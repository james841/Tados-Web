import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

import { getCurrentUser } from "@/lib/auth";

/**
 * Shared plumbing for the admin JSON API.
 *
 * Every admin route needs the same three things — a role check, a parsed and
 * validated body, and error responses that never leak internals — so they live
 * here once rather than being re-typed (and slowly diverging) per route.
 */

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status: number, extra?: unknown) {
  return NextResponse.json({ error: message, details: extra }, { status });
}

/** Thrown by `requireAdmin` and mapped to a response by `handleRoute`.
 *
 * `details` is optional and keyed by field name, matching the shape Zod errors
 * come back in — so a hand-thrown conflict can highlight the input that caused
 * it instead of only showing a banner at the top of the form. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

/**
 * Gate for every /api/admin route.
 *
 * The middleware already keeps non-admins out of the admin pages, but it only
 * sees the JWT cookie. Re-checking here means a hand-crafted request straight
 * to the API is rejected too — the pages and the data are separate doors.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) throw new HttpError(401, "You must be signed in.");
  if (user.role !== "ADMIN") throw new HttpError(403, "Admins only.");

  return user;
}

/**
 * Wraps a route body so thrown errors become clean JSON.
 *
 * Zod issues come back as 422 with field details the client form can display;
 * anything unexpected is logged server-side and reported as a bare 500, so a
 * stack trace or SQL fragment never reaches the browser.
 */
export async function handleRoute(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonError(error.message, error.status, error.details);
    }

    if (error instanceof ZodError) {
      return jsonError("Validation failed.", 422, error.flatten().fieldErrors);
    }

    // Unique-constraint violations are the one Prisma error worth naming:
    // duplicate slug/SKU is a user mistake, not a server fault. Routes that can
    // predict a clash catch it first and say which record holds the value —
    // this is the backstop, and it still has to land on the right input rather
    // than as a banner reading "That sku is already taken", which sends an
    // admin looking at a field they may never have typed in.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      const target = (error as { meta?: { target?: string[] | string } }).meta
        ?.target;
      const fields = Array.isArray(target)
        ? target
        : typeof target === "string"
          ? [target]
          : [];

      const label = fields.map(fieldLabel).join(" and ") || "value";
      const message = `That ${label} is already used by another record. Try a different one.`;

      return jsonError(
        message,
        409,
        fields.length
          ? Object.fromEntries(fields.map((field) => [field, [message]]))
          : undefined,
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return jsonError("Not found.", 404);
    }

    // A foreign key that points at a row which no longer exists. In practice
    // this is a stale reference rather than a server fault — most often a JWT
    // session naming a user the database no longer has — so it gets a status the
    // client can act on instead of a bare 500.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2003"
    ) {
      console.error("[api] foreign key violation", error);
      return jsonError(
        "That request referenced something that no longer exists. Please sign in again and retry.",
        409,
      );
    }

    console.error("[api]", error);

    // In development the message is the whole point — a bare 500 in the browser
    // sends you hunting through terminal scrollback for the real cause.
    return jsonError(
      process.env.NODE_ENV === "production"
        ? "Something went wrong."
        : `Something went wrong: ${
            error instanceof Error ? error.message : String(error)
          }`,
      500,
    );
  }
}

/** Column name -> what an admin calls it on screen. */
function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    sku: "SKU",
    slug: "web address",
    email: "email address",
    name: "name",
    orderNumber: "order number",
  };
  return labels[field] ?? field;
}

/** Parse a JSON body against a schema, rejecting malformed JSON up front. */
export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, "Expected a JSON body.");
  }

  return schema.parse(raw);
}

/** Clamped pagination, so a hand-typed `?perPage=100000` can't hurt the DB. */
export function readPagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const perPage = Math.min(
    100,
    Math.max(1, Number(searchParams.get("perPage") ?? 20) || 20),
  );

  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

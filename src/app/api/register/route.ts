import bcrypt from "bcryptjs";

import { handleRoute, jsonError, jsonOk, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export const runtime = "nodejs";

/**
 * Customer sign-up.
 *
 * Only ever creates CUSTOMER accounts — `role` is not read from the body, so a
 * crafted request can't mint itself an admin. Promotion happens in the database
 * or the admin panel, never here.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const input = await parseBody(request, registerSchema);
    const email = input.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    if (existing) {
      // Deliberately explicit rather than vague. The login page already
      // discloses which emails exist (it has to, to explain a failed sign-in),
      // so hiding it here would cost usability and buy no real secrecy.
      return jsonError(
        existing.passwordHash
          ? "An account with that email already exists. Sign in instead."
          : "That email is already registered with Google. Use “Continue with Google”.",
        409,
      );
    }

    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash: await bcrypt.hash(input.password, 12),
      },
      select: { id: true, name: true, email: true },
    });

    // No session is issued here — the client signs in straight after, which
    // keeps one code path for minting tokens instead of two.
    return jsonOk({ user }, { status: 201 });
  });
}

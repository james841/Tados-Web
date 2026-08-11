"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui";

/**
 * Route-level error boundary for everything under `src/app`.
 *
 * Until this file existed, a render failure had nowhere to land: Next fell back
 * to `missing required error components, refreshing...` plus an auto-reload
 * script, which reads as a broken site and hides the actual cause. A shopper who
 * had just paid saw that on the checkout success page.
 *
 * `reset()` re-renders the failed segment without a full page load, which is the
 * right first move for a transient failure (a dropped database connection, a
 * cache miss mid-deploy). The layout, header and cart state all survive it.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server errors reach the browser with their message stripped, so the digest
    // is the only thing that ties what the customer saw to a server log line.
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="container-page max-w-2xl py-16">
      <div className="rounded-card border border-ink-200 bg-white p-8 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-ink-100 text-ink-500">
          <AlertTriangle size={32} />
        </span>

        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink-900">
          Something broke on our side
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm text-ink-600">
          This one is on us, not you. Nothing you were doing was lost — try again
          and it will usually go through.
        </p>

        {error.digest ? (
          <p className="mt-4 inline-block rounded-lg bg-ink-100 px-4 py-2 text-xs font-semibold text-ink-600">
            Reference {error.digest}
          </p>
        ) : null}

        {process.env.NODE_ENV !== "production" ? (
          <pre className="mt-5 overflow-x-auto rounded-lg bg-ink-900 p-4 text-left text-xs leading-relaxed text-ink-100">
            {error.message}
          </pre>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset} variant="primary">
            <RotateCw size={16} />
            Try again
          </Button>
          <ButtonLink href="/" variant="outline">
            Back to home
          </ButtonLink>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-ink-500">
        Were you in the middle of paying? Your order is safe — check{" "}
        <Link
          href="/account"
          className="font-semibold text-brand-700 hover:underline"
        >
          your orders
        </Link>{" "}
        before paying again.
      </p>
    </div>
  );
}

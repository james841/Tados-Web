"use client";

import { useEffect } from "react";

/**
 * The last-resort boundary: a failure in the root layout itself.
 *
 * `error.tsx` sits *inside* the layout, so it can't catch a layout that threw —
 * by then there's no `<html>` to render into. This file replaces the whole
 * document, which is why it ships its own `<html>` and `<body>` and why the
 * styling is inline: a broken layout may well mean the stylesheet never loaded.
 *
 * In practice this should never render. That's the point of having it.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html lang="en-ZA">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0 }}>
            Tados Smart Technology is temporarily unavailable
          </h1>

          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "0.9rem",
              lineHeight: 1.6,
              color: "#475569",
            }}
          >
            Something failed before the page could load. Reloading usually fixes
            it — if it doesn&apos;t, please try again in a few minutes.
          </p>

          {error.digest ? (
            <p
              style={{
                marginTop: "1rem",
                display: "inline-block",
                borderRadius: "0.5rem",
                background: "#e2e8f0",
                padding: "0.5rem 1rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#475569",
              }}
            >
              Reference {error.digest}
            </p>
          ) : null}

          <div style={{ marginTop: "1.75rem" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                cursor: "pointer",
                borderRadius: "0.75rem",
                border: "none",
                background: "#0f172a",
                padding: "0.75rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#ffffff",
              }}
            >
              Reload the page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

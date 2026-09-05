"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * Shell for the admin create/edit dialogs.
 *
 * The panel is a flex column that is never taller than the viewport: a fixed
 * header, one scrolling body, and a fixed footer holding the actions.
 *
 * That structure is the whole point. The previous version let the panel grow to
 * whatever height its fields needed inside a `items-center` flex container, and
 * a centred flex item taller than its container overflows in *both* directions
 * — the top edge ends up above the scroll origin, where no amount of scrolling
 * can reach it. Adding a few product photos was enough to push the Name field
 * permanently off-screen, and zooming the browser out was the only way back.
 * Capping the panel at the viewport removes the overflow altogether, so every
 * field is reachable on any screen size.
 */
export function AdminDialog({
  title,
  titleId,
  onClose,
  onSubmit,
  error,
  footer,
  children,
}: {
  title: string;
  titleId: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  /** Shown at the top of the body, which is scrolled into view when it appears. */
  error?: string | null;
  /** Action buttons. Pinned to the footer, so they're reachable without scrolling. */
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // Escape closes, matching the storefront cart drawer.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Lock the page behind the dialog. Without this the wheel scrolls whichever
  // of the two the pointer happens to be over, which is the other half of "I
  // can't get back to the top".
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // A rejected save puts the reason at the top of the body — a long way from
  // the button that was just pressed, on a form this tall.
  useEffect(() => {
    if (error) bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [error]);

  return (
    // No click-to-dismiss on the backdrop on purpose: these forms hold a lot of
    // typing, and a stray click just outside the panel shouldn't discard it.
    // Escape and the close button are the ways out.
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-card bg-surface shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-card"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-200 px-5 py-4">
          <h2 id={titleId} className="text-lg font-bold text-ink-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600 transition-colors hover:bg-ink-200"
          >
            <X size={16} />
          </button>
        </header>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* `min-h-0` is what allows this to shrink below its content height.
              Without it a flex child refuses to be smaller than its contents and
              the overflow moves straight back onto the page. */}
          <div
            ref={bodyRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5"
          >
            {error ? (
              <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            {children}
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-ink-200 px-5 py-4">
            {footer}
          </div>
        </form>
      </div>
    </div>
  );
}

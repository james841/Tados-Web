"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/**
 * Admin feedback: a running ledger of what just happened, and a confirm step
 * for the actions worth pausing on.
 *
 * The panel is an operations desk, so outcomes read as entries in a daybook
 * rather than as notification balloons: a rail in the outcome colour, the verb
 * in the same uppercase micro-label the status pills use, the time in
 * `tabular-nums`, then one plain sentence naming the record. Deliberately no
 * tick icon and no coloured pill — the verb carries the outcome, which also
 * means the meaning survives for anyone who can't separate the two hues.
 *
 * The one rule that matters: **a success clears itself, a failure does not.**
 * Auto-dismissing both is what makes ordinary toasts unreliable — the message
 * you most needed to read is the one that timed out while you were looking
 * somewhere else. Failures stay until they're dismissed.
 *
 * Where each kind of message goes, so nothing is reported twice:
 *  - A page that can't load keeps its own banner. The message stands in for the
 *    data that isn't there, so it belongs on the page.
 *  - A rejected save keeps the banner inside its dialog, next to the fields
 *    that have to change. A corner note would be the wrong end of the screen.
 *  - A successful save reports here, because by then the dialog has closed.
 *  - Row actions — deactivate, delete, status change — report here either way.
 *    There's no form to put the message in, and the row is already the context.
 *
 * Docked bottom-right for two structural reasons: the sidebar occupies the left
 * column at `lg`, and every page's primary action ("New product") sits at the
 * top right, which is exactly where an overlay must not land.
 *
 * Rendered inside the admin subtree rather than through a portal to
 * `document.body` — `AdminThemeProvider` scopes `.dark` to a wrapper div, so
 * anything that escapes it renders in light mode on a dark panel.
 */

type Tone = "done" | "failed";

type Entry = {
  id: number;
  tone: Tone;
  /** Past-tense verb, matching the button that caused it. "Saved", not "Success". */
  label: string;
  detail: string;
  /** Formatted at creation — these never render on the server, so no mismatch. */
  at: string;
};

type ConfirmRequest = {
  /**
   * What's at stake, in the admin's terms — "Permanent", "Reversible",
   * "Adjusts stock". Free text on purpose: only the call site knows the truth,
   * and a fixed vocabulary would end up lying about one of them.
   */
  impact: string;
  title: string;
  detail: string;
  /** The button label. Use the verb, never "OK". */
  action: string;
  /** `danger` for anything that can't be cleanly undone. Defaults to `caution`. */
  tone?: "caution" | "danger";
};

type AdminFeedbackValue = {
  done: (label: string, detail: string) => void;
  failed: (label: string, detail: string) => void;
  confirm: (request: ConfirmRequest) => Promise<boolean>;
};

const AdminFeedbackContext = createContext<AdminFeedbackValue | null>(null);

export function useAdminFeedback() {
  const context = useContext(AdminFeedbackContext);

  if (!context) {
    throw new Error(
      "useAdminFeedback must be used within an AdminFeedbackProvider.",
    );
  }

  return context;
}

/** Entries kept on screen at once. Older ones fall off the top. */
const KEEP = 4;
/** Long enough to read a sentence without hunting for it. Successes only. */
const CLEAR_AFTER_MS = 6000;

export function AdminFeedbackProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [request, setRequest] = useState<
    (ConfirmRequest & { resolve: (confirmed: boolean) => void }) | null
  >(null);

  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const push = useCallback(
    (tone: Tone, label: string, detail: string) => {
      const id = nextId.current++;

      setEntries((current) =>
        [
          ...current,
          {
            id,
            tone,
            label,
            detail,
            at: new Date().toLocaleTimeString("en-ZA", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
          },
        ].slice(-KEEP),
      );

      if (tone === "done") {
        timers.current.set(id, setTimeout(() => dismiss(id), CLEAR_AFTER_MS));
      }
    },
    [dismiss],
  );

  // Clear pending timers on unmount — a navigation away shouldn't leave them
  // firing into a dead component.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const confirm = useCallback(
    (next: ConfirmRequest) =>
      new Promise<boolean>((resolve) => setRequest({ ...next, resolve })),
    [],
  );

  const settle = useCallback(
    (confirmed: boolean) => {
      request?.resolve(confirmed);
      setRequest(null);
    },
    [request],
  );

  const value = useMemo<AdminFeedbackValue>(
    () => ({
      done: (label, detail) => push("done", label, detail),
      failed: (label, detail) => push("failed", label, detail),
      confirm,
    }),
    [push, confirm],
  );

  return (
    <AdminFeedbackContext.Provider value={value}>
      {children}
      <Ledger entries={entries} onDismiss={dismiss} />
      {request ? <ConfirmSheet request={request} onSettle={settle} /> : null}
    </AdminFeedbackContext.Provider>
  );
}

/** The docked stack of outcomes. Newest sits at the bottom, nearest the corner. */
function Ledger({
  entries,
  onDismiss,
}: {
  entries: Entry[];
  onDismiss: (id: number) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      /* One polite region for both outcomes. Failures are announced politely
         too: they're already visually persistent, so an assertive region would
         only talk over whatever the admin is reading. */
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[22rem]"
    >
      <AnimatePresence initial={false}>
        {entries.map((entry) => {
          const failed = entry.tone === "failed";

          return (
            <motion.div
              key={entry.id}
              layout={!reduceMotion}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex overflow-hidden rounded-lg border border-ink-200 bg-surface shadow-md"
            >
              {/* The rail is the only colour in the entry, which is what keeps
                  it readable at a glance without shouting. */}
              <span
                aria-hidden="true"
                className={cn(
                  "w-[3px] shrink-0",
                  failed ? "bg-red-600" : "bg-brand-600",
                )}
              />

              <div className="min-w-0 flex-1 px-3.5 py-3">
                <p className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-[0.14em]",
                      failed ? "text-red-700" : "text-brand-700",
                    )}
                  >
                    {entry.label}
                  </span>
                  <span className="text-[10px] tabular-nums text-ink-400">
                    {entry.at}
                  </span>
                </p>
                <p className="mt-1 text-sm leading-snug text-ink-600">
                  {entry.detail}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(entry.id)}
                aria-label={`Dismiss: ${entry.label}`}
                className="m-2 flex size-7 shrink-0 items-center justify-center self-start rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * The confirm step. Same rail-and-micro-label vocabulary as the ledger, so the
 * question and the answer that follows it read as one system.
 *
 * Unlike `AdminDialog`, the backdrop dismisses. That dialog holds a long form
 * where a stray click would discard real typing; here dismissing *is* the safe
 * outcome, so making it easy costs nothing.
 */
function ConfirmSheet({
  request,
  onSettle,
}: {
  request: ConfirmRequest;
  onSettle: (confirmed: boolean) => void;
}) {
  const reduceMotion = useReducedMotion();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const danger = request.tone === "danger";

  // Focus lands on Cancel for a change that can't be undone, and on the action
  // for one that can — so the Enter key does the safe thing precisely where
  // being wrong is most expensive. Cheaper than making an admin retype a name
  // to delete an empty category, and it guards the same mistake.
  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;

    const frame = requestAnimationFrame(() => {
      (danger ? cancelRef : actionRef).current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      returnFocusRef.current?.focus?.();
    };
  }, [danger]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onSettle(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onSettle]);

  // Lock the page behind the sheet. Restoring the previous value rather than
  // clearing it keeps this from fighting `AdminDialog`'s own lock.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <motion.div
        aria-hidden="true"
        onClick={() => onSettle(false)}
        className="absolute inset-0 bg-ink-950/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      />

      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-detail"
        initial={
          reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }
        }
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex w-full max-w-md overflow-hidden rounded-card border border-ink-200 bg-surface shadow-md"
      >
        <span
          aria-hidden="true"
          className={cn(
            "w-[3px] shrink-0",
            danger ? "bg-red-600" : "bg-amber-600",
          )}
        />

        <div className="min-w-0 flex-1 p-5">
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.14em]",
              danger ? "text-red-700" : "text-amber-700",
            )}
          >
            {request.impact}
          </p>

          <h2
            id="admin-confirm-title"
            className="mt-2 text-base font-bold text-ink-900"
          >
            {request.title}
          </h2>
          <p
            id="admin-confirm-detail"
            className="mt-1.5 text-sm leading-relaxed text-ink-600"
          >
            {request.detail}
          </p>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={() => onSettle(false)}
              className="rounded-lg border border-ink-300 px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-900"
            >
              Cancel
            </button>

            {/* `bg-red-600 text-ink-50` is correct in both themes without an
                override: the ink ramp inverts wholesale and red-600 flips
                lightness with it, so the label stays legible either way. A
                pastel `-50` fill would not survive the same trip. */}
            <button
              ref={actionRef}
              type="button"
              onClick={() => onSettle(true)}
              className={cn(
                "rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-50 transition-colors",
                danger
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-ink-900 hover:bg-ink-800",
              )}
            >
              {request.action}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

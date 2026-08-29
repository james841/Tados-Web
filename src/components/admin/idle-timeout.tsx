"use client";

import { ShieldAlert } from "lucide-react";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui";
import { clearAdminActivity, writeAdminActivity } from "@/lib/admin-activity";
import {
  ADMIN_ACTIVITY_STORAGE_KEY,
  ADMIN_ACTIVITY_WRITE_INTERVAL_MS,
  ADMIN_IDLE_TIMEOUT_MS,
  ADMIN_IDLE_WARNING_MS,
} from "@/lib/admin-session";

const ACTIVITY_EVENTS = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
] as const;

const TIMEOUT_REDIRECT = "/login?timeout=1";

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Idle-session timeout for the admin area.
 *
 * Warns at 28 minutes with a live countdown and signs out at 30. Activity in
 * any admin tab keeps every other tab alive, via a `localStorage` timestamp and
 * the `storage` event — otherwise working in one tab would silently expire the
 * others.
 *
 * This is the convenience half of the timeout. It is trivially bypassable (stop
 * the JS and the modal never appears), which is why `src/middleware.ts` checks
 * the same timestamp server-side on every admin navigation. Same two-door shape
 * as the auth guard.
 */
export function IdleTimeout() {
  const [warning, setWarning] = useState(false);
  const [remaining, setRemaining] = useState(
    ADMIN_IDLE_TIMEOUT_MS - ADMIN_IDLE_WARNING_MS,
  );

  const lastActiveRef = useRef(Date.now());
  const lastWriteRef = useRef(0);
  const signedOutRef = useRef(false);

  const endSession = useCallback(() => {
    if (signedOutRef.current) return;
    signedOutRef.current = true;
    // Drop the timestamp first, or middleware reads it as still-stale on the
    // next sign-in and bounces straight back here.
    clearAdminActivity();
    void signOut({ callbackUrl: TIMEOUT_REDIRECT });
  }, []);

  /** Records activity locally, and broadcasts it when the throttle allows. */
  const markActive = useCallback((broadcast: boolean) => {
    const now = Date.now();
    lastActiveRef.current = now;

    if (!broadcast) return;
    if (now - lastWriteRef.current < ADMIN_ACTIVITY_WRITE_INTERVAL_MS) return;

    lastWriteRef.current = now;
    writeAdminActivity(now);
  }, []);

  // Seed the cookie on mount so middleware has something to compare against
  // from the very first admin page view.
  useEffect(() => {
    lastWriteRef.current = 0;
    markActive(true);
  }, [markActive]);

  useEffect(() => {
    function onActivity() {
      // Moving the mouse must not dismiss the warning — that would make the
      // modal impossible to read. Only "Stay signed in" clears it.
      if (warning) return;
      markActive(true);
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [markActive, warning]);

  // Another tab reporting activity counts as activity here too.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== ADMIN_ACTIVITY_STORAGE_KEY || !event.newValue) return;

      const timestamp = Number(event.newValue);
      if (!Number.isFinite(timestamp)) return;
      if (timestamp <= lastActiveRef.current) return;

      lastActiveRef.current = timestamp;
      setWarning(false);
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Single ticking clock rather than a chain of timeouts: a laptop waking from
  // sleep resolves on the next tick instead of firing a stale timer.
  useEffect(() => {
    const id = window.setInterval(() => {
      const idle = Date.now() - lastActiveRef.current;

      if (idle >= ADMIN_IDLE_TIMEOUT_MS) {
        endSession();
        return;
      }

      if (idle >= ADMIN_IDLE_WARNING_MS) {
        setWarning(true);
        setRemaining(ADMIN_IDLE_TIMEOUT_MS - idle);
      } else {
        setWarning(false);
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [endSession]);

  if (!warning) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-timeout-title"
      aria-describedby="idle-timeout-description"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-card border border-ink-200 bg-surface p-6 shadow-lg">
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <ShieldAlert size={22} />
        </span>

        <h2
          id="idle-timeout-title"
          className="mt-4 text-lg font-bold text-ink-900"
        >
          Still there?
        </h2>

        <p id="idle-timeout-description" className="mt-2 text-sm text-ink-600">
          You&apos;ll be signed out in{" "}
          <strong className="tabular-nums text-ink-900">
            {formatCountdown(remaining)}
          </strong>{" "}
          for security, because this tab has been idle.
        </p>

        <div className="mt-6 flex gap-3">
          <Button
            variant="dark"
            fullWidth
            autoFocus
            onClick={() => {
              lastWriteRef.current = 0;
              markActive(true);
              setWarning(false);
            }}
          >
            Stay signed in
          </Button>
          <Button variant="outline" onClick={endSession}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

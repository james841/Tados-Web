"use client";

import { Moon, Sun } from "lucide-react";

import { useAdminTheme } from "@/components/admin/theme-provider";
import type { AdminTheme } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{
  value: AdminTheme;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/**
 * Light/dark switch for the admin panel.
 *
 * A two-option segmented control rather than a single icon button, because an
 * icon button has to choose between showing the current state and showing what
 * pressing it would do — and whichever it picks, half the users read it the
 * other way. Here both states are visible and the thumb says which one is
 * active, so there's nothing to infer.
 *
 * Exposed as a radiogroup, not a checkbox: "light or dark" is a choice between
 * two named things, and arrow-key navigation between the two comes for free.
 */
export function AdminThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useAdminTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "relative flex shrink-0 items-center gap-0.5 rounded-full border border-ink-200 bg-ink-100 p-0.5",
        className,
      )}
    >
      {/**
       * The moving highlight. Sized and offset to land exactly on a button, and
       * pulled out of the accessibility tree — the buttons already announce
       * which option is checked, so this is purely the visual echo of that.
       */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0.5 top-0.5 size-7 rounded-full bg-surface shadow-sm",
          "transition-transform duration-200 ease-out motion-reduce:transition-none",
          theme === "dark" && "translate-x-[1.875rem]",
        )}
      />

      {OPTIONS.map((option) => {
        const active = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            // The icon alone isn't a label, and the group's own label says
            // "Colour theme" — this is what names the individual choice.
            aria-label={option.label}
            // Only the selected option is a tab stop; arrow keys move between
            // them once focus is inside, which is how a radiogroup behaves.
            tabIndex={active ? 0 : -1}
            onClick={() => setTheme(option.value)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              setTheme(theme === "dark" ? "light" : "dark");
            }}
            className={cn(
              "relative flex size-7 items-center justify-center rounded-full transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
              active
                ? "text-ink-900"
                : "text-ink-400 hover:text-ink-600",
            )}
          >
            <option.icon size={14} strokeWidth={2.25} />
          </button>
        );
      })}
    </div>
  );
}

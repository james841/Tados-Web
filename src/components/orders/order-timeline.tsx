import {
  CheckCircle2,
  CreditCard,
  Package,
  RotateCcw,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";

import { cn, formatDateTime } from "@/lib/utils";

/**
 * Order tracking timeline, shared by the customer's order page and the admin
 * order detail page.
 *
 * The schema has no status-history table, so the only timestamps we genuinely
 * know are when the order was created and when it was last touched. Rather than
 * invent a date for every step, `createdAt` is shown against the first step and
 * `updatedAt` against the current one — everything else stays undated.
 */

const FULFILMENT_STEPS = [
  {
    status: "PENDING",
    label: "Order placed",
    description: "We have your order and are waiting for payment to clear.",
    icon: ShoppingBag,
  },
  {
    status: "PAID",
    label: "Payment confirmed",
    description: "Your payment came through successfully.",
    icon: CreditCard,
  },
  {
    status: "PROCESSING",
    label: "Preparing your order",
    description: "We're packing your items for dispatch.",
    icon: Package,
  },
  {
    status: "SHIPPED",
    label: "Shipped",
    description: "Your parcel is on its way to you.",
    icon: Truck,
  },
  {
    status: "DELIVERED",
    label: "Delivered",
    description: "Your order has arrived.",
    icon: CheckCircle2,
  },
] as const;

/** Statuses that end the order instead of advancing it. */
const TERMINAL_STATES: Record<
  string,
  { label: string; description: string; icon: typeof XCircle }
> = {
  CANCELLED: {
    label: "Cancelled",
    description:
      "This order was cancelled and any reserved stock has been released.",
    icon: XCircle,
  },
  REFUNDED: {
    label: "Refunded",
    description: "This order was refunded back to the original payment method.",
    icon: RotateCcw,
  },
};

export function OrderTimeline({
  status,
  createdAt,
  updatedAt,
}: {
  status: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}) {
  const terminal = TERMINAL_STATES[status];

  /**
   * A cancelled order still got placed, so the first step stays truthful — the
   * cancellation is shown as the branch it is rather than blanking the history.
   */
  if (terminal) {
    const TerminalIcon = terminal.icon;

    return (
      <ol className="space-y-0">
        <Step
          icon={FULFILMENT_STEPS[0].icon}
          label={FULFILMENT_STEPS[0].label}
          description={FULFILMENT_STEPS[0].description}
          timestamp={createdAt}
          state="done"
          isLast={false}
        />
        <Step
          icon={TerminalIcon}
          label={terminal.label}
          description={terminal.description}
          timestamp={updatedAt}
          state="terminal"
          isLast
        />
      </ol>
    );
  }

  const currentIndex = FULFILMENT_STEPS.findIndex(
    (step) => step.status === status,
  );

  return (
    <ol className="space-y-0">
      {FULFILMENT_STEPS.map((step, index) => {
        // An unrecognised status shouldn't light up the whole timeline.
        const state =
          currentIndex < 0
            ? "upcoming"
            : index < currentIndex
              ? "done"
              : index === currentIndex
                ? "current"
                : "upcoming";

        const timestamp =
          index === 0
            ? createdAt
            : index === currentIndex
              ? updatedAt
              : undefined;

        return (
          <Step
            key={step.status}
            icon={step.icon}
            label={step.label}
            description={step.description}
            timestamp={timestamp}
            state={state}
            isLast={index === FULFILMENT_STEPS.length - 1}
          />
        );
      })}
    </ol>
  );
}

type StepState = "done" | "current" | "upcoming" | "terminal";

const MARKER_STYLES: Record<StepState, string> = {
  done: "border-brand-600 bg-brand-600 text-white",
  current: "border-brand-600 bg-white text-brand-700 ring-4 ring-brand-100",
  upcoming: "border-ink-200 bg-white text-ink-300",
  terminal: "border-red-500 bg-red-500 text-white",
};

const LABEL_STYLES: Record<StepState, string> = {
  done: "text-ink-900",
  current: "text-ink-900",
  upcoming: "text-ink-400",
  terminal: "text-red-700",
};

function Step({
  icon: Icon,
  label,
  description,
  timestamp,
  state,
  isLast,
}: {
  icon: typeof XCircle;
  label: string;
  description: string;
  timestamp?: Date | string;
  state: StepState;
  isLast: boolean;
}) {
  return (
    <li className="flex gap-4">
      {/* Marker column: the connector is drawn by the item above it, so the
          last step omits it and the line stops at the final marker. */}
      <div className="flex flex-col items-center">
        <span
          aria-hidden
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            MARKER_STYLES[state],
          )}
        >
          <Icon size={17} />
        </span>

        {!isLast ? (
          <span
            aria-hidden
            className={cn(
              "min-h-10 w-0.5 flex-1",
              state === "done" ? "bg-brand-600" : "bg-ink-200",
            )}
          />
        ) : null}
      </div>

      <div className={cn("min-w-0 pb-6", isLast && "pb-0")}>
        <p className={cn("text-sm font-semibold", LABEL_STYLES[state])}>
          {label}
          {state === "current" ? (
            <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-inset ring-brand-600/20">
              Current
            </span>
          ) : null}
        </p>

        <p
          className={cn(
            "mt-0.5 text-xs",
            state === "upcoming" ? "text-ink-400" : "text-ink-600",
          )}
        >
          {description}
        </p>

        {timestamp ? (
          <p className="mt-1 text-xs tabular-nums text-ink-500">
            {formatDateTime(timestamp)}
          </p>
        ) : null}
      </div>
    </li>
  );
}

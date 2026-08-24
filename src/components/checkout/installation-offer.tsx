"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui";
import { CITIES_SENTENCE, SITE, whatsappLink } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

export interface InstallationOfferOrder {
  orderNumber: string;
  customerName: string;
  total: number;
  items: { name: string; quantity: number }[];
  address: {
    line1: string;
    line2: string | null;
    city: string;
    province: string;
    postalCode: string;
  } | null;
}

/** localStorage key. Per-order, so a second purchase gets asked again. */
const answerKey = (orderNumber: string) => `tados:install-offer:${orderNumber}`;

/**
 * Post-payment installation offer.
 *
 * The Installation Support Policy is explicit that installation is a separate,
 * quoted service — there is no fixed price to charge and no way to add it to a
 * PayFast transaction that has already settled. So this deliberately does not
 * take payment or write an order line. It hands the customer to WhatsApp with
 * everything a technician needs to quote: order number, what they bought, where
 * it's going and who to call. That is the whole job.
 *
 * Three exits, as asked for, and they mean different things:
 *
 * - **Accept** opens WhatsApp with the message pre-filled, and the answer is
 *   remembered so a refresh doesn't ask again.
 * - **Decline** is a final "no" — also remembered, and the page stops offering.
 * - **Cancel** (the X, Escape, or a click outside) is "not now": nothing is
 *   stored, and a small link stays on the page to reopen it. Losing the offer
 *   permanently because someone pressed Escape would be the wrong default.
 *
 * The answer lives in localStorage rather than the database because it isn't
 * order state — it's a UI preference about whether to keep asking. Nothing
 * downstream reads it, and a cleared browser simply asks once more.
 */
export function InstallationOffer({ order }: { order: InstallationOfferOrder }) {
  // Starts closed and only auto-opens from an effect: the pop-up timing depends
  // on localStorage, which doesn't exist during SSR. The in-page prompt below,
  // however, renders on the server — it needs no client state to show its
  // default "request installation" form, so there's no gate hiding it and no
  // layout shift when hydration finishes.
  const [open, setOpen] = useState(false);
  const [answered, setAnswered] = useState<"accepted" | "declined" | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(answerKey(order.orderNumber));
    } catch {
      // Private mode or storage disabled — fall through and just ask.
    }

    if (stored === "accepted" || stored === "declined") {
      setAnswered(stored);
      return;
    }

    // A short beat so the confirmation renders first. Slamming a modal over the
    // page the instant it paints reads as an interstitial ad; letting the
    // customer register "payment went through" first does not.
    const id = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(id);
  }, [order.orderNumber]);

  const remember = useCallback(
    (answer: "accepted" | "declined") => {
      try {
        window.localStorage.setItem(answerKey(order.orderNumber), answer);
      } catch {
        // Not being able to remember is survivable; the offer just reappears.
      }
      setAnswered(answer);
      setOpen(false);
    },
    [order.orderNumber],
  );

  /** "Not now" — no answer recorded, the reopen link stays available. */
  const cancel = useCallback(() => setOpen(false), []);

  const accept = useCallback(() => {
    // Opened synchronously inside the click handler. Deferring it behind an
    // await or a timeout gets the tab eaten by the popup blocker.
    window.open(
      whatsappLink(buildMessage(order)),
      "_blank",
      "noopener,noreferrer",
    );
    remember("accepted");
  }, [order, remember]);

  // Escape closes, Tab stays inside the panel.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, cancel]);

  // Move focus in on open, hand it back on close, and stop the page behind
  // scrolling underneath the dialog.
  useEffect(() => {
    if (!open) {
      returnFocusRef.current?.focus?.();
      return;
    }

    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => closeRef.current?.focus());

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      {/* The persistent entry point, rendered server-side. Once the modal is
          dismissed — however it was dismissed — installation is still one click
          away, which is what keeps the popup from being the only chance to say
          yes, and what makes this work with JavaScript still loading. */}
      <InstallationPrompt
        answered={answered}
        onOpen={() => {
          setAnswered(null);
          setOpen(true);
        }}
      />

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
            <motion.div
              className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={cancel}
            />

            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="install-offer-title"
              aria-describedby="install-offer-description"
              className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                ref={closeRef}
                type="button"
                onClick={cancel}
                aria-label="Close without answering"
                className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-full bg-white/80 text-ink-500 backdrop-blur transition-colors hover:bg-ink-100 hover:text-ink-900"
              >
                <X size={16} />
              </button>

              <div className="border-b border-ink-100 bg-ink-50/60 px-6 pb-6 pt-8 sm:px-8">
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
                  <Wrench size={22} />
                </span>

                <h2
                  id="install-offer-title"
                  className="mt-4 text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl"
                >
                  Would you like us to install it?
                </h2>

                <p
                  id="install-offer-description"
                  className="mt-2 text-sm leading-relaxed text-ink-600"
                >
                  Order{" "}
                  <strong className="font-semibold text-ink-900">
                    {order.orderNumber}
                  </strong>{" "}
                  is paid and on its way. If you&apos;d rather not fit it
                  yourself, our technicians can do it for you.
                </p>
              </div>

              <div className="px-6 py-6 sm:px-8">
                <ul className="space-y-3 text-sm text-ink-700">
                  <Point icon={<MapPin size={15} />}>
                    Available in{" "}
                    <strong className="font-semibold text-ink-900">
                      {CITIES_SENTENCE}
                    </strong>
                    . Elsewhere we&apos;ll help remotely and you can use your own
                    installer.
                  </Point>
                  <Point icon={<MessageCircle size={15} />}>
                    We&apos;ll open WhatsApp with your order details already
                    filled in — just press send.
                  </Point>
                  <Point icon={<ShieldCheck size={15} />}>
                    Installation is quoted separately, based on the job. Nothing
                    is charged now and you&apos;re free to decline the quote.
                  </Point>
                </ul>

                <div className="mt-6 flex flex-col gap-2.5 sm:flex-row-reverse">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={accept}
                    className="sm:flex-1"
                  >
                    <MessageCircle size={17} />
                    Yes, request installation
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    onClick={() => remember("declined")}
                    className="sm:flex-1"
                  >
                    No thanks
                  </Button>
                </div>

                <p className="mt-4 text-center text-xs leading-relaxed text-ink-500">
                  Read the{" "}
                  <Link
                    href="/installation"
                    className="font-semibold text-brand-700 underline-offset-2 hover:underline"
                  >
                    Installation Support Policy
                  </Link>{" "}
                  for what&apos;s covered, site requirements and how quotes work.
                </p>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Point({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        {icon}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

/** The in-page card: the state the offer leaves behind once the modal closes. */
function InstallationPrompt({
  answered,
  onOpen,
}: {
  answered: "accepted" | "declined" | null;
  onOpen: () => void;
}) {
  if (answered === "accepted") {
    return (
      <div className="mt-6 flex items-start gap-3 rounded-card border border-brand-200 bg-brand-50/60 p-4 text-sm">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-700" />
        <p className="text-ink-700">
          <strong className="font-semibold text-ink-900">
            Installation requested.
          </strong>{" "}
          Send the WhatsApp message and we&apos;ll come back with a quote.{" "}
          <button
            type="button"
            onClick={onOpen}
            className="font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            Open it again
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-card border border-dashed border-ink-300 bg-ink-50 px-4 py-3 text-center text-sm text-ink-600">
      <Wrench size={15} className="shrink-0 text-ink-400" />
      <span>Need this professionally installed?</span>
      <button
        type="button"
        onClick={onOpen}
        className="font-semibold text-brand-700 underline-offset-2 hover:underline"
      >
        Request installation
      </button>
    </div>
  );
}

/**
 * The WhatsApp message.
 *
 * Written so the technician can quote without a follow-up round-trip: what was
 * bought, how many, where it goes and who to call. Plain line breaks — wa.me
 * renders them, and `whatsappLink` handles the encoding.
 */
function buildMessage(order: InstallationOfferOrder): string {
  const lines = [
    `Hi ${SITE.shortName}, I'd like to request installation for my order.`,
    "",
    `Order number: ${order.orderNumber}`,
    `Name: ${order.customerName}`,
    `Order total: ${formatPrice(order.total)}`,
    "",
    "Items:",
    ...order.items.map((item) => `• ${item.name} x${item.quantity}`),
  ];

  if (order.address) {
    const { line1, line2, city, province, postalCode } = order.address;
    lines.push(
      "",
      "Installation address:",
      line1,
      ...(line2 ? [line2] : []),
      `${city}, ${province} ${postalCode}`,
    );
  }

  lines.push("", "Please send me a quote and available dates. Thank you.");

  return lines.join("\n");
}

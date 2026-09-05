"use client";

import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { Button, CurrencyAmount, CurrencyNotice, Price } from "@/components/ui";
import {
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_FEE,
} from "@/lib/constants";
import { cn, formatPrice, SA_PROVINCES } from "@/lib/utils";
import { selectCartSubtotal, useCart } from "@/store/cart";

/**
 * Checkout form.
 *
 * Two steps — shipping details, then a review — followed by a handoff to
 * PayFast. The handoff is a real form POST rather than a redirect because
 * PayFast expects the signed fields as form data, and the signature covers
 * exactly the field set the server built.
 *
 * The totals shown here are indicative. The server recomputes them from
 * database prices in /api/checkout, and that figure is what gets signed and
 * charged — so a stale localStorage price shows a brief discrepancy at worst,
 * never an incorrect charge.
 */

type Step = "details" | "review";

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
}

const EMPTY: FormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  province: "",
  postalCode: "",
  notes: "",
};

export function CheckoutForm() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const items = useCart((s) => s.items);
  const subtotal = useCart(selectCartSubtotal);

  const [step, setStep] = useState<Step>("details");
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** Hidden form used to hand off to PayFast. */
  const payfastFormRef = useRef<HTMLFormElement>(null);
  const [handoff, setHandoff] = useState<{
    processUrl: string;
    fields: Record<string, string>;
  } | null>(null);

  const shipping =
    subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  const total = subtotal + shipping;

  const hydrated = useHydrated();

  // Prefill from the session once it resolves. Only fills blanks, so it never
  // overwrites something already typed.
  useEffect(() => {
    if (!session?.user) return;

    setValues((current) => {
      const [first = "", ...rest] = (session.user.name ?? "").split(" ");
      return {
        ...current,
        firstName: current.firstName || first,
        lastName: current.lastName || rest.join(" "),
        email: current.email || (session.user.email ?? ""),
      };
    });
  }, [session]);

  // An empty cart has nothing to check out. Waits for hydration so the
  // persisted cart has loaded before deciding.
  useEffect(() => {
    if (hydrated && items.length === 0 && !handoff) router.replace("/cart");
  }, [hydrated, items.length, handoff, router]);

  // Submit the handoff form as soon as it has the signed fields.
  useEffect(() => {
    if (handoff) payfastFormRef.current?.submit();
  }, [handoff]);

  function update(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function validateDetails() {
    const errors: Record<string, string> = {};

    if (!values.firstName.trim()) errors.firstName = "First name is required.";
    if (!values.lastName.trim()) errors.lastName = "Last name is required.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email))
      errors.email = "Enter a valid email address.";
    if (values.phone.replace(/\D/g, "").length < 10)
      errors.phone = "Enter a valid phone number.";
    if (!values.line1.trim()) errors.line1 = "Street address is required.";
    if (!values.city.trim()) errors.city = "City is required.";
    if (!values.province) errors.province = "Pick a province.";
    if (!/^\d{4}$/.test(values.postalCode))
      errors.postalCode = "Postal codes are 4 digits.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function goToReview() {
    if (!validateDetails()) {
      // Put the user on the first thing that needs fixing.
      document
        .querySelector<HTMLElement>("[data-field-error='true']")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handlePay() {
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          line2: values.line2 || null,
          notes: values.notes || null,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        // 422 carries per-field detail from Zod; anything else is a message.
        if (res.status === 422 && body.details) {
          const flattened: Record<string, string> = {};
          for (const [key, messages] of Object.entries(
            body.details as Record<string, string[]>,
          )) {
            if (messages?.[0]) flattened[key] = messages[0];
          }
          setFieldErrors(flattened);
          setStep("details");
        }

        throw new Error(body.error ?? "We couldn't start your payment.");
      }

      // Cart is cleared on the success page, not here — if the customer
      // abandons the PayFast page, their cart is still waiting for them.
      setHandoff({ processUrl: body.processUrl, fields: body.paymentData });
    } catch (err) {
      setFormError((err as Error).message);
      setSubmitting(false);
    }
  }

  if (!hydrated) return <CheckoutSkeleton />;
  if (items.length === 0 && !handoff) return <CheckoutSkeleton />;

  if (handoff) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Loader2 size={32} className="animate-spin text-brand-600" />
        <p className="mt-4 text-lg font-semibold text-ink-900">
          Redirecting to PayFast…
        </p>
        <p className="mt-1 text-sm text-ink-500">
          Don&apos;t close this window.
        </p>

        <form
          ref={payfastFormRef}
          action={handoff.processUrl}
          method="POST"
          className="hidden"
        >
          {Object.entries(handoff.fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {/* Fallback if the browser blocks the scripted submit. */}
          <button type="submit">Continue to PayFast</button>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        <StepIndicator step={step} />

        {formError ? (
          <p
            role="alert"
            className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-600/20"
          >
            {formError}
          </p>
        ) : null}

        {step === "details" ? (
          <section className="rounded-card border border-ink-200 bg-white p-6">
            <h2 className="text-lg font-bold text-ink-900">
              Shipping details
            </h2>

            {sessionStatus === "unauthenticated" ? (
              <p className="mt-2 text-sm text-ink-500">
                Checking out as a guest.{" "}
                <a
                  href="/login?callbackUrl=/checkout"
                  className="font-semibold text-brand-700 hover:underline"
                >
                  Sign in
                </a>{" "}
                to save your details and track this order.
              </p>
            ) : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="First name"
                value={values.firstName}
                onChange={(v) => update("firstName", v)}
                error={fieldErrors.firstName}
                autoComplete="given-name"
              />
              <Field
                label="Last name"
                value={values.lastName}
                onChange={(v) => update("lastName", v)}
                error={fieldErrors.lastName}
                autoComplete="family-name"
              />
              <Field
                label="Email"
                type="email"
                value={values.email}
                onChange={(v) => update("email", v)}
                error={fieldErrors.email}
                autoComplete="email"
                hint="Your order confirmation goes here."
              />
              <Field
                label="Phone"
                type="tel"
                value={values.phone}
                onChange={(v) => update("phone", v)}
                error={fieldErrors.phone}
                autoComplete="tel"
                placeholder="082 123 4567"
              />

              <div className="sm:col-span-2">
                <Field
                  label="Street address"
                  value={values.line1}
                  onChange={(v) => update("line1", v)}
                  error={fieldErrors.line1}
                  autoComplete="address-line1"
                />
              </div>

              <div className="sm:col-span-2">
                <Field
                  label="Apartment, suite, etc."
                  value={values.line2}
                  onChange={(v) => update("line2", v)}
                  optional
                  autoComplete="address-line2"
                />
              </div>

              <Field
                label="City"
                value={values.city}
                onChange={(v) => update("city", v)}
                error={fieldErrors.city}
                autoComplete="address-level2"
              />

              <div data-field-error={fieldErrors.province ? "true" : undefined}>
                <label
                  htmlFor="province"
                  className="mb-1.5 block text-sm font-medium text-ink-700"
                >
                  Province
                </label>
                <select
                  id="province"
                  value={values.province}
                  onChange={(e) => update("province", e.target.value)}
                  autoComplete="address-level1"
                  aria-invalid={fieldErrors.province ? true : undefined}
                  className={cn(
                    "w-full rounded-lg border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-ink-900",
                    fieldErrors.province ? "border-red-400" : "border-ink-200",
                  )}
                >
                  <option value="">Select a province…</option>
                  {SA_PROVINCES.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
                {fieldErrors.province ? (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.province}
                  </p>
                ) : null}
              </div>

              <Field
                label="Postal code"
                value={values.postalCode}
                onChange={(v) => update("postalCode", v)}
                error={fieldErrors.postalCode}
                autoComplete="postal-code"
                inputMode="numeric"
                maxLength={4}
              />

              <div className="sm:col-span-2">
                <label
                  htmlFor="notes"
                  className="mb-1.5 block text-sm font-medium text-ink-700"
                >
                  Delivery notes{" "}
                  <span className="font-normal text-ink-400">(optional)</span>
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  maxLength={500}
                  value={values.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Gate code, complex name, best delivery time…"
                  className="w-full resize-none rounded-lg border border-ink-200 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-400 focus:border-ink-900"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={goToReview}
              size="lg"
              className="mt-6 w-full"
            >
              Review order
            </Button>
          </section>
        ) : (
          <section className="rounded-card border border-ink-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-ink-900">
                Review &amp; pay
              </h2>
              <button
                type="button"
                onClick={() => setStep("details")}
                className="text-sm font-semibold text-brand-700 hover:underline"
              >
                Edit details
              </button>
            </div>

            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-ink-900">Deliver to</dt>
                <dd className="mt-1 text-ink-600">
                  {values.firstName} {values.lastName}
                  <br />
                  {values.line1}
                  {values.line2 ? (
                    <>
                      <br />
                      {values.line2}
                    </>
                  ) : null}
                  <br />
                  {values.city}, {values.province} {values.postalCode}
                </dd>
              </div>

              <div>
                <dt className="font-semibold text-ink-900">Contact</dt>
                <dd className="mt-1 text-ink-600">
                  {values.email}
                  <br />
                  {values.phone}
                </dd>
              </div>
            </dl>

            {values.notes ? (
              <div className="mt-4 rounded-lg bg-ink-50 p-3 text-sm">
                <p className="font-semibold text-ink-900">Delivery notes</p>
                <p className="mt-0.5 text-ink-600">{values.notes}</p>
              </div>
            ) : null}

            <ul className="mt-6 divide-y divide-ink-100 border-t border-ink-200">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink-900">
                      {item.name}
                    </span>
                    <span className="text-xs text-ink-500">
                      Qty {item.quantity} ·{" "}
                      <CurrencyAmount value={item.price} /> each
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-ink-900">
                    <CurrencyAmount value={item.price * item.quantity} />
                  </span>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              onClick={handlePay}
              disabled={submitting}
              size="lg"
              className="mt-6 w-full"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Lock size={16} />
              )}
              {/* Deliberately `formatPrice`, not the visitor's currency: this is
                  the amount PayFast will actually charge, and PayFast settles in
                  rand only. Everywhere else on the page may show a converted
                  guide price — the button must not. */}
              Pay {formatPrice(total)} with PayFast
            </Button>

            <CurrencyNotice className="mt-3 text-center" />

            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-500">
              <ShieldCheck size={14} className="text-brand-600" />
              You&apos;ll be redirected to PayFast&apos;s secure page. We never
              see your card details.
            </p>
          </section>
        )}
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-card border border-ink-200 bg-white p-6">
          <h2 className="text-lg font-bold text-ink-900">Order summary</h2>

          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li
                key={item.productId}
                className="flex justify-between gap-3 text-sm"
              >
                <span className="min-w-0 text-ink-600">
                  <span className="line-clamp-2">{item.name}</span>
                  <span className="text-xs text-ink-400">
                    × {item.quantity}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-ink-900">
                  <CurrencyAmount value={item.price * item.quantity} />
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-2 border-t border-ink-200 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-600">Subtotal</span>
              <Price price={subtotal} showBase={false} />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-600">Shipping</span>
              {shipping === 0 ? (
                <span className="font-semibold text-ink-900">Included</span>
              ) : (
                <Price price={shipping} showBase={false} />
              )}
            </div>
          </div>

          <div className="mt-4 flex items-baseline justify-between border-t border-ink-200 pt-4">
            <span className="font-semibold text-ink-900">Total</span>
            <Price price={total} className="text-2xl font-bold" />
          </div>

          <CurrencyNotice className="mt-3" />
        </div>
      </aside>
    </div>
  );
}

/* ---------------------------------------------------------------
   Pieces
   --------------------------------------------------------------- */

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "details", label: "Shipping" },
    { key: "review", label: "Review & pay" },
  ];

  return (
    <ol className="mb-6 flex items-center gap-3 text-sm">
      {steps.map((entry, index) => {
        const active = entry.key === step;
        const done = step === "review" && entry.key === "details";

        return (
          <li key={entry.key} className="flex items-center gap-3">
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 font-semibold",
                active || done ? "text-ink-900" : "text-ink-400",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs",
                  active
                    ? "bg-ink-900 text-white"
                    : done
                      ? "bg-brand-600 text-white"
                      : "bg-ink-100 text-ink-500",
                )}
              >
                {done ? "✓" : index + 1}
              </span>
              {entry.label}
            </span>
            {index < steps.length - 1 ? (
              <span className="h-px w-8 bg-ink-200" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  hint,
  optional,
  type = "text",
  ...rest
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  optional?: boolean;
  type?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
>) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");

  return (
    <div data-field-error={error ? "true" : undefined}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-ink-700"
      >
        {label}{" "}
        {optional ? (
          <span className="font-normal text-ink-400">(optional)</span>
        ) : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:border-ink-900",
          error ? "border-red-400" : "border-ink-200",
        )}
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="skeleton h-[520px] rounded-card" />
      <div className="skeleton h-72 rounded-card" />
    </div>
  );
}

/**
 * The cart is restored from localStorage after the first paint, so rendering
 * "your cart is empty" before that would flash for anyone who actually has
 * items. Wait one commit before trusting the store.
 */
function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

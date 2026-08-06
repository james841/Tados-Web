"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Loader2 } from "lucide-react";

/** Google's brand mark. Inline so there's no extra network request. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "That email and password combination isn't correct.",
  OAuthAccountNotLinked:
    "That email is already registered. Sign in with your password instead.",
  AccessDenied: "You don't have permission to sign in.",
  Configuration:
    "Google sign-in isn't configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.",
};

export function LoginForm({
  callbackUrl,
  error,
}: {
  callbackUrl?: string;
  error?: string;
}) {
  const [pending, setPending] = useState<"google" | "credentials" | null>(null);
  const [formError, setFormError] = useState<string | null>(
    error ? (ERROR_MESSAGES[error] ?? "Something went wrong. Try again.") : null,
  );

  const destination = callbackUrl ?? "/";

  async function handleCredentials(formData: FormData) {
    setPending("credentials");
    setFormError(null);

    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
    });

    if (result?.error) {
      setFormError(ERROR_MESSAGES.CredentialsSignin);
      setPending(null);
      return;
    }

    // Full navigation so every server component re-reads the new session.
    window.location.href = destination;
  }

  return (
    <div className="mt-6">
      {formError ? (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-600/20"
        >
          {formError}
        </p>
      ) : null}

      {/* Google is listed first because it's the primary path you asked for. */}
      <button
        type="button"
        onClick={() => {
          setPending("google");
          signIn("google", { callbackUrl: destination });
        }}
        disabled={pending !== null}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-ink-300 bg-white px-4 py-3 text-sm font-semibold text-ink-900 transition-colors hover:bg-ink-50 disabled:opacity-60"
      >
        {pending === "google" ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-ink-200" />
        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
          or
        </span>
        <span className="h-px flex-1 bg-ink-200" />
      </div>

      <form action={handleCredentials} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-ink-700"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-ink-900"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-ink-700"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-ink-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-ink-900"
          />
        </div>

        <button
          type="submit"
          disabled={pending !== null}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-800 disabled:opacity-60"
        >
          {pending === "credentials" ? (
            <Loader2 size={18} className="animate-spin" />
          ) : null}
          Sign in
        </button>
      </form>
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

import { POLICY_LAST_UPDATED, POLICY_PAGES, SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type PolicyBlock =
  | { type: "p"; text: ReactNode }
  | { type: "list"; items: ReactNode[] }
  | { type: "ordered"; items: ReactNode[] }
  | { type: "note"; title?: string; text: ReactNode }
  | { type: "qa"; question: string; blocks: PolicyBlock[] };

export interface PolicySection {
  heading: string;
  id?: string;
  blocks: PolicyBlock[];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function PolicyPage({
  eyebrow,
  title,
  intro,
  sections,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  sections: PolicySection[];
  children?: ReactNode;
}) {
  const withIds = sections.map((section) => ({
    ...section,
    id: section.id ?? slugify(section.heading),
  }));

  return (
    <div className="min-h-screen bg-ink-50/30">
      {/* Header section with structured top bar & crisp hierarchy */}
      <header className="border-b border-white/10 bg-ink-950 py-16 text-white sm:py-20">
        <div className="container-page max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur-md">
            <span>{eyebrow}</span>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>

          <div className="mt-5 text-base leading-relaxed text-ink-200 sm:text-lg">
            {intro}
          </div>

          <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-4 text-xs text-white/50">
            <span className="inline-block size-2 rounded-full bg-emerald-500" />
            <span>Last updated: {POLICY_LAST_UPDATED}</span>
          </div>
        </div>
      </header>

      <div className="container-page py-12 sm:py-16">
        <div className="gap-12 lg:flex">
          {/* Sticky Table of Contents navigation */}
          <nav
            aria-label="On this page"
            className="mb-10 shrink-0 lg:sticky lg:top-32 lg:mb-0 lg:w-64 lg:self-start"
          >
            <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-sm">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-400">
                On this page
              </p>
              <ol className="space-y-1 text-xs sm:text-sm">
                {withIds.map((section, index) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-ink-600 transition-all hover:bg-ink-50 hover:text-ink-950"
                    >
                      <span className="tabular-nums text-ink-400 group-hover:text-ink-950 font-medium">
                        {String(index + 1).padStart(2, "0")}.
                      </span>
                      <span className="line-clamp-1">{section.heading}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          {/* Main policy body */}
          <div className="min-w-0 flex-1 max-w-2xl">
            {withIds.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-32 border-b border-ink-100 py-10 first:pt-0 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-ink-100 text-xs font-bold tabular-nums text-ink-700">
                    {index + 1}
                  </span>
                  <h2 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
                    {section.heading}
                  </h2>
                </div>

                <div className="mt-6 space-y-5">
                  {section.blocks.map((block, blockIndex) => (
                    <Block key={blockIndex} block={block} />
                  ))}
                </div>
              </section>
            ))}

            {children ? (
              <div className="mt-8 border-t border-ink-200 pt-8">{children}</div>
            ) : null}

            <RelatedPolicies currentTitle={title} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ block }: { block: PolicyBlock }) {
  switch (block.type) {
    case "p":
      return (
        <p className="text-sm leading-relaxed text-ink-700 sm:text-base">
          {block.text}
        </p>
      );

    case "list":
      return (
        <ul className="space-y-2.5 text-sm leading-relaxed text-ink-700 sm:text-base">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ink-900"
              />
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      );

    case "ordered":
      return (
        <ol className="space-y-2.5 text-sm leading-relaxed text-ink-700 sm:text-base">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-3">
              <span className="shrink-0 font-semibold tabular-nums text-ink-900">
                {index + 1}.
              </span>
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ol>
      );

    case "note":
      return (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 sm:p-5">
          {block.title ? (
            <p className="text-sm font-semibold text-amber-900">{block.title}</p>
          ) : null}
          <p
            className={cn(
              "text-sm leading-relaxed text-amber-800/90",
              block.title && "mt-1.5",
            )}
          >
            {block.text}
          </p>
        </div>
      );

    case "qa":
      return (
        <div className="rounded-xl border border-ink-200/80 bg-white p-5 shadow-xs">
          <h3 className="text-base font-bold tracking-tight text-ink-900">
            {block.question}
          </h3>
          <div className="mt-3 space-y-3">
            {block.blocks.map((child, index) => (
              <Block key={index} block={child} />
            ))}
          </div>
        </div>
      );
  }
}

function RelatedPolicies({ currentTitle }: { currentTitle: string }) {
  const others = POLICY_PAGES.filter((page) => page.label !== currentTitle);

  return (
    <nav
      aria-label="Other policies"
      className="mt-12 border-t border-ink-200 pt-8"
    >
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
        Other policies
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {others.map((page) => (
          <li key={page.href}>
            <Link
              href={page.href}
              className="inline-flex rounded-xl border border-ink-200/80 bg-white px-3.5 py-2 text-xs font-medium text-ink-700 transition-all hover:border-ink-900 hover:bg-ink-900 hover:text-white"
            >
              {page.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PolicyContact({
  heading = "Questions about this policy?",
  email = SITE.email,
}: {
  heading?: string;
  email?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-200/80 bg-white p-6 sm:p-8 shadow-xs">
      <p className="text-lg font-bold text-ink-900">{heading}</p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3">
          <dt className="text-xs font-semibold text-ink-400">Email</dt>
          <dd className="mt-1">
            <a
              href={`mailto:${email}`}
              className="font-medium text-ink-900 hover:underline"
            >
              {email}
            </a>
          </dd>
        </div>
        <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3">
          <dt className="text-xs font-semibold text-ink-400">Phone / WhatsApp</dt>
          <dd className="mt-1">
            <a
              href={`tel:${SITE.phone.replace(/\s/g, "")}`}
              className="font-medium text-ink-900 hover:underline"
            >
              {SITE.phone}
            </a>
          </dd>
        </div>
        <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3">
          <dt className="text-xs font-semibold text-ink-400">Hours</dt>
          <dd className="mt-1 font-medium text-ink-900">{SITE.operatingHours}</dd>
        </div>
      </dl>
    </div>
  );
}
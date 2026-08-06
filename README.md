# Tados Web

Electronics & smart-security e-commerce store for the South African market.
Built with Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Prisma +
PostgreSQL, Redis and PayFast.

---

## ⚠️ Build status — read this first

The **storefront is feature-complete and compiles cleanly**. The checkout flow and admin
dashboard are **not built yet**. Section 6 (PayFast), the `checkout/` and `admin/`
entries in section 9, and some static pages describe the *intended* design, not shipped code.

**✅ Done and working:**

- Prisma schema + seed (10 products from the spec doc, categories, brands, admin user)
- Data layer with Redis caching (`src/lib/queries.ts`)
- PayFast signature + ITN validation helpers (`src/lib/payfast.ts`) — library ready
- **Google OAuth** configured via NextAuth (`src/lib/auth.ts`) + route handler
- SessionProvider wrapping the app for client-side auth checks
- Zustand cart store (`src/store/cart.ts`)
- Header with category dropdown, footer, root layout with full SEO + JSON-LD
- **Hero carousel** with Framer Motion (Ken Burns zoom-out effect + text transitions)
- Home page with hero, promo band, deal banners, lifestyle CTA
- Catalogue with URL-driven filters + pagination, category pages,
  product detail page with Product/Offer/AggregateRating/Breadcrumb structured data
- **`/cart` page** with inline quantity controls + **sign-in gate on "Clear cart"**
- **`/login` page** with Google OAuth button (primary) + email/password fallback
- `sitemap.xml` and `robots.txt` generated from the database
- **`DATABASE_SCHEMA.md`** explaining every table, how categories link to products, and what
  each column means

**📋 Still to build:**

- [ ] Cart drawer (sidebar overlay triggered from header badge)
- [ ] `/checkout` flow (shipping → payment → review)
- [ ] `POST /api/payfast/notify` ITN route handler (validation helpers ready in `src/lib/payfast.ts`)
- [ ] `/checkout/success` and `/checkout/cancelled` pages
- [ ] `/admin` nested layout + dashboard, orders, products, customers, settings
- [ ] `/register` page
- [ ] Static pages (`/about`, `/contact`, `/bestsellers`, `/new-arrivals`, `/deals`)
      — these are referenced by the footer and sitemap and will 404 until built

**TypeScript compiles cleanly.** The build will succeed once you configure `.env` per section 3.

---


## 1. Requirements

| Tool       | Version | Notes                                    |
| ---------- | ------- | ---------------------------------------- |
| Node.js    | ≥ 20    | `node -v`                                |
| PostgreSQL | ≥ 14    | You already have pgAdmin installed       |
| Redis      | ≥ 6     | Optional — the app degrades gracefully   |

---

## 2. Create the database (pgAdmin)

1. Open **pgAdmin** → right-click **Databases** → **Create → Database…**
2. Name it `tados_web` → **Save**.

That is all you need to do in pgAdmin — Prisma creates every table for you.

---

## 3. Configure environment variables

Copy the example file and fill it in:

```bash
cd tados-web
copy .env.example .env
```

Then edit `.env`:

```env
# Swap YOUR_PASSWORD for your postgres user's password
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/tados_web?schema=public"

REDIS_URL="redis://localhost:6379"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: npx auth secret   (or any long random string)"

NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# --- PayFast SANDBOX credentials (safe to use as-is for testing) ---
PAYFAST_MERCHANT_ID="10041144"
PAYFAST_MERCHANT_KEY="p3xkwoxsbdlwq"
PAYFAST_PASSPHRASE=""
PAYFAST_SANDBOX="true"

# Seeded admin login
ADMIN_EMAIL="admin@tadosweb.co.za"
ADMIN_PASSWORD="Admin@12345"
```

Generate a real `NEXTAUTH_SECRET` with:

```bash
npx auth secret
```

---

## 4. Install, migrate, seed, run

```bash
npm install
npx prisma migrate dev --name init   # creates all tables
npm run db:seed                      # categories, brands, 10 products, admin user
npm run dev
```

Open <http://localhost:3000>.

**Admin panel:** <http://localhost:3000/admin> — sign in with the
`ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`.

---

## 5. Useful scripts

| Command              | What it does                                 |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Dev server (Turbopack)                       |
| `npm run build`      | Production build                             |
| `npm start`          | Serve the production build                   |
| `npm run db:seed`    | Re-seed the catalogue                        |
| `npm run db:studio`  | Prisma Studio — browse/edit data in a GUI    |
| `npm run db:reset`   | Drop, re-migrate and re-seed                 |

---

## 6. Testing PayFast (sandbox)

The store ships in **sandbox mode** (`PAYFAST_SANDBOX="true"`). Payments post to
`https://sandbox.payfast.co.za/eng/process` and no real money moves.

**To place a test order:**

1. Add products to the cart → **Checkout**.
2. Fill in the shipping form → **Continue to payment**.
3. You are redirected to the PayFast sandbox. Log in with the sandbox buyer
   account PayFast shows on screen (or use any of their test cards) and
   approve the payment.
4. PayFast redirects you back to `/checkout/success`.

### The ITN callback on localhost

PayFast confirms payments by POSTing an **Instant Transaction Notification** to
`/api/payfast/notify`. PayFast's servers cannot reach `localhost`, so during
local testing the order stays `PENDING` until you expose your machine:

```bash
npx localtunnel --port 3000
# or: ngrok http 3000
```

Then set both of these to the public URL and restart the dev server:

```env
NEXTAUTH_URL="https://your-tunnel-url.loca.lt"
NEXT_PUBLIC_SITE_URL="https://your-tunnel-url.loca.lt"
```

The ITN handler validates every notification four ways before it marks an order
as paid:

1. **Signature** — MD5 of the payload + passphrase must match.
2. **Source IP** — must resolve to a known PayFast host.
3. **Amount** — must equal the order total (±R0.01).
4. **Server confirmation** — the payload is posted back to PayFast's
   `/eng/query/validate` endpoint for a final `VALID`.

Stock is only decremented, and the order only becomes `PAID`, after all four
pass — and the handler is idempotent, so PayFast's retries can't double-count.

### Going live

1. Replace `PAYFAST_MERCHANT_ID` / `PAYFAST_MERCHANT_KEY` with your real
   credentials from the PayFast dashboard.
2. Set a `PAYFAST_PASSPHRASE` (set the identical value in your PayFast account
   under *Settings → Security*).
3. Set `PAYFAST_SANDBOX="false"`.
4. Point `NEXT_PUBLIC_SITE_URL` at your production domain.

No code changes are needed — `src/lib/payfast.ts` reads the mode from the
environment and switches endpoints automatically.

---

## 7. Performance notes

- **Static generation** — every product and category page is pre-rendered at
  build time (`generateStaticParams`), so they're served from cache instantly.
- **Redis** — expensive catalogue queries are cached with short TTLs in
  `src/lib/queries.ts`. If `REDIS_URL` is unreachable the app falls straight
  through to Postgres, so Redis is never a hard dependency.
- **Images** — all product images use `next/image` with `fill` + `sizes`, and
  are served as AVIF/WebP. Only above-the-fold images are `priority`.
- **Fonts** — a system font stack is used, so there is no font download, no
  layout shift and no flash of unstyled text.
- **Streaming** — the catalogue grid streams inside `<Suspense>` so the page
  shell paints before the database query finishes.
- **Admin sidebar** — the admin area uses a nested layout, so clicking a
  sidebar link swaps only the panel content. The shell never re-renders and
  the page never reloads.

---

## 8. SEO checklist (already implemented)

- Per-page `metadata` with unique titles, descriptions and canonicals
- Open Graph + Twitter card tags
- JSON-LD: `Organization`, `WebSite` + `SearchAction`, `Product` + `Offer` +
  `AggregateRating`, and `BreadcrumbList`
- `sitemap.xml` and `robots.txt` generated from the database
- Semantic headings, breadcrumb navigation and a skip-to-content link
- `lang="en-ZA"`, ZAR pricing and South African address markup

---

## 9. Project structure

```
src/
├── app/
│   ├── layout.tsx              Root layout, global SEO, JSON-LD
│   ├── page.tsx                Home page
│   ├── products/               Catalogue + product detail
│   ├── category/[slug]/        Category pages
│   ├── cart/  checkout/        Cart and checkout flow
│   ├── admin/                  Admin dashboard (nested layout)
│   └── api/                    Route handlers (auth, PayFast ITN)
├── components/
│   ├── layout/                 Header (category dropdown), Footer
│   ├── home/                   Home page sections
│   ├── product/                Cards, grid, filters, detail
│   └── ui/                     Buttons, badges, price, skeletons
├── lib/
│   ├── prisma.ts  redis.ts     Clients (singleton-safe)
│   ├── queries.ts              Cached data access layer
│   ├── payfast.ts              Signature generation + ITN validation
│   ├── auth.ts                 NextAuth configuration
│   └── constants.ts  utils.ts
├── store/cart.ts               Zustand cart (persisted to localStorage)
└── prisma/
    ├── schema.prisma
    └── seed.ts
```

---

## 10. Troubleshooting

**`Can't reach database server at localhost:5432`**
PostgreSQL isn't running, or the password in `DATABASE_URL` is wrong. Start the
service from Windows *Services*, or check the password in pgAdmin.

**`Redis connection refused`**
Harmless — the app runs without Redis, just without the caching layer. Install
Redis (or use a free Upstash instance) to remove the warning.

**Prisma types look stale after editing `schema.prisma`**
Run `npx prisma generate`, then reload the VS Code window
(`Ctrl+Shift+P → Developer: Reload Window`).

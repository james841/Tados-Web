import { z } from "zod";

import { SA_PROVINCES } from "@/lib/utils";

/**
 * Request shapes for the admin API.
 *
 * Kept separate from the route handlers so the client-side forms can import the
 * same schemas and validate before a round-trip. `slug` and `sku` are the only
 * fields with a format constraint — everything else is bounded rather than
 * patterned, to avoid rejecting legitimate product copy.
 */

const slug = z
  .string()
  .min(1, "Slug is required.")
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and single hyphens.",
  );

/** Money arrives as a string from `<input type="number">`; coerce and bound. */
const money = z.coerce
  .number()
  .nonnegative("Must be zero or more.")
  .max(9_999_999);

export const productCreateSchema = z.object({
  name: z.string().min(2, "Name is required.").max(200),
  slug,
  sku: z.string().min(1, "SKU is required.").max(64),
  tagline: z.string().max(200).optional().nullable(),
  description: z.string().min(1, "Description is required."),

  price: money,
  compareAtPrice: money.optional().nullable(),
  costPrice: money.optional().nullable(),

  stock: z.coerce.number().int().min(0).max(1_000_000).default(0),
  lowStockAt: z.coerce.number().int().min(0).max(10_000).default(5),

  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),

  categoryId: z.string().min(1, "Pick a category."),
  brandId: z.string().min(1).optional().nullable(),

  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),

  /** Ordered gallery. First image is treated as the card/hero image. */
  images: z
    .array(
      z.object({
        url: z.string().min(1, "Image URL is required."),
        alt: z.string().max(200).optional().nullable(),
      }),
    )
    .max(10)
    .default([]),
});

/** Every field optional on edit, so the form can send only what changed. */
export const productUpdateSchema = productCreateSchema.partial();

/**
 * Categories.
 *
 * `image` and `icon` are plain strings rather than a URL/enum: images are repo
 * paths like `/products/cat-smart-locks.jpg` today, and the icon is a lucide
 * component name the carousel maps (see `CATEGORY_ICON_NAMES`). Both are
 * optional — a category with neither renders as a gradient tile.
 *
 * `parentId` accepts `null` to promote a child to a top-level category.
 */
export const categoryCreateSchema = z.object({
  name: z.string().min(2, "Name is required.").max(120),
  slug,
  description: z.string().max(500).optional().nullable(),
  image: z.string().max(500).optional().nullable(),
  icon: z.string().max(60).optional().nullable(),
  position: z.coerce.number().int().min(0).max(9_999).default(0),
  /** Drives the homepage "Most Popular Categories" rail. */
  featured: z.boolean().default(false),
  parentId: z.string().min(1).optional().nullable(),
});

/** Every field optional on edit — the homepage toggle sends `featured` alone. */
export const categoryUpdateSchema = categoryCreateSchema.partial();

export const orderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ]),
});

export const customerUpdateSchema = z.object({
  role: z.enum(["CUSTOMER", "ADMIN"]),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

/* ---------------------------------------------------------------
   Storefront: checkout + registration
   --------------------------------------------------------------- */

/**
 * South African mobile numbers, accepted in the forms people actually type:
 * "0821234567", "082 123 4567", "+27 82 123 4567". Normalised server-side.
 */
const phone = z
  .string()
  .min(10, "Enter a valid phone number.")
  .max(20)
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 13;
  }, "Enter a valid South African phone number.");

/**
 * Cart lines carry only an id and a quantity.
 *
 * Deliberately no price field — the route re-reads prices from the database, so
 * accepting one here would imply it mattered and invite someone to send their
 * own. See the contract documented in `src/store/cart.ts`.
 */
export const checkoutSchema = z.object({
  firstName: z.string().min(1, "First name is required.").max(80),
  lastName: z.string().min(1, "Last name is required.").max(80),
  email: z.string().email("Enter a valid email address."),
  phone,

  line1: z.string().min(1, "Street address is required.").max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1, "City is required.").max(100),
  province: z.enum(SA_PROVINCES, {
    errorMap: () => ({ message: "Pick a province." }),
  }),
  postalCode: z
    .string()
    .regex(/^\d{4}$/, "South African postal codes are 4 digits."),

  notes: z.string().max(500).optional().nullable(),

  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(100),
      }),
    )
    .min(1, "Your cart is empty."),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Enter your name.").max(120),
  email: z.string().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(200, "That password is too long."),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

import {
  Bike,
  Blinds,
  DoorClosed,
  Fingerprint,
  Flame,
  House,
  KeyRound,
  LayoutGrid,
  Lock,
  ScanFace,
  ShieldAlert,
  Siren,
  Speaker,
  ToggleRight,
  type LucideIcon,
} from "lucide-react";

/**
 * The lucide glyphs a category may use.
 *
 * `Category.icon` is a free-text column holding a component name (see
 * `prisma/seed.ts`), so the storefront can only render names it knows about.
 * The map lives here rather than beside the carousel so the admin form can
 * offer exactly this set in a <select> — an admin can't then pick an icon that
 * silently falls back to the generic glyph.
 *
 * `Home` is an alias kept for rows seeded before the lucide rename; it's
 * deliberately absent from `CATEGORY_ICON_NAMES` so the picker offers one
 * canonical name per glyph.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Bike,
  Blinds,
  DoorClosed,
  Fingerprint,
  Flame,
  Home: House,
  House,
  KeyRound,
  Lock,
  ScanFace,
  ShieldAlert,
  Siren,
  Speaker,
  ToggleRight,
};

/** Shown when a category has no icon, or one this build doesn't recognise. */
export const FALLBACK_CATEGORY_ICON = LayoutGrid;

/** Selectable names, alphabetical, aliases excluded. */
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS)
  .filter((name) => name !== "Home")
  .sort();

export function resolveCategoryIcon(name: string | null | undefined) {
  return (name ? CATEGORY_ICONS[name] : undefined) ?? FALLBACK_CATEGORY_ICON;
}

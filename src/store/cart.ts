"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Client-side cart, persisted to localStorage.
 *
 * The cart is deliberately client-only until checkout — that keeps every
 * product page statically renderable and avoids a DB write per "add to cart".
 * At checkout the server re-reads live prices and stock from the database, so
 * a tampered localStorage cart cannot change what a customer is charged.
 */

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  image: string | null;
  quantity: number;
  stock: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;

  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,

      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId,
          );

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? {
                      ...i,
                      // Never let the cart exceed available stock.
                      quantity: Math.min(i.quantity + quantity, i.stock),
                      price: item.price,
                      stock: item.stock,
                    }
                  : i,
              ),
              isOpen: true,
            };
          }

          return {
            items: [
              ...state.items,
              { ...item, quantity: Math.min(quantity, item.stock) },
            ],
            isOpen: true,
          };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      setQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId
                    ? { ...i, quantity: Math.min(quantity, i.stock) }
                    : i,
                ),
        })),

      clear: () => set({ items: [], isOpen: false }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: "tados-cart",
      // `isOpen` is UI state — don't restore a drawer open on page load.
      partialize: (state) => ({ items: state.items }),
      version: 1,
    },
  ),
);

/** Derived selectors — kept outside the store so they don't trigger re-renders. */
export const selectCartCount = (state: CartState) =>
  state.items.reduce((sum, i) => sum + i.quantity, 0);

export const selectCartSubtotal = (state: CartState) =>
  state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

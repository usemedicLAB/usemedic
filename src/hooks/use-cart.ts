import { useEffect, useState } from "react";

export type CartItem = { id: string; name: string; price: number; image_url?: string | null; qty: number; requires_rx: boolean };

const KEY = "medic.cart.v1";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("medic:cart"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    setItems(read());
    const handler = () => setItems(read());
    window.addEventListener("medic:cart", handler);
    window.addEventListener("storage", handler);
    return () => { window.removeEventListener("medic:cart", handler); window.removeEventListener("storage", handler); };
  }, []);
  return {
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    subtotal: items.reduce((s, i) => s + i.qty * i.price, 0),
    add: (it: Omit<CartItem, "qty">, qty = 1) => {
      const cur = read();
      const idx = cur.findIndex((x) => x.id === it.id);
      if (idx >= 0) cur[idx].qty += qty; else cur.push({ ...it, qty });
      write(cur);
    },
    setQty: (id: string, qty: number) => {
      const cur = read().map((x) => (x.id === id ? { ...x, qty } : x)).filter((x) => x.qty > 0);
      write(cur);
    },
    remove: (id: string) => write(read().filter((x) => x.id !== id)),
    clear: () => write([]),
  };
}

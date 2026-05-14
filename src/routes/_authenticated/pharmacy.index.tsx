import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, ShoppingCart, Pill, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { MobileShell } from "@/components/mobile-shell";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pharmacy/")({
  head: () => ({ meta: [{ title: "Pharmacy — Medic" }] }),
  component: Pharmacy,
});

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "prescription", label: "Prescription" },
  { key: "otc", label: "OTC" },
  { key: "vitamins", label: "Vitamins" },
  { key: "devices", label: "Devices" },
  { key: "wellness", label: "Wellness" },
] as const;

const CAT_TAG: Record<string, string> = { otc: "OTC", prescription: "Rx", vitamins: "Supplement", devices: "Device", wellness: "Wellness" };

function Pharmacy() {
  const { user } = useAuth();
  const cart = useCart();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<typeof CATEGORIES[number]["key"]>("all");

  const { data: products, isLoading } = useQuery({
    queryKey: ["pharmacy-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacy_products" as any)
        .select("id, name, category, price, image_url, in_stock, requires_rx")
        .eq("in_stock", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: hasRx } = useQuery({
    queryKey: ["my-rx-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("patient_id", user!.id);
      return (count ?? 0) > 0;
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (products ?? []).filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!term) return true;
      return p.name.toLowerCase().includes(term);
    });
  }, [products, q, cat]);

  const addToCart = (p: any) => {
    if (p.requires_rx && !hasRx) {
      toast.error("Prescription required — consult a doctor first");
      return;
    }
    cart.add({ id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url, requires_rx: !!p.requires_rx });
    toast.success(`${p.name} added`);
  };

  return (
    <MobileShell role="user"><div className="pb-4">
      <header className="bg-[#1A73E8] px-4 pt-6 pb-5 text-white rounded-b-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">Pharmacy</h1>
            <p className="text-sm text-white/85">Medications & health products</p>
          </div>
          <Link to="/pharmacy/orders" className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">My orders</Link>
        </div>
      </header>

      <div className="-mt-3 px-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search medicines, vitamins…" className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" />
        </div>

        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setCat(c.key)}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap",
                cat === c.key ? "border-[#1A73E8] bg-[#1A73E8] text-white" : "border-border bg-card text-foreground/70")}>
              {c.label}
            </button>
          ))}
        </div>

        {!hasRx && (
          <div className="mt-3 rounded-xl bg-[#1A73E8]/5 border border-[#1A73E8]/20 p-3 text-xs text-[#1A73E8]">
            No active prescriptions. Rx items will be locked until a doctor issues one.
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          {isLoading && <p className="col-span-2 py-10 text-center text-sm text-muted-foreground">Loading products…</p>}
          {!isLoading && filtered.length === 0 && (
            <div className="col-span-2 rounded-xl border border-dashed border-border bg-surface p-8 text-center">
              <Pill className="mx-auto h-7 w-7 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No products match.</p>
            </div>
          )}
          {filtered.map((p) => {
            const locked = p.requires_rx && !hasRx;
            return (
              <article key={p.id} className="flex flex-col rounded-xl border border-border bg-card p-3">
                <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" /> : <Pill className="h-8 w-8 text-muted-foreground" />}
                </div>
                <div className="mt-2 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold">{p.name}</p>
                  <p className="mt-0.5 font-bold">₦{Number(p.price).toLocaleString()}</p>
                  {p.requires_rx ? (
                    <span className="mt-1 inline-flex rounded-full bg-[#D93025]/10 px-2 py-0.5 text-[10px] font-semibold text-[#D93025]">Rx required</span>
                  ) : (
                    <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{CAT_TAG[p.category] ?? p.category}</span>
                  )}
                </div>
                {locked ? (
                  <Button asChild size="sm" variant="outline" className="mt-2 h-9 rounded-lg border-[#D93025] text-[#D93025]">
                    <Link to="/doctors">Consult a doctor</Link>
                  </Button>
                ) : (
                  <Button onClick={() => addToCart(p)} size="sm" className="mt-2 h-9 rounded-lg bg-[#1A73E8] text-white hover:bg-[#155ec2]">
                    <Plus className="h-4 w-4" /> Add to cart
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4">
          <Link to="/pharmacy/cart" className="mx-auto flex max-w-md items-center justify-between rounded-xl bg-[#1A73E8] px-4 py-3 text-sm font-semibold text-white shadow-lg">
            <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> {cart.count} item{cart.count > 1 ? "s" : ""} · ₦{cart.subtotal.toLocaleString()}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div></MobileShell>
  );
}

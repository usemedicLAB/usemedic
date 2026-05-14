import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Minus, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { MobileShell } from "@/components/mobile-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pharmacy/cart")({
  head: () => ({ meta: [{ title: "Cart — Medic" }] }),
  component: Cart,
});

const DELIVERY_FEE = 1500;

function Cart() {
  const { user } = useAuth();
  const cart = useCart();
  const nav = useNavigate();
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle();
      // Reserved for future prefill from saved addresses
      void data;
    })();
  }, [user]);

  const total = cart.subtotal + (cart.items.length ? DELIVERY_FEE : 0);

  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  const startCheckout = () => {
    if (!user || !cart.items.length) return;
    if (!address.trim()) { toast.error("Add a delivery address"); return; }
    setPayOpen(true);
  };

  const simulatePaystack = async () => {
    if (!user) return;
    setPaying(true);
    try {
      // 1. Create order
      const { data: order, error } = await supabase.from("pharmacy_orders" as any).insert({
        patient_id: user.id,
        subtotal: cart.subtotal,
        delivery_fee: DELIVERY_FEE,
        total,
        delivery_address: address.trim(),
      }).select("id, ref").single();
      if (error) throw error;
      const orderId = (order as any).id;
      const items = cart.items.map((i) => ({ order_id: orderId, product_id: i.id, name: i.name, quantity: i.qty, unit_price: i.price }));
      const { error: ie } = await supabase.from("pharmacy_order_items" as any).insert(items);
      if (ie) throw ie;

      // 2. Simulate Paystack processing delay
      await new Promise((r) => setTimeout(r, 1800));

      // 3. Mark paid
      const ref = `PSK-SIM-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      await supabase.from("pharmacy_orders" as any).update({
        paid_at: new Date().toISOString(),
        status: "out_for_delivery",
        payment_ref: ref,
      } as any).eq("id", orderId);

      cart.clear();
      toast.success(`Payment successful — ${ref}`);
      setPayOpen(false);
      nav({ to: "/pharmacy/orders" });
    } catch (e: any) {
      toast.error(e?.message ?? "Payment failed");
    } finally { setPaying(false); }
  };

  return (
    <MobileShell role="user"><div className="pb-4">
      <header className="bg-[#1A73E8] px-4 pt-6 pb-5 text-white rounded-b-2xl">
        <div className="flex items-center gap-3">
          <Link to="/pharmacy" aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="font-display text-xl font-bold">Cart</h1>
            <p className="text-sm text-white/85">{cart.count} item{cart.count !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-5">
        {cart.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <Button asChild className="mt-3 rounded-xl bg-[#1A73E8] text-white"><Link to="/pharmacy">Browse pharmacy</Link></Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {cart.items.map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
                    {i.image_url ? <img src={i.image_url} alt="" className="h-full w-full rounded-lg object-cover" /> : <span className="text-xs">{i.name.slice(0,2)}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{i.name}</p>
                    <p className="text-xs text-muted-foreground">₦{i.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => cart.setQty(i.id, i.qty - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border"><Minus className="h-3 w-3" /></button>
                    <span className="w-6 text-center text-sm font-semibold">{i.qty}</span>
                    <button onClick={() => cart.setQty(i.id, i.qty + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border"><Plus className="h-3 w-3" /></button>
                    <button onClick={() => cart.remove(i.id)} aria-label="Remove" className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-border bg-card p-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Delivery address</p>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House no, street, area, city" className="h-11" />
            </div>

            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <Row label="Subtotal" value={`₦${cart.subtotal.toLocaleString()}`} />
              <Row label="Delivery" value={`₦${DELIVERY_FEE.toLocaleString()}`} />
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold">₦{total.toLocaleString()}</span>
              </div>
            </div>

            <Button onClick={startCheckout} className="mt-5 h-12 w-full rounded-xl bg-[#1A73E8] text-base font-semibold text-white hover:bg-[#155ec2]">
              Pay ₦{total.toLocaleString()} with Paystack
            </Button>

            {payOpen && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6 sm:items-center">
                <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0BA4DB] text-xs font-bold text-white">P</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Paystack Checkout</p>
                      <p className="text-[11px] text-gray-500">Test / simulated payment</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-sm">
                    <Row label="Amount" value={`₦${total.toLocaleString()}`} />
                    <Row label="Email" value={user?.email ?? "—"} />
                    <Row label="Method" value="Card / Bank / USSD" />
                  </div>
                  <Button onClick={simulatePaystack} disabled={paying} className="mt-4 h-11 w-full rounded-xl bg-[#0BA4DB] text-white hover:bg-[#0892c2]">
                    {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ₦${total.toLocaleString()}`}
                  </Button>
                  <button onClick={() => !paying && setPayOpen(false)} className="mt-2 h-10 w-full rounded-xl text-sm text-gray-600">Cancel</button>
                  <p className="mt-2 text-center text-[10px] text-gray-400">Real Paystack keys can be added later</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div></MobileShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between py-1 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}

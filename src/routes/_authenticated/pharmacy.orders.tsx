import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Package, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/mobile-shell";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { downloadPharmacyReceipt } from "@/lib/pharmacy-receipt";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pharmacy/orders")({
  head: () => ({ meta: [{ title: "Orders — Medic" }] }),
  component: Orders,
});

const STATUS_TONE: Record<string, string> = {
  processing: "bg-yellow-100 text-yellow-800",
  dispatched: "bg-[#1A73E8]/10 text-[#1A73E8]",
  out_for_delivery: "bg-[#1A73E8]/10 text-[#1A73E8]",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-destructive/10 text-destructive",
};

function Orders() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-pharmacy-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("pharmacy_orders" as any)
        .select("id, ref, status, subtotal, delivery_fee, total, delivery_address, paid_at, payment_ref, created_at")
        .eq("patient_id", user!.id)
        .order("created_at", { ascending: false });
      const ids = (orders ?? []).map((o: any) => o.id);
      const { data: items } = ids.length
        ? await supabase.from("pharmacy_order_items" as any).select("order_id, name, quantity, unit_price").in("order_id", ids)
        : { data: [] } as any;
      const byOrder = new Map<string, any[]>();
      (items ?? []).forEach((it: any) => { const arr = byOrder.get(it.order_id) ?? []; arr.push(it); byOrder.set(it.order_id, arr); });
      return (orders ?? []).map((o: any) => ({ ...o, items: byOrder.get(o.id) ?? [] }));
    },
  });

  const handleDownload = async (o: any) => {
    try {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle();
      downloadPharmacyReceipt({
        ref: o.ref,
        status: o.status,
        subtotal: Number(o.subtotal),
        delivery_fee: Number(o.delivery_fee),
        total: Number(o.total),
        delivery_address: o.delivery_address,
        paid_at: o.paid_at,
        payment_ref: o.payment_ref,
        created_at: o.created_at,
        patient_name: profile?.full_name ?? user?.email ?? null,
        patient_email: user?.email ?? null,
        items: (o.items ?? []).map((i: any) => ({ name: i.name, quantity: i.quantity, unit_price: Number(i.unit_price) })),
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate receipt");
    }
  };

  return (
    <MobileShell role="user"><div className="pb-4">
      <header className="bg-[#1A73E8] px-4 pt-6 pb-5 text-white rounded-b-2xl">
        <div className="flex items-center gap-3">
          <Link to="/pharmacy" aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="font-display text-xl font-bold">My orders</h1>
            <p className="text-sm text-white/85">Pharmacy purchases</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-3">
        {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
            <Package className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No orders yet.</p>
          </div>
        )}
        {(data ?? []).map((o: any) => (
          <article key={o.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">#{o.ref}</p>
                <p className="text-sm font-semibold truncate">{(o.items ?? []).map((i: any) => `${i.quantity}× ${i.name}`).join(", ") || "Order"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", STATUS_TONE[o.status] ?? "bg-muted text-muted-foreground")}>{String(o.status).replace(/_/g, " ")}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="font-bold">₦{Number(o.total).toLocaleString()}</p>
              <button
                onClick={() => handleDownload(o)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <Download className="h-3.5 w-3.5" /> Receipt
              </button>
            </div>
          </article>
        ))}
      </div>
    </div></MobileShell>
  );
}

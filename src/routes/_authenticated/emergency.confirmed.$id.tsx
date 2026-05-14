import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Ambulance, Phone, Share2, FileText, CheckCircle2, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MobileShell } from "@/components/mobile-shell";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/emergency/confirmed/$id")({
  head: () => ({ meta: [{ title: "Booking confirmed — Medic" }] }),
  component: Confirmed,
});

const STATUS_LABEL: Record<string, string> = {
  dispatched: "Dispatched",
  en_route: "En Route",
  arrived: "Arrived",
  completed: "Completed",
  cancelled: "Cancelled",
};

function Confirmed() {
  const { id } = useParams({ from: "/_authenticated/emergency/confirmed/$id" });
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const { data } = useQuery({
    queryKey: ["amb-booking", id],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: b, error } = await supabase
        .from("ambulance_bookings" as any)
        .select("id, ref, status, fee, location_text, created_at, unit_id, rating")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      const { data: u } = b ? await supabase.from("ambulance_units" as any).select("unit_name, unit_code, type").eq("id", (b as any).unit_id).maybeSingle() : { data: null } as any;
      return { booking: b as any, unit: u as any };
    },
  });

  const b = data?.booking;
  const u = data?.unit;

  const cancellable = b && b.status !== "cancelled" && b.status !== "completed" &&
    Date.now() - new Date(b.created_at).getTime() < 5 * 60_000;

  useEffect(() => { if (b?.rating) setSubmitted(true); }, [b?.rating]);

  const cancel = async () => {
    const { error } = await supabase.from("ambulance_bookings" as any).update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Booking cancelled"); qc.invalidateQueries({ queryKey: ["amb-booking", id] }); }
  };

  const rate = async (v: number) => {
    setRating(v);
    const { error } = await supabase.from("ambulance_bookings" as any).update({ rating: v }).eq("id", id);
    if (error) toast.error(error.message); else { setSubmitted(true); toast.success("Thanks for rating"); }
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: "Ambulance ETA", url }); else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
  };

  return (
    <MobileShell role="user"><div className="pb-4">
      <header className="bg-[#D93025] px-4 pt-6 pb-5 text-white rounded-b-2xl">
        <h1 className="font-display text-xl font-bold">Booking confirmed</h1>
        <p className="text-sm text-white/85">Ref #{b?.ref ?? "…"}</p>
      </header>

      {b?.status === "arrived" && (
        <div className="mx-4 mt-3 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">
          Ambulance has arrived.
        </div>
      )}

      <div className="px-4 pt-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#D93025]/10">
          <Ambulance className="h-10 w-10 text-[#D93025]" />
        </div>
        <p className="mt-3 font-display text-lg font-bold">Ambulance on its way</p>
        <p className="text-sm text-muted-foreground">{u?.unit_name ?? "Unit"} · {u?.unit_code ?? ""}</p>
      </div>

      <div className="mt-5 px-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <Row label="Pickup" value={b?.location_text ?? "—"} />
          <Row label="Unit ID" value={u?.unit_code ?? "—"} />
          <Row label="Fee" value={`₦${Number(b?.fee ?? 0).toLocaleString()}`} />
          <Row label="Status" value={
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              b?.status === "completed" ? "bg-emerald-100 text-emerald-700" :
              b?.status === "cancelled" ? "bg-destructive/10 text-destructive" :
              "bg-[#D93025]/10 text-[#D93025]",
            )}>{STATUS_LABEL[b?.status ?? ""] ?? "—"}</span>
          } />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <a href="tel:112" className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-xs">
            <Phone className="h-5 w-5 text-[#D93025]" /> Call driver
          </a>
          <button onClick={share} className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-xs">
            <Share2 className="h-5 w-5 text-[#D93025]" /> Share ETA
          </button>
          <button className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-xs">
            <FileText className="h-5 w-5 text-[#D93025]" /> Receipt
          </button>
        </div>

        {b?.status === "completed" && (
          <div className="mt-5 rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-sm font-semibold">How was your trip?</p>
            <div className="mt-2 flex justify-center gap-2">
              {[1,2,3,4,5].map((v) => (
                <button key={v} onClick={() => rate(v)} disabled={submitted} aria-label={`${v} star`}>
                  <Star className={cn("h-7 w-7", (submitted ? (b.rating ?? rating) : rating) >= v ? "fill-[#D93025] text-[#D93025]" : "text-muted-foreground/40")} />
                </button>
              ))}
            </div>
            {submitted && <p className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Thanks!</p>}
          </div>
        )}

        {cancellable && (
          <Button onClick={cancel} variant="outline" className="mt-5 h-12 w-full rounded-xl border-[#D93025] text-[#D93025] hover:bg-[#D93025]/5">
            <X className="h-4 w-4" /> Cancel booking
          </Button>
        )}

        <Link to="/emergency" className="mt-3 block text-center text-xs text-muted-foreground">Back to emergency</Link>
      </div>
    </div></MobileShell>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0 last:pb-0 first:pt-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

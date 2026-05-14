import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Ambulance, MapPin, Pencil, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MobileShell } from "@/components/mobile-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/emergency/")({
  head: () => ({ meta: [{ title: "Emergency — Medic" }] }),
  component: Emergency,
});

const TYPE_LABEL: Record<string, string> = {
  basic_life_support: "Basic Life Support",
  advanced_life_support: "Advanced Life Support",
  patient_transport: "Patient Transport",
};

function Emergency() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>("Detecting location…");
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) { setAddress("Location unavailable — enter manually"); setEditing(true); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`, {
            headers: { Accept: "application/json" },
          });
          const j = await r.json();
          const a = j.address ?? {};
          const parts = [a.suburb || a.neighbourhood || a.village || a.town, a.city || a.state].filter(Boolean);
          setAddress(parts.join(", ") || j.display_name || "Current location");
        } catch { setAddress(`${latitude.toFixed(3)}, ${longitude.toFixed(3)}`); }
      },
      () => { setAddress("Location unavailable — enter manually"); setEditing(true); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const { data: units, isLoading } = useQuery({
    queryKey: ["amb-units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambulance_units" as any)
        .select("id, unit_name, unit_code, type, price, status")
        .order("status", { ascending: true })
        .order("price", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const sortedUnits = (units ?? []).slice().sort((a, b) => {
    if (a.status === b.status) return Number(a.price) - Number(b.price);
    return a.status === "available" ? -1 : 1;
  });

  const selectedUnit = sortedUnits.find((u) => u.id === selected);

  const submit = async () => {
    if (!user || !selectedUnit) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from("ambulance_bookings" as any).insert({
        patient_id: user.id,
        unit_id: selectedUnit.id,
        location_text: address,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        fee: Number(selectedUnit.price ?? 0),
      }).select("id").single();
      if (error) throw error;
      toast.success("Ambulance dispatched");
      nav({ to: "/emergency/confirmed/$id", params: { id: (data as any).id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not book");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  return (
    <MobileShell role="user">
    <div className="pb-4">
      <header className="-mx-0 bg-[#D93025] px-4 pt-6 pb-5 text-white rounded-b-2xl">
        <h1 className="font-display text-xl font-bold">Request ambulance</h1>
        <p className="text-sm text-white/85">Available units near you</p>
      </header>

      <div className="-mt-3 px-4">
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#D93025]" />
            {editing ? (
              <Input autoFocus value={address} onChange={(e) => setAddress(e.target.value)} onBlur={() => setEditing(false)} className="h-8" />
            ) : (
              <button onClick={() => setEditing(true)} className="flex flex-1 items-center justify-between gap-2 text-left">
                <span className="truncate text-sm font-medium">{address}</span>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading units…</p>}
          {!isLoading && sortedUnits.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
              <Ambulance className="mx-auto h-7 w-7 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No ambulance units available right now.</p>
            </div>
          )}
          {sortedUnits.map((u) => {
            const isSel = u.id === selected;
            const busyU = u.status === "busy";
            return (
              <button
                key={u.id}
                onClick={() => setSelected(u.id)}
                className={cn(
                  "block w-full rounded-xl border bg-card p-4 text-left transition",
                  isSel ? "border-2 border-[#D93025]" : "border-border",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{TYPE_LABEL[u.type] ?? u.unit_name}</p>
                    <p className="text-xs text-muted-foreground">Unit {u.unit_code} · {u.unit_name}</p>
                    <p className="mt-1 font-bold">₦{Number(u.price ?? 0).toLocaleString()}</p>
                  </div>
                  {busyU ? (
                    <span className="rounded-full bg-yellow-100 px-2 py-1 text-[11px] font-semibold text-yellow-800">Busy · ~15 min</span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">Available</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedUnit && (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4">
          <div className="mx-auto max-w-md">
            <Button onClick={() => setConfirmOpen(true)} className="h-12 w-full rounded-xl bg-[#D93025] text-base font-semibold text-white hover:bg-[#b8261d]">
              Book — {TYPE_LABEL[selectedUnit.type]}
            </Button>
          </div>
        </div>
      )}

      <Sheet open={confirmOpen} onOpenChange={setConfirmOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Confirm booking</SheetTitle>
          </SheetHeader>
          {selectedUnit && (
            <div className="space-y-3 py-2">
              {selectedUnit.status === "busy" && (
                <div className="flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-xs text-yellow-900">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  This unit is currently busy. ETA may be longer than usual.
                </div>
              )}
              <p className="text-sm">
                Confirm booking to <span className="font-semibold">{address}</span> for <span className="font-semibold">₦{Number(selectedUnit.price).toLocaleString()}</span>?
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                <Button onClick={submit} disabled={busy} className="flex-1 h-12 rounded-xl bg-[#D93025] text-white hover:bg-[#b8261d]">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
    </MobileShell>
  );
}

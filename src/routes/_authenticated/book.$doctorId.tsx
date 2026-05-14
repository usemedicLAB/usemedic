import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { MessageCircle, Phone, Video, MapPin, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/book/$doctorId")({
  head: () => ({ meta: [{ title: "Book — Medic" }] }),
  component: Book,
});

const MODES = [
  { key: "chat", label: "Chat", Icon: MessageCircle },
  { key: "voice", label: "Voice", Icon: Phone },
  { key: "video", label: "Video", Icon: Video },
  { key: "in_person", label: "In-person", Icon: MapPin },
] as const;

function Book() {
  const { doctorId } = useParams({ from: "/_authenticated/book/$doctorId" });
  const { user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<typeof MODES[number]["key"]>("video");
  const [dayOffset, setDayOffset] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["doctor-book", doctorId],
    queryFn: async () => {
      const { data: dp, error: dpError } = await supabase.from("doctor_profiles").select("fee").eq("user_id", doctorId).eq("kyc_status", "approved").maybeSingle();
      if (dpError) throw dpError;
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", doctorId).maybeSingle();
      const { data: av } = await supabase.from("doctor_availability").select("weekday, start_time, end_time").eq("doctor_id", doctorId);
      return { dp: dp ? { ...dp, profile } : null, av: av ?? [] };
    },
  });

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  }), []);

  const { data: bookedSlotsData } = useQuery({
    queryKey: ["doctor-booked-slots", doctorId, dayOffset],
    queryFn: async () => {
      const day = days[dayOffset];
      const dateStr = day.toISOString().split('T')[0];
      const { data, error } = await supabase.rpc("get_doctor_booked_slots", { p_doctor_id: doctorId, p_date: dateStr });
      if (error) return [];
      return data.map((r: any) => r.scheduled_time.slice(0, 5));
    },
    enabled: !!doctorId && !!days[dayOffset],
  });

  const bookedSlots = useMemo(() => new Set<string>(bookedSlotsData ?? []), [bookedSlotsData]);

  const slots = useMemo(() => {
    const day = days[dayOffset]; if (!day) return [];
    const wd = day.getDay();
    const ranges = (data?.av ?? []).filter((a: any) => a.weekday === wd);
    if (!ranges.length) {
      // Sensible default: 9-12 and 14-17 in 30 min slots
      const defaults = ["09:00","09:30","10:00","10:30","11:00","11:30","14:00","14:30","15:00","15:30","16:00","16:30"];
      return defaults.filter(t => !bookedSlots.has(t));
    }
    const out: string[] = [];
    for (const r of ranges) {
      const [sh, sm] = r.start_time.split(":").map(Number);
      const [eh, em] = r.end_time.split(":").map(Number);
      let mins = sh * 60 + sm; const end = eh * 60 + em;
      while (mins + 30 <= end) {
        const timeStr = `${String(Math.floor(mins/60)).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`;
        if (!bookedSlots.has(timeStr)) {
          out.push(timeStr);
        }
        mins += 30;
      }
    }
    return out;
  }, [days, dayOffset, data, bookedSlots]);

  const submit = async () => {
    if (!user || !slot) return;
    setBusy(true);
    try {
      const day = days[dayOffset];
      const [hh, mm] = slot.split(":").map(Number);
      const dt = new Date(day); dt.setHours(hh, mm, 0, 0);
      const { error } = await supabase.from("appointments").insert({
        patient_id: user.id, doctor_id: doctorId, mode, scheduled_at: dt.toISOString(),
        reason: reason || null, fee: Number((data?.dp as any)?.fee ?? 0),
      });
      if (error) throw error;
      toast.success("Appointment booked");
      nav({ to: "/appointments" });
    } catch (e: any) { toast.error(e.message ?? "Failed to book"); } finally { setBusy(false); }
  };

  return (
    <MobileShell role="user">
      <PageHeader title="Book a visit" subtitle={(data?.dp as any)?.profile?.full_name ?? ""} />
      <div className="px-5 pt-5 pb-32 space-y-6">
        {/* Mode */}
        <section>
          <p className="mb-2 text-sm font-semibold">Consultation type</p>
          <div className="grid grid-cols-4 gap-2">
            {MODES.map(({ key, label, Icon }) => (
              <button key={key} type="button" onClick={() => setMode(key)}
                className={cn("flex flex-col items-center gap-1 rounded-2xl border p-3 transition",
                  mode === key ? "border-primary bg-primary-soft text-primary-deep" : "border-border bg-card text-muted-foreground")}>
                <Icon className="h-4 w-4" /><span className="text-[11px] font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Date */}
        <section>
          <p className="mb-2 text-sm font-semibold">Choose a day</p>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {days.map((d, i) => {
              const isActive = i === dayOffset;
              return (
                <button key={i} type="button" onClick={() => { setDayOffset(i); setSlot(null); }}
                  className={cn("min-w-[60px] rounded-2xl border p-3 text-center",
                    isActive ? "border-primary bg-primary text-white" : "border-border bg-card")}>
                  <p className="text-[10px] uppercase">{d.toLocaleDateString(undefined, { weekday: "short" })}</p>
                  <p className="text-base font-bold">{d.getDate()}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Slot */}
        <section>
          <p className="mb-2 text-sm font-semibold">Pick a time</p>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slots this day.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((t) => (
                <button key={t} type="button" onClick={() => setSlot(t)}
                  className={cn("rounded-xl border py-2 text-xs font-semibold",
                    slot === t ? "border-primary bg-primary text-white" : "border-border bg-card")}>{t}</button>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="mb-2 text-sm font-semibold">Reason for visit (optional)</p>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-20 rounded-xl" placeholder="Briefly describe your symptoms" />
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-20 z-30 px-5">
        <div className="mx-auto max-w-md rounded-2xl bg-card p-3 shadow-[var(--shadow-card)] flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">{slot ? <span className="text-foreground font-semibold">{days[dayOffset].toDateString()} · {slot}</span> : "Select a time"}</div>
          <Button onClick={submit} disabled={!slot || busy} variant="hero" size="lg" className="rounded-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirm
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}

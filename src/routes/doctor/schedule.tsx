import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/doctor/schedule")({
  head: () => ({ meta: [{ title: "Schedule — Medic" }] }),
  component: Schedule,
});

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function Schedule() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ weekday: 1, start_time: "09:00", end_time: "17:00" });

  const { data } = useQuery({
    queryKey: ["my-availability"],
    queryFn: async () => {
      const { data } = await supabase.from("doctor_availability").select("id, weekday, start_time, end_time").eq("doctor_id", user!.id).order("weekday");
      return data ?? [];
    },
    enabled: !!user,
  });

  const add = async () => {
    const { error } = await supabase.from("doctor_availability").insert({ ...draft, doctor_id: user!.id });
    if (error) toast.error(error.message); else { toast.success("Slot added"); qc.invalidateQueries({ queryKey: ["my-availability"] }); }
  };
  const del = async (id: string) => {
    const { error } = await supabase.from("doctor_availability").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["my-availability"] });
  };

  return (
    <MobileShell role="doctor">
      <PageHeader title="Schedule" subtitle="Set your weekly availability" />
      <div className="px-5 pt-5 pb-6 space-y-5">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => setDraft({ ...draft, weekday: i })} className={`rounded-lg py-2 text-xs font-semibold ${draft.weekday===i?"bg-primary text-white":"bg-muted text-muted-foreground"}`}>{d}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs">From</label><Input type="time" value={draft.start_time} onChange={(e) => setDraft({ ...draft, start_time: e.target.value })} className="mt-1 h-11 rounded-xl" /></div>
            <div><label className="text-xs">To</label><Input type="time" value={draft.end_time} onChange={(e) => setDraft({ ...draft, end_time: e.target.value })} className="mt-1 h-11 rounded-xl" /></div>
          </div>
          <Button onClick={add} variant="hero" className="w-full rounded-full"><Plus className="h-4 w-4" /> Add slot</Button>
        </div>

        <div className="space-y-2">
          {(data ?? []).length === 0 && <p className="text-center text-sm text-muted-foreground">No availability set yet.</p>}
          {data?.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
              <div>
                <p className="font-semibold">{DAYS[s.weekday]}</p>
                <p className="text-xs text-muted-foreground">{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</p>
              </div>
              <button onClick={() => del(s.id)} aria-label="Delete" className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}

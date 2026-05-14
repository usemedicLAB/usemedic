import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, Plus, MessageCircle, Video, Phone, MapPin, X, CreditCard, CheckCircle2, Star } from "lucide-react";
import { toast } from "sonner";
import { createCheckout } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({ meta: [{ title: "Appointments — Medic" }] }),
  component: Appointments,
});

const MODE_ICON: Record<string, any> = { chat: MessageCircle, voice: Phone, video: Video, in_person: MapPin };

function Appointments() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [paying, setPaying] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<{ apptId: string; doctorId: string; doctorName: string } | null>(null);
  const checkoutFn = useServerFn(createCheckout);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "1") toast.success("Payment received");
    else if (params.get("paid") === "0") toast.message("Payment cancelled");
  }, []);

  const pay = async (apptId: string) => {
    setPaying(apptId);
    try {
      const res = await checkoutFn({ data: { appointmentId: apptId } });
      if (res?.url) window.location.href = res.url;
    } catch (e: any) {
      toast.error(e?.message ?? "Payment failed to start");
    } finally {
      setPaying(null);
    }
  };

  const { data: items, isLoading } = useQuery({
    queryKey: ["my-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_appointments");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: myReviews } = useQuery({
    queryKey: ["my-reviews", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("appointment_id").eq("patient_id", user!.id);
      return new Set(((data ?? []) as Array<{ appointment_id: string | null }>).map((r) => r.appointment_id).filter(Boolean) as string[]);
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`appts:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => qc.invalidateQueries({ queryKey: ["my-appointments"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const now = Date.now();
  const filtered = (items ?? []).filter((a: any) => {
    const t = new Date(a.scheduled_at).getTime();
    return tab === "upcoming" ? t >= now - 30 * 60_000 && a.status !== "cancelled" : t < now - 30 * 60_000 || a.status === "completed";
  });

  const join = async (apptId: string) => {
    const { data, error } = await supabase.rpc("get_or_create_consultation", { _appointment_id: apptId });
    if (error) { toast.error(error.message); return; }
    nav({ to: "/consultations/$id", params: { id: data as string } });
  };

  const cancel = async (apptId: string) => {
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", apptId);
    if (error) toast.error(error.message); else { toast.success("Cancelled"); qc.invalidateQueries({ queryKey: ["my-appointments"] }); }
  };

  return (
    <MobileShell role="user">
      <PageHeader title="Appointments" subtitle="Upcoming and past visits" right={
        <Button variant="hero" size="sm" asChild><Link to="/doctors"><Plus className="h-4 w-4" /> Book</Link></Button>
      } />
      <div className="px-5 pt-5">
        <div className="flex rounded-full bg-muted p-1">
          {(["upcoming","past"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-full py-2 text-xs font-semibold capitalize ${tab===t?"bg-card shadow":""}`}>{t}</button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <Calendar className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">No {tab} appointments.</p>
              <Button asChild variant="hero" className="mt-4 rounded-full"><Link to="/doctors">Find a doctor</Link></Button>
            </div>
          )}
          {filtered.map((a: any) => {
            const Icon = MODE_ICON[a.mode] ?? Video;
            const dt = new Date(a.scheduled_at);
            const canJoin = tab === "upcoming" && a.status !== "cancelled";
            const isPast = tab === "past";
            const reviewed = myReviews?.has(a.id);
            return (
              <article key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.doctor_name ?? "Doctor"}</p>
                    <p className="text-xs text-muted-foreground">{a.specialty ?? "Consultation"} · {a.mode.replace("_", " ")}</p>
                    <p className="mt-1 text-xs">{dt.toLocaleString()}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.status === "scheduled" ? "bg-primary-soft text-primary-deep" : a.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>{a.status}</span>
                </div>
                {canJoin && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    {Number(a.fee ?? 0) > 0 && (
                      a.paid_at ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Paid
                        </span>
                      ) : (
                        <Button onClick={() => pay(a.id)} disabled={paying === a.id} size="sm" variant="outline" className="rounded-full">
                          <CreditCard className="h-3.5 w-3.5" /> Pay ₦{Number(a.fee).toLocaleString()}
                        </Button>
                      )
                    )}
                    <Button onClick={() => join(a.id)} variant="hero" size="sm" className="flex-1 rounded-full">Join</Button>
                    <Button onClick={() => cancel(a.id)} variant="outline" size="sm" className="rounded-full"><X className="h-3.5 w-3.5" /> Cancel</Button>
                  </div>
                )}
                {isPast && a.status !== "cancelled" && (
                  <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                    {reviewed ? (
                      <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary-deep">
                        <Star className="h-3 w-3 fill-primary-deep" /> Reviewed
                      </span>
                    ) : (
                      <Button
                        onClick={() => setReviewing({ apptId: a.id, doctorId: a.doctor_id, doctorName: a.doctor_name ?? "Doctor" })}
                        variant="hero" size="sm" className="flex-1 rounded-full"
                      >
                        <Star className="h-3.5 w-3.5" /> Leave a review
                      </Button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      <ReviewDialog
        open={!!reviewing}
        onOpenChange={(v) => !v && setReviewing(null)}
        target={reviewing}
        onSubmitted={() => {
          setReviewing(null);
          if (user) qc.invalidateQueries({ queryKey: ["my-reviews", user.id] });
        }}
      />
    </MobileShell>
  );
}

function ReviewDialog({ open, onOpenChange, target, onSubmitted }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: { apptId: string; doctorId: string; doctorName: string } | null;
  onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setRating(5); setComment(""); } }, [open]);

  const submit = async () => {
    if (!user || !target) return;
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      doctor_id: target.doctorId,
      patient_id: user.id,
      appointment_id: target.apptId,
      rating,
      comment: comment.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks for your review!");
    onSubmitted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Review {target?.doctorName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Your rating</p>
            <div className="mt-2 flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} type="button" onClick={() => setRating(v)} aria-label={`${v} star`}>
                  <Star className={`h-8 w-8 ${v <= rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Comment (optional)</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              placeholder="How was your consultation?"
              className="mt-2 min-h-24 rounded-xl"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy} className="rounded-full">Cancel</Button>
          <Button variant="hero" onClick={submit} disabled={busy} className="rounded-full">Submit review</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

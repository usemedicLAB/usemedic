import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, X, ChevronRight, FileText } from "lucide-react";
import { decideDoctorSubmission, listDoctorSubmissions } from "@/lib/admin-doctors.functions";

export const Route = createFileRoute("/admin/doctors")({
  head: () => ({ meta: [{ title: "KYC review — Medic" }] }),
  component: KycReview,
});

function KycReview() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const listSubmissions = useServerFn(listDoctorSubmissions);
  const decideSubmission = useServerFn(decideDoctorSubmission);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-doctors", filter],
    queryFn: async () => {
      return listSubmissions({ data: { status: filter } });
    },
  });

  const submissions = Array.isArray(data) ? data : [];

  const decide = useMutation({
    mutationFn: async ({ userId, status, note }: { userId: string; status: "approved" | "rejected"; note?: string }) => {
      return decideSubmission({ data: { userId, status, note } });
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-doctors"] }); },
    onError: (e: any) => toast.error(e.message),
  });


  return (
    <MobileShell role="admin">
      <PageHeader title="KYC review" subtitle="Approve or reject doctor submissions" />
      <div className="px-5 pt-5">
        <div className="flex gap-2">
          {(["pending", "approved", "rejected"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && error && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
              <p className="text-sm text-muted-foreground">Could not load KYC submissions. Please make sure you are signed in as admin.</p>
            </div>
          )}
          {!isLoading && !error && submissions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
              <p className="text-sm text-muted-foreground">No {filter} submissions.</p>
            </div>
          )}
          {submissions.map((d: any) => (
            <article key={d.user_id} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{d.profile?.full_name ?? "Doctor"}</p>
                  <p className="text-xs text-muted-foreground">{d.specialty ?? "—"} · {d.years_exp ?? 0}y · ₦{Number(d.fee ?? 0).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-muted-foreground">License: {d.license_number ?? "—"} · {d.location ?? "—"}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary"><FileText className="h-3 w-3" /> {d.document_count ?? 0} document{(d.document_count ?? 0) === 1 ? "" : "s"}</p>
                  {d.bio && <p className="mt-2 text-xs">{d.bio}</p>}
                </div>
                <Link to="/admin/doctors/$userId" params={{ userId: d.user_id }} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                  Review <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {filter === "pending" && (
                <>
                  <Textarea
                    placeholder="Optional note (shown to doctor if rejected)"
                    value={notes[d.user_id] ?? ""}
                    onChange={(e) => setNotes((s) => ({ ...s, [d.user_id]: e.target.value }))}
                    className="mt-3 min-h-16 rounded-xl text-xs"
                  />
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="hero" className="flex-1" disabled={decide.isPending} onClick={() => decide.mutate({ userId: d.user_id, status: "approved" })}>
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={decide.isPending} className="flex-1 text-destructive hover:bg-destructive/10" onClick={() => {
                      if (!notes[d.user_id]?.trim()) { toast.error("Add a note explaining the rejection"); return; }
                      decide.mutate({ userId: d.user_id, status: "rejected", note: notes[d.user_id] });
                    }}>
                      <X className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </>
              )}
              {filter === "rejected" && d.kyc_notes && (
                <p className="mt-2 rounded-xl bg-destructive/10 p-2 text-xs text-destructive">{d.kyc_notes}</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}

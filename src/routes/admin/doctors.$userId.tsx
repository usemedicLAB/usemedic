import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Check, X, FileText, ExternalLink, BadgeCheck, Clock3, AlertTriangle } from "lucide-react";
import { decideDoctorSubmission, getDoctorSubmission } from "@/lib/admin-doctors.functions";

export const Route = createFileRoute("/admin/doctors/$userId")({
  head: () => ({ meta: [{ title: "Doctor submission — Medic" }] }),
  component: DoctorDetail,
});

type Doc = { id: string; type: string; file_path: string; uploaded_at: string; signedUrl?: string | null };

function DoctorDetail() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const getSubmission = useServerFn(getDoctorSubmission);
  const decideSubmission = useServerFn(decideDoctorSubmission);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-doctor", userId],
    queryFn: async () => {
      return getSubmission({ data: { userId } }) as Promise<{ doctor: any; profile: any; docs: Doc[] }>;
    },
  });

  useEffect(() => { if (data?.doctor?.kyc_notes) setNote(data.doctor.kyc_notes); }, [data?.doctor?.kyc_notes]);

  const decide = useMutation({
    mutationFn: async (status: "approved" | "rejected") => {
      return decideSubmission({ data: { userId, status, note } });
    },
    onSuccess: (_, status) => {
      toast.success(status === "approved" ? "Doctor approved" : "Submission rejected");
      qc.invalidateQueries({ queryKey: ["admin-doctors"] });
      qc.invalidateQueries({ queryKey: ["admin-doctor", userId] });
      navigate({ to: "/admin/doctors" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const status = data?.doctor?.kyc_status as "pending" | "approved" | "rejected" | undefined;
  const StatusIcon = status === "approved" ? BadgeCheck : status === "rejected" ? AlertTriangle : Clock3;
  const statusTone =
    status === "approved" ? "bg-emerald-500/10 text-emerald-600"
    : status === "rejected" ? "bg-destructive/10 text-destructive"
    : "bg-amber-500/10 text-amber-600";

  return (
    <MobileShell role="admin">
      <PageHeader title="Submission" subtitle="Full KYC details" />
      <div className="px-5 pt-3">
        <Link to="/admin/doctors" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to KYC list
        </Link>
      </div>

      <div className="px-5 pt-4 pb-6 space-y-4">
        {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}

        {!isLoading && !data?.doctor && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
            <p className="text-sm text-muted-foreground">Submission not found.</p>
          </div>
        )}

        {data?.doctor && (
          <>
            {/* Header card */}
            <article className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-3">
                {data.profile?.avatar_url ? (
                  <img src={data.profile.avatar_url} alt={data.profile?.full_name ?? "Doctor"} className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{data.profile?.full_name ?? "Doctor"}</p>
                  <p className="truncate text-xs text-muted-foreground">{data.doctor.specialty ?? "—"}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone}`}>
                  <StatusIcon className="h-3 w-3" /> {status}
                </span>
              </div>
            </article>

            {/* Details */}
            <article className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
              <h3 className="text-sm font-semibold">Professional details</h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <Field label="License" value={data.doctor.license_number} />
                <Field label="Years exp." value={data.doctor.years_exp != null ? `${data.doctor.years_exp}y` : null} />
                <Field label="Fee" value={data.doctor.fee != null ? `₦${Number(data.doctor.fee).toLocaleString()}` : null} />
                <Field label="Location" value={data.doctor.location} />
                <Field label="Phone" value={data.profile?.phone} />
                <Field label="Languages" value={(data.doctor.languages ?? []).join(", ") || null} />
              </dl>
              {data.doctor.bio && (
                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Bio</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs">{data.doctor.bio}</p>
                </div>
              )}
            </article>

            {/* Documents */}
            <article className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
              <h3 className="text-sm font-semibold">Documents ({data.docs.length})</h3>
              {data.docs.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No documents uploaded.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {data.docs.map((d) => {
                    const isImage = /\.(png|jpe?g|webp|gif)$/i.test(d.file_path);
                    const isPdf = /\.pdf$/i.test(d.file_path);
                    return (
                      <li key={d.id} className="rounded-xl border border-border bg-surface p-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium capitalize">{d.type.replace(/_/g, " ")}</p>
                            <p className="truncate text-[10px] text-muted-foreground">{d.file_path.split("/").pop()}</p>
                          </div>
                          {d.signedUrl && (
                            <a href={d.signedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                              Open <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        {d.signedUrl && isImage && (
                          <a href={d.signedUrl} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-lg">
                            <img src={d.signedUrl} alt={d.type} className="max-h-72 w-full object-contain bg-black/5" />
                          </a>
                        )}
                        {d.signedUrl && isPdf && (
                          <iframe src={d.signedUrl} title={d.type} className="mt-2 h-72 w-full rounded-lg border border-border bg-white" />
                        )}
                        {d.signedUrl && !isImage && !isPdf && (
                          <a href={d.signedUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary">
                            <FileText className="h-3 w-3" /> View file
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>

            {/* Decision */}
            <article className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
              <h3 className="text-sm font-semibold">Decision</h3>
              <Textarea
                placeholder="Reason / note (required when rejecting, shown to the doctor)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-3 min-h-20 rounded-xl text-xs"
              />
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="hero" className="flex-1" disabled={decide.isPending} onClick={() => decide.mutate("approved")}>
                  <Check className="h-4 w-4" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-destructive hover:bg-destructive/10"
                  disabled={decide.isPending}
                  onClick={() => {
                    if (!note.trim()) { toast.error("Add a note explaining the rejection"); return; }
                    decide.mutate("rejected");
                  }}
                >
                  <X className="h-4 w-4" /> Reject
                </Button>
              </div>
            </article>
          </>
        )}
      </div>
    </MobileShell>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-xl bg-surface p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-xs font-medium">{value ?? "—"}</p>
    </div>
  );
}

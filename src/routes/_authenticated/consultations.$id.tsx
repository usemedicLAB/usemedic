import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Send, Phone, Video, FileText, Paperclip, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConsultationCall } from "@/components/consultation-call";

export const Route = createFileRoute("/_authenticated/consultations/$id")({
  head: () => ({ meta: [{ title: "Consultation — Medic" }] }),
  component: Thread,
});

function Thread() {
  const { id } = useParams({ from: "/_authenticated/consultations/$id" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [callOpen, setCallOpen] = useState<null | "voice" | "video">(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const autoStarted = useRef(false);

  const { data: ctx } = useQuery({
    queryKey: ["consult-ctx", id],
    queryFn: async () => {
      const { data: c } = await supabase.from("consultations").select("appointment_id").eq("id", id).maybeSingle();
      if (!c) return null;
      const { data: a } = await supabase.from("appointments").select("doctor_id, patient_id, mode").eq("id", c.appointment_id).maybeSingle();
      const otherId = a?.doctor_id === user?.id ? a?.patient_id : a?.doctor_id;
      const { data: p } = otherId ? await supabase.from("profiles").select("full_name").eq("id", otherId).maybeSingle() : { data: null } as any;
      const { data: rxs } = await supabase.from("prescriptions").select("id, items, issued_at").eq("consultation_id", id).order("issued_at", { ascending: false });
      return { other: p?.full_name ?? "Participant", mode: a?.mode, rxs: rxs ?? [] };
    },
    enabled: !!user,
  });

  const { data: messages } = useQuery({
    queryKey: ["consult-msgs", id],
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("id, sender_id, body, created_at, attachments").eq("consultation_id", id).order("created_at");
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`msgs:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `consultation_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["consult-msgs", id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Auto-launch the right room based on appointment mode
  useEffect(() => {
    if (autoStarted.current || !ctx?.mode) return;
    if (ctx.mode === "video" || ctx.mode === "voice") {
      autoStarted.current = true;
      setCallOpen(ctx.mode);
    } else {
      autoStarted.current = true; // chat / in_person stay on the message thread
    }
  }, [ctx?.mode]);

  const send = async () => {
    const body = text.trim(); if (!body || !user) return;
    setText("");
    const { error } = await supabase.from("messages").insert({ consultation_id: id, sender_id: user.id, body });
    if (error) toast.error(error.message);
  };

  const sendFile = async (file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10 MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
      const att = [{ url: data.publicUrl, name: file.name, type: file.type, size: file.size }];
      const { error } = await supabase.from("messages").insert({ consultation_id: id, sender_id: user.id, body: "", attachments: att });
      if (error) throw error;
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/95 backdrop-blur px-4 py-3">
        <Link to="/consultations" aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{ctx?.other ?? "Loading…"}</p>
          <p className="text-[11px] text-muted-foreground">{ctx?.mode ?? "consultation"}</p>
        </div>
        <button aria-label="Voice" onClick={() => setCallOpen("voice")} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary"><Phone className="h-4 w-4" /></button>
        <button aria-label="Video" onClick={() => setCallOpen("video")} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary"><Video className="h-4 w-4" /></button>
      </header>

      {/* Prescriptions banner */}
      {(ctx?.rxs?.length ?? 0) > 0 && (
        <div className="border-b border-border bg-primary-soft/40 px-4 py-2 text-xs">
          <p className="font-semibold text-primary-deep flex items-center gap-1"><FileText className="h-3 w-3" /> {ctx?.rxs.length} prescription(s) issued</p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {(messages ?? []).length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">No messages yet. Say hello 👋</p>
        )}
        {messages?.map((m: any) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[78%] rounded-2xl px-3 py-2 text-sm", mine ? "bg-primary text-primary-foreground" : "bg-card border border-border")}>
                {(m.attachments ?? []).map((a: any, i: number) => (
                  <a key={i} href={a.url} target="_blank" rel="noreferrer" className="mb-1 block">
                    {a.type?.startsWith("image/")
                      ? <img src={a.url} alt={a.name} className="max-h-56 rounded-lg" />
                      : <span className="flex items-center gap-2 rounded-lg bg-black/10 px-2 py-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> {a.name}</span>}
                  </a>
                ))}
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                <p className={cn("mt-0.5 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 border-t border-border bg-card px-3 py-3">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2">
          <button type="button" aria-label="Attach" disabled={uploading} onClick={() => fileRef.current?.click()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground disabled:opacity-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) sendFile(f); }} />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" className="h-11 rounded-full" />
          <Button type="submit" variant="hero" size="icon" className="h-11 w-11 rounded-full"><Send className="h-4 w-4" /></Button>
        </form>
      </div>

      {callOpen && (
        <ConsultationCall roomName={`medic-consultation-${id}`} mode={callOpen} participantName={ctx?.other ?? "Participant"} onEnd={() => setCallOpen(null)} />
      )}
    </div>
  );
}

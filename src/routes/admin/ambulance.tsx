import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/ambulance")({
  head: () => ({ meta: [{ title: "Ambulance fleet — Admin" }] }),
  component: AdminAmbulance,
});

const TYPES = [
  { v: "basic_life_support", l: "Basic Life Support" },
  { v: "advanced_life_support", l: "Advanced Life Support" },
  { v: "patient_transport", l: "Patient Transport" },
];

function AdminAmbulance() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ unit_name: "", unit_code: "", type: "basic_life_support", price: "" });

  const { data: units, isLoading } = useQuery({
    queryKey: ["admin-amb-units"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ambulance_units" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const create = async () => {
    if (!form.unit_name || !form.unit_code) { toast.error("Name and code required"); return; }
    const { error } = await supabase.from("ambulance_units" as any).insert({
      unit_name: form.unit_name, unit_code: form.unit_code, type: form.type, price: Number(form.price || 0),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Unit added");
    setOpen(false); setForm({ unit_name: "", unit_code: "", type: "basic_life_support", price: "" });
    qc.invalidateQueries({ queryKey: ["admin-amb-units"] });
  };

  const toggle = async (id: string, status: string) => {
    const next = status === "available" ? "busy" : "available";
    const { error } = await supabase.from("ambulance_units" as any).update({ status: next }).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-amb-units"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this unit?")) return;
    const { error } = await supabase.from("ambulance_units" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-amb-units"] });
  };

  return (
    <MobileShell role="admin">
      <PageHeader title="Ambulance fleet" subtitle="Manage units & availability" right={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full bg-[#D93025] text-white hover:bg-[#b8261d]"><Plus className="h-4 w-4" /> Add</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>New ambulance unit</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Unit name</Label><Input value={form.unit_name} onChange={(e) => setForm({ ...form, unit_name: e.target.value })} placeholder="Med-Rescue 01" /></div>
              <div><Label>Unit ID</Label><Input value={form.unit_code} onChange={(e) => setForm({ ...form, unit_code: e.target.value })} placeholder="AMB-001" /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Price (₦)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="15000" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={create} className="bg-[#D93025] text-white hover:bg-[#b8261d]">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      <div className="px-5 pt-5 space-y-3">
        {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (units?.length ?? 0) === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted-foreground">No units yet.</div>
        )}
        {(units ?? []).map((u) => (
          <div key={u.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{u.unit_name}</p>
                <p className="text-xs text-muted-foreground">{u.unit_code} · {(TYPES.find((t) => t.v === u.type)?.l) ?? u.type}</p>
                <p className="mt-1 font-bold">₦{Number(u.price).toLocaleString()}</p>
              </div>
              <button onClick={() => remove(u.id)} aria-label="Delete" className="text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">{u.status === "available" ? "Available" : "Busy"}</span>
              <Switch checked={u.status === "available"} onCheckedChange={() => toggle(u.id, u.status)} />
            </div>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}

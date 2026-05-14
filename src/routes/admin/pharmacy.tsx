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
import { Plus, Trash2, Pill } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pharmacy")({
  head: () => ({ meta: [{ title: "Pharmacy catalog — Admin" }] }),
  component: AdminPharmacy,
});

const CATS = [
  { v: "otc", l: "OTC" },
  { v: "prescription", l: "Prescription" },
  { v: "vitamins", l: "Vitamins" },
  { v: "devices", l: "Devices" },
  { v: "wellness", l: "Wellness" },
];

function AdminPharmacy() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "otc", price: "", image_url: "", requires_rx: false, in_stock: true });

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pharmacy_products" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const create = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    const { error } = await supabase.from("pharmacy_products" as any).insert({
      name: form.name, category: form.category, price: Number(form.price || 0),
      image_url: form.image_url || null, requires_rx: form.requires_rx, in_stock: form.in_stock,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Product added");
    setOpen(false); setForm({ name: "", category: "otc", price: "", image_url: "", requires_rx: false, in_stock: true });
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const toggleStock = async (id: string, in_stock: boolean) => {
    const { error } = await supabase.from("pharmacy_products" as any).update({ in_stock: !in_stock }).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete product?")) return;
    const { error } = await supabase.from("pharmacy_products" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  return (
    <MobileShell role="admin">
      <PageHeader title="Pharmacy catalog" subtitle="Manage products & stock" right={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full bg-[#1A73E8] text-white hover:bg-[#155ec2]"><Plus className="h-4 w-4" /> Add</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>New product</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Paracetamol 500mg" /></div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATS.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Price (₦)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="1500" /></div>
              <div><Label>Image URL (optional)</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" /></div>
              <div className="flex items-center justify-between"><Label>Prescription required</Label><Switch checked={form.requires_rx} onCheckedChange={(v) => setForm({ ...form, requires_rx: v })} /></div>
              <div className="flex items-center justify-between"><Label>In stock</Label><Switch checked={form.in_stock} onCheckedChange={(v) => setForm({ ...form, in_stock: v })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={create} className="bg-[#1A73E8] text-white hover:bg-[#155ec2]">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      <div className="px-5 pt-5 grid grid-cols-2 gap-3">
        {isLoading && <p className="col-span-2 py-10 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (products?.length ?? 0) === 0 && (
          <div className="col-span-2 rounded-xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted-foreground">No products yet.</div>
        )}
        {(products ?? []).map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex h-20 items-center justify-center overflow-hidden rounded-lg bg-muted">
              {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <Pill className="h-7 w-7 text-muted-foreground" />}
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-semibold">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.category}{p.requires_rx ? " · Rx" : ""}</p>
            <p className="font-bold">₦{Number(p.price).toLocaleString()}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{p.in_stock ? "In stock" : "Out"}</span>
              <Switch checked={p.in_stock} onCheckedChange={() => toggleStock(p.id, p.in_stock)} />
            </div>
            <button onClick={() => remove(p.id)} className="mt-2 inline-flex items-center gap-1 text-xs text-destructive"><Trash2 className="h-3 w-3" /> Delete</button>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}

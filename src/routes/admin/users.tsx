import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MobileShell, PageHeader } from "@/components/mobile-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Medic" }] }),
  component: Users,
});

function Users() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });
  return (
    <MobileShell role="admin">
      <PageHeader title="Users" subtitle="Recent signups" />
      <div className="px-5 pt-5 space-y-2">
        {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}
        {data?.map((u: any) => (
          <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
              {(u.full_name ?? "U").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{u.full_name || "(unnamed)"}</p>
              <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}

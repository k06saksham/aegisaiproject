import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, Badge, PageHeader } from "@/components/ui/atoms";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — AEGIS AI" },
      { name: "description", content: "Immutable audit log of every AEGIS decision. SHA-256 hash chain over payload for tamper-evidence." },
    ],
  }),
  component: Audit,
});

function Audit() {
  const { data } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
    refetchInterval: 5000,
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Audit & Explainability"
        subtitle="Immutable log · SHA-256 hash per decision · Signed-in analysts share the ops picture"
      />

      <Card>
        <div className="space-y-1.5">
          {data?.map((row) => (
            <div key={row.id} className="border border-border/60 rounded p-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3 w-3 text-primary" />
                  <div className="mono">{row.action}</div>
                  <Badge tone="info">{new Date(row.created_at).toLocaleTimeString()}</Badge>
                </div>
                <code className="text-[10px] text-muted-foreground truncate max-w-[280px]">sha256: {row.hash.slice(0, 24)}…</code>
              </div>
              <details className="mt-2">
                <summary className="text-[11px] text-muted-foreground cursor-pointer">Payload</summary>
                <pre className="mt-1 text-[10px] bg-input rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(row.payload, null, 2)}
                </pre>
              </details>
            </div>
          ))}
          {!data?.length && <div className="text-sm text-muted-foreground">No audit entries yet.</div>}
        </div>
      </Card>
    </div>
  );
}

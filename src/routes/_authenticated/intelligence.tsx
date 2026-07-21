import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { analyzeSignal, ingestDemoSignal } from "@/lib/agents.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, Badge, Button, PageHeader } from "@/components/ui/atoms";
import { useState } from "react";
import { Zap, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/intelligence")({
  head: () => ({
    meta: [
      { title: "Live Intelligence — AEGIS AI" },
      { name: "description", content: "Multi-source signal feed with real-time LLM analysis. Geopolitical, maritime, weather, sanctions, commodity." },
    ],
  }),
  component: Intelligence,
});

interface Signal {
  id: string;
  title: string;
  source: string | null;
  category: string;
  region: string | null;
  severity: number;
  raw_text: string | null;
  status: string;
  created_at: string;
  analyzed_at: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysis: any;
}

function Intelligence() {
  const analyzeFn = useServerFn(analyzeSignal);
  const ingestFn = useServerFn(ingestDemoSignal);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["signals"],
    queryFn: async () => {
      const { data } = await supabase.from("signals").select("*").order("created_at", { ascending: false });
      return (data ?? []) as Signal[];
    },
    refetchInterval: 5000,
  });

  const [busy, setBusy] = useState<string | null>(null);

  const analyze = async (id: string) => {
    setBusy(id);
    try {
      await analyzeFn({ data: { signalId: id } });
      qc.invalidateQueries({ queryKey: ["signals"] });
      qc.invalidateQueries({ queryKey: ["graph"] });
    } finally {
      setBusy(null);
    }
  };
  const ingest = async () => {
    await ingestFn();
    qc.invalidateQueries({ queryKey: ["signals"] });
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Live Intelligence"
        subtitle="Multi-source signal feed · Geopolitical Risk Intelligence Agent (Gemini 2.5 Flash)"
        actions={
          <Button variant="primary" onClick={ingest}>
            <Zap className="h-3 w-3" /> Ingest demo signal
          </Button>
        }
      />

      <div className="space-y-3">
        {data?.map((s) => (
          <Card key={s.id} title={s.category.toUpperCase() + " · " + (s.region ?? "")} right={
            <Badge tone={s.severity > 0.7 ? "bad" : s.severity > 0.4 ? "warn" : "good"}>
              sev {(s.severity * 100).toFixed(0)}%
            </Badge>
          }>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{s.title}</div>
                <div className="text-[11px] text-muted-foreground mono mt-0.5">{s.source} · {new Date(s.created_at).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-2">{s.raw_text}</p>
                {s.analysis && (
                  <div className="mt-3 border border-primary/30 rounded p-3 bg-primary/5 space-y-2 text-xs">
                    <div className="flex items-center gap-1 text-primary"><Sparkles className="h-3 w-3" /> <b>Agent analysis</b></div>
                    <div><span className="text-muted-foreground">Summary:</span> {s.analysis.summary}</div>
                    <div><span className="text-muted-foreground">Impact:</span> {s.analysis.likely_impact}</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className="text-[10px] mono uppercase text-muted-foreground">7d disruption prob</div>
                        <div className="mono">{((s.analysis.disruption_probability_7d ?? 0) * 100).toFixed(0)}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] mono uppercase text-muted-foreground">Confidence</div>
                        <div className="mono">{((s.analysis.confidence ?? 0) * 100).toFixed(0)}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] mono uppercase text-muted-foreground">Corridors</div>
                        <div className="mono">{(s.analysis.affected_corridors ?? []).join(", ")}</div>
                      </div>
                    </div>
                    {s.analysis.recommended_actions && (
                      <div>
                        <div className="text-[10px] mono uppercase text-muted-foreground mb-1">Recommended actions</div>
                        <ul className="list-disc ml-4 space-y-0.5">
                          {s.analysis.recommended_actions.map((a: string, i: number) => (<li key={i}>{a}</li>))}
                        </ul>
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground italic border-t border-primary/20 pt-2">
                      Reasoning: {s.analysis.reasoning}
                    </div>
                  </div>
                )}
              </div>
              <div className="w-40 shrink-0 flex flex-col items-end gap-2">
                <Badge tone={s.status === "analyzed" ? "good" : s.status === "analyzing" ? "warn" : "info"}>
                  {s.status}
                </Badge>
                <Button
                  onClick={() => analyze(s.id)}
                  disabled={busy === s.id || s.status === "analyzing"}
                  size="sm"
                  variant={s.analysis ? "default" : "primary"}
                >
                  <Sparkles className="h-3 w-3" /> {busy === s.id ? "Analyzing…" : s.analysis ? "Re-analyze" : "Analyze"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {!data?.length && (
          <Card><div className="text-sm text-muted-foreground">No signals. Click "Ingest demo signal" to start.</div></Card>
        )}
      </div>
    </div>
  );
}

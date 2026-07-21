import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listGraph, ingestDemoSignal } from "@/lib/agents.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, Stat, Badge, Button, PageHeader } from "@/components/ui/atoms";
import { DriGauge } from "@/components/DriGauge";
import { useEffect, useState } from "react";
import { Zap, TrendingUp, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/command")({
  head: () => ({
    meta: [
      { title: "Command Center — AEGIS AI" },
      { name: "description", content: "Live Disruption Risk Index, active signals, and end-to-end signal→recommendation latency for India's energy supply chain." },
    ],
  }),
  component: Command,
});

function Command() {
  const graphFn = useServerFn(listGraph);
  const ingestFn = useServerFn(ingestDemoSignal);
  const graph = useQuery({ queryKey: ["graph"], queryFn: () => graphFn(), refetchInterval: 30000 });

  const [signalCount, setSignalCount] = useState(0);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [recCount, setRecCount] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const [ingestBusy, setIngestBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ count: sCount }, { count: aCount }, { count: rCount }, { data: latest }] = await Promise.all([
        supabase.from("signals").select("id", { count: "exact", head: true }),
        supabase.from("signals").select("id", { count: "exact", head: true }).eq("status", "analyzed"),
        supabase.from("recommendations").select("id", { count: "exact", head: true }),
        supabase.from("recommendations").select("latency_ms").order("created_at", { ascending: false }).limit(1),
      ]);
      setSignalCount(sCount ?? 0);
      setAnalyzedCount(aCount ?? 0);
      setRecCount(rCount ?? 0);
      setLatency(latest?.[0]?.latency_ms ?? null);
    };
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  const dri = graph.data?.dri ?? 0;
  const activeRefineries = graph.data?.refineryRisk?.filter((r) => r.reachable).length ?? 0;
  const stuckRefineries = (graph.data?.refineryRisk?.length ?? 0) - activeRefineries;

  const ingest = async () => {
    setIngestBusy(true);
    try {
      await ingestFn();
    } finally {
      setIngestBusy(false);
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Command Center"
        subtitle="India Energy Supply Resilience OS · Real-time DRI · Multi-agent decision loop"
        actions={
          <Button variant="primary" onClick={ingest} disabled={ingestBusy}>
            <Zap className="h-3 w-3" /> {ingestBusy ? "Ingesting…" : "Ingest demo signal"}
          </Button>
        }
      />

      {/* Problem context stripe */}
      <div className="glass rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-4">
        <Stat label="India crude import dependence" value="88%" sub="MoPNG 2024" tone="warn" />
        <Stat label="Via Strait of Hormuz" value="40–45%" sub="EIA / IEA" tone="warn" />
        <Stat label="Strategic reserve cover" value="9.5d" sub="ISPRL disclosed" tone="warn" />
        <Stat label="Industry response latency" value="47d" sub="McKinsey 2023" tone="bad" />
        <Stat
          label="AEGIS latency (last decision)"
          value={latency !== null ? `${(latency / 1000).toFixed(1)}s` : "—"}
          sub="signal → recommendation"
          tone="good"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <Card title="Disruption Risk Index" right={<Badge tone={dri > 0.6 ? "bad" : dri > 0.3 ? "warn" : "good"}>{dri > 0.6 ? "ELEVATED" : dri > 0.3 ? "WATCH" : "NOMINAL"}</Badge>}>
          <div className="flex items-center justify-around">
            <DriGauge value={dri} />
            <div className="space-y-3">
              <div>
                <div className="text-[10px] mono uppercase text-muted-foreground">Refineries reachable</div>
                <div className="mono text-lg">{activeRefineries}/{graph.data?.refineryRisk?.length ?? 0}</div>
              </div>
              <div>
                <div className="text-[10px] mono uppercase text-muted-foreground">Unreachable</div>
                <div className={`mono text-lg ${stuckRefineries > 0 ? "text-severity-crit" : ""}`}>{stuckRefineries}</div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Capacity-weighted risk across every India refinery's best-cost path from any active supplier.
          </p>
        </Card>

        <Card title="Signal pipeline" right={<TrendingUp className="h-3 w-3 text-primary" />}>
          <div className="space-y-3">
            <Stat label="Signals ingested" value={signalCount} />
            <Stat label="Analyzed by Geopolitical Agent" value={analyzedCount} tone={analyzedCount === signalCount ? "good" : "warn"} />
            <Stat label="Recommendations generated" value={recCount} />
          </div>
        </Card>

        <Card title="Refinery risk snapshot">
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {graph.data?.refineryRisk?.map((r) => (
              <div key={r.refineryId} className="flex items-center justify-between text-xs">
                <div className="truncate mr-2">{r.refineryName}</div>
                {r.reachable ? (
                  <Badge tone={r.risk > 0.5 ? "bad" : r.risk > 0.3 ? "warn" : "good"}>
                    {(r.risk * 100).toFixed(0)}% · {(r.days ?? 0).toFixed(1)}d
                  </Badge>
                ) : (
                  <Badge tone="bad"><AlertTriangle className="h-3 w-3" /> UNREACHABLE</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Agent stack">
          <div className="space-y-1.5 text-xs">
            {[
              { name: "Geopolitical Intelligence Agent", stack: "Gemini 2.5 Flash · signal→JSON" },
              { name: "Disruption Scenario Modeller", stack: "Graph engine · cascading impact formulas" },
              { name: "Adaptive Procurement Orchestrator", stack: "Dijkstra ranking + Gemini reasoning" },
              { name: "Strategic Reserve Optimiser", stack: "Deterministic optimiser · SPR drawdown" },
              { name: "Executive Report Agent", stack: "Gemini 2.5 Pro · MoPNG-style memo" },
              { name: "Audit / Explainability Agent", stack: "SHA-256 hash chain over decisions" },
            ].map((a) => (
              <div key={a.name} className="flex items-center justify-between border border-border/60 rounded px-2 py-1.5">
                <div>
                  <div>{a.name}</div>
                  <div className="text-[10px] text-muted-foreground mono">{a.stack}</div>
                </div>
                <Badge tone="good">ONLINE</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card title="How to demo">
          <ol className="text-xs space-y-2 list-decimal ml-4 text-muted-foreground">
            <li>Open <b>Live Intelligence</b>, click "Analyze" on any new signal — Gemini returns structured JSON in ~2s. Latency stat above updates.</li>
            <li>Open <b>Scenario Lab</b>, pick <i>Hormuz — Full Closure</i>. Watch DRI, refinery reachability, and cascading impact re-compute.</li>
            <li>Open <b>Digital Twin</b>. Edges that turn red / dashed are disabled by the scenario.</li>
            <li>Open <b>Adaptive Procurement</b>. Get a real ranked substitute plan grounded in the live graph.</li>
            <li>Open <b>Strategic Reserve</b> → drawdown schedule against the supply gap.</li>
            <li>Open <b>Executive Reports</b> → generates a ministry-style memo.</li>
            <li>Every step is written to <b>Audit Log</b> with a SHA-256 hash chain.</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}

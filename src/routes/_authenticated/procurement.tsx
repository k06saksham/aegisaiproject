import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { recommendProcurement, listGraph } from "@/lib/agents.functions";
import { Card, Badge, Button, PageHeader, Stat } from "@/components/ui/atoms";
import { useState } from "react";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/procurement")({
  head: () => ({
    meta: [
      { title: "Adaptive Procurement — AEGIS AI" },
      { name: "description", content: "Adaptive Procurement Orchestrator: ranked alternative crude sources by risk, ETA, cost, grade compatibility. Grounded in the live graph." },
    ],
  }),
  component: Procurement,
});

function Procurement() {
  const graphFn = useServerFn(listGraph);
  const recFn = useServerFn(recommendProcurement);
  const qc = useQueryClient();
  const [scenario, setScenario] = useState("baseline");
  const [refinery, setRefinery] = useState("ref_jamnagar");

  const graph = useQuery({ queryKey: ["graph"], queryFn: () => graphFn() });
  const refineries = graph.data?.nodes.filter((n) => n.node_type === "refinery") ?? [];

  const mut = useMutation({
    mutationFn: () => recFn({ data: { scenarioKey: scenario, refineryId: refinery } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["graph"] }),
  });
  const r = mut.data?.recommendation;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Adaptive Procurement Orchestrator"
        subtitle="Ranked alternative crude sources · risk-weighted graph search + Gemini reasoning"
      />

      <Card title="Query" className="mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[10px] mono uppercase text-muted-foreground">Target refinery</label>
            <select value={refinery} onChange={(e) => setRefinery(e.target.value)} className="mt-1 rounded-md bg-input border border-border px-3 py-1.5 text-sm">
              {refineries.map((rf) => (<option key={rf.id} value={rf.id}>{rf.name}</option>))}
            </select>
          </div>
          <div>
            <label className="text-[10px] mono uppercase text-muted-foreground">Scenario</label>
            <select value={scenario} onChange={(e) => setScenario(e.target.value)} className="mt-1 rounded-md bg-input border border-border px-3 py-1.5 text-sm">
              <option value="baseline">Baseline</option>
              <option value="hormuz_closure">Hormuz — Full Closure</option>
              <option value="hormuz_partial">Hormuz — Partial</option>
              <option value="red_sea_shutdown">Red Sea Shutdown</option>
              <option value="malacca_incident">Malacca Incident</option>
              <option value="opec_cut">OPEC+ Cut</option>
              <option value="cyclone_arabian">Arabian Cyclone</option>
            </select>
          </div>
          <Button variant="primary" onClick={() => mut.mutate()} disabled={mut.isPending}>
            <Sparkles className="h-3 w-3" /> {mut.isPending ? "Optimising…" : "Generate procurement plan"}
          </Button>
          {mut.data?.latency_ms != null && <Badge tone="good">latency {(mut.data.latency_ms / 1000).toFixed(1)}s</Badge>}
        </div>
      </Card>

      {r && (
        <>
          <Card title="Executive summary" className="mb-4">
            <p className="text-sm">{r.executive_summary}</p>
            <div className="mt-2 text-[11px] text-muted-foreground">Timeline: act within {r.timeline_hours}h</div>
          </Card>

          <div className="grid md:grid-cols-2 gap-3">
            {r.recommendations?.map((rec, i: number) => (
              <div key={i} className="glass rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{rec.supplier_name}</div>
                  <Badge tone={rec.action === "increase" ? "good" : rec.action === "redirect" ? "warn" : "info"}>{rec.action.toUpperCase()}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <Stat label="Volume" value={`${rec.target_volume_kbd} kbd`} />
                  <Stat label="ETA" value={`${rec.eta_days}d`} tone={rec.eta_days > 20 ? "warn" : "good"} />
                  <Stat label="Confidence" value={`${(rec.confidence * 100).toFixed(0)}%`} />
                </div>
                <div className="mt-3 text-[11px] text-muted-foreground">
                  <div><b>Grade:</b> {rec.grade_notes}</div>
                  <div className="mt-1"><b>Rationale:</b> {rec.why}</div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Badge tone={rec.risk_score > 0.5 ? "bad" : rec.risk_score > 0.3 ? "warn" : "good"}>
                    risk {(rec.risk_score * 100).toFixed(0)}%
                  </Badge>
                  <Badge tone={rec.cost_index > 0.6 ? "warn" : "good"}>cost {(rec.cost_index * 100).toFixed(0)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

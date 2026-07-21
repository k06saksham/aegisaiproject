import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runScenario } from "@/lib/agents.functions";
import { Card, Badge, Button, PageHeader, Stat } from "@/components/ui/atoms";
import { DriGauge } from "@/components/DriGauge";
import { useState } from "react";
import { PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/scenarios")({
  head: () => ({
    meta: [
      { title: "Scenario Lab — AEGIS AI" },
      { name: "description", content: "Disruption Scenario Modeller. Simulate Hormuz closure, Red Sea shutdown, OPEC cut, cyclone — with explicit cascading-impact formulas." },
    ],
  }),
  component: Scenarios,
});

const SCENARIOS: { key: string; label: string; desc: string; tone: "warn" | "bad" }[] = [
  { key: "baseline", label: "Baseline", desc: "Current live conditions.", tone: "warn" },
  { key: "hormuz_closure", label: "Strait of Hormuz — Full Closure", desc: "40–45% of India's crude blocked at source.", tone: "bad" },
  { key: "hormuz_partial", label: "Hormuz — Partial Disruption", desc: "Iran escalation, insurance +200%, transit slowdown.", tone: "warn" },
  { key: "red_sea_shutdown", label: "Red Sea / Bab-el-Mandeb Shutdown", desc: "Cape reroute, +14–18 days for AF/Med barrels.", tone: "bad" },
  { key: "malacca_incident", label: "Strait of Malacca Incident", desc: "Piracy/accident spike; impacts East India ports.", tone: "warn" },
  { key: "opec_cut", label: "OPEC+ Emergency Cut", desc: "2M bpd surprise cut. ME grade slate compresses.", tone: "warn" },
  { key: "cyclone_arabian", label: "Severe Cyclone — Arabian Sea", desc: "West India ports offline 3–7 days.", tone: "warn" },
];

function Scenarios() {
  const runFn = useServerFn(runScenario);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string>("hormuz_closure");
  const mut = useMutation({
    mutationFn: (key: string) => runFn({ data: { scenarioKey: key as "hormuz_closure" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["graph"] }),
  });

  const r = mut.data;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Disruption Scenario Lab"
        subtitle="Deterministic graph re-computation · Explicit cascading-impact formulas · Every run audit-logged"
      />

      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <Card title="Scenario library" className="md:col-span-1">
          <div className="space-y-1.5">
            {SCENARIOS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSelected(s.key)}
                className={`w-full text-left border rounded p-2 transition ${selected === s.key ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium">{s.label}</div>
                  <Badge tone={s.tone}>{s.tone === "bad" ? "SEVERE" : "MOD"}</Badge>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={() => mut.mutate(selected)} disabled={mut.isPending} >
            <PlayCircle className="h-3 w-3" /> {mut.isPending ? "Simulating…" : "Run scenario"}
          </Button>
        </Card>

        <Card title="Live impact — DRI" className="md:col-span-1">
          <div className="flex items-center justify-around">
            <DriGauge value={r?.dri ?? 0} />
            {r && (
              <div className="space-y-3">
                <Stat label="Unreachable capacity" value={`${(r.unreachableCap_kbd ?? 0).toFixed(0)} kbd`} tone={r.unreachableCap_kbd ? "bad" : "good"} />
                <Stat label="Total refining capacity" value={`${(r.totalCap_kbd ?? 0).toFixed(0)} kbd`} />
              </div>
            )}
          </div>
          {r?.impact && (
            <div className="mt-3 text-[11px] text-muted-foreground">
              Rec: escalate to Adaptive Procurement + Strategic Reserve modules.
            </div>
          )}
        </Card>

        <Card title="Cascading impact — testable formulas" className="md:col-span-1">
          {r?.impact ? (
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-[10px] mono uppercase text-muted-foreground">Refinery utilization</div>
                <div className="mono text-lg">{r.impact.refinery_utilization_pct}%</div>
                <code className="text-[10px] text-muted-foreground">{r.impact.formula_refinery}</code>
              </div>
              <div>
                <div className="text-[10px] mono uppercase text-muted-foreground">Δ retail fuel price</div>
                <div className="mono text-lg text-severity-med">+{r.impact.fuel_price_delta_pct}%</div>
                <code className="text-[10px] text-muted-foreground">{r.impact.formula_price}</code>
              </div>
              <div>
                <div className="text-[10px] mono uppercase text-muted-foreground">Δ GDP impact</div>
                <div className="mono text-lg text-severity-high">−{r.impact.gdp_impact_bps} bps</div>
                <code className="text-[10px] text-muted-foreground">{r.impact.formula_gdp}</code>
              </div>
              <div className="border-t border-border pt-2">
                <div className="text-[10px] mono uppercase text-muted-foreground mb-1">Assumptions (auditable)</div>
                <ul className="list-disc ml-4 space-y-0.5 text-[11px] text-muted-foreground">
                  {r.impact.assumptions.map((a, i) => (<li key={i}>{a}</li>))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Run a scenario to see cascading impact.</div>
          )}
        </Card>
      </div>

      {r && (
        <Card title="Refinery reachability under this scenario">
          <div className="grid md:grid-cols-2 gap-2 text-xs">
            {r.refineryRisk.map((rf) => (
              <div key={rf.refineryId} className="flex items-center justify-between border border-border/60 rounded px-2 py-1.5">
                <div>
                  <div className="font-medium">{rf.refineryName}</div>
                  {rf.reachable ? (
                    <div className="text-[10px] mono text-muted-foreground">ETA {rf.totalDays?.toFixed(1)}d · path {rf.path.length} hops</div>
                  ) : (
                    <div className="text-[10px] mono text-severity-crit">no reachable path from any active supplier</div>
                  )}
                </div>
                <Badge tone={!rf.reachable ? "bad" : rf.worstRisk > 0.6 ? "bad" : rf.worstRisk > 0.3 ? "warn" : "good"}>
                  {rf.reachable ? `${(rf.worstRisk * 100).toFixed(0)}%` : "OFFLINE"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

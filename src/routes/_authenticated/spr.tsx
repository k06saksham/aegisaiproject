import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { optimiseReserve } from "@/lib/agents.functions";
import { Card, Button, PageHeader, Stat } from "@/components/ui/atoms";
import { useState } from "react";
import { Fuel } from "lucide-react";

export const Route = createFileRoute("/_authenticated/spr")({
  head: () => ({
    meta: [
      { title: "Strategic Reserve — AEGIS AI" },
      { name: "description", content: "Strategic Petroleum Reserve Optimisation Agent. Optimal drawdown schedule against forecast supply gap." },
    ],
  }),
  component: SPR,
});

function SPR() {
  const fn = useServerFn(optimiseReserve);
  const [scenario, setScenario] = useState("baseline");
  const mut = useMutation({ mutationFn: () => fn({ data: { scenarioKey: scenario } }) });
  const p = mut.data?.plan;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Strategic Reserve Optimisation Agent"
        subtitle="Optimal SPR drawdown schedule against forecast supply gap · deterministic formula, auditable"
      />

      <Card title="Optimise" className="mb-4">
        <div className="flex items-end gap-3">
          <div>
            <label className="text-[10px] mono uppercase text-muted-foreground">Scenario</label>
            <select value={scenario} onChange={(e) => setScenario(e.target.value)} className="mt-1 rounded-md bg-input border border-border px-3 py-1.5 text-sm">
              <option value="baseline">Baseline</option>
              <option value="hormuz_closure">Hormuz — Full Closure</option>
              <option value="hormuz_partial">Hormuz — Partial</option>
              <option value="red_sea_shutdown">Red Sea Shutdown</option>
              <option value="opec_cut">OPEC+ Cut</option>
              <option value="cyclone_arabian">Arabian Cyclone</option>
            </select>
          </div>
          <Button variant="primary" onClick={() => mut.mutate()} disabled={mut.isPending}>
            <Fuel className="h-3 w-3" /> {mut.isPending ? "Optimising…" : "Run SPR optimiser"}
          </Button>
        </div>
      </Card>

      {p && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Card><Stat label="DRI" value={`${(p.dri * 100).toFixed(0)}%`} tone={p.dri > 0.5 ? "bad" : "warn"} /></Card>
            <Card><Stat label="Supply gap" value={`${p.supplyGap_kbd.toFixed(0)} kbd`} tone="warn" /></Card>
            <Card><Stat label="Daily release (peak)" value={`${p.dailyRelease_kbd} kbd`} tone="good" /></Card>
            <Card><Stat label="Days cover after 30d" value={`${p.daysCoverAfter}d`} tone={p.daysCoverAfter < 5 ? "bad" : "good"} /></Card>
          </div>

          <Card title="30-day drawdown schedule">
            <div className="grid grid-cols-15 gap-0.5">
              <div className="col-span-15">
                <svg viewBox="0 0 300 100" className="w-full h-32">
                  {p.releaseSchedule.map((d, i) => {
                    const max = Math.max(...p.releaseSchedule.map((x) => x.release_kbd), 1);
                    const h = (d.release_kbd / max) * 90;
                    const x = (i * 300) / p.releaseSchedule.length;
                    const w = 300 / p.releaseSchedule.length - 1;
                    return (
                      <rect key={i} x={x} y={100 - h} width={w} height={h} fill="var(--color-primary)" opacity={0.6 + (i / 60)} />
                    );
                  })}
                </svg>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground mono">
              Formula: {p.formula}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Total released: <b>{p.totalRelease_kb.toLocaleString()} kb</b> · Remaining SPR: <b>{p.remainingSPR_kb.toLocaleString()} kb</b> · Replenishment window when safe: <b>{p.replenishmentWindow_weeks} weeks</b>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

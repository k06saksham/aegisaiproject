import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { generateExecReport } from "@/lib/agents.functions";
import { Card, Button, PageHeader, Badge } from "@/components/ui/atoms";
import { useState } from "react";
import { FileText, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Executive Reports — AEGIS AI" },
      { name: "description", content: "AI-generated ministry-briefing style situation reports for India's crude supply chain." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const fn = useServerFn(generateExecReport);
  const [scenario, setScenario] = useState("baseline");
  const mut = useMutation({ mutationFn: () => fn({ data: { scenarioKey: scenario } }) });
  const r = mut.data?.report;

  const download = () => {
    if (!r) return;
    const blob = new Blob(
      [
        `AEGIS AI — Situation Report\n`,
        `Generated: ${new Date().toISOString()}\n`,
        `Scenario: ${scenario}\n\n`,
        `HEADLINE\n${r.headline}\n\n`,
        `SITUATION\n${r.situation}\n\n`,
        `IMPACT\n${r.impact}\n\n`,
        `ACTIONS (48H)\n${r.actions_48h.map((a: string) => "• " + a).join("\n")}\n\n`,
        `RISKS WE ARE WATCHING\n${r.risks_watching.map((a: string) => "• " + a).join("\n")}\n\n`,
        `CONFIDENCE: ${(r.confidence * 100).toFixed(0)}%\n`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aegis-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-[1000px] mx-auto">
      <PageHeader
        title="Executive Report Agent"
        subtitle="Ministry-briefing style memo · Gemini 2.5 Pro · SHA-256 audit hash"
      />

      <Card title="Generate" className="mb-4">
        <div className="flex items-end gap-3">
          <div>
            <label className="text-[10px] mono uppercase text-muted-foreground">Scenario context</label>
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
            <FileText className="h-3 w-3" /> {mut.isPending ? "Drafting…" : "Draft situation report"}
          </Button>
          {r && <Button onClick={download}><Download className="h-3 w-3" /> Download</Button>}
          {mut.data?.latency_ms != null && <Badge tone="good">latency {(mut.data.latency_ms / 1000).toFixed(1)}s</Badge>}
        </div>
      </Card>

      {r && (
        <div className="glass rounded-lg p-6 space-y-4">
          <div className="text-[10px] mono uppercase text-muted-foreground border-b border-border pb-2">
            AEGIS AI · Situation Report · Generated {new Date().toLocaleString()}
          </div>
          <h2 className="text-lg font-semibold">{r.headline}</h2>
          <Section title="Situation">{r.situation}</Section>
          <Section title="Impact">{r.impact}</Section>
          <Section title="Actions — next 48 hours">
            <ul className="list-disc ml-5 space-y-1">
              {r.actions_48h.map((a: string, i: number) => (<li key={i}>{a}</li>))}
            </ul>
          </Section>
          <Section title="Risks we are watching">
            <ul className="list-disc ml-5 space-y-1">
              {r.risks_watching.map((a: string, i: number) => (<li key={i}>{a}</li>))}
            </ul>
          </Section>
          <div className="text-[11px] text-muted-foreground border-t border-border pt-2">
            Model confidence: <b>{(r.confidence * 100).toFixed(0)}%</b>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] mono uppercase text-primary mb-1">{title}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listGraph } from "@/lib/agents.functions";
import { WorldMap } from "@/components/WorldMap";
import { Card, Badge, PageHeader, Stat } from "@/components/ui/atoms";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/twin")({
  head: () => ({
    meta: [
      { title: "Digital Twin — AEGIS AI" },
      { name: "description", content: "Live geospatial digital twin of India's energy supply network — suppliers, chokepoints, ports, refineries. Risk-colored edges." },
    ],
  }),
  component: Twin,
});

function Twin() {
  const graphFn = useServerFn(listGraph);
  const { data } = useQuery({ queryKey: ["graph"], queryFn: () => graphFn(), refetchInterval: 30000 });
  const [selected, setSelected] = useState<string | null>(null);

  const node = selected ? data?.nodes.find((n) => n.id === selected) : null;
  const nodeEdges = selected ? data?.edges.filter((e) => e.from_node === selected || e.to_node === selected) : [];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Digital Twin"
        subtitle="Supplier → Chokepoint → Port → Refinery · Edges colored by live risk · Dashed = disabled by active scenario"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3" title="Global energy corridor · India-focused">
          <div className="aspect-[2/1] w-full">
            {data && <WorldMap nodes={data.nodes} edges={data.edges} onNodeClick={setSelected} />}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] mono">
            <Legend color="var(--color-severity-low)" label="risk < 25%" />
            <Legend color="var(--color-severity-med)" label="25–50%" />
            <Legend color="var(--color-severity-high)" label="50–75%" />
            <Legend color="var(--color-severity-crit)" label="> 75% / disabled" />
            <span className="mx-2 text-muted-foreground">·</span>
            <Legend color="var(--color-severity-high)" label="chokepoint" dot />
            <Legend color="var(--color-accent-cyan)" label="refinery" dot />
            <Legend color="var(--color-accent-amber)" label="port" dot />
            <Legend color="var(--color-accent-emerald)" label="supplier" dot />
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Node inspector">
            {node ? (
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">{node.name}</div>
                  <div className="text-[10px] mono uppercase text-muted-foreground">{node.node_type} · {node.country}</div>
                </div>
                {node.capacity_bpd && <Stat label="Capacity" value={`${(node.capacity_bpd / 1000).toFixed(0)} kbd`} />}
                <div className="text-xs">
                  <div className="text-[10px] mono uppercase text-muted-foreground mb-1">Connected edges</div>
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {nodeEdges?.map((e) => (
                      <div key={e.id} className="flex items-center justify-between border border-border/60 rounded px-2 py-1">
                        <div className="truncate">
                          {data?.nodes.find((n) => n.id === (e.from_node === selected ? e.to_node : e.from_node))?.name}
                        </div>
                        <Badge tone={e.disabled ? "bad" : e.current_risk > 0.5 ? "bad" : e.current_risk > 0.3 ? "warn" : "good"}>
                          {e.disabled ? "DISABLED" : `${(e.current_risk * 100).toFixed(0)}%`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Click any node on the map to inspect.</div>
            )}
          </Card>

          <Card title="Network stats">
            <Stat label="Nodes" value={data?.nodes.length ?? 0} />
            <Stat label="Edges" value={data?.edges.length ?? 0} />
            <Stat label="Disabled edges" value={data?.edges.filter((e) => e.disabled).length ?? 0} tone={data?.edges.some((e) => e.disabled) ? "bad" : "good"} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label, dot }: { color: string; label: string; dot?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={dot ? "inline-block h-2 w-2 rounded-full" : "inline-block h-0.5 w-4"} style={{ background: color }} />
      {label}
    </span>
  );
}

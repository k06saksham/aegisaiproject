// AEGIS Graph Engine — pure TypeScript, runs client + server.
// Real Dijkstra with risk-weighted cost + risk propagation.

export type NodeType = "supplier" | "chokepoint" | "port" | "refinery" | "pipeline";
export interface GraphNode {
  id: string;
  name: string;
  node_type: NodeType | string;
  country?: string | null;
  region?: string | null;
  lat: number;
  lng: number;
  capacity_bpd?: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}
export interface GraphEdge {
  id: string;
  from_node: string;
  to_node: string;
  mode: string;
  distance_km: number;
  transit_days: number;
  base_risk: number;
  current_risk: number;
  disabled: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}

/** Cost = transit_days * (1 + 6 * risk). Risk hikes penalize the path. */
export function edgeCost(e: GraphEdge): number {
  if (e.disabled) return Number.POSITIVE_INFINITY;
  const r = Math.max(0, Math.min(1, e.current_risk));
  return e.transit_days * (1 + 6 * r);
}

interface DijkstraResult {
  path: string[];
  edges: GraphEdge[];
  totalDays: number;
  totalCost: number;
  worstRisk: number;
  reachable: boolean;
}

/** Undirected Dijkstra over nodes/edges. Returns best path from source→target. */
export function shortestPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  source: string,
  target: string,
): DijkstraResult {
  const adj = new Map<string, { to: string; edge: GraphEdge }[]>();
  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => {
    adj.get(e.from_node)?.push({ to: e.to_node, edge: e });
    adj.get(e.to_node)?.push({ to: e.from_node, edge: e });
  });

  const dist = new Map<string, number>();
  const prev = new Map<string, { node: string; edge: GraphEdge } | null>();
  nodes.forEach((n) => {
    dist.set(n.id, Number.POSITIVE_INFINITY);
    prev.set(n.id, null);
  });
  dist.set(source, 0);

  const visited = new Set<string>();
  while (visited.size < nodes.length) {
    let u: string | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const [id, d] of dist) {
      if (!visited.has(id) && d < best) {
        best = d;
        u = id;
      }
    }
    if (u === null || best === Number.POSITIVE_INFINITY) break;
    visited.add(u);
    if (u === target) break;
    for (const { to, edge } of adj.get(u) ?? []) {
      if (visited.has(to)) continue;
      const alt = best + edgeCost(edge);
      if (alt < (dist.get(to) ?? Infinity)) {
        dist.set(to, alt);
        prev.set(to, { node: u, edge });
      }
    }
  }

  const totalCost = dist.get(target) ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(totalCost)) {
    return { path: [], edges: [], totalDays: 0, totalCost: Infinity, worstRisk: 1, reachable: false };
  }
  // reconstruct
  const path: string[] = [];
  const usedEdges: GraphEdge[] = [];
  let cur: string | null = target;
  while (cur) {
    path.unshift(cur);
    const p = prev.get(cur);
    if (!p) break;
    usedEdges.unshift(p.edge);
    cur = p.node;
  }
  const totalDays = usedEdges.reduce((s, e) => s + e.transit_days, 0);
  const worstRisk = usedEdges.reduce((m, e) => Math.max(m, e.current_risk), 0);
  return { path, edges: usedEdges, totalDays, totalCost, worstRisk, reachable: true };
}

/** Disruption Risk Index — weighted risk across all edges into Indian refineries. */
export function computeDRI(nodes: GraphNode[], edges: GraphEdge[]): {
  dri: number;
  refineryRisk: { refineryId: string; refineryName: string; bestPath: DijkstraResult | null }[];
} {
  const refineries = nodes.filter((n) => n.node_type === "refinery" && n.country === "IN");
  const suppliers = nodes.filter((n) => n.node_type === "supplier");

  const refineryRisk = refineries.map((ref) => {
    let best: DijkstraResult | null = null;
    for (const sup of suppliers) {
      const r = shortestPath(nodes, edges, sup.id, ref.id);
      if (r.reachable && (!best || r.totalCost < best.totalCost)) best = r;
    }
    return { refineryId: ref.id, refineryName: ref.name, bestPath: best };
  });

  // capacity-weighted risk
  let numer = 0, denom = 0;
  refineryRisk.forEach((r) => {
    const cap = refineries.find((x) => x.id === r.refineryId)?.capacity_bpd ?? 100000;
    const risk = r.bestPath?.reachable
      ? Math.min(1, r.bestPath.worstRisk + (r.bestPath.totalDays > 20 ? 0.15 : 0))
      : 1;
    numer += cap * risk;
    denom += cap;
  });
  const dri = denom > 0 ? numer / denom : 0;
  return { dri, refineryRisk };
}

/** Apply a scenario (mutates a copy of edges). */
export function applyScenario(
  edges: GraphEdge[],
  scenarioKey: string,
): GraphEdge[] {
  return edges.map((e) => {
    const copy = { ...e };
    switch (scenarioKey) {
      case "hormuz_closure":
        if (e.from_node === "cp_hormuz" || e.to_node === "cp_hormuz") {
          copy.disabled = true;
          copy.current_risk = 1;
        }
        break;
      case "hormuz_partial":
        if (e.from_node === "cp_hormuz" || e.to_node === "cp_hormuz") {
          copy.current_risk = Math.min(1, e.current_risk + 0.45);
        }
        break;
      case "red_sea_shutdown":
        if (["cp_babelmandeb", "cp_suez"].includes(e.from_node) || ["cp_babelmandeb", "cp_suez"].includes(e.to_node)) {
          copy.disabled = true;
          copy.current_risk = 1;
        }
        break;
      case "malacca_incident":
        if (e.from_node === "cp_malacca" || e.to_node === "cp_malacca") {
          copy.current_risk = Math.min(1, e.current_risk + 0.35);
        }
        break;
      case "opec_cut":
        // Middle-East suppliers become higher risk / more expensive
        if (["sup_saudi", "sup_iraq", "sup_uae", "sup_kuwait"].includes(e.from_node)) {
          copy.current_risk = Math.min(1, e.current_risk + 0.20);
          copy.transit_days = e.transit_days * 1.1;
        }
        break;
      case "cyclone_arabian":
        if (["port_jamnagar", "port_mundra", "port_kandla"].includes(e.to_node)) {
          copy.current_risk = Math.min(1, e.current_risk + 0.50);
          copy.transit_days = e.transit_days + 3;
        }
        break;
    }
    return copy;
  });
}

export interface CascadingImpact {
  formula_refinery: string;
  refinery_utilization_pct: number;
  formula_price: string;
  fuel_price_delta_pct: number;
  formula_gdp: string;
  gdp_impact_bps: number;
  supply_gap_kbd: number;
  assumptions: string[];
}

/** Explicit, testable cascading-impact model (linear placeholders, calibrated on public sources). */
export function cascadingImpact(dri: number, unreachableCapKbd: number, totalCapKbd: number): CascadingImpact {
  const util = Math.max(50, Math.round((1 - dri * 0.35 - (unreachableCapKbd / Math.max(1, totalCapKbd)) * 0.6) * 100));
  const priceDelta = Math.round(dri * 22 * 10) / 10; // 22% max at DRI=1
  const gdpBps = Math.round(dri * 45); // up to 45 bps
  return {
    formula_refinery: "util% = clamp(100·(1 − 0.35·DRI − 0.6·unreachable_share), 50, 100)",
    refinery_utilization_pct: util,
    formula_price: "Δ retail fuel % = 22·DRI",
    fuel_price_delta_pct: priceDelta,
    formula_gdp: "Δ GDP (bps) = 45·DRI",
    gdp_impact_bps: gdpBps,
    supply_gap_kbd: Math.round(unreachableCapKbd),
    assumptions: [
      "Coefficients illustrative; production calibration on 2019–2024 IEA / MoPNG data.",
      "Assumes 30-day inventory buffer before pump-price passthrough.",
      "SPR release not applied in this baseline; see SPR Optimiser panel.",
    ],
  };
}

/** SPR optimizer — draws down reserves to close supply gap over horizon. */
export function optimiseSPR(input: {
  currentSPR_kbd_days: number;    // e.g. 74000 kb (9.5 days at 7800 kbd demand)
  demand_kbd: number;             // ~5500 kbd India demand
  supplyGap_kbd: number;          // from graph
  horizonDays: number;            // e.g. 30
  refillWeeksWhenSafe: number;    // e.g. 12
}) {
  const gap = Math.max(0, input.supplyGap_kbd);
  const maxDailyRelease = Math.min(1200, input.currentSPR_kbd_days / 10); // physical drawdown limit
  const dailyRelease = Math.min(maxDailyRelease, gap);
  const releaseSchedule = Array.from({ length: input.horizonDays }, (_, i) => ({
    day: i + 1,
    release_kbd: Math.round(dailyRelease * (i < 7 ? 1 : i < 21 ? 0.8 : 0.5)),
  }));
  const totalRelease = releaseSchedule.reduce((s, x) => s + x.release_kbd, 0);
  const remaining = Math.max(0, input.currentSPR_kbd_days - totalRelease);
  const daysCoverAfter = remaining / input.demand_kbd;
  return {
    dailyRelease_kbd: Math.round(dailyRelease),
    releaseSchedule,
    totalRelease_kb: totalRelease,
    remainingSPR_kb: Math.round(remaining),
    daysCoverAfter: Math.round(daysCoverAfter * 10) / 10,
    replenishmentWindow_weeks: input.refillWeeksWhenSafe,
    formula: "release_t = min(maxRelease, gap) · decay(t); coverAfter = (SPR₀ − Σrelease) / demand",
  };
}

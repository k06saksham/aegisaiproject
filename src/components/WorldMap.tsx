import type { GraphNode, GraphEdge } from "@/lib/graph";
import { useMemo } from "react";

/** SVG map of the Indian Ocean energy corridor. Real geo-coords → equirectangular projection. */
export function WorldMap({
  nodes,
  edges,
  highlightPath = [],
  onNodeClick,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightPath?: string[];
  onNodeClick?: (id: string) => void;
}) {
  // Bounds: -60W to 140E, -30S to 55N (covers routes we care about)
  const W = 1000, H = 500;
  const lonMin = -100, lonMax = 140;
  const latMin = -30, latMax = 55;
  const proj = (lat: number, lng: number) => {
    const x = ((lng - lonMin) / (lonMax - lonMin)) * W;
    const y = H - ((lat - latMin) / (latMax - latMin)) * H;
    return { x, y };
  };
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const pathSet = new Set<string>();
  for (let i = 0; i < highlightPath.length - 1; i++) {
    pathSet.add(`${highlightPath[i]}|${highlightPath[i + 1]}`);
    pathSet.add(`${highlightPath[i + 1]}|${highlightPath[i]}`);
  }
  const risk = (r: number) =>
    r >= 0.75 ? "var(--color-severity-crit)" :
    r >= 0.5 ? "var(--color-severity-high)" :
    r >= 0.25 ? "var(--color-severity-med)" :
    "var(--color-severity-low)";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <defs>
        <radialGradient id="glow-primary" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </radialGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-border)" strokeWidth="0.4" opacity="0.5" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="var(--color-panel)" />
      <rect width={W} height={H} fill="url(#grid)" />
      {/* Simplified landmass hints */}
      <g opacity="0.35" fill="var(--color-muted)">
        {/* Africa+ME+Asia blob (loose polygons) */}
        <path d={landmassPath(proj)} />
      </g>

      {/* Edges */}
      {edges.map((e) => {
        const a = nodeById.get(e.from_node), b = nodeById.get(e.to_node);
        if (!a || !b) return null;
        const p1 = proj(a.lat, a.lng), p2 = proj(b.lat, b.lng);
        const highlighted = pathSet.has(`${a.id}|${b.id}`);
        const color = e.disabled ? "var(--color-severity-crit)" : risk(e.current_risk);
        return (
          <line
            key={e.id}
            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke={color}
            strokeWidth={highlighted ? 3 : 1.2}
            strokeOpacity={e.disabled ? 0.4 : highlighted ? 1 : 0.55}
            className={highlighted ? "dash-flow" : ""}
            strokeDasharray={e.disabled ? "3 3" : undefined}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((n) => {
        const p = proj(n.lat, n.lng);
        const color =
          n.node_type === "chokepoint" ? "var(--color-severity-high)" :
          n.node_type === "refinery" ? "var(--color-accent-cyan)" :
          n.node_type === "port" ? "var(--color-accent-amber)" :
          "var(--color-accent-emerald)";
        const r = n.node_type === "chokepoint" ? 6 : n.node_type === "refinery" ? 5 : 4;
        return (
          <g key={n.id} className="cursor-pointer" onClick={() => onNodeClick?.(n.id)}>
            {n.node_type === "chokepoint" && (
              <circle cx={p.x} cy={p.y} r={16} fill="url(#glow-primary)" />
            )}
            <circle
              cx={p.x} cy={p.y} r={r}
              fill={color}
              stroke="var(--color-background)"
              strokeWidth={1.5}
            />
            <text
              x={p.x + r + 3} y={p.y + 3}
              fill="var(--color-foreground)"
              fontSize={9}
              className="mono"
              opacity={n.node_type === "supplier" || n.node_type === "chokepoint" ? 0.9 : 0.7}
            >
              {shortName(n.name)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function shortName(n: string) {
  return n.length > 22 ? n.slice(0, 20) + "…" : n;
}

// Very rough continental hints — not accurate cartography, just spatial context.
function landmassPath(proj: (lat: number, lng: number) => { x: number; y: number }) {
  const pts = [
    // Africa
    [30, -10], [20, 10], [10, 20], [0, 25], [-15, 30], [-25, 25], [-30, 15], [-20, 10], [-10, 5], [10, -10], [20, -15], [30, -10],
    // Break — actually we'll draw multiple simple regions
  ];
  const d = pts.map((p, i) => {
    const { x, y } = proj(p[0], p[1]);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z";
  // India+ME+SE Asia blob
  const pts2 = [
    [40, 40], [45, 60], [35, 75], [25, 85], [15, 90], [5, 100], [10, 120], [0, 115], [-10, 110], [8, 78], [12, 45], [30, 40], [40, 40],
  ];
  const d2 = pts2.map((p, i) => {
    const { x, y } = proj(p[0], p[1]);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z";
  return d + " " + d2;
}

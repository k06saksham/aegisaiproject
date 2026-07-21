// AEGIS AI Agents — real Lovable AI Gateway calls, server-side only.
// Handlers read process.env inside; module-level imports are client-safe.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  shortestPath,
  computeDRI,
  applyScenario,
  cascadingImpact,
  optimiseSPR,
  type GraphNode,
  type GraphEdge,
} from "@/lib/graph";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL_FAST = "google/gemini-2.5-flash";
const MODEL_SMART = "google/gemini-2.5-pro";

async function callLLM(opts: {
  system: string;
  user: string;
  model?: string;
  json?: boolean;
}): Promise<{ text: string; raw: unknown; error?: string }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { text: "", raw: null, error: "LOVABLE_API_KEY missing" };
  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: opts.model ?? MODEL_FAST,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { text: "", raw: null, error: `LLM ${res.status}: ${body.slice(0, 300)}` };
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? "";
    return { text, raw: data };
  } catch (e) {
    return { text: "", raw: null, error: String(e) };
  }
}

function safeJson<T>(s: string, fallback: T): T {
  try {
    const clean = s.replace(/^```json\s*|^```\s*|```$/gim, "").trim();
    return JSON.parse(clean) as T;
  } catch {
    return fallback;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadGraph(supabase: any) {
  const [nRes, eRes] = await Promise.all([
    supabase.from("nodes").select("*"),
    supabase.from("edges").select("*"),
  ]);
  const nodes = (nRes.data ?? []) as unknown as GraphNode[];
  const edges = (eRes.data ?? []) as unknown as GraphEdge[];
  return { nodes, edges };
}

// ---------- 1. Geopolitical Intelligence Agent ----------
export const analyzeSignal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ signalId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sig } = await supabase.from("signals").select("*").eq("id", data.signalId).single();
    if (!sig) throw new Error("Signal not found");

    await supabase.from("signals").update({ status: "analyzing" }).eq("id", data.signalId);

    const system = `You are the Geopolitical Risk Intelligence Agent for AEGIS AI, focused on India's crude oil imports.
Return STRICT JSON with keys: {
  "summary": "≤240 chars",
  "likely_impact": "≤200 chars",
  "affected_corridors": ["hormuz"|"bab_el_mandeb"|"suez"|"malacca"|"none"],
  "affected_suppliers": ["saudi"|"iraq"|"uae"|"kuwait"|"russia"|"usa"|"nigeria"|"brazil"],
  "disruption_probability_7d": 0..1,
  "severity_estimate": 0..1,
  "confidence": 0..1,
  "recommended_actions": ["≤3 short bullets"],
  "reasoning": "≤300 chars, cite the concrete signal you used"
}`;
    const user = `SIGNAL:
Title: ${sig.title}
Category: ${sig.category}
Region: ${sig.region}
Source: ${sig.source}
Text: ${sig.raw_text}`;

    const start = Date.now();
    const { text, error } = await callLLM({ system, user, json: true });
    const latency = Date.now() - start;

    const parsed = safeJson(text, {
      summary: sig.title,
      likely_impact: "Model unavailable — using deterministic fallback",
      affected_corridors: [sig.region?.toLowerCase().includes("red sea") ? "bab_el_mandeb" : "hormuz"],
      affected_suppliers: [],
      disruption_probability_7d: Math.min(0.9, Number(sig.severity) + 0.1),
      severity_estimate: Number(sig.severity) || 0.5,
      confidence: 0.4,
      recommended_actions: ["Escalate to Adaptive Procurement Agent", "Notify SPR desk"],
      reasoning: error ?? "Fallback deterministic analysis",
    });

    await supabase
      .from("signals")
      .update({
        status: "analyzed",
        analysis: parsed,
        analyzed_at: new Date().toISOString(),
        severity: parsed.severity_estimate,
      })
      .eq("id", data.signalId);

    // audit
    const payload = { signal_id: data.signalId, analysis: parsed, model: MODEL_FAST, latency_ms: latency };
    const hash = await sha256(JSON.stringify(payload));
    await supabase.from("audit_log").insert({
      user_id: userId,
      action: "signal.analyzed",
      payload,
      hash,
    });

    return { analysis: parsed, latency_ms: latency, error };
  });

// ---------- 2. Disruption Scenario Modeller ----------
export const runScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        scenarioKey: z.enum([
          "baseline",
          "hormuz_closure",
          "hormuz_partial",
          "red_sea_shutdown",
          "malacca_incident",
          "opec_cut",
          "cyclone_arabian",
        ]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { nodes, edges } = await loadGraph(supabase);
    const scenarioEdges = data.scenarioKey === "baseline" ? edges : applyScenario(edges, data.scenarioKey);
    const { dri, refineryRisk } = computeDRI(nodes, scenarioEdges);

    const totalCap = refineryRisk.reduce((s, r) => {
      const cap = nodes.find((n) => n.id === r.refineryId)?.capacity_bpd ?? 0;
      return s + (cap ?? 0);
    }, 0);
    const unreachableCap = refineryRisk.reduce((s, r) => {
      const cap = nodes.find((n) => n.id === r.refineryId)?.capacity_bpd ?? 0;
      return s + (!r.bestPath?.reachable ? (cap ?? 0) : 0);
    }, 0);
    const impact = cascadingImpact(dri, unreachableCap / 1000, totalCap / 1000);

    const scenarioRow = await supabase
      .from("scenarios")
      .insert({
        user_id: userId,
        name: scenarioLabel(data.scenarioKey),
        description: scenarioDescription(data.scenarioKey),
        scenario_key: data.scenarioKey,
        params: {},
        active: true,
        impact: { dri, ...impact, refineryRisk },
      })
      .select()
      .single();

    return {
      scenario_id: scenarioRow.data?.id ?? null,
      scenario_key: data.scenarioKey,
      dri,
      impact,
      refineryRisk: refineryRisk.map((r) => ({
        refineryId: r.refineryId,
        refineryName: r.refineryName,
        reachable: r.bestPath?.reachable ?? false,
        totalDays: r.bestPath?.totalDays ?? null,
        worstRisk: r.bestPath?.worstRisk ?? 1,
        path: r.bestPath?.path ?? [],
      })),
      unreachableCap_kbd: unreachableCap / 1000,
      totalCap_kbd: totalCap / 1000,
    };
  });

function scenarioLabel(k: string): string {
  return (
    {
      baseline: "Baseline",
      hormuz_closure: "Strait of Hormuz — Full Closure",
      hormuz_partial: "Strait of Hormuz — Partial Disruption",
      red_sea_shutdown: "Red Sea / Bab-el-Mandeb Shutdown",
      malacca_incident: "Strait of Malacca Incident",
      opec_cut: "OPEC+ Emergency Production Cut",
      cyclone_arabian: "Severe Cyclone — Arabian Sea",
    } as Record<string, string>
  )[k] ?? k;
}
function scenarioDescription(k: string): string {
  return (
    {
      hormuz_closure: "Complete closure. 40–45% of India's crude blocked at source. Requires immediate SPR + reroute.",
      hormuz_partial: "Escalated Iranian activity. Insurance premiums +200%, transit slowdown.",
      red_sea_shutdown: "Houthi attacks force Cape reroute. +14–18 days for African/Med barrels.",
      malacca_incident: "Piracy / accident spike. Impacts Americas + SE Asia imports to East India.",
      opec_cut: "Surprise 2M bpd cut from ME producers. Prices spike; grade mix shifts.",
      cyclone_arabian: "Severe cyclone hits Gujarat ports. West-India ports offline 3–7 days.",
    } as Record<string, string>
  )[k] ?? "Custom scenario";
}

// ---------- 3. Adaptive Procurement Orchestrator ----------
export const recommendProcurement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ scenarioKey: z.string().default("baseline"), refineryId: z.string().default("ref_jamnagar") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const start = Date.now();
    const { supabase, userId } = context;
    const { nodes, edges } = await loadGraph(supabase);
    const scenarioEdges = data.scenarioKey === "baseline" ? edges : applyScenario(edges, data.scenarioKey);

    // Rank suppliers by best-path cost to target refinery
    const suppliers = nodes.filter((n) => n.node_type === "supplier");
    const ranked = suppliers
      .map((s) => {
        const r = shortestPath(nodes, scenarioEdges, s.id, data.refineryId);
        return { supplier: s, result: r };
      })
      .filter((x) => x.result.reachable)
      .sort((a, b) => a.result.totalCost - b.result.totalCost)
      .slice(0, 5);

    const system = `You are the Adaptive Procurement Orchestrator for AEGIS AI. Given ranked alternative crude sources with real graph-derived transit and risk, output ACTIONABLE procurement recommendations for India's OMCs (IOCL/BPCL/HPCL/RIL/Nayara). Consider Indian refinery grade compatibility.
STRICT JSON: {
  "recommendations": [
    {
      "supplier_id": "sup_*",
      "supplier_name": "…",
      "action": "increase|hold|redirect|substitute",
      "target_volume_kbd": 0,
      "grade_notes": "≤120 chars, mention compatibility",
      "eta_days": 0,
      "risk_score": 0..1,
      "cost_index": 0..1,
      "confidence": 0..1,
      "why": "≤160 chars"
    }
  ],
  "executive_summary": "≤200 chars",
  "timeline_hours": 24
}`;
    const user = `TARGET REFINERY: ${nodes.find((n) => n.id === data.refineryId)?.name}
SCENARIO: ${data.scenarioKey}
RANKED CANDIDATES (from graph engine):
${ranked
  .map(
    (x, i) =>
      `${i + 1}. ${x.supplier.name} (${x.supplier.id}) grade=${(x.supplier.metadata as { grade?: string })?.grade ?? "?"} ETA=${x.result.totalDays.toFixed(1)}d worstRisk=${x.result.worstRisk.toFixed(2)}`,
  )
  .join("\n")}`;

    const { text, error } = await callLLM({ system, user, json: true, model: MODEL_FAST });
    const parsed = safeJson(text, {
      recommendations: ranked.slice(0, 4).map((x) => ({
        supplier_id: x.supplier.id,
        supplier_name: x.supplier.name,
        action: "hold",
        target_volume_kbd: 200,
        grade_notes: `Fallback: ${((x.supplier.metadata as { grade?: string })?.grade) ?? "grade unknown"}`,
        eta_days: Math.round(x.result.totalDays),
        risk_score: x.result.worstRisk,
        cost_index: Math.min(1, x.result.totalCost / 300),
        confidence: 0.5,
        why: "Deterministic fallback ranking by graph cost",
      })),
      executive_summary: "Model unavailable — fallback used graph engine ranking",
      timeline_hours: 24,
    });
    const latency = Date.now() - start;

    const rec = await supabase
      .from("recommendations")
      .insert({
        user_id: userId,
        agent: "adaptive_procurement",
        title: `Procurement plan — ${scenarioLabel(data.scenarioKey)}`,
        payload: parsed,
        latency_ms: latency,
      })
      .select()
      .single();

    const hash = await sha256(JSON.stringify({ rec: rec.data?.id, parsed }));
    await supabase.from("audit_log").insert({ user_id: userId, action: "procurement.recommended", payload: { rec_id: rec.data?.id }, hash });

    return { recommendation: parsed, latency_ms: latency, ranked: ranked.map((x) => ({ id: x.supplier.id, days: x.result.totalDays, risk: x.result.worstRisk })), error };
  });

// ---------- 4. Strategic Petroleum Reserve Agent ----------
export const optimiseReserve = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ scenarioKey: z.string().default("baseline") }).parse(d))
  .handler(async ({ data, context }) => {
    const start = Date.now();
    const { supabase, userId } = context;
    const { nodes, edges } = await loadGraph(supabase);
    const scenarioEdges = data.scenarioKey === "baseline" ? edges : applyScenario(edges, data.scenarioKey);
    const { dri, refineryRisk } = computeDRI(nodes, scenarioEdges);

    const unreachableCap = refineryRisk.reduce((s, r) => {
      const cap = nodes.find((n) => n.id === r.refineryId)?.capacity_bpd ?? 0;
      return s + (!r.bestPath?.reachable ? (cap ?? 0) : 0);
    }, 0);
    const supplyGap_kbd = Math.max(300, (unreachableCap + dri * 800_000) / 1000);

    const plan = optimiseSPR({
      currentSPR_kbd_days: 74_000, // India 2025 approx: 39.4 MMT ≈ 74 M barrels
      demand_kbd: 5500,
      supplyGap_kbd,
      horizonDays: 30,
      refillWeeksWhenSafe: 12,
    });

    const latency = Date.now() - start;
    const payload = { dri, supplyGap_kbd, ...plan };

    const rec = await supabase
      .from("recommendations")
      .insert({
        user_id: userId,
        agent: "spr_optimiser",
        title: `SPR drawdown plan — DRI ${(dri * 100).toFixed(0)}%`,
        payload,
        latency_ms: latency,
      })
      .select()
      .single();

    return { plan: payload, latency_ms: latency, recommendation_id: rec.data?.id };
  });

// ---------- 5. Executive Report Agent ----------
export const generateExecReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ scenarioKey: z.string().default("baseline") }).parse(d))
  .handler(async ({ data, context }) => {
    const start = Date.now();
    const { supabase, userId } = context;
    const { data: signals } = await supabase.from("signals").select("*").order("created_at", { ascending: false }).limit(5);
    const { data: recs } = await supabase.from("recommendations").select("*").order("created_at", { ascending: false }).limit(3);

    const system = `You are the Executive Report Agent for AEGIS AI. Draft a MINISTRY-BRIEFING style memo (India MoPNG audience). Grounded, sober, numeric. STRICT JSON: {
  "headline": "≤120 chars",
  "situation": "≤400 chars — what is happening",
  "impact": "≤400 chars — cascading on refineries/prices/GDP",
  "actions_48h": ["3 bullets, verb-first"],
  "risks_watching": ["3 bullets"],
  "confidence": 0..1
}`;
    const user = `SCENARIO: ${data.scenarioKey}
RECENT SIGNALS:
${(signals ?? []).map((s: { title: string; category: string; severity: number }) => `- [${s.category}] sev=${s.severity} — ${s.title}`).join("\n")}
RECENT AGENT OUTPUTS:
${(recs ?? []).map((r: { agent: string; title: string }) => `- ${r.agent}: ${r.title}`).join("\n")}`;

    const { text, error } = await callLLM({ system, user, json: true, model: MODEL_SMART });
    const parsed = safeJson(text, {
      headline: "AEGIS Situation Report — Fallback",
      situation: "LLM unavailable; using deterministic summary of latest 5 signals.",
      impact: "See Cascading Impact panel for numeric estimates from live graph.",
      actions_48h: ["Convene procurement war-room", "Pre-authorise SPR test drawdown", "Notify strategic refinery pairs"],
      risks_watching: ["Iran posture", "Insurance premium jump", "Freight capacity"],
      confidence: 0.35,
    });
    const latency = Date.now() - start;

    const rec = await supabase
      .from("recommendations")
      .insert({ user_id: userId, agent: "executive_brief", title: parsed.headline, payload: parsed, latency_ms: latency })
      .select()
      .single();

    const hash = await sha256(JSON.stringify(parsed));
    await supabase.from("audit_log").insert({ user_id: userId, action: "exec_report.generated", payload: { rec_id: rec.data?.id, hash }, hash });

    return { report: parsed, latency_ms: latency, error };
  });

// ---------- 6. Ingest simulated signal (RAG-lite corpus injection) ----------
const SEED_SIGNALS = [
  { title: "Cyclone Biparjoy path shifts toward Gujarat coast", source: "IMD (simulated)", category: "weather", region: "Arabian Sea", severity: 0.65, raw_text: "IMD upgraded Cyclone Biparjoy to Very Severe Cyclonic Storm with landfall track shifting toward Jakhau/Mundra. Port operations at Mundra & Kandla likely to suspend 48–72h." },
  { title: "Nigeria pipeline sabotage cuts Bonny Light output", source: "Bloomberg (simulated)", category: "commodity", region: "Africa", severity: 0.58, raw_text: "Two pipeline attacks in Rivers State have shut in ~180 kbd of Bonny Light. Restart timing uncertain." },
  { title: "China–Taiwan naval exercise near Bashi Channel", source: "SCMP (simulated)", category: "geopolitical", region: "SE Asia", severity: 0.48, raw_text: "PLAN 3-day live-fire exercise announced near Bashi. Tanker AIS shows early rerouting via northern Luzon Strait." },
  { title: "US Treasury adds 3 tankers to Iran-linked sanctions list", source: "OFAC (simulated)", category: "sanctions", region: "Middle East", severity: 0.52, raw_text: "OFAC designated 3 Suezmax tankers alleged to carry Iranian crude. Shadow-fleet insurance risk rising." },
];
export const ingestDemoSignal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const pick = SEED_SIGNALS[Math.floor(Math.random() * SEED_SIGNALS.length)];
    const { data } = await supabase.from("signals").insert({ ...pick, user_id: userId, status: "new" }).select().single();
    return { signal: data };
  });

// ---------- 7. List / helpers ----------
export const listGraph = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { nodes, edges } = await loadGraph(context.supabase);
    const { dri, refineryRisk } = computeDRI(nodes, edges);
    return { nodes, edges, dri, refineryRisk: refineryRisk.map(r => ({ refineryId: r.refineryId, refineryName: r.refineryName, reachable: r.bestPath?.reachable ?? false, days: r.bestPath?.totalDays ?? null, risk: r.bestPath?.worstRisk ?? 1 })) };
  });

// ---------- audit hash helper ----------
async function sha256(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

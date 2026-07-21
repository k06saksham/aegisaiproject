import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Radar, Layers3, Globe2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AEGIS AI — Energy Supply Resilience OS for India" },
      { name: "description", content: "Multi-agent AI platform that predicts, models, and responds to energy supply disruptions in real time — for India's crude oil supply chain." },
      { property: "og:title", content: "AEGIS AI — Energy Supply Resilience OS" },
      { property: "og:description", content: "Geopolitical Intelligence Agent · Scenario Modeller · Adaptive Procurement · Strategic Reserve Optimiser · Supply Chain Digital Twin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      if (data.session) throw redirect({ to: "/command" });
    }
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/20 border border-primary/40 grid place-items-center">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide">AEGIS AI</div>
              <div className="text-[10px] text-muted-foreground mono uppercase">Energy Supply Resilience OS</div>
            </div>
          </div>
          <Link to="/auth" className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground">
            Enter Console
          </Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div className="text-[11px] mono uppercase tracking-widest text-primary/80 mb-3">
          ET AI Hackathon 2.0 · Problem Statement — Smart Supply Chains for Energy
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
          India imports <span className="mono text-primary">88%</span> of its crude.
          <br />
          <span className="mono text-primary">40–45%</span> of it passes through the Strait of Hormuz.
          <br />
          Our reserves cover just <span className="mono text-primary">9.5 days</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-muted-foreground">
          AEGIS AI is a multi-agent supply-resilience platform. It watches geopolitical, maritime,
          weather, and commodity signals, simulates disruption scenarios on a live knowledge graph of
          suppliers → chokepoints → ports → refineries, and produces procurement + SPR decisions your
          team can act on within hours — not the 47 days industry average.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/auth" className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">
            Sign in / Sign up
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-4 gap-3">
        {[
          { icon: Radar, name: "Geopolitical Intelligence Agent", desc: "Multi-source signal ingestion + LLM analysis into corridor-level disruption probability." },
          { icon: Layers3, name: "Disruption Scenario Modeller", desc: "Hormuz, Red Sea, OPEC cut, cyclone — with explicit, testable cascading-impact formulas." },
          { icon: Globe2, name: "Digital Twin", desc: "Live network of suppliers, chokepoints, ports, refineries, with risk-weighted graph search." },
          { icon: ShieldCheck, name: "SPR & Procurement", desc: "Adaptive Procurement Orchestrator + Strategic Reserve Optimiser with audit-logged decisions." },
        ].map(({ icon: Icon, name, desc }) => (
          <div key={name} className="glass rounded-lg p-4">
            <Icon className="h-5 w-5 text-primary" />
            <div className="text-sm font-medium mt-3">{name}</div>
            <p className="text-xs text-muted-foreground mt-1">{desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Built for ET AI Hackathon 2.0 · Multi-agent AI · Knowledge Graph · RAG · Digital Twin
      </footer>
    </div>
  );
}

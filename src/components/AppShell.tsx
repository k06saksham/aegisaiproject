import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  Globe2,
  Layers3,
  ShoppingCart,
  Fuel,
  FileText,
  ShieldCheck,
  Radar,
  LogOut,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/command", label: "Command Center", icon: Activity },
  { to: "/intelligence", label: "Live Intelligence", icon: Radar },
  { to: "/twin", label: "Digital Twin", icon: Globe2 },
  { to: "/scenarios", label: "Scenario Lab", icon: Layers3 },
  { to: "/procurement", label: "Adaptive Procurement", icon: ShoppingCart },
  { to: "/spr", label: "Strategic Reserve", icon: Fuel },
  { to: "/reports", label: "Executive Reports", icon: FileText },
  { to: "/audit", label: "Audit Log", icon: ShieldCheck },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const loc = useLocation();
  const nav = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 shrink-0 border-r border-border bg-panel/60 backdrop-blur flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/20 border border-primary/40 grid place-items-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide">AEGIS AI</div>
              <div className="text-[10px] text-muted-foreground mono uppercase">Energy Supply Resilience OS</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = loc.pathname === to || loc.pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition " +
                  (active
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent")
                }
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="text-[11px] text-muted-foreground mono truncate">{user?.email}</div>
          <button
            onClick={signOut}
            className="mt-2 w-full flex items-center gap-2 justify-center rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted"
          >
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

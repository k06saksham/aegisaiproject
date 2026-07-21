import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/atoms";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AEGIS AI" },
      { name: "description", content: "Sign in to AEGIS AI, the Energy Supply Resilience OS for India." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/command", replace: true });
    });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name || email.split("@")[0] }, emailRedirectTo: window.location.origin + "/command" },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await router.invalidate();
      nav({ to: "/command", replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const demoLogin = async () => {
    setBusy(true);
    setErr(null);
    const demoEmail = `demo+${Math.random().toString(36).slice(2, 8)}@aegis.dev`;
    const demoPass = "aegis-demo-" + Math.random().toString(36).slice(2, 10);
    try {
      const { error } = await supabase.auth.signUp({
        email: demoEmail,
        password: demoPass,
        options: { data: { display_name: "Analyst (demo)" } },
      });
      if (error) throw error;
      await router.invalidate();
      nav({ to: "/command", replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground px-4">
      <div className="w-full max-w-sm glass rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-md bg-primary/20 border border-primary/40 grid place-items-center">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold">AEGIS AI Console</div>
            <div className="text-[10px] text-muted-foreground mono uppercase">Authorised analysts only</div>
          </div>
        </div>

        <div className="flex text-xs mono uppercase mb-4">
          <button
            className={`flex-1 py-1.5 border-b-2 ${mode === "signin" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            className={`flex-1 py-1.5 border-b-2 ${mode === "signup" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            onClick={() => setMode("signup")}
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="text-[10px] mono uppercase text-muted-foreground">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md bg-input border border-border px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="text-[10px] mono uppercase text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md bg-input border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] mono uppercase text-muted-foreground">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md bg-input border border-border px-3 py-2 text-sm"
            />
          </div>
          {err && <div className="text-xs text-severity-crit">{err}</div>}
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="mt-4 border-t border-border pt-4">
          <button
            onClick={demoLogin}
            disabled={busy}
            className="w-full text-xs mono uppercase text-primary hover:underline disabled:opacity-50"
          >
            → One-click demo login (auto-provision analyst)
          </button>
        </div>
      </div>
    </div>
  );
}

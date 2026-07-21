export function Card({ title, right, children, className = "" }: { title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={"glass rounded-lg " + className}>
      {(title || right) && (
        <div className="px-4 py-3 flex items-center justify-between border-b border-border">
          {title && <div className="text-xs uppercase tracking-wider text-muted-foreground mono">{title}</div>}
          {right}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Stat({ label, value, sub, tone = "default" }: { label: string; value: React.ReactNode; sub?: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const color =
    tone === "good" ? "text-severity-low" :
    tone === "warn" ? "text-severity-med" :
    tone === "bad" ? "text-severity-crit" :
    "text-foreground";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mono">{label}</div>
      <div className={`text-2xl mt-1 mono ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "good" | "warn" | "bad" | "info" }) {
  const cls =
    tone === "good" ? "bg-severity-low/15 text-severity-low border-severity-low/40" :
    tone === "warn" ? "bg-severity-med/15 text-severity-med border-severity-med/40" :
    tone === "bad" ? "bg-severity-crit/15 text-severity-crit border-severity-crit/40" :
    tone === "info" ? "bg-primary/15 text-primary border-primary/40" :
    "bg-muted text-muted-foreground border-border";
  return <span className={"inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] mono uppercase " + cls}>{children}</span>;
}

export function Button({ children, onClick, disabled, variant = "default", size = "md", type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: "default" | "primary" | "ghost" | "danger"; size?: "sm" | "md"; type?: "button" | "submit" }) {
  const base = "inline-flex items-center gap-2 rounded-md border font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const sz = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  const cls =
    variant === "primary" ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" :
    variant === "ghost" ? "border-transparent hover:bg-muted" :
    variant === "danger" ? "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90" :
    "bg-panel border-border hover:bg-muted";
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sz} ${cls}`}>{children}</button>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

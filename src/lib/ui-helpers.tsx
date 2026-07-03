import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function formatINR(n: number, compact = false) {
  if (compact) {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
    if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  }
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatPct(n: number, digits = 2) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function Delta({ value, className }: { value: number; className?: string }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1 font-medium tabular-nums",
        up ? "text-success" : "text-destructive",
        className,
      )}
    >
      <span className="text-[0.7em]">{up ? "▲" : "▼"}</span>
      {formatPct(Math.abs(value))}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  delta?: number;
  hint?: string;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-5 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_oklch(0_0_0/0.6)]",
        accent && "surface-glow",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
      </div>
      <div className="mt-3 text-2xl font-semibold num tracking-tight">{value}</div>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        {typeof delta === "number" && <Delta value={delta} />}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Sparkline({ data, positive = true, className }: { data: number[]; positive?: boolean; className?: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const step = w / (data.length - 1);
  const points = data.map((d, i) => `${i * step},${h - ((d - min) / range) * h}`).join(" ");
  const color = positive ? "oklch(0.74 0.17 155)" : "oklch(0.65 0.22 22)";
  const id = `spark-${Math.random().toString(36).slice(2)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("w-full h-7", className)} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} strokeLinejoin="round" strokeLinecap="round" />
      <polygon fill={`url(#${id})`} points={`0,${h} ${points} ${w},${h}`} />
    </svg>
  );
}

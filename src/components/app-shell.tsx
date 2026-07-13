import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Compass,
  Briefcase,
  BookOpen,
  Bot,
  Brain,
  Sparkles,
  Search,
  Bell,
  Command,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const nav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/explorer", label: "Screener", icon: Compass },
  { to: "/trade", label: "Trade Terminal", icon: Zap },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/journal", label: "Trading Journal", icon: BookOpen },
  { to: "/coach", label: "AI Coach", icon: Bot },
  { to: "/analytics", label: "Behavioral", icon: Brain },
];


export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border/60 bg-sidebar/80 backdrop-blur-xl sticky top-0 h-screen flex flex-col">
        <div className="px-5 pt-5 pb-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative h-9 w-9 rounded-xl grid place-items-center bg-[var(--gradient-emerald)] shadow-[var(--shadow-glow)]">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight leading-none">StockSense</div>
              <div className="text-[10px] text-primary font-medium tracking-widest uppercase mt-1">AI OS</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          <div className="px-3 pb-2 text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">
            Workspace
          </div>
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as "/"}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group relative",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary" />
                )}
                <Icon className={cn("h-4 w-4", active && "text-primary")} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 mt-4">
          <div className="glass rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[11px] font-medium">Markets Open</span>
            </div>
            <div className="text-[10px] text-muted-foreground leading-relaxed">
              NSE · BSE · closes in 2h 14m
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-border/60">
          <div className="flex items-center gap-2.5 px-1">
            <div className="h-8 w-8 rounded-full bg-[var(--gradient-emerald)] grid place-items-center text-xs font-semibold text-primary-foreground">
              AR
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">Arjun Rao</div>
              <div className="text-[10px] text-muted-foreground truncate">Pro · Portfolio ₹18.4L</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl flex items-center gap-3 px-6">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search stocks, sectors, news, or ask AI..."
              className="w-full h-9 pl-9 pr-16 rounded-lg bg-muted/40 border border-border/60 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              <Command className="h-3 w-3" /> K
            </kbd>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
            <button className="h-9 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition flex items-center gap-1.5 border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI
            </button>
          </div>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

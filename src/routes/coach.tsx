import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Sparkles, Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/coach")({
  component: Coach,
  head: () => ({ meta: [{ title: "AI Coach — StockSense AI" }] }),
});

type Msg = { role: "user" | "assistant"; text: string };

const PROMPTS = [
  { icon: "📊", title: "Review my portfolio", body: "Analyze diversification, risk, and suggest rebalancing" },
  { icon: "⚖️", title: "Compare RELIANCE vs TCS", body: "Side-by-side fundamentals, technicals, and outlook" },
  { icon: "🎯", title: "Best sectors this quarter", body: "Which sectors are showing strongest momentum?" },
  { icon: "🧠", title: "Explain my biggest mistake", body: "What patterns should I avoid based on my journal?" },
];

const SEED: Msg[] = [
  { role: "assistant", text: "Hi Arjun — I've reviewed your latest portfolio and journal. Your IT allocation is overweight and confidence-to-outcome correlation is strong (r=0.78). What would you like to explore today?" },
];

function Coach() {
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "user", text },
      { role: "assistant", text: `Here's my analysis on "${text.slice(0, 60)}"...\n\nBased on your portfolio composition and 90-day trading history, three observations stand out. First, your win rate on Breakout setups is 75% versus 44% on Mean Reversion — consider tilting toward the former. Second, your position sizing does not scale with confidence, leaving alpha on the table. Third, consecutive losses trigger revenge trades within 48 hours; enforce a cooldown rule.` },
    ]);
    setInput("");
  };

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto flex flex-col h-[calc(100vh-3.5rem)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-[var(--gradient-emerald)] grid place-items-center shadow-[var(--shadow-glow)]">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">AI Coach</h1>
            <p className="text-[11px] text-muted-foreground">Personalized · trained on your portfolio, trades, and preferences</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
              <div className={cn(
                "h-8 w-8 shrink-0 rounded-lg grid place-items-center",
                m.role === "user" ? "bg-muted/40 border border-border/60" : "bg-[var(--gradient-emerald)]"
              )}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary-foreground" />}
              </div>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "glass rounded-tl-sm"
              )}>
                {m.text}
              </div>
            </div>
          ))}

          {messages.length <= 1 && (
            <div className="mt-6">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Suggested prompts</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PROMPTS.map((p) => (
                  <button key={p.title} onClick={() => send(p.title)}
                    className="text-left p-3.5 rounded-xl glass hover:-translate-y-0.5 transition-all">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{p.icon}</span>
                      <div>
                        <div className="text-sm font-medium">{p.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{p.body}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-2 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about your portfolio, a stock, or a strategy..."
            className="flex-1 bg-transparent text-sm px-3 py-2 resize-none focus:outline-none max-h-32"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim()}
            className="h-9 w-9 shrink-0 grid place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="text-[10px] text-muted-foreground text-center mt-2">
          AI Coach is educational · Not investment advice
        </div>
      </div>
    </AppShell>
  );
}

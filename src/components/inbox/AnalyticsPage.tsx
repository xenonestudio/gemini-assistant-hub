import { useMemo, useState } from "react";
import {
  MessageSquare,
  Bot,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Inbox,
  Activity,
  Zap,
} from "lucide-react";
import { useInbox } from "@/lib/inbox-store";
import { ContactAvatar } from "./Avatar";
import { ChannelBadge } from "./ChannelBadge";
import { cn } from "@/lib/utils";
import type { Channel } from "@/lib/inbox-types";

type RangeKey = "24h" | "7d" | "30d";
const RANGE_HOURS: Record<RangeKey, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };
const RANGE_LABEL: Record<RangeKey, string> = { "24h": "Últimas 24 h", "7d": "Últimos 7 días", "30d": "Últimos 30 días" };

const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  webhook: "Webhook",
  instagram: "Instagram",
  messenger: "Messenger",
};

const CHANNEL_COLOR: Record<Channel, string> = {
  whatsapp: "oklch(0.7 0.16 155)",
  webhook: "oklch(0.7 0.14 250)",
  instagram: "oklch(0.65 0.22 320)",
  messenger: "oklch(0.7 0.16 235)",
};

export function AnalyticsPage() {
  const { conversations, contacts, messages, deals, pipelineStages } = useInbox();
  const [range, setRange] = useState<RangeKey>("7d");

  const now = Date.now();
  const since = now - RANGE_HOURS[range] * 60 * 60 * 1000;
  const prevSince = since - RANGE_HOURS[range] * 60 * 60 * 1000;

  const stats = useMemo(() => {
    const inRange = messages.filter((m) => m.createdAt >= since);
    const prevRange = messages.filter((m) => m.createdAt >= prevSince && m.createdAt < since);

    const inboundNow = inRange.filter((m) => m.sender === "contact").length;
    const inboundPrev = prevRange.filter((m) => m.sender === "contact").length;
    const botNow = inRange.filter((m) => m.sender === "bot").length;
    const botPrev = prevRange.filter((m) => m.sender === "bot").length;
    const agentNow = inRange.filter((m) => m.sender === "agent").length;
    const agentPrev = prevRange.filter((m) => m.sender === "agent").length;

    const activeConvs = conversations.filter((c) => c.lastMessageAt >= since);
    const newConvs = conversations.filter((c) => {
      const first = messages
        .filter((m) => m.conversationId === c.id)
        .sort((a, b) => a.createdAt - b.createdAt)[0];
      return first ? first.createdAt >= since : false;
    });
    const resolved = conversations.filter((c) => c.status === "resolved");

    // Avg response time: time between contact message and next agent/bot reply (same conv)
    const resp: number[] = [];
    const botResp: number[] = [];
    for (const conv of conversations) {
      const thread = messages
        .filter((m) => m.conversationId === conv.id)
        .sort((a, b) => a.createdAt - b.createdAt);
      for (let i = 0; i < thread.length - 1; i++) {
        const cur = thread[i];
        const next = thread[i + 1];
        if (cur.sender === "contact" && next.sender !== "contact" && next.createdAt >= since) {
          const delta = next.createdAt - cur.createdAt;
          resp.push(delta);
          if (next.sender === "bot") botResp.push(delta);
        }
      }
    }
    const avgResp = resp.length ? resp.reduce((a, b) => a + b, 0) / resp.length : 0;
    const avgBotResp = botResp.length ? botResp.reduce((a, b) => a + b, 0) / botResp.length : 0;

    const totalReplies = botNow + agentNow;
    const botShare = totalReplies > 0 ? (botNow / totalReplies) * 100 : 0;
    const resolutionRate = conversations.length > 0 ? (resolved.length / conversations.length) * 100 : 0;

    return {
      inboundNow,
      inboundPrev,
      botNow,
      botPrev,
      agentNow,
      agentPrev,
      activeConvs: activeConvs.length,
      newConvs: newConvs.length,
      resolvedCount: resolved.length,
      avgResp,
      avgBotResp,
      botShare,
      resolutionRate,
    };
  }, [messages, conversations, since, prevSince]);

  // Messages per day (or per hour for 24h) — for the activity chart
  const series = useMemo(() => {
    const buckets: { label: string; ts: number; inbound: number; bot: number; agent: number }[] = [];
    const isHourly = range === "24h";
    const stepMs = isHourly ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const count = isHourly ? 24 : range === "7d" ? 7 : 30;
    for (let i = count - 1; i >= 0; i--) {
      const end = now - i * stepMs;
      const start = end - stepMs;
      const slice = messages.filter((m) => m.createdAt >= start && m.createdAt < end);
      const d = new Date(end);
      const label = isHourly
        ? `${String(d.getHours()).padStart(2, "0")}h`
        : d.toLocaleDateString("es", { day: "2-digit", month: "short" });
      buckets.push({
        label,
        ts: end,
        inbound: slice.filter((m) => m.sender === "contact").length,
        bot: slice.filter((m) => m.sender === "bot").length,
        agent: slice.filter((m) => m.sender === "agent").length,
      });
    }
    return buckets;
  }, [messages, range, now]);

  // Channel breakdown
  const channelStats = useMemo(() => {
    const byChannel: Record<Channel, { conversations: number; messages: number }> = {
      whatsapp: { conversations: 0, messages: 0 },
      webhook: { conversations: 0, messages: 0 },
      instagram: { conversations: 0, messages: 0 },
      messenger: { conversations: 0, messages: 0 },
    };
    for (const c of conversations) {
      const ct = contacts.find((x) => x.id === c.contactId);
      if (!ct) continue;
      byChannel[ct.channel].conversations += 1;
      byChannel[ct.channel].messages += messages.filter(
        (m) => m.conversationId === c.id && m.createdAt >= since,
      ).length;
    }
    return (Object.keys(byChannel) as Channel[])
      .map((ch) => ({ channel: ch, ...byChannel[ch] }))
      .sort((a, b) => b.conversations - a.conversations);
  }, [conversations, contacts, messages, since]);

  // Top contacts by message count in range
  const topContacts = useMemo(() => {
    return contacts
      .map((c) => {
        const convs = conversations.filter((cv) => cv.contactId === c.id);
        const msgs = messages.filter(
          (m) => convs.some((cv) => cv.id === m.conversationId) && m.createdAt >= since,
        ).length;
        return { contact: c, msgs };
      })
      .filter((x) => x.msgs > 0)
      .sort((a, b) => b.msgs - a.msgs)
      .slice(0, 5);
  }, [contacts, conversations, messages, since]);

  // Pipeline metrics (sales)
  const pipelineMetrics = useMemo(() => {
    const won = deals.filter((d) => {
      const s = pipelineStages.find((st) => st.id === d.stage);
      return s?.type === "won";
    });
    const lost = deals.filter((d) => {
      const s = pipelineStages.find((st) => st.id === d.stage);
      return s?.type === "lost";
    });
    const open = deals.filter((d) => {
      const s = pipelineStages.find((st) => st.id === d.stage);
      return !s?.type || s.type === "open";
    });
    const wonRevenue = won.reduce((sum, d) => sum + d.amount, 0);
    const pipelineValue = open.reduce((sum, d) => sum + d.amount * (d.probability / 100), 0);
    const winRate = won.length + lost.length > 0 ? (won.length / (won.length + lost.length)) * 100 : 0;
    const byStage = pipelineStages.map((s) => ({
      stage: s,
      count: deals.filter((d) => d.stage === s.id).length,
      value: deals.filter((d) => d.stage === s.id).reduce((sum, d) => sum + d.amount, 0),
    }));
    return { won, lost, open, wonRevenue, pipelineValue, winRate, byStage };
  }, [deals, pipelineStages]);

  const fmtMs = (ms: number) => {
    if (!ms) return "—";
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min`;
    const h = Math.round(m / 60);
    return `${h} h`;
  };

  const trend = (now: number, prev: number) => {
    if (prev === 0 && now === 0) return { pct: 0, dir: "flat" as const };
    if (prev === 0) return { pct: 100, dir: "up" as const };
    const diff = ((now - prev) / prev) * 100;
    return { pct: Math.abs(Math.round(diff)), dir: diff >= 0 ? ("up" as const) : ("down" as const) };
  };

  const inboundTrend = trend(stats.inboundNow, stats.inboundPrev);
  const botTrend = trend(stats.botNow, stats.botPrev);

  const maxBucket = Math.max(1, ...series.map((b) => b.inbound + b.bot + b.agent));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-4 border-b bg-card/60 backdrop-blur px-4 py-4 md:px-8 md:py-5">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">Métricas</h1>
          <p className="text-sm text-muted-foreground">Rendimiento del bot, canales y embudo de ventas.</p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-lg border bg-background p-1">
          {(Object.keys(RANGE_LABEL) as RangeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition",
                range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 pb-20 md:px-8 md:pb-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<Inbox className="h-4 w-4" />}
            label="Mensajes entrantes"
            value={stats.inboundNow.toString()}
            trend={inboundTrend}
            sub={`vs período anterior`}
            tone="primary"
          />
          <KpiCard
            icon={<Bot className="h-4 w-4" />}
            label="Respuestas del bot"
            value={stats.botNow.toString()}
            trend={botTrend}
            sub={`${stats.botShare.toFixed(0)}% del total`}
            tone="brand"
          />
          <KpiCard
            icon={<Clock className="h-4 w-4" />}
            label="Tiempo de respuesta"
            value={fmtMs(stats.avgResp)}
            sub={`Bot: ${fmtMs(stats.avgBotResp)}`}
            tone="warning"
          />
          <KpiCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Tasa de resolución"
            value={`${stats.resolutionRate.toFixed(0)}%`}
            sub={`${stats.resolvedCount}/${conversations.length} conversaciones`}
            tone="success"
          />
        </div>

        {/* Activity chart */}
        <Card className="mt-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Actividad de mensajes</h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <Legend color="oklch(0.7 0.04 250)" label="Entrantes" />
              <Legend color="var(--primary)" label="Bot" />
              <Legend color="oklch(0.65 0.2 145)" label="Agente" />
            </div>
          </div>
          <div className="flex h-44 items-end gap-1.5">
            {series.map((b, i) => {
              const total = b.inbound + b.bot + b.agent;
              const h = total > 0 ? (total / maxBucket) * 100 : 0;
              const inboundH = total > 0 ? (b.inbound / total) * 100 : 0;
              const botH = total > 0 ? (b.bot / total) * 100 : 0;
              const agentH = total > 0 ? (b.agent / total) * 100 : 0;
              return (
                <div key={i} className="group relative flex flex-1 flex-col items-center justify-end">
                  <div className="w-full rounded-md overflow-hidden bg-muted/30" style={{ height: `${Math.max(h, 4)}%` }}>
                    {total > 0 ? (
                      <div className="flex h-full w-full flex-col-reverse">
                        <div style={{ height: `${inboundH}%`, background: "oklch(0.75 0.04 250)" }} />
                        <div style={{ height: `${botH}%`, background: "var(--primary)" }} />
                        <div style={{ height: `${agentH}%`, background: "oklch(0.65 0.2 145)" }} />
                      </div>
                    ) : null}
                  </div>
                  <div className="absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md group-hover:block">
                    {b.label} · {total} msg
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            {series
              .filter((_, i) => i % Math.ceil(series.length / 7) === 0)
              .map((b, i) => (
                <span key={i}>{b.label}</span>
              ))}
          </div>
        </Card>

        {/* Two-column row: channels + top contacts */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Conversaciones por canal</h3>
            </div>
            <div className="space-y-3">
              {channelStats.map((cs) => {
                const total = channelStats.reduce((s, x) => s + x.conversations, 0);
                const pct = total > 0 ? (cs.conversations / total) * 100 : 0;
                return (
                  <div key={cs.channel}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <ChannelBadge channel={cs.channel} />
                        <span className="font-medium">{CHANNEL_LABEL[cs.channel]}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {cs.conversations} conv · {cs.messages} msg
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: CHANNEL_COLOR[cs.channel] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Contactos más activos</h3>
            </div>
            {topContacts.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin actividad en este período.</p>
            ) : (
              <ul className="space-y-2">
                {topContacts.map(({ contact: c, msgs }) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50">
                    <ContactAvatar name={c.name} color={c.avatarColor} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{c.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {CHANNEL_LABEL[c.channel]} · {c.phone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{msgs}</div>
                      <div className="text-[10px] text-muted-foreground">mensajes</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Sales pipeline metrics */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-success" />
              <h3 className="text-sm font-semibold">Ingresos cerrados</h3>
            </div>
            <div className="text-2xl font-bold">${pipelineMetrics.wonRevenue.toLocaleString()}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {pipelineMetrics.won.length} oportunidades ganadas
            </p>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Pipeline ponderado</h3>
            </div>
            <div className="text-2xl font-bold">${Math.round(pipelineMetrics.pipelineValue).toLocaleString()}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {pipelineMetrics.open.length} oportunidades abiertas
            </p>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-warning-foreground" />
              <h3 className="text-sm font-semibold">Win rate</h3>
            </div>
            <div className="text-2xl font-bold">{pipelineMetrics.winRate.toFixed(0)}%</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {pipelineMetrics.won.length} ganadas / {pipelineMetrics.lost.length} perdidas
            </p>
          </Card>
        </div>

        {/* Pipeline distribution */}
        <Card className="mt-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Distribución del embudo</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {pipelineMetrics.byStage.map(({ stage, count, value }) => (
              <div
                key={stage.id}
                className="rounded-xl border bg-background p-3"
                style={{ borderTopColor: stage.accent, borderTopWidth: 3 }}
              >
                <div className="text-[11px] font-medium text-muted-foreground">{stage.label}</div>
                <div className="mt-1 text-lg font-bold">{count}</div>
                <div className="text-[11px] text-muted-foreground">${value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)] md:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  trend,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  trend?: { pct: number; dir: "up" | "down" | "flat" };
  tone: "primary" | "brand" | "warning" | "success";
}) {
  const toneClass = {
    primary: "bg-primary-soft text-primary",
    brand: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning-foreground",
    success: "bg-success/15 text-success",
  }[tone];

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between">
        <div className={cn("grid h-8 w-8 place-items-center rounded-lg", toneClass)}>{icon}</div>
        {trend && trend.dir !== "flat" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
              trend.dir === "up" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
            )}
          >
            {trend.dir === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend.pct}%
          </span>
        )}
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</div>
      {sub && <div className="mt-1 text-[10px] text-muted-foreground/80">{sub}</div>}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
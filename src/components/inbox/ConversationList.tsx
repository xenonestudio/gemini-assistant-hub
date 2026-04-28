import { useMemo, useState } from "react";
import { Search, Filter, CheckCircle2, Mail, MailOpen, Trash2, Pause, Play, Ban, ShieldOff } from "lucide-react";
import { useInbox } from "@/lib/inbox-store";
import { ContactAvatar } from "./Avatar";
import { ChannelBadge } from "./ChannelBadge";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { MoreMenu, type MenuAction } from "./MoreMenu";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";

export function ConversationList() {
  const {
    conversations, contacts, selectedConversationId, selectConversation, messages,
    resolveConversation, deleteConversation, toggleUnread, toggleBotPause,
    toggleBlockContact, resumeBot,
  } = useInbox();
  const { isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"open" | "resolved" | "all">("open");

  const items = useMemo(() => {
    return conversations
      .filter((c) => (tab === "all" ? true : c.status === tab))
      .map((c) => {
        const contact = contacts.find((ct) => ct.id === c.contactId)!;
        const last = [...messages].reverse().find((m) => m.conversationId === c.id);
        return { conv: c, contact, last };
      })
      .filter(({ contact, last }) => {
        if (!q) return true;
        const n = q.toLowerCase();
        return contact.name.toLowerCase().includes(n) || (last?.text.toLowerCase().includes(n) ?? false);
      })
      .sort((a, b) => b.conv.lastMessageAt - a.conv.lastMessageAt);
  }, [conversations, contacts, messages, q, tab]);

  return (
    <div className="flex w-full md:w-[340px] shrink-0 flex-col border-r bg-card">
      <div className="border-b px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Bandeja</h2>
          <button className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted">
            <Filter className="h-4 w-4" />
          </button>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar conversación..."
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="mt-3 flex gap-1 rounded-lg bg-secondary p-1">
          {(["open", "resolved", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {t === "open" ? "Abiertas" : t === "resolved" ? "Resueltas" : "Todas"}
            </button>
          ))}
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {items.map(({ conv, contact, last }) => {
          const active = conv.id === selectedConversationId;
          const paused = conv.botPausedUntil && conv.botPausedUntil > Date.now();
          const itemActions: MenuAction[] = [
            {
              label: conv.status === "open" ? "Marcar resuelta" : "Reabrir",
              icon: CheckCircle2,
              onClick: () => {
                resolveConversation(conv.id);
                toast.success(conv.status === "open" ? "Conversación resuelta" : "Conversación reabierta");
              },
            },
            {
              label: conv.unread > 0 ? "Marcar como leída" : "Marcar como no leída",
              icon: conv.unread > 0 ? MailOpen : Mail,
              onClick: () => toggleUnread(conv.id),
            },
            {
              label: paused ? "Reactivar bot" : "Pausar bot 30 min",
              icon: paused ? Play : Pause,
              onClick: () => {
                if (paused) {
                  resumeBot(conv.id);
                  toast.success("Bot reactivado");
                } else {
                  toggleBotPause(conv.id);
                  toast("Bot pausado");
                }
              },
              divider: true,
            },
            {
              label: contact.blocked ? "Desbloquear contacto" : "Bloquear contacto",
              icon: contact.blocked ? ShieldOff : Ban,
              onClick: () => {
                toggleBlockContact(contact.id);
                toast(contact.blocked ? "Contacto desbloqueado" : "Contacto bloqueado");
              },
              destructive: !contact.blocked,
            },
            {
              label: "Eliminar conversación",
              icon: Trash2,
              onClick: () => {
                if (typeof window !== "undefined" && !window.confirm("¿Eliminar esta conversación?")) return;
                deleteConversation(conv.id);
                toast.success("Conversación eliminada");
              },
              destructive: true,
              divider: true,
              hidden: !isAdmin,
            },
          ];
          return (
            <li key={conv.id}>
              <div
                className={cn(
                  "group relative flex w-full gap-3 border-l-2 px-4 py-3 transition",
                  active
                    ? "border-l-primary bg-primary-soft/40"
                    : "border-l-transparent hover:bg-muted/40",
                )}
              >
                <button
                  onClick={() => selectConversation(conv.id)}
                  className="flex flex-1 min-w-0 gap-3 text-left"
                >
                  <ContactAvatar name={contact.name} color={contact.avatarColor} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-sm font-semibold">{contact.name}</span>
                        <ChannelBadge channel={contact.channel} />
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground" suppressHydrationWarning>
                        {formatDistanceToNowStrict(conv.lastMessageAt, { locale: es, addSuffix: false })}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {last?.sender === "agent" && <span className="font-medium text-foreground/70">Tú: </span>}
                        {last?.sender === "bot" && <span className="font-medium text-primary">Bot: </span>}
                        {last?.text}
                      </p>
                      <div className="flex shrink-0 items-center gap-1">
                        {contact.blocked && (
                          <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                            Bloqueado
                          </span>
                        )}
                        {!contact.saved && !contact.blocked && (
                          <span className="rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground">
                            No guardado
                          </span>
                        )}
                        {paused && !contact.blocked && (
                          <span className="rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground">
                            Pausado
                          </span>
                        )}
                        {conv.unread > 0 && (
                          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <MoreMenu actions={itemActions} align="right" variant="vertical" title="Opciones de la conversación" />
                </div>
              </div>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="px-4 py-12 text-center text-sm text-muted-foreground">Sin conversaciones</li>
        )}
      </ul>
    </div>
  );
}
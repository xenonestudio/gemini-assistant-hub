import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { initialContacts, initialConversations, initialDeals, initialMessages } from "./inbox-data";
import {
  BOT_PAUSE_MS,
  DEFAULT_AI_SETTINGS,
  DEFAULT_ACCOUNT_SETTINGS,
  DEAL_STAGES,
  type AISettings,
  type AccountSettings,
  type Attachment,
  type Contact,
  type Conversation,
  type Deal,
  type DealComment,
  type DealStage,
  type Message,
  type PipelineStage,
} from "./inbox-types";

interface InboxState {
  contacts: Contact[];
  conversations: Conversation[];
  messages: Message[];
  selectedConversationId: string | null;
  selectConversation: (id: string | null) => void;
  /** Contact id of a draft (not-yet-persisted) conversation. The chat opens with this contact, but no entry appears in the inbox until the agent sends the first message. */
  draftContactId: string | null;
  /** Begin a draft conversation with a contact. If a real conversation already exists, it is selected instead. */
  startDraftConversation: (contactId: string) => void;
  /** Discard the current draft (without sending). */
  cancelDraftConversation: () => void;
  sendAgentMessage: (conversationId: string, text: string) => void;
  /** Send an agent message with optional quoted reply */
  sendAgentReply: (conversationId: string, text: string, replyToId?: string | null) => void;
  toggleBlockContact: (contactId: string) => void;
  resumeBot: (conversationId: string) => void;
  markAsRead: (conversationId: string) => void;
  resolveConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  toggleUnread: (conversationId: string) => void;
  toggleBotPause: (conversationId: string) => void;
  /** Simulates an incoming message from a contact (for the demo webhook button) */
  simulateIncoming: (contactId: string, text: string) => void;
  // Contact CRUD
  addContact: (input: Omit<Contact, "id" | "createdAt" | "blocked" | "tags" | "avatarColor" | "saved"> & { tags?: string[]; blocked?: boolean; avatarColor?: string; saved?: boolean }) => string;
  updateContact: (contactId: string, patch: Partial<Pick<Contact, "name" | "phone" | "email" | "channel" | "tags">>) => void;
  deleteContact: (contactId: string) => void;
  /** Mark an unsaved (unknown-number) contact as saved, optionally updating its data. */
  saveContact: (contactId: string, patch?: Partial<Pick<Contact, "name" | "email" | "tags" | "channel" | "phone">>) => void;
  addContactTag: (contactId: string, tag: string) => void;
  removeContactTag: (contactId: string, tag: string) => void;
  selectContactChat: (contactId: string) => void;
  // Sales pipeline
  deals: Deal[];
  selectedDealId: string | null;
  selectDeal: (id: string | null) => void;
  moveDeal: (dealId: string, stage: DealStage) => void;
  updateDeal: (dealId: string, patch: Partial<Pick<Deal, "title" | "amount" | "currency" | "probability" | "expectedCloseAt" | "owner" | "tags">>) => void;
  addDealAttachment: (dealId: string, attachment: Omit<Attachment, "id" | "createdAt">) => void;
  removeDealAttachment: (dealId: string, attachmentId: string) => void;
  addDealComment: (dealId: string, text: string, author?: string) => void;
  createDeal: (input: { title: string; contactId: string; stage?: DealStage; amount?: number; currency?: string }) => string;
  deleteDeal: (dealId: string) => void;
  deleteDealComment: (dealId: string, commentId: string) => void;
  // Pipeline stages (customizable funnel)
  pipelineStages: PipelineStage[];
  addPipelineStage: (stage: Omit<PipelineStage, "id"> & { id?: string }) => string;
  updatePipelineStage: (id: string, patch: Partial<Omit<PipelineStage, "id">>) => void;
  removePipelineStage: (id: string, fallbackId?: string) => void;
  reorderPipelineStage: (id: string, direction: -1 | 1) => void;
  resetPipelineStages: () => void;
  // AI settings
  aiSettings: AISettings;
  updateAISettings: (patch: Partial<AISettings>) => void;
  resetAISettings: () => void;
  // Account
  account: AccountSettings;
  updateAccount: (patch: Partial<AccountSettings>) => void;
  resetAccount: () => void;
  deleteAccount: () => void;
<<<<<<< Updated upstream
=======
  // WhatsApp connection
  whatsappQr: string | null;
  whatsappStatus: 'connected' | 'disconnected' | 'loading' | 'error';
  whatsappSession: any | null;
  logoutWhatsapp: () => Promise<void>;
>>>>>>> Stashed changes
}

const InboxContext = createContext<InboxState | null>(null);

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const AVATAR_COLORS = [
  "oklch(0.7 0.18 25)",
  "oklch(0.65 0.2 145)",
  "oklch(0.65 0.2 280)",
  "oklch(0.7 0.18 60)",
  "oklch(0.65 0.2 200)",
  "oklch(0.6 0.22 320)",
  "oklch(0.7 0.16 100)",
  "oklch(0.55 0.22 15)",
];

export function InboxProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>("v1");
  const [draftContactId, setDraftContactId] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(initialDeals[0]?.id ?? null);
  const [aiSettings, setAISettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [account, setAccount] = useState<AccountSettings>(DEFAULT_ACCOUNT_SETTINGS);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(DEAL_STAGES);
<<<<<<< Updated upstream
=======
  const [isLoading, setIsLoading] = useState(true);
  const [whatsappQr, setWhatsappQr] = useState<string | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<'connected' | 'disconnected' | 'loading' | 'error'>('loading');
  const [whatsappSession, setWhatsappSession] = useState<any | null>(null);

  // Carga inicial de datos
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargamos contactos, conversaciones y configuración en paralelo
        const [contactsData, convsData, configData] = await Promise.all([
          apiFetch("/api/contactos"),
          apiFetch("/api/conversaciones"),
          apiFetch("/api/config")
        ]);

        const mappedConversations: Conversation[] = convsData.map((c: any) => ({
          id: c.whatsapp_id,
          contactId: c.whatsapp_id,
          unread: 0,
          lastMessageAt: new Date(c.fecha_ultimo_mensaje).getTime(),
          status: "open",
          botPausedUntil: null,
        }));

        // Mapear configuración de la DB al estado de la IA
        const aiMap: Partial<AISettings> = {};
        configData.forEach((item: { clave: string; valor: string }) => {
          if (item.clave === "bot_enabled") aiMap.enabled = item.valor === "true";
          if (item.clave === "model_name") aiMap.model = item.valor as any;
          if (item.clave === "system_prompt") aiMap.systemPrompt = item.valor;
          if (item.clave === "temperature") aiMap.temperature = parseFloat(item.valor);
          if (item.clave === "max_tokens") aiMap.maxTokens = parseInt(item.valor);
          if (item.clave === "response_delay") aiMap.responseDelaySec = parseFloat(item.valor);
          if (item.clave === "pause_after_agent") aiMap.pauseAfterAgentMin = parseInt(item.valor);
        });

        if (Object.keys(aiMap).length > 0) {
          setAISettings(prev => ({ ...prev, ...aiMap }));
        }

        // Si hay conversaciones de gente que no está en nuestra tabla 'contactos' aún,
        // creamos contactos temporales para que se puedan visualizar.
        const augmentedContacts = [...contactsData];
        mappedConversations.forEach(conv => {
          if (!augmentedContacts.find(ct => ct.id === conv.contactId)) {
            augmentedContacts.push({
              id: conv.contactId,
              name: conv.contactId.split('@')[0],
              phone: conv.contactId.split('@')[0],
              channel: "whatsapp",
              tags: [],
              blocked: false,
              avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
              saved: false,
              createdAt: conv.lastMessageAt
            });
          }
        });

        setContacts(augmentedContacts);
        setConversations(mappedConversations);
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Sockets para actualizaciones en tiempo real
  useEffect(() => {
    socket.on("nuevo_mensaje", (data) => {
      // Si el mensaje es de 'admin' (nosotros), ya lo añadimos localmente
      // para que sea instantáneo. Solo lo añadimos vía socket si es del contacto.
      if (data.rol === 'admin') return;

      const msg: Message = {
        id: uid(),
        conversationId: data.whatsapp_id,
        sender: "contact", // Si no es admin, es el contacto
        text: data.mensaje,
        createdAt: Date.now(),
        replyToId: data.replyToId
      };

      setMessages((prev) => [...prev, msg]);
      
      // Actualizamos la conversación en la lista
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.whatsapp_id 
            ? { ...c, lastMessageAt: msg.createdAt, unread: selectedConversationId === c.id ? 0 : c.unread + 1 } 
            : c
        )
      );
    });

    socket.on("whatsapp_status", (status) => setWhatsappStatus(status));
    socket.on("qr", (qr) => setWhatsappQr(qr));
    socket.on("whatsapp_session", (session) => setWhatsappSession(session));

    return () => {
      socket.off("nuevo_mensaje");
      socket.off("whatsapp_status");
      socket.off("qr");
      socket.off("whatsapp_session");
    };
  }, [selectedConversationId]);

  // Cargar mensajes cuando se selecciona una conversación
  useEffect(() => {
    if (!selectedConversationId) return;

    const loadMessages = async () => {
      try {
        const data = await apiFetch(`/api/mensajes/${selectedConversationId}`);
        const mappedMessages: Message[] = data.map((m: any) => ({
          id: m.id.toString(),
          conversationId: m.whatsapp_id,
          sender: m.rol === "admin" ? "agent" : m.rol === "bot" ? "bot" : "contact",
          text: m.mensaje,
          createdAt: new Date(m.timestamp).getTime(),
        }));
        setMessages(mappedMessages);
      } catch (error) {
        console.error("Error cargando mensajes:", error);
      }
    };

    loadMessages();
  }, [selectedConversationId]);

  // Sockets para mensajes en tiempo real
  useEffect(() => {
    const onNuevoMensaje = (datos: any) => {
      const { whatsapp_id, rol, mensaje, timestamp, nombre } = datos;

      const newMsg: Message = {
        id: Math.random().toString(36).slice(2, 11),
        conversationId: whatsapp_id,
        sender: rol === "admin" ? "agent" : rol === "bot" ? "bot" : "contact",
        text: mensaje,
        createdAt: new Date(timestamp).getTime(),
      };

      setMessages((prev) => {
        // Evitar duplicados si el mensaje ya llegó por carga inicial
        if (prev.some((m) => m.text === mensaje && Math.abs(m.createdAt - newMsg.createdAt) < 2000)) {
          return prev;
        }
        return [...prev, newMsg];
      });

      setConversations((prev) => {
        const exists = prev.find((c) => c.id === whatsapp_id);
        if (exists) {
          return prev.map((c) =>
            c.id === whatsapp_id
              ? { ...c, lastMessageAt: newMsg.createdAt, unread: c.id === selectedConversationId ? 0 : c.unread + 1 }
              : c,
          ).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
        } else {
          // Nueva conversación
          const newConv: Conversation = {
            id: whatsapp_id,
            contactId: whatsapp_id,
            unread: 1,
            lastMessageAt: newMsg.createdAt,
            status: "open",
            botPausedUntil: null,
          };
          return [newConv, ...prev];
        }
      });

      // Actualizar contacto si es nuevo
      setContacts((prev) => {
        if (prev.find((c) => c.id === whatsapp_id)) return prev;
        const newContact: Contact = {
          id: whatsapp_id,
          name: nombre || whatsapp_id.split("@")[0],
          phone: whatsapp_id.split("@")[0],
          channel: "whatsapp",
          tags: [],
          blocked: false,
          avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
          saved: !!nombre,
          createdAt: new Date(timestamp).getTime(),
        };
        return [newContact, ...prev];
      });
    };

    socket.on("nuevo_mensaje", onNuevoMensaje);
    
    socket.on("qr", (qr: string) => {
      setWhatsappQr(qr);
      setWhatsappStatus('disconnected');
    });

    socket.on("whatsapp_status", (status: any) => {
      setWhatsappStatus(status);
      if (status === 'connected') {
        setWhatsappQr(null);
        loadWhatsappSession();
      } else {
        setWhatsappSession(null);
      }
    });

    return () => {
      socket.off("nuevo_mensaje", onNuevoMensaje);
      socket.off("qr");
      socket.off("whatsapp_status");
    };
  }, [selectedConversationId]);
>>>>>>> Stashed changes

  // Tick every 30s so the "bot paused" countdown re-renders
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  const selectConversation = useCallback((id: string | null) => {
    setSelectedConversationId(id);
    if (id) setDraftContactId(null);
    if (id) {
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    }
  }, []);

<<<<<<< Updated upstream
  const startDraftConversation = useCallback((contactId: string) => {
    // If a real conversation exists for this contact, open it instead of a draft.
    const existing = conversations.find((c) => c.contactId === contactId);
    if (existing) {
      setDraftContactId(null);
      setSelectedConversationId(existing.id);
      setConversations((prev) => prev.map((c) => (c.id === existing.id ? { ...c, unread: 0 } : c)));
      return;
    }
    setSelectedConversationId(null);
    setDraftContactId(contactId);
  }, [conversations]);

  const cancelDraftConversation = useCallback(() => {
    setDraftContactId(null);
=======
  const selectContactChat = useCallback((contactId: string) => {
    setConversations((prev) => {
      const exists = prev.find((c) => c.contactId === contactId);
      if (exists) return prev;

      const newConv: Conversation = {
        id: contactId,
        contactId,
        unread: 0,
        lastMessageAt: Date.now(),
        status: "open",
        botPausedUntil: null,
      };
      return [newConv, ...prev];
    });
    setSelectedConversationId(contactId);
>>>>>>> Stashed changes
  }, []);

  const markAsRead = useCallback((conversationId: string) => {
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)));
  }, []);

  const sendAgentMessage = useCallback((conversationId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
<<<<<<< Updated upstream
    // If this is a draft conversation id, materialize it first.
    let realId = conversationId;
    if (conversationId.startsWith("draft:")) {
      const contactId = conversationId.slice("draft:".length);
      realId = uid();
      const newConv: Conversation = {
        id: realId,
        contactId,
        unread: 0,
        lastMessageAt: Date.now(),
        status: "open",
        botPausedUntil: null,
      };
      setConversations((prev) => [newConv, ...prev]);
      setDraftContactId(null);
      setSelectedConversationId(realId);
    }
    const newMsg: Message = {
      id: uid(),
      conversationId: realId,
      sender: "agent",
      text: trimmed,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === realId
          ? { ...c, lastMessageAt: newMsg.createdAt, botPausedUntil: Date.now() + BOT_PAUSE_MS, unread: 0 }
          : c,
      ),
    );
  }, []);

  const sendAgentReply = useCallback((conversationId: string, text: string, replyToId?: string | null) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    let realId = conversationId;
    if (conversationId.startsWith("draft:")) {
      const contactId = conversationId.slice("draft:".length);
      realId = uid();
      const newConv: Conversation = {
        id: realId,
        contactId,
        unread: 0,
        lastMessageAt: Date.now(),
        status: "open",
        botPausedUntil: null,
      };
      setConversations((prev) => [newConv, ...prev]);
      setDraftContactId(null);
      setSelectedConversationId(realId);
    }
    const newMsg: Message = {
=======
    const newMessage: Message = {
>>>>>>> Stashed changes
      id: uid(),
      conversationId: realId,
      sender: "agent",
      text: trimmed,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);

    // Actualizamos el timestamp de la conversación para que suba en la lista
    setConversations((prev) =>
      prev.map((c) =>
<<<<<<< Updated upstream
        c.id === realId
          ? { ...c, lastMessageAt: newMsg.createdAt, botPausedUntil: Date.now() + BOT_PAUSE_MS, unread: 0 }
          : c,
      ),
=======
        c.id === conversationId ? { ...c, lastMessageAt: newMessage.createdAt, unread: 0 } : c
      )
>>>>>>> Stashed changes
    );

    try {
      await apiFetch("/api/enviar-manual", {
        method: "POST",
        body: JSON.stringify({ whatsapp_id: conversationId, mensaje: text }),
      });
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      toast.error("Error al enviar mensaje al servidor");
    }
  }, []);

  const sendAgentReply = useCallback(
    async (conversationId: string, text: string, replyToId?: string | null) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const newMessage: Message = {
        id: uid(),
        conversationId,
        sender: "agent",
        text: trimmed,
        createdAt: Date.now(),
        replyToId: replyToId ?? undefined,
      };
      setMessages((prev) => [...prev, newMessage]);

      // Actualizamos el timestamp de la conversación
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, lastMessageAt: newMessage.createdAt, unread: 0 } : c
        )
      );

      try {
        await apiFetch("/api/enviar-manual", {
          method: "POST",
          body: JSON.stringify({ 
            whatsapp_id: conversationId, 
            mensaje: text,
            replyToId 
          }),
        });
      } catch (error) {
        console.error("Error enviando respuesta:", error);
        toast.error("Error al enviar respuesta");
      }
    },
    [],
  );

  const toggleBlockContact = useCallback((contactId: string) => {
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, blocked: !c.blocked } : c)));
  }, []);

  const resumeBot = useCallback((conversationId: string) => {
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, botPausedUntil: null } : c)));
  }, []);

  const resolveConversation = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, status: c.status === "open" ? "resolved" : "open" } : c)),
    );
  }, []);

  const deleteConversation = useCallback((conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    setMessages((prev) => prev.filter((m) => m.conversationId !== conversationId));
    setSelectedConversationId((cur) => (cur === conversationId ? null : cur));
  }, []);

  const toggleUnread = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread: c.unread > 0 ? 0 : 1 } : c)),
    );
  }, []);

  const toggleBotPause = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        const isPaused = c.botPausedUntil && c.botPausedUntil > Date.now();
        return { ...c, botPausedUntil: isPaused ? null : Date.now() + BOT_PAUSE_MS };
      }),
    );
  }, []);

  const simulateIncoming = useCallback((contactId: string, text: string) => {
    const conversation = conversations.find((c) => c.contactId === contactId);
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact || contact.blocked) return; // Bot won't even reply if blocked
    const conv = conversation ?? {
      id: uid(),
      contactId,
      unread: 0,
      lastMessageAt: Date.now(),
      status: "open" as const,
      botPausedUntil: null,
    };
    if (!conversation) setConversations((prev) => [conv, ...prev]);
    const incoming: Message = { id: uid(), conversationId: conv.id, sender: "contact", text, createdAt: Date.now() };
    setMessages((prev) => [...prev, incoming]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id ? { ...c, lastMessageAt: incoming.createdAt, unread: c.id === selectedConversationId ? 0 : c.unread + 1 } : c,
      ),
    );

    // Bot replies if not paused and contact not blocked
    const botActive = !conv.botPausedUntil || conv.botPausedUntil < Date.now();
    if (botActive) {
      setTimeout(() => {
        const reply: Message = {
          id: uid(),
          conversationId: conv.id,
          sender: "bot",
          text: "Recibí tu mensaje. ¿En qué puedo ayudarte? (respuesta generada por Gemini)",
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, reply]);
        setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, lastMessageAt: reply.createdAt } : c)));
      }, 1200);
    }
  }, [contacts, conversations, selectedConversationId]);

  const addContact = useCallback<InboxState["addContact"]>((input) => {
    const id = input.phone.includes('@') ? input.phone : `${input.phone.replace(/\D/g, '')}@c.us`;
    const contact: Contact = {
      id,
      name: input.name,
      phone: input.phone,
      email: input.email,
      channel: input.channel,
      tags: input.tags ?? [],
      blocked: input.blocked ?? false,
      avatarColor: input.avatarColor ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      saved: input.saved ?? true,
      createdAt: Date.now(),
    };
    setContacts((prev) => [contact, ...prev]);
    
    // Guardar en base de datos
    apiFetch("/api/contactos", {
      method: "POST",
      body: JSON.stringify(contact)
    }).catch(err => console.error("Error al guardar contacto:", err));

    return id;
  }, []);

  const updateContact = useCallback<InboxState["updateContact"]>((contactId, patch) => {
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, ...patch } : c)));
    
    // Persistir cambios
    apiFetch(`/api/contactos/${contactId}`, {
      method: "PATCH",
      body: JSON.stringify(patch)
    }).catch(err => console.error("Error al actualizar contacto:", err));
  }, []);

  const deleteContact = useCallback<InboxState["deleteContact"]>((contactId) => {
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
    setConversations((prev) => prev.filter((c) => c.contactId !== contactId));
    
    // Borrar de base de datos
    apiFetch(`/api/contactos/${contactId}`, {
      method: "DELETE"
    }).catch(err => console.error("Error al eliminar contacto:", err));

    setMessages((prev) => {
      const removedConvIds = new Set(
        conversations.filter((c) => c.contactId === contactId).map((c) => c.id),
      );
      return prev.filter((m) => !removedConvIds.has(m.conversationId));
    });
    setSelectedConversationId((cur) => {
      if (!cur) return cur;
      const conv = conversations.find((c) => c.id === cur);
      return conv && conv.contactId === contactId ? null : cur;
    });
  }, [conversations]);

  const saveContact = useCallback<InboxState["saveContact"]>((contactId, patch) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id !== contactId) return c;
        const isPlaceholderColor = !c.avatarColor || c.avatarColor.includes("0.04");
        return {
          ...c,
          ...patch,
          saved: true,
          avatarColor: isPlaceholderColor
            ? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
            : c.avatarColor,
        };
      }),
    );
  }, []);

  const addContactTag = useCallback<InboxState["addContactTag"]>((contactId, tag) => {
    const t = tag.trim();
    if (!t) return;
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId && !c.tags.includes(t) ? { ...c, tags: [...c.tags, t] } : c)),
    );
  }, []);

  const removeContactTag = useCallback<InboxState["removeContactTag"]>((contactId, tag) => {
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, tags: c.tags.filter((x) => x !== tag) } : c)));
  }, []);

  const selectDeal = useCallback((id: string | null) => setSelectedDealId(id), []);

  const moveDeal = useCallback((dealId: string, stage: DealStage) => {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage, updatedAt: Date.now() } : d)));
  }, []);

  const updateDeal = useCallback<InboxState["updateDeal"]>((dealId, patch) => {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, ...patch, updatedAt: Date.now() } : d)));
  }, []);

  const addDealAttachment = useCallback<InboxState["addDealAttachment"]>((dealId, attachment) => {
    const att: Attachment = { ...attachment, id: uid(), createdAt: Date.now() };
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, attachments: [att, ...d.attachments], updatedAt: Date.now() } : d)));
  }, []);

  const removeDealAttachment = useCallback<InboxState["removeDealAttachment"]>((dealId, attachmentId) => {
    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId ? { ...d, attachments: d.attachments.filter((a) => a.id !== attachmentId), updatedAt: Date.now() } : d,
      ),
    );
  }, []);

  const addDealComment = useCallback<InboxState["addDealComment"]>((dealId, text, author = "Tú") => {
    const t = text.trim();
    if (!t) return;
    const c: DealComment = { id: uid(), author, text: t, createdAt: Date.now() };
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, comments: [...d.comments, c], updatedAt: Date.now() } : d)));
  }, []);

  const createDeal = useCallback<InboxState["createDeal"]>((input) => {
    const id = uid();
    const conv = conversations.find((c) => c.contactId === input.contactId);
    const deal: Deal = {
      id,
      title: input.title || "Nueva oportunidad",
      contactId: input.contactId,
      conversationId: conv?.id,
      stage: input.stage ?? "new",
      amount: input.amount ?? 0,
      currency: input.currency ?? "USD",
      probability: 20,
      expectedCloseAt: Date.now() + 1000 * 60 * 60 * 24 * 14,
      owner: "Laura R.",
      tags: [],
      attachments: [],
      comments: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setDeals((prev) => [deal, ...prev]);
    setSelectedDealId(id);
    return id;
  }, [conversations]);

  const deleteDeal = useCallback<InboxState["deleteDeal"]>((dealId) => {
    setDeals((prev) => prev.filter((d) => d.id !== dealId));
    setSelectedDealId((cur) => (cur === dealId ? null : cur));
  }, []);

  const deleteDealComment = useCallback<InboxState["deleteDealComment"]>((dealId, commentId) => {
    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId ? { ...d, comments: d.comments.filter((c) => c.id !== commentId), updatedAt: Date.now() } : d,
      ),
    );
  }, []);

  const updateAISettings = useCallback((patch: Partial<AISettings>) => {
    setAISettings((prev) => {
      const next = { ...prev, ...patch };
      
      // Persistir cambios al backend
      Object.entries(patch).forEach(([key, value]) => {
        let clave = "";
        let valor = String(value);

        if (key === "enabled") clave = "bot_enabled";
        else if (key === "model") clave = "model_name";
        else if (key === "systemPrompt") clave = "system_prompt";
        else if (key === "temperature") clave = "temperature";
        else if (key === "maxTokens") clave = "max_tokens";
        else if (key === "responseDelaySec") clave = "response_delay";
        else if (key === "pauseAfterAgentMin") clave = "pause_after_agent";

        if (clave) {
          apiFetch("/api/config", {
            method: "POST",
            body: JSON.stringify({ clave, valor })
          }).catch(err => console.error(`Error persistiendo ${clave}:`, err));
        }
      });

      return next;
    });
  }, []);
  const resetAISettings = useCallback(() => setAISettings(DEFAULT_AI_SETTINGS), []);

  const updateAccount = useCallback((patch: Partial<AccountSettings>) => {
    setAccount((prev) => ({ ...prev, ...patch }));
  }, []);
  const resetAccount = useCallback(() => setAccount(DEFAULT_ACCOUNT_SETTINGS), []);
  const deleteAccount = useCallback(() => {
    // Demo: limpia datos locales
    setAccount(DEFAULT_ACCOUNT_SETTINGS);
  }, []);

  const addPipelineStage = useCallback<InboxState["addPipelineStage"]>((stage) => {
    const id = stage.id ?? uid();
    setPipelineStages((prev) => {
      // Insert before terminal stages (won/lost) when present
      const terminalIdx = prev.findIndex((s) => s.type === "won" || s.type === "lost");
      const next: PipelineStage = { id, label: stage.label, accent: stage.accent, type: stage.type ?? "open" };
      if (terminalIdx === -1) return [...prev, next];
      return [...prev.slice(0, terminalIdx), next, ...prev.slice(terminalIdx)];
    });
    return id;
  }, []);

  const updatePipelineStage = useCallback<InboxState["updatePipelineStage"]>((id, patch) => {
    setPipelineStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removePipelineStage = useCallback<InboxState["removePipelineStage"]>((id, fallbackId) => {
    setPipelineStages((prev) => {
      if (prev.length <= 2) return prev; // keep at least 2 columns
      const fallback = fallbackId ?? prev.find((s) => s.id !== id)?.id;
      if (fallback) {
        setDeals((ds) => ds.map((d) => (d.stage === id ? { ...d, stage: fallback, updatedAt: Date.now() } : d)));
      }
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const reorderPipelineStage = useCallback<InboxState["reorderPipelineStage"]>((id, direction) => {
    setPipelineStages((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const resetPipelineStages = useCallback(() => setPipelineStages(DEAL_STAGES), []);

  const loadWhatsappSession = useCallback(async () => {
    try {
      const data = await apiFetch("/api/whatsapp/session-info");
      if (data.connected) {
        setWhatsappSession(data);
        setWhatsappStatus('connected');
      }
    } catch (error) {
      console.error("Error cargando sesión de whatsapp:", error);
    }
  }, []);

  const logoutWhatsapp = useCallback(async () => {
    try {
      await apiFetch("/api/whatsapp/logout", { method: "POST" });
      setWhatsappStatus('disconnected');
      setWhatsappSession(null);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      throw error;
    }
  }, []);

  useEffect(() => {
    loadWhatsappSession();
  }, [loadWhatsappSession]);

  const value = useMemo<InboxState>(
    () => ({
      contacts,
      conversations,
      messages,
      selectedConversationId,
      selectConversation,
      draftContactId,
      startDraftConversation,
      cancelDraftConversation,
      sendAgentMessage,
      sendAgentReply,
      toggleBlockContact,
      resumeBot,
      markAsRead,
      resolveConversation,
      deleteConversation,
      toggleUnread,
      toggleBotPause,
      simulateIncoming,
      addContact,
      updateContact,
      deleteContact,
      saveContact,
      addContactTag,
      removeContactTag,
      deals,
      selectedDealId,
      selectDeal,
      moveDeal,
      updateDeal,
      addDealAttachment,
      removeDealAttachment,
      addDealComment,
      createDeal,
      deleteDeal,
      deleteDealComment,
      aiSettings,
      updateAISettings,
      resetAISettings,
      account,
      updateAccount,
      resetAccount,
      deleteAccount,
      pipelineStages,
      addPipelineStage,
      updatePipelineStage,
      removePipelineStage,
      reorderPipelineStage,
      resetPipelineStages,
<<<<<<< Updated upstream
=======
      whatsappQr,
      whatsappStatus,
      whatsappSession,
      logoutWhatsapp,
>>>>>>> Stashed changes
    }),
    [
      contacts,
      conversations,
      messages,
      selectedConversationId,
      selectConversation,
      draftContactId,
      startDraftConversation,
      cancelDraftConversation,
      sendAgentMessage,
      sendAgentReply,
      toggleBlockContact,
      resumeBot,
      markAsRead,
      resolveConversation,
      deleteConversation,
      toggleUnread,
      toggleBotPause,
      simulateIncoming,
      addContact,
      updateContact,
      deleteContact,
      saveContact,
      addContactTag,
      removeContactTag,
      selectContactChat,
      deals,
      selectedDealId,
      selectDeal,
      moveDeal,
      updateDeal,
      addDealAttachment,
      removeDealAttachment,
      addDealComment,
      createDeal,
      deleteDeal,
      deleteDealComment,
      aiSettings,
      updateAISettings,
      resetAISettings,
      account,
      updateAccount,
      resetAccount,
      deleteAccount,
      pipelineStages,
      addPipelineStage,
      updatePipelineStage,
      removePipelineStage,
      reorderPipelineStage,
      resetPipelineStages,
<<<<<<< Updated upstream
=======
      whatsappQr,
      whatsappStatus,
      whatsappSession,
      logoutWhatsapp,
>>>>>>> Stashed changes
    ],
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error("useInbox must be used inside InboxProvider");
  return ctx;
}
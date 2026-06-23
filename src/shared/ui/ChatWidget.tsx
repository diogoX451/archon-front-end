import { useState, useRef, useEffect, useCallback } from "react";
import { withApiBase } from "@shared/api/client";

declare global {
  interface Window {
    gtag_report_conversion?: (url?: string) => boolean;
  }
}

const TENANT_SLUG  = "almexa";
const PROFILE_ID   = "my-almexa";
const TRIGGER_MSG  = "Olá! Quero conhecer o Archon.";
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS        = 150; // 5 min — interim while planner turn latency is reduced

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  pending?: boolean;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function genConversationId() {
  return `widget-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── session persistence ───────────────────────────────────────────────────────
// On-platform funnel: a closed tab must not lose the lead. We persist the
// conversation id + visible messages so a returning visitor resumes instead
// of starting over, and remember whether the conversion already fired.
const LS_PREFIX = `archon_widget_${TENANT_SLUG}_${PROFILE_ID}`;
const LS_CONV = `${LS_PREFIX}_conv`;
const LS_MSGS = `${LS_PREFIX}_msgs`;
const LS_LEAD = `${LS_PREFIX}_lead`;
const LS_ATTR = `archon_widget_attr`; // first-touch ad attribution (shared)

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch { /* private mode / quota — ignore */ }
}

function loadOrCreateConversationId(): string {
  const existing = lsGet(LS_CONV);
  if (existing) return existing;
  const id = genConversationId();
  lsSet(LS_CONV, id);
  return id;
}

function loadMessages(): Message[] {
  const raw = lsGet(LS_MSGS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// captureAttribution stores ad-click params (gclid/utm) on first touch so they
// reach the backend with the turn and get attached to the CRM lead. First-touch
// wins — a later visit without params doesn't overwrite the original source.
function captureAttribution(): Record<string, string> | null {
  const existing = lsGet(LS_ATTR);
  if (existing) {
    try { return JSON.parse(existing); } catch { /* fall through to recapture */ }
  }
  try {
    const p = new URLSearchParams(window.location.search);
    const keys = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    const attr: Record<string, string> = {};
    keys.forEach((k) => { const v = p.get(k); if (v) attr[k] = v; });
    if (Object.keys(attr).length === 0) return null;
    attr.landing_url = window.location.href;
    if (document.referrer) attr.referrer = document.referrer;
    lsSet(LS_ATTR, JSON.stringify(attr));
    return attr;
  } catch { return null; }
}

async function postTurn(
  conversationId: string,
  message: string,
  metadata?: Record<string, string> | null,
): Promise<string> {
  const body: Record<string, unknown> = { profile_id: PROFILE_ID, conversation_id: conversationId, message };
  if (metadata && Object.keys(metadata).length) body.metadata = metadata;
  const res = await fetch(withApiBase(`/api/v1/public/widget/${TENANT_SLUG}/turns`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`turn failed: ${res.status}`);
  const data = await res.json();
  return data.workflow_id as string;
}

async function pollResult(workflowId: string): Promise<string | null> {
  const res = await fetch(
    withApiBase(`/api/v1/public/widget/${TENANT_SLUG}/result/${workflowId}`)
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status === "completed" && data.response) return data.response as string;
  if (data.status === "failed") return "Desculpe, ocorreu um erro. Tente novamente.";
  return null;
}

export function ChatWidget() {
  const restored                      = useRef<Message[]>(loadMessages());
  const [open, setOpen]               = useState(false);
  const [messages, setMessages]       = useState<Message[]>(restored.current);
  const [input, setInput]             = useState("");
  const [waiting, setWaiting]         = useState(false);
  // A restored conversation has already been "started" — don't replay the
  // auto greeting over the visitor's existing history.
  const [started, setStarted]         = useState(restored.current.length > 0);
  const conversationIdRef             = useRef<string>(loadOrCreateConversationId());
  const attributionRef                = useRef<Record<string, string> | null>(captureAttribution());
  const bottomRef                     = useRef<HTMLDivElement>(null);
  const inputRef                      = useRef<HTMLInputElement>(null);
  const leadFiredRef                  = useRef(lsGet(LS_LEAD) === "1");

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Persist the conversation (settled messages only — never the pending
  // typing bubble) so a returning visitor resumes where they left off.
  useEffect(() => {
    const settled = messages.filter((m) => !m.pending && !(m.role === "user" && m.text === ""));
    lsSet(LS_MSGS, JSON.stringify(settled));
  }, [messages]);

  useEffect(() => {
    if (open && !started) {
      setStarted(true);
      void sendMessage(TRIGGER_MSG, true);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sendMessage = useCallback(async (text: string, isAuto = false) => {
    if (waiting) return;

    const userMsg: Message = { id: genId(), role: "user", text };
    if (!isAuto) setMessages((prev) => [...prev, userMsg]);
    else setMessages([{ ...userMsg, text: "" }]); // hide auto trigger from user

    const pendingId = genId();
    setMessages((prev) => [...prev, { id: pendingId, role: "assistant", text: "", pending: true }]);
    setWaiting(true);

    try {
      const workflowId = await postTurn(conversationIdRef.current, text, attributionRef.current);

      // Dispara conversão GA4 somente na primeira mensagem real do usuário
      // (não no trigger automático) e somente após o backend confirmar recebimento.
      if (!isAuto && !leadFiredRef.current) {
        leadFiredRef.current = true;
        lsSet(LS_LEAD, "1");
        if (typeof window.gtag_report_conversion === "function") {
          window.gtag_report_conversion();
        }
      }
      let polls = 0;
      const interval = setInterval(async () => {
        polls++;
        try {
          const response = await pollResult(workflowId);
          if (response !== null) {
            clearInterval(interval);
            setMessages((prev) =>
              prev.map((m) => m.id === pendingId ? { ...m, text: response, pending: false } : m)
            );
            setWaiting(false);
          } else if (polls >= MAX_POLLS) {
            clearInterval(interval);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === pendingId
                  ? { ...m, text: "Demorou mais que o esperado. Tente novamente.", pending: false }
                  : m
              )
            );
            setWaiting(false);
          }
        } catch {
          clearInterval(interval);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingId ? { ...m, text: "Erro ao buscar resposta.", pending: false } : m
            )
          );
          setWaiting(false);
        }
      }, POLL_INTERVAL_MS);
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId ? { ...m, text: "Não foi possível enviar. Tente novamente.", pending: false } : m
        )
      );
      setWaiting(false);
    }
  }, [waiting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || waiting) return;
    setInput("");
    void sendMessage(text);
  };

  const visibleMessages = messages.filter((m) => !(m.role === "user" && m.text === ""));

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar chat" : "Falar com o Assist"}
        style={fabStyle}
      >
        {open ? closeIcon : chatIcon}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={panelStyle} role="dialog" aria-label="Chat Assist">
          {/* Header */}
          <div style={headerStyle}>
            <div style={headerAvatar}>A</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Assist · Archon</div>
              <div style={{ fontSize: 12, color: "var(--ok, #48bb78)" }}>● online</div>
            </div>
            <button onClick={() => setOpen(false)} style={closeBtn} aria-label="Fechar">✕</button>
          </div>

          {/* Messages */}
          <div style={bodyStyle}>
            {visibleMessages.length === 0 && (
              <div style={emptyStyle}>Iniciando conversa…</div>
            )}
            {visibleMessages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "82%",
                }}
              >
                <div style={m.role === "user" ? userBubble : assistantBubble}>
                  {m.pending ? <TypingDots /> : m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} style={formStyle}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem…"
              disabled={waiting}
              style={inputStyle}
              maxLength={1000}
            />
            <button type="submit" disabled={waiting || !input.trim()} style={sendBtn}>
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6, height: 6, borderRadius: 999,
            background: "currentColor", opacity: 0.5,
            display: "inline-block",
            animation: `dotPulse 1.2s ${i * 0.18}s infinite ease-in-out`,
          }}
        />
      ))}
    </span>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const fabStyle: React.CSSProperties = {
  position: "fixed", bottom: 24, right: 24, zIndex: 1000,
  width: 56, height: 56, borderRadius: 999,
  background: "var(--ink, #1a1a1a)", color: "var(--surface, #fff)",
  border: "none", cursor: "pointer", fontSize: 22,
  display: "flex", alignItems: "center", justifyContent: "center",
  boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
  transition: "transform 0.15s ease",
};

const panelStyle: React.CSSProperties = {
  position: "fixed", bottom: 92, right: 24, zIndex: 999,
  width: 360, maxHeight: 520,
  background: "var(--surface, #fff)",
  border: "1px solid var(--line, #e5e5e5)",
  borderRadius: 18, boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
  display: "flex", flexDirection: "column", overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "12px 14px", borderBottom: "1px solid var(--line, #e5e5e5)",
  background: "var(--surface, #fff)",
};

const headerAvatar: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 999,
  background: "linear-gradient(135deg, var(--accent, #6c63ff), #a78bfa)",
  color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 15,
  flexShrink: 0,
};

const closeBtn: React.CSSProperties = {
  marginLeft: "auto", background: "none", border: "none",
  cursor: "pointer", color: "var(--ink-3, #888)", fontSize: 14, padding: 4,
};

const bodyStyle: React.CSSProperties = {
  flex: 1, overflowY: "auto", padding: "14px 12px",
  display: "flex", flexDirection: "column", gap: 10, minHeight: 0,
};

const emptyStyle: React.CSSProperties = {
  color: "var(--ink-3, #888)", fontSize: 13, textAlign: "center", margin: "auto",
};

const userBubble: React.CSSProperties = {
  background: "var(--ink, #1a1a1a)", color: "var(--surface, #fff)",
  padding: "9px 13px", borderRadius: 14, borderBottomRightRadius: 4,
  fontSize: 14, lineHeight: 1.45,
};

const assistantBubble: React.CSSProperties = {
  background: "var(--surface-2, #f5f5f5)", color: "var(--ink, #1a1a1a)",
  border: "1px solid var(--line, #e5e5e5)",
  padding: "9px 13px", borderRadius: 14, borderBottomLeftRadius: 4,
  fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap",
};

const formStyle: React.CSSProperties = {
  display: "flex", gap: 8, padding: "10px 12px",
  borderTop: "1px solid var(--line, #e5e5e5)",
};

const inputStyle: React.CSSProperties = {
  flex: 1, border: "1px solid var(--line, #e5e5e5)",
  borderRadius: 999, padding: "8px 14px",
  fontSize: 14, outline: "none",
  background: "var(--surface-2, #f5f5f5)",
  color: "var(--ink, #1a1a1a)",
};

const sendBtn: React.CSSProperties = {
  background: "var(--ink, #1a1a1a)", color: "var(--surface, #fff)",
  border: "none", borderRadius: 999, width: 36, height: 36,
  cursor: "pointer", fontSize: 14, flexShrink: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
};

const chatIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const closeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

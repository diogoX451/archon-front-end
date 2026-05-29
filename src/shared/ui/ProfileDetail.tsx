import { useState } from "react";
import type { ConversationProfileV2 } from "@shared/api/profiles";
import { GLYPHS } from "@shared/ui/icons/glyphs";
import { GlyphPlanner } from "@shared/ui/icons/Icons";
import { AGENT_TYPES } from "@features/workflow-builder/data";
import { useTenants } from "@shared/hooks/useTenants";

// Inline styles live in a single string so callers don't have to import
// CSS in every place ProfileDetail is mounted. The drawer adds its own
// chrome (backdrop, fixed positioning) on top.
//
// Layout strategy: every container that holds the KV grid is set up as
// a CSS container so .pd-grid-2 collapses to a single column when the
// holder is narrower than ~360px. Falls back gracefully on older
// browsers (single column everywhere — still legible, just less dense).
const STYLES = `
.pd-root { container-type: inline-size; min-width: 0; }
.pd-section { border: 1px solid var(--line); border-radius: var(--r-2); background: var(--surface-2); overflow: hidden; }
.pd-section + .pd-section { margin-top: 10px; }
.pd-section-head { width: 100%; background: transparent; border: 0; padding: 10px 12px; display: flex; align-items: center; gap: 8px; cursor: pointer; text-align: left; }
.pd-section-head:hover { background: var(--surface); }
.pd-section-title { font-weight: 600; font-size: 12.5px; }
.pd-section-count { font-family: var(--font-mono); font-size: 11px; color: var(--ink-4); background: var(--surface); padding: 1px 6px; border-radius: 4px; }
.pd-section-body { padding: 10px 12px; border-top: 1px solid var(--line); background: var(--surface); min-width: 0; }
.pd-arrow { display: inline-block; transition: transform 120ms ease; color: var(--ink-3); font-size: 10px; }
.pd-arrow[data-open="true"] { transform: rotate(90deg); }
.pd-grid-2 { display: grid; grid-template-columns: 1fr; gap: 8px 16px; }
@container (min-width: 380px) { .pd-grid-2 { grid-template-columns: 1fr 1fr; } }
.pd-kv { display: flex; gap: 8px; font-size: 12px; line-height: 1.5; min-width: 0; }
.pd-kv .pd-k { color: var(--ink-4); flex: 0 0 84px; font-size: 11px; padding-top: 1px; text-transform: uppercase; letter-spacing: 0.04em; }
.pd-kv .pd-v { color: var(--ink); flex: 1 1 auto; min-width: 0; word-break: break-word; overflow-wrap: anywhere; }
.pd-kv .pd-v.mono { font-family: var(--font-mono); font-size: 11.5px; }
.pd-text { font-size: 12.5px; line-height: 1.55; color: var(--ink); white-space: pre-wrap; background: var(--surface-2); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--line); max-height: 320px; overflow: auto; }
.pd-json { background: var(--surface-2); border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 10.5px; line-height: 1.45; overflow: auto; white-space: pre; font-family: var(--font-mono); margin: 0; max-width: 100%; }
.pd-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.pd-agent { border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; background: var(--surface-2); display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.pd-agent-head { display: flex; gap: 10px; align-items: center; min-width: 0; }
.pd-glyph { width: 28px; height: 28px; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; display: grid; place-items: center; color: var(--ink-2); flex: 0 0 28px; }
.pd-agent-id { font-family: var(--font-mono); font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pd-agent-sub { margin-top: 2px; }
.pd-action { border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; background: var(--surface); display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.pd-action-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 12.5px; }
.pd-action-desc { font-size: 11.5px; color: var(--ink-3); line-height: 1.45; }
.pd-id { font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-4); }
`;

interface ProfileDetailProps {
  profile: ConversationProfileV2;
  /** When true, omits the global <style> tag — caller already injected it. */
  styleInjected?: boolean;
}

function Section({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number | string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="pd-section">
      <button className="pd-section-head" onClick={() => setOpen((o) => !o)} type="button">
        <span className="pd-arrow" data-open={open}>▸</span>
        <span className="pd-section-title">{title}</span>
        {count != null && <span className="pd-section-count">{count}</span>}
      </button>
      {open && <div className="pd-section-body">{children}</div>}
    </div>
  );
}

function KeyValue({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="pd-kv">
      <span className="pd-k">{k}</span>
      <span className={`pd-v${mono ? " mono" : ""}`}>{v ?? <em style={{ color: "var(--ink-4)" }}>{"—"}</em>}</span>
    </div>
  );
}

function JsonBlock({ value, maxHeight = 400 }: { value: unknown; maxHeight?: number }) {
  return (
    <pre className="pd-json" style={{ maxHeight }}>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function safeArray<T = any>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function safeObject(v: unknown): Record<string, any> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {};
}

function EntryConditionsView({ cfg }: { cfg: Record<string, any> }) {
  const firstIn = safeArray<string>(cfg.first_message_in);
  const firstRegex = safeArray<string>(cfg.first_message_matches);
  const channels = safeArray<string>(cfg.channel_in);
  const recipients = safeArray<string>(cfg.recipient_in);
  const onReject = typeof cfg.on_reject === "string" ? cfg.on_reject : "silent_drop";
  const rejectReply = typeof cfg.reject_reply === "string" ? cfg.reject_reply : "";

  const onRejectTone = onReject === "reply" ? "warn" : "neutral";
  const onRejectLabel = onReject === "reply" ? "responder com mensagem" : "descartar silenciosamente";

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontSize: 11, color: "var(--ink-4)" }}>
        Aplicado apenas na <strong>primeira mensagem</strong> de uma conversa. Todas as regras presentes são combinadas (AND); listas internas são OR.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="pill" data-tone={onRejectTone}>
          <span className="dot" /> ao rejeitar: {onRejectLabel}
        </span>
        {firstIn.length > 0 && <span className="pill" data-tone="ok">{firstIn.length} mensagem(ns) exata(s)</span>}
        {firstRegex.length > 0 && <span className="pill" data-tone="ok">{firstRegex.length} regex</span>}
        {channels.length > 0 && <span className="pill" data-tone="ok">canais: {channels.join(", ")}</span>}
        {recipients.length > 0 && <span className="pill" data-tone="ok">{recipients.length} destinatário(s)</span>}
      </div>

      {firstIn.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 4 }}>Mensagens exatas aceitas (case-insensitive):</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {firstIn.map((s, i) => <li key={i} style={{ fontFamily: "var(--mono)" }}>"{s}"</li>)}
          </ul>
        </div>
      )}

      {firstRegex.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 4 }}>Padrões regex aceitos:</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, fontFamily: "var(--mono)" }}>
            {firstRegex.map((s, i) => <li key={i}>/{s}/</li>)}
          </ul>
        </div>
      )}

      {onReject === "reply" && rejectReply && (
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 4 }}>Resposta ao rejeitar:</div>
          <div style={{ fontSize: 12, padding: "6px 8px", background: "var(--bg-2)", borderRadius: 4 }}>{rejectReply}</div>
        </div>
      )}
    </div>
  );
}

function PlannerAgentDetail({ config }: { config: Record<string, any> }) {
  const actions = safeArray<any>(config.actions);
  const providers = safeObject(safeObject(config.metadata).providers);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="pd-grid-2">
        <KeyValue k="mode" v={config.mode} mono />
        <KeyValue k="need_type" v={config.need_type} mono />
        <KeyValue k="provider" v={config.provider} mono />
        <KeyValue k="model" v={config.model} mono />
      </div>

      {Object.keys(providers).length > 0 && (
        <Section title="Providers por fase" defaultOpen={false}>
          <div style={{ display: "grid", gap: 6 }}>
            {Object.entries(providers).map(([phase, info]: any) => (
              <div key={phase} className="pd-row">
                <span className="pill" data-tone="muted" style={{ minWidth: 100 }}>{phase}</span>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-2)" }}>
                  {info?.provider}/{info?.model}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {typeof config.instructions === "string" && config.instructions.length > 0 && (
        <Section title="Instructions" defaultOpen={false}>
          <div className="pd-text">{config.instructions}</div>
        </Section>
      )}

      {actions.length > 0 && (
        <Section title="Actions do planner" count={actions.length}>
          <div style={{ display: "grid", gap: 8 }}>
            {actions.map((a: any, i: number) => (
              <div key={i} className="pd-action">
                <div className="pd-action-head">
                  <span className="mono" style={{ fontWeight: 600 }}>{a.name}</span>
                  {a.agent_type && (
                    <span className="pill" data-tone="muted">→ {a.agent_type}</span>
                  )}
                  {a.need_type && (
                    <span className="pill" data-tone="warn" style={{ fontFamily: "var(--font-mono)" }}>
                      need: {a.need_type}
                    </span>
                  )}
                </div>
                {a.description && (
                  <div className="pd-action-desc">{a.description}</div>
                )}
                {a.config && Object.keys(a.config).length > 0 && (
                  <JsonBlock value={a.config} maxHeight={200} />
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {config.response_schema && (
        <Section title="Response schema (planner)" defaultOpen={false}>
          <JsonBlock value={config.response_schema} />
        </Section>
      )}
    </div>
  );
}

function AgentDetail({ agent }: { agent: any }) {
  const type = agent?.type || "—";
  const meta = AGENT_TYPES[type];
  const Glyph = meta ? ((GLYPHS as any)[meta.glyph] || GlyphPlanner) : GlyphPlanner;
  const config = safeObject(agent?.config);

  return (
    <div className="pd-agent">
      <div className="pd-agent-head">
        <div className="pd-glyph"><Glyph size={14} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pd-agent-id">{agent?.id || "—"}</div>
          <div className="pd-agent-sub">
            <span className="pill">{type}</span>
            {meta?.category && <span style={{ marginLeft: 6, color: "var(--ink-4)", fontSize: 11 }}>{meta.category}</span>}
          </div>
        </div>
      </div>
      {type === "planner" ? (
        <PlannerAgentDetail config={config} />
      ) : Object.keys(config).length > 0 ? (
        <JsonBlock value={config} maxHeight={260} />
      ) : (
        <div style={{ color: "var(--ink-4)", fontSize: 12 }}>sem config</div>
      )}
    </div>
  );
}

/**
 * Renders a full conversation profile in a stack of collapsible sections.
 * The exact same render is used by /templates' drawer and by the builder's
 * "Profile" tab — keeps the view consistent so changes here propagate to
 * both surfaces.
 */
export function ProfileDetail({ profile, styleInjected = false }: ProfileDetailProps) {
  const { data: tenants } = useTenants();
  const tenant = tenants?.find((t) => t.id === profile.tenant_id);
  // Prefer human-readable tenant name; UUID stays internal so URLs and
  // labels never expose the slug or backend id.
  const tenantLabel = tenant ? `${tenant.name} · ${tenant.slug}` : (profile.tenant_id ? "global" : "—");

  const agents = safeArray(profile.agents);
  const connections = safeArray(profile.connections);
  const metadata = safeObject(profile.metadata);
  const inputDefaults = profile.input_defaults;
  const memorySchema = profile.memory_schema;
  const ui = safeObject(metadata.ui);
  const plannerUI = safeObject(metadata.planner_ui);
  const dialoguePolicy = safeObject(metadata.dialogue_policy);
  const entryConditions = safeObject(metadata.entry_conditions);

  const otherMeta = Object.fromEntries(
    Object.entries(metadata).filter(
      ([k]) => k !== "ui" && k !== "planner_ui" && k !== "dialogue_policy" && k !== "entry_conditions",
    ),
  );

  return (
    <div className="pd-root" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!styleInjected && <style dangerouslySetInnerHTML={{ __html: STYLES }} />}

      <Section title="Identidade" defaultOpen>
        <div className="pd-grid-2">
          <KeyValue k="nome" v={profile.profile_id} mono />
          <KeyValue k="tenant" v={tenantLabel} />
          <KeyValue k="user_id_prefix" v={profile.user_id_prefix} mono />
          <KeyValue k="executor_type" v={profile.executor_type} mono />
          <KeyValue k="atualizado" v={profile.updated_at ? new Date(profile.updated_at).toLocaleString("pt-BR") : "—"} />
          <KeyValue k="criado" v={profile.created_at ? new Date(profile.created_at).toLocaleString("pt-BR") : "—"} />
        </div>
      </Section>

      <Section title="Agents" count={agents.length}>
        <div style={{ display: "grid", gap: 10 }}>
          {agents.length === 0 && (
            <div style={{ color: "var(--ink-4)", fontSize: 12 }}>Sem agentes definidos.</div>
          )}
          {agents.map((a: any, i: number) => (
            <AgentDetail key={a?.id || i} agent={a} />
          ))}
        </div>
      </Section>

      {connections.length > 0 && (
        <Section title="Connections" count={connections.length} defaultOpen={false}>
          <JsonBlock value={connections} maxHeight={240} />
        </Section>
      )}

      {!!memorySchema && (
        <Section title="Memory schema" defaultOpen={false}>
          <JsonBlock value={memorySchema} />
        </Section>
      )}

      {!!inputDefaults && (
        <Section title="Input defaults" defaultOpen={false}>
          <JsonBlock value={inputDefaults} maxHeight={200} />
        </Section>
      )}

      {Object.keys(plannerUI).length > 0 && (
        <Section title="Planner UI (botões / clarify)" defaultOpen={false}>
          <JsonBlock value={plannerUI} />
        </Section>
      )}

      {Object.keys(dialoguePolicy).length > 0 && (
        <Section title="Dialogue policy (slots / next_step)" defaultOpen={false}>
          <JsonBlock value={dialoguePolicy} />
        </Section>
      )}

      {Object.keys(entryConditions).length > 0 && (
        <Section title="Entry conditions (filtro de entrada)" defaultOpen>
          <EntryConditionsView cfg={entryConditions} />
        </Section>
      )}

      {Object.keys(ui).length > 0 && (
        <Section title="UI metadata (posições do canvas)" defaultOpen={false}>
          <JsonBlock value={ui} maxHeight={240} />
        </Section>
      )}

      {Object.keys(otherMeta).length > 0 && (
        <Section title="Outros metadata" defaultOpen={false}>
          <JsonBlock value={otherMeta} />
        </Section>
      )}

      <Section title="JSON cru completo" defaultOpen={false}>
        <JsonBlock value={profile} maxHeight={500} />
      </Section>
    </div>
  );
}

// Header card kept separate so callers can put it outside the scrolling
// region (e.g. above a sticky inspector body). Shows the human-friendly
// name + description while keeping the backend id out of the URL bar.
export function ProfileHeader({ profile }: { profile: ConversationProfileV2 }) {
  const { data: tenants } = useTenants();
  const tenant = tenants?.find((t) => t.id === profile.tenant_id);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <div style={{
        fontWeight: 600, fontSize: 13.5, fontFamily: "var(--font-mono)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {profile.profile_id}
      </div>
      {profile.description && (
        <div style={{
          color: "var(--ink-3)", fontSize: 11.5, lineHeight: 1.4,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {profile.description}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
        {tenant && <span className="pill" data-tone="muted">{tenant.name}</span>}
        {profile.executor_type && (
          <span className="pill" style={{ fontFamily: "var(--font-mono)" }}>{profile.executor_type}</span>
        )}
      </div>
    </div>
  );
}

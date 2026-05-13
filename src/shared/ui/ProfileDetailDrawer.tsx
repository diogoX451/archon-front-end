import { useState } from "react";
import type { ConversationProfileV2 } from "@shared/api/profiles";
import { GLYPHS, GlyphPlanner } from "@shared/ui/icons/Icons";
import { AGENT_TYPES } from "@features/workflow-builder/data";

interface Props {
  open: boolean;
  profile: ConversationProfileV2 | null;
  onClose: () => void;
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
      <button className="pd-section-head" onClick={() => setOpen((o) => !o)}>
        <span className="pd-arrow" data-open={open}>▸</span>
        <span className="pd-section-title">{title}</span>
        {count != null && <span className="pd-section-count">{count}</span>}
      </button>
      {open && <div className="pd-section-body">{children}</div>}
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="pd-kv">
      <span className="pd-k">{k}</span>
      <span className={`pd-v${mono ? " mono" : ""}`}>{v ?? <em style={{ color: "var(--ink-4)" }}>—</em>}</span>
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

function PlannerAgentDetail({ config }: { config: Record<string, any> }) {
  const actions = safeArray<any>(config.actions);
  const providers = safeObject(safeObject(config.metadata).providers);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="pd-grid-2">
        <KV k="mode" v={config.mode} mono />
        <KV k="need_type" v={config.need_type} mono />
        <KV k="provider" v={config.provider} mono />
        <KV k="model" v={config.model} mono />
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

export function ProfileDetailDrawer({ open, profile, onClose }: Props) {
  if (!open || !profile) return null;
  const agents = safeArray(profile.agents);
  const connections = safeArray(profile.connections);
  const metadata = safeObject(profile.metadata);
  const inputDefaults = profile.input_defaults;
  const memorySchema = profile.memory_schema;
  const ui = safeObject(metadata.ui);
  const plannerUI = safeObject(metadata.planner_ui);
  const dialoguePolicy = safeObject(metadata.dialogue_policy);

  const otherMeta = Object.fromEntries(
    Object.entries(metadata).filter(([k]) => k !== "ui" && k !== "planner_ui" && k !== "dialogue_policy"),
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .pd-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 90; }
        .pd-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(720px, 100vw); background: var(--surface); border-left: 1px solid var(--line); z-index: 91; display: flex; flex-direction: column; box-shadow: var(--shadow-3); }
        .pd-head { padding: 14px 18px; border-bottom: 1px solid var(--line); display: flex; gap: 10px; align-items: flex-start; }
        .pd-head-title { font-weight: 600; font-size: 14px; font-family: var(--font-mono); }
        .pd-head-desc { color: var(--ink-3); font-size: 12px; margin-top: 4px; line-height: 1.4; }
        .pd-body { flex: 1; overflow-y: auto; padding: 12px 18px; display: flex; flex-direction: column; gap: 12px; }
        .pd-section { border: 1px solid var(--line); border-radius: var(--r-2); background: var(--surface-2); overflow: hidden; }
        .pd-section-head { width: 100%; background: transparent; border: 0; padding: 10px 12px; display: flex; align-items: center; gap: 8px; cursor: pointer; text-align: left; }
        .pd-section-head:hover { background: var(--surface); }
        .pd-section-title { font-weight: 600; font-size: 12.5px; }
        .pd-section-count { font-family: var(--font-mono); font-size: 11px; color: var(--ink-4); background: var(--surface); padding: 1px 6px; border-radius: 4px; }
        .pd-section-body { padding: 10px 12px; border-top: 1px solid var(--line); background: var(--surface); }
        .pd-arrow { display: inline-block; transition: transform 120ms ease; color: var(--ink-3); font-size: 10px; }
        .pd-arrow[data-open="true"] { transform: rotate(90deg); }
        .pd-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
        .pd-kv { display: flex; gap: 8px; font-size: 12px; line-height: 1.5; }
        .pd-kv .pd-k { color: var(--ink-4); min-width: 96px; font-size: 11px; padding-top: 1px; }
        .pd-kv .pd-v { color: var(--ink); flex: 1; word-break: break-word; }
        .pd-kv .pd-v.mono { font-family: var(--font-mono); font-size: 11.5px; }
        .pd-text { font-size: 12.5px; line-height: 1.55; color: var(--ink); white-space: pre-wrap; background: var(--surface-2); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--line); max-height: 320px; overflow: auto; }
        .pd-json { background: var(--surface-2); border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; font-size: 10.5px; line-height: 1.45; overflow: auto; white-space: pre; font-family: var(--font-mono); }
        .pd-row { display: flex; gap: 8px; align-items: center; }
        .pd-agent { border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; background: var(--surface-2); display: flex; flex-direction: column; gap: 8px; }
        .pd-agent-head { display: flex; gap: 10px; align-items: center; }
        .pd-glyph { width: 28px; height: 28px; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; display: grid; place-items: center; color: var(--ink-2); }
        .pd-agent-id { font-family: var(--font-mono); font-size: 12px; font-weight: 600; }
        .pd-agent-sub { margin-top: 2px; }
        .pd-action { border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; background: var(--surface); display: flex; flex-direction: column; gap: 6px; }
        .pd-action-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 12.5px; }
        .pd-action-desc { font-size: 11.5px; color: var(--ink-3); line-height: 1.45; }
      `}} />
      <div className="pd-backdrop" onClick={onClose} />
      <aside className="pd-drawer">
        <div className="pd-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pd-head-title">{profile.profile_id || profile.id}</div>
            {profile.description && <div className="pd-head-desc">{profile.description}</div>}
          </div>
          <button className="btn ghost" onClick={onClose} style={{ padding: "4px 10px" }}>Fechar</button>
        </div>

        <div className="pd-body">
          <Section title="Identidade" defaultOpen>
            <div className="pd-grid-2">
              <KV k="profile_id" v={profile.profile_id} mono />
              <KV k="tenant_id" v={profile.tenant_id} mono />
              <KV k="user_id_prefix" v={profile.user_id_prefix} mono />
              <KV k="user_id" v={profile.user_id} mono />
              <KV k="executor_type" v={profile.executor_type} mono />
              <KV k="updated_at" v={profile.updated_at ? new Date(profile.updated_at).toLocaleString("pt-BR") : "—"} />
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
      </aside>
    </>
  );
}

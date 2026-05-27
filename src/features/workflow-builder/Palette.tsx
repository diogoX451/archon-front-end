import React, { useState, useMemo, useRef } from "react";
import { AGENT_TYPES, CATEGORIES, type AgentTypeMetadata } from "./data";
import { GLYPHS } from "@shared/ui/icons/glyphs";
import { IconSearch, GlyphPlanner } from "@shared/ui/icons/Icons";
import { useAuth } from "@app/auth-context";
import { useMCPConfigs } from "@shared/hooks/useMCPConfigs";

type PaletteProps = {
  onStartDrag: (type: string, e: React.MouseEvent) => void;
};

type HoverState = { type: string; top: number; left: number } | null;

const PORT_LABELS: Record<string, string> = {
  input: "input",
  trigger: "trigger",
  query: "query",
  document: "document",
  signal: "signal",
  payload: "payload",
  request: "request",
  output: "output",
  response: "response",
  chunks: "chunks",
  status: "status",
  ack: "ack",
  receipt: "receipt",
};

function PalettePopover({
  type,
  meta,
  top,
  left,
  mcpServers,
  onMouseEnter,
  onMouseLeave,
}: {
  type: string;
  meta: AgentTypeMetadata;
  top: number;
  left: number;
  mcpServers: { name: string; transport: string; enabled: boolean }[];
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const Glyph = (GLYPHS as any)[meta.glyph] || GlyphPlanner;

  return (
    <div
      className="palette-popover"
      style={{ top, left }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="palette-popover-header">
        <div className="palette-popover-glyph">
          <Glyph size={16} />
        </div>
        <div className="palette-popover-title">
          <span className="palette-popover-name">{meta.label}</span>
          <span className="palette-popover-cat">{meta.category}</span>
        </div>
      </div>

      <p className="palette-popover-desc">{meta.description}</p>

      {meta.details && (
        <p className="palette-popover-details">{meta.details}</p>
      )}

      <div className="palette-popover-ports">
        <div className="palette-popover-port-row">
          <span className="palette-popover-port-label">Entrada</span>
          <span className="palette-popover-port-values">
            {meta.ports.principal.map((p) => (
              <code key={p}>{PORT_LABELS[p] ?? p}</code>
            ))}
          </span>
        </div>
        <div className="palette-popover-port-row">
          <span className="palette-popover-port-label">Saída</span>
          <span className="palette-popover-port-values">
            {meta.ports.auxiliary.map((p) => (
              <code key={p}>{PORT_LABELS[p] ?? p}</code>
            ))}
          </span>
        </div>
      </div>

      {type === "mcp" && (
        <div className="palette-popover-mcps">
          <div className="palette-popover-mcps-header">
            MCPs disponíveis
            <span className="palette-popover-mcps-count">{mcpServers.filter((s) => s.enabled).length}</span>
          </div>
          {mcpServers.length === 0 ? (
            <div className="palette-popover-mcps-empty">
              Nenhum MCP configurado.{" "}
              <a href="/mcp-config" target="_blank" rel="noreferrer">
                Configurar →
              </a>
            </div>
          ) : (
            <ul className="palette-popover-mcps-list">
              {mcpServers.map((s) => (
                <li key={s.name} className={s.enabled ? "" : "disabled"}>
                  <span className="mcp-dot" data-enabled={s.enabled} />
                  <span className="mcp-name">{s.name}</span>
                  <span className="mcp-transport">{s.transport}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function Palette({ onStartDrag }: PaletteProps) {
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<HoverState>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>();

  const { activeTenantSlug, isSuper } = useAuth();
  const mcpTenant = isSuper ? undefined : activeTenantSlug || undefined;
  const { data: mcpServers = [] } = useMCPConfigs(mcpTenant);

  const groups = useMemo(() => {
    const byCat: Record<string, typeof AGENT_TYPES[string][]> = {};
    for (const cat of CATEGORIES) byCat[cat] = [];

    for (const [type, meta] of Object.entries(AGENT_TYPES)) {
      if (query) {
        const q = query.toLowerCase();
        if (
          !meta.label.toLowerCase().includes(q) &&
          !type.includes(q) &&
          !meta.description.toLowerCase().includes(q)
        ) {
          continue;
        }
      }
      byCat[meta.category]?.push({ ...meta, type } as any);
    }
    return byCat;
  }, [query]);

  function handleEnter(type: string, e: React.MouseEvent<HTMLDivElement>) {
    clearTimeout(leaveTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const top = Math.max(8, Math.min(rect.top, window.innerHeight - 360));
    setHovered({ type, top, left: rect.right + 8 });
  }

  function handleLeave() {
    leaveTimer.current = setTimeout(() => setHovered(null), 100);
  }

  const hoveredMeta = hovered ? (AGENT_TYPES as any)[hovered.type] as AgentTypeMetadata : null;

  return (
    <>
      <div className="palette" data-tour="builder-palette">
        <div className="panel-header">
          <span>Paleta de Agentes</span>
          <span style={{ color: "var(--ink-4)", fontFamily: "var(--font-mono)", fontSize: 10.5 }}>
            {Object.values(AGENT_TYPES).filter((m) => CATEGORIES.includes(m.category)).length}
          </span>
        </div>
        <div style={{ position: "relative", margin: "0 12px 8px" }}>
          <IconSearch className="icon-sm" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)" }} />
          <input
            className="palette-search"
            placeholder="Buscar agentes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 26, width: "100%", margin: 0 }}
            aria-label="Buscar agentes na paleta"
          />
        </div>
        {CATEGORIES.map((cat) => groups[cat].length > 0 && (
          <div key={cat}>
            <div className="palette-category">{cat}</div>
            {groups[cat].map((item: any) => {
              const Glyph = (GLYPHS as any)[item.glyph] || GlyphPlanner;
              return (
                <div
                  key={item.type}
                  className="palette-item"
                  data-tour={item.type === "planner" ? "builder-palette-planner" : undefined}
                  onMouseDown={(e) => { e.preventDefault(); onStartDrag(item.type, e); }}
                  onMouseEnter={(e) => handleEnter(item.type, e)}
                  onMouseLeave={handleLeave}
                >
                  <div className="glyph"><Glyph size={14} /></div>
                  <div className="meta">
                    <div className="name">{item.label}</div>
                    <div className="desc">{item.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div className="palette-foot">
          <strong style={{ color: "var(--ink-2)", fontWeight: 500 }}>Dica:</strong>{" "}
          arraste um item ao canvas. Passe o mouse sobre um agente para ver detalhes.
        </div>
      </div>

      {hovered && hoveredMeta && (
        <PalettePopover
          type={hovered.type}
          meta={hoveredMeta}
          top={hovered.top}
          left={hovered.left}
          mcpServers={mcpServers}
          onMouseEnter={() => clearTimeout(leaveTimer.current)}
          onMouseLeave={handleLeave}
        />
      )}
    </>
  );
}

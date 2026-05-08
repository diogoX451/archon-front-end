import React, { useState } from "react";
import { AGENT_TYPES } from "./data";
import { AgentNodeData } from "./types";
import { GLYPHS, GlyphPlanner } from "@shared/ui/icons/Icons";

type AgentNodeProps = {
  agent: AgentNodeData;
  density: string;
  selected: boolean;
  onSelect: () => void;
  onStartDrag: (clientX: number, clientY: number, ax: number, ay: number) => void;
  onRename: (newId: string) => void;
  onPortMouseDown: (port: string, kind: "principal" | "auxiliary") => void;
  onPortMouseUp: (port: string, kind: "principal" | "auxiliary") => void;
  connectedPorts: Set<string>;
};

function summaryFor(agent: AgentNodeData) {
  const c = agent.config || {};
  if (agent.type === "http") return `${c.method || "GET"} · ${(c.url || "").replace(/^https?:\/\//, "") || "—"}`;
  if (agent.type === "planner") return `${c.provider || "—"} · ${c.model || ""}`;
  if (agent.type === "transform") return c.script ? `${(c.script).slice(0, 28)}…` : "—";
  if (agent.type === "rag-query") return `kb=${c.knowledge_base_id || "—"} · k=${c.top_k || 5}`;
  if (agent.type === "event") return `need=${c.need_type || "—"}`;
  if (agent.type === "interaction") return `${c.channel || "—"} · ${c.template || ""}`;
  if (agent.type === "conversation") return `profile=${c.profile_id || "—"}`;
  return "—";
}

export function AgentNode({ 
  agent, 
  density, 
  selected, 
  onSelect, 
  onStartDrag, 
  onRename, 
  onPortMouseDown, 
  onPortMouseUp, 
  connectedPorts 
}: AgentNodeProps) {
  const meta = AGENT_TYPES[agent.type];
  const Glyph = (GLYPHS as any)[meta.glyph] || GlyphPlanner;
  const [editing, setEditing] = useState(false);
  const [tempId, setTempId] = useState(agent.id);

  return (
    <div
      className="agent"
      data-selected={selected}
      data-status={agent.status}
      data-density={density}
      style={{ left: agent.x, top: agent.y }}
      onMouseDown={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <div
        className="agent-header"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).tagName === "INPUT") return;
          e.preventDefault();
          onStartDrag(e.clientX, e.clientY, agent.x, agent.y);
        }}
      >
        <div className="agent-glyph"><Glyph size={12} /></div>
        {editing ? (
          <input
            className="agent-id"
            value={tempId}
            onChange={(e) => setTempId(e.target.value.replace(/[^a-zA-Z0-9_]/g, "_"))}
            onBlur={() => { onRename(tempId); setEditing(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { onRename(tempId); setEditing(false); }
              if (e.key === "Escape") { setTempId(agent.id); setEditing(false); }
            }}
            autoFocus
          />
        ) : (
          <div
            className="agent-id"
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); setTempId(agent.id); }}
            style={{ cursor: "text" }}
          >
            {agent.id}
          </div>
        )}
        <div className="agent-status-dot" />
      </div>

      <div className="agent-body">
        <div className="agent-ports">
          {meta.ports.principal.map((port: string) => (
            <div key={port} className="agent-port">
              <span
                className="port-dot"
                data-kind="principal"
                data-connected={connectedPorts.has(port)}
                onMouseDown={(e) => { e.stopPropagation(); onPortMouseDown(port, "principal"); }}
                onMouseUp={(e) => { e.stopPropagation(); onPortMouseUp(port, "principal"); }}
              >
                <span className="port-hit" />
              </span>
              <span>{port}</span>
            </div>
          ))}
        </div>
        <div className="agent-ports right">
          {meta.ports.auxiliary.map((port: string) => (
            <div key={port} className="agent-port">
              <span>{port}</span>
              <span
                className="port-dot"
                data-connected={connectedPorts.has(port)}
                onMouseDown={(e) => { e.stopPropagation(); onPortMouseDown(port, "auxiliary"); }}
                onMouseUp={(e) => { e.stopPropagation(); onPortMouseUp(port, "auxiliary"); }}
              >
                <span className="port-hit" />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="agent-foot">
        <span className="agent-type-badge">{agent.type}</span>
        <span className="truncate">{summaryFor(agent)}</span>
      </div>
    </div>
  );
}

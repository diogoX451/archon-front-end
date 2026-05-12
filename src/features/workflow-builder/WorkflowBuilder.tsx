import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AGENT_TYPES, SAMPLE_WORKFLOW, SIMULATED_TRACE } from "./data";
import { WorkflowData, SelectedEntity, AgentNodeData, ConnectionData } from "./types";
import { Palette } from "./Palette";
import { Inspector } from "./Inspector";
import { EventDrawer } from "./EventDrawer";
import { AgentNode } from "./AgentNode";
import { GLYPHS, GlyphPlanner, IconPlay, IconReset, IconValidate, IconCursor, IconHand, IconMinus, IconPlus } from "@shared/ui/icons/Icons";
import { Rail } from "@shared/ui/Rail";
import { useProfiles, useUpsertProfile } from "@shared/hooks/useProfiles";
import { canvasToProfile, profileToCanvas, emptyCanvas, type CanvasMeta } from "./profileSerializer";

const uid = (prefix = "id") => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

function portCoords(agent: AgentNodeData, portName: string, kind: string) {
  const meta = AGENT_TYPES[agent.type];
  const isPrincipal = meta.ports.principal.includes(portName);
  const w = 220;
  const headerH = 36;
  const portRowH = 20;
  const ports = isPrincipal ? meta.ports.principal : meta.ports.auxiliary;
  const idx = ports.indexOf(portName);
  const x = isPrincipal ? agent.x : agent.x + w;
  const y = agent.y + headerH + 12 + idx * portRowH;
  return { x, y };
}

function bezierPath(a: {x: number, y: number}, b: {x: number, y: number}) {
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5);
  const c1 = { x: a.x + dx, y: a.y };
  const c2 = { x: b.x - dx, y: b.y };
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
}

export function WorkflowBuilder() {
  const { id: routeId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isNew = routeId === "new";
  const hasRouteId = !!routeId && !isNew;

  const { data: profilesList, isLoading: profilesLoading } = useProfiles();
  const upsertMutation = useUpsertProfile();

  const [meta, setMeta] = useState<CanvasMeta>(() => ({
    id: isNew ? "" : routeId || "demo-workflow",
    description: "",
  }));
  const [loadedFromBackend, setLoadedFromBackend] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [workflow, setWorkflow] = useState<WorkflowData>(() => {
    if (isNew || hasRouteId) return emptyCanvas("Novo agente");
    return {
      name: SAMPLE_WORKFLOW.name,
      agents: SAMPLE_WORKFLOW.agents.map((a: any) => ({ ...a, status: "idle" })),
      connections: SAMPLE_WORKFLOW.connections.map((c: any) => ({ ...c, status: "idle" })),
    };
  });

  // Hydrate canvas from backend when route carries a profile id
  useEffect(() => {
    if (!hasRouteId || loadedFromBackend) return;
    if (!profilesList) return;
    const match = profilesList.find((p) => (p.profile_id || p.id) === routeId);
    if (!match) return;
    const { workflow: loadedWorkflow, meta: loadedMeta } = profileToCanvas(match);
    setWorkflow(loadedWorkflow);
    setMeta(loadedMeta);
    setLoadedFromBackend(true);
  }, [profilesList, hasRouteId, routeId, loadedFromBackend]);

  const handleSave = async () => {
    setSaveError(null);
    const id = (meta.id || "").trim();
    if (!id) {
      setSaveError("Defina um ID para o agente antes de salvar.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      setSaveError("ID deve conter apenas letras, números, _ ou -.");
      return;
    }
    if (workflow.agents.length === 0) {
      setSaveError("Adicione ao menos um agente antes de salvar.");
      return;
    }
    try {
      const payload = canvasToProfile(workflow, { ...meta, id });
      await upsertMutation.mutateAsync(payload);
      if (isNew || routeId !== id) {
        navigate(`/workflows/builder/${encodeURIComponent(id)}`, { replace: true });
      }
    } catch (err: any) {
      setSaveError(err?.message || "Falha ao salvar profile.");
    }
  };

  const [selected, setSelected] = useState<SelectedEntity>({ kind: null, id: null });
  const [runState, setRunState] = useState<"idle" | "running" | "completed" | "error">("idle");
  const [eventLog, setEventLog] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [inspectorTab, setInspectorTab] = useState("config");

  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<"select" | "pan">("select");
  const [panState, setPanState] = useState<{startX: number, startY: number, startVx: number, startVy: number} | null>(null);

  const [agentDrag, setAgentDrag] = useState<{id: string, offsetX: number, offsetY: number} | null>(null);
  const [paletteDrag, setPaletteDrag] = useState<{type: string, x: number, y: number} | null>(null);
  const [connDraft, setConnDraft] = useState<{from: {agent: string, port: string, kind: string}, x: number, y: number} | null>(null);

  const findAgent = (id: string) => workflow.agents.find((a) => a.id === id) || null;
  const updateAgent = (id: string, patch: any) => {
    setWorkflow((w) => ({
      ...w,
      agents: w.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  };
  const removeAgent = (id: string) => {
    setWorkflow((w) => ({
      ...w,
      agents: w.agents.filter((a) => a.id !== id),
      connections: w.connections.filter((c) => c.from.agent !== id && c.to.agent !== id),
    }));
    setSelected({ kind: null, id: null });
  };
  const removeConnection = (id: string) => {
    setWorkflow((w) => ({ ...w, connections: w.connections.filter((c) => c.id !== id) }));
    setSelected({ kind: null, id: null });
  };

  const screenToStage = useCallback((sx: number, sy: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (sx - rect.left - viewport.x) / viewport.scale,
      y: (sy - rect.top - viewport.y) / viewport.scale,
    };
  }, [viewport]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (paletteDrag) {
        setPaletteDrag((p) => p ? ({ ...p, x: e.clientX, y: e.clientY }) : null);
      }
      if (agentDrag) {
        const stage = screenToStage(e.clientX, e.clientY);
        updateAgent(agentDrag.id, {
          x: Math.round(stage.x - agentDrag.offsetX),
          y: Math.round(stage.y - agentDrag.offsetY),
        });
      }
      if (connDraft) {
        const stage = screenToStage(e.clientX, e.clientY);
        setConnDraft((c) => c ? ({ ...c, x: stage.x, y: stage.y }) : null);
      }
      if (panState) {
        setViewport((v) => ({
          ...v,
          x: panState.startVx + (e.clientX - panState.startX),
          y: panState.startVy + (e.clientY - panState.startY),
        }));
      }
    };
    const onUp = (e: MouseEvent) => {
      if (paletteDrag) {
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          if (
            e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom
          ) {
            const stage = screenToStage(e.clientX, e.clientY);
            const newId = uid(paletteDrag.type.replace(/-/g, "_"));
            const typeMeta = AGENT_TYPES[paletteDrag.type];
            setWorkflow((w) => ({
              ...w,
              agents: [...w.agents, {
                id: newId,
                type: paletteDrag.type,
                x: Math.round(stage.x - 110),
                y: Math.round(stage.y - 30),
                status: "idle",
                config: { ...typeMeta.defaultConfig },
              }],
            }));
            setSelected({ kind: "agent", id: newId });
          }
        }
        setPaletteDrag(null);
      }
      if (agentDrag) setAgentDrag(null);
      if (connDraft) setConnDraft(null);
      if (panState) setPanState(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [paletteDrag, agentDrag, connDraft, panState, screenToStage]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 50) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setViewport((v) => {
        const factor = e.deltaY < 0 ? 1.08 : 0.93;
        const newScale = Math.max(0.4, Math.min(2.5, v.scale * factor));
        const sx = (cx - v.x) / v.scale;
        const sy = (cy - v.y) / v.scale;
        return {
          scale: newScale,
          x: cx - sx * newScale,
          y: cy - sy * newScale,
        };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = ((e.target as HTMLElement).tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "Backspace" || e.key === "Delete") {
        if (selected.kind === "agent" && selected.id) removeAgent(selected.id);
        else if (selected.kind === "connection" && selected.id) removeConnection(selected.id);
      } else if (e.key === "Escape") {
        setSelected({ kind: null, id: null });
      } else if (e.code === "Space") {
        setTool("pan");
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === "Space") setTool("select"); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); };
  }, [selected]);

  const runTimers = useRef<number[]>([]);
  const stopRun = () => {
    runTimers.current.forEach(clearTimeout);
    runTimers.current = [];
  };
  const reset = () => {
    stopRun();
    setRunState("idle");
    setEventLog([]);
    setWorkflow((w) => ({
      ...w,
      agents: w.agents.map((a) => ({ ...a, status: "idle" })),
      connections: w.connections.map((c) => ({ ...c, status: "idle" })),
    }));
  };

  const run = () => {
    stopRun();
    setEventLog([]);
    setRunState("running");
    setWorkflow((w) => ({
      ...w,
      agents: w.agents.map((a) => ({ ...a, status: "idle" })),
      connections: w.connections.map((c) => ({ ...c, status: "idle" })),
    }));
    setDrawerOpen(true);

    SIMULATED_TRACE.forEach((evt, i) => {
      const tm = window.setTimeout(() => {
        setEventLog((log) => [...log, { ...evt, n: i + 1 }]);
        if (evt.type === "fire" && evt.agent) {
          setWorkflow((w) => ({
            ...w,
            agents: w.agents.map((a) => a.id === evt.agent ? { ...a, status: "running" } : a),
            connections: w.connections.map((c) =>
              c.to.agent === evt.agent ? { ...c, status: "active" } : c
            ),
          }));
        } else if ((evt.type === "response" || evt.type === "local") && evt.agent && evt.status === "done") {
          setWorkflow((w) => ({
            ...w,
            agents: w.agents.map((a) => a.id === evt.agent ? { ...a, status: "done" } : a),
            connections: w.connections.map((c) =>
              c.from.agent === evt.agent ? { ...c, status: "done" } :
              c.to.agent === evt.agent && c.status === "active" ? { ...c, status: "done" } : c
            ),
          }));
        } else if (evt.type === "result") {
          setRunState("completed");
        }
      }, evt.t);
      runTimers.current.push(tm);
    });
  };

  useEffect(() => () => stopRun(), []);

  const selectedAgent = selected.kind === "agent" && selected.id ? findAgent(selected.id) : null;
  const selectedConn = selected.kind === "connection" && selected.id ? workflow.connections.find((c) => c.id === selected.id) || null : null;
  const connectedPorts = new Set<string>();
  for (const c of workflow.connections) {
    connectedPorts.add(c.from.port);
    connectedPorts.add(c.to.port);
  }

  return (
    <>
      <Rail />
      <div
        className="app"
        data-density="comfortable"
        data-inspector={inspectorTab && (selectedAgent || selectedConn || inspectorTab === "input" || inspectorTab === "rules") ? "open" : "open"}
        data-palette={paletteOpen ? "open" : "closed"}
      >
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true"></div>
            <span>Archon</span>
          </div>
          <div className="crumbs">
            <span>Workspace</span>
            <span className="sep">/</span>
            <span>Workflows</span>
            <span className="sep">/</span>
          </div>
          <input
            className="workflow-name"
            value={workflow.name}
            onChange={(e) => setWorkflow((w) => ({ ...w, name: e.target.value }))}
            placeholder="Nome do agente"
          />
          <input
            className="workflow-name"
            value={meta.id}
            onChange={(e) => setMeta((m) => ({ ...m, id: e.target.value }))}
            placeholder="id-do-profile"
            style={{ fontFamily: "var(--font-mono)", fontSize: 12, maxWidth: 200 }}
            readOnly={hasRouteId && loadedFromBackend}
            title={hasRouteId ? "ID do profile (imutável após criação)" : "ID único do profile (a-z, 0-9, _, -)"}
          />

          <div className="spacer" />

          {saveError && (
            <span style={{ color: "var(--err)", fontSize: 12, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={saveError}>
              {saveError}
            </span>
          )}

          {hasRouteId && profilesLoading && !loadedFromBackend && (
            <span style={{ color: "var(--ink-3)", fontSize: 12 }}>carregando profile…</span>
          )}

          <div className="status-pill" data-state={runState}>
            <span className="dot" />
            {runState === "idle"      && <span>aguardando · {workflow.agents.length} agentes</span>}
            {runState === "running"   && <span>executando · {eventLog.length}/{SIMULATED_TRACE.length}</span>}
            {runState === "completed" && <span>concluído · 1540ms</span>}
            {runState === "error"     && <span>erro</span>}
          </div>

          <button className="btn ghost" title="Validar">
            <IconValidate className="icon" />
            <span>Validar</span>
          </button>

          <button className="btn" onClick={reset} disabled={runState === "idle" && eventLog.length === 0}>
            <IconReset className="icon" />
            <span>Reset</span>
          </button>

          <button
            className="btn primary"
            onClick={handleSave}
            disabled={upsertMutation.isPending}
            title="Persistir profile no backend (POST /api/v1/profiles)"
          >
            <span>{upsertMutation.isPending ? "Salvando…" : "Salvar"}</span>
          </button>

          <button
            className="btn"
            onClick={() => {
              const id = (meta.id || "").trim();
              if (!id) return;
              navigate(`/conversation?profile=${encodeURIComponent(id)}`);
            }}
            disabled={!hasRouteId || !loadedFromBackend}
            title={loadedFromBackend ? "Abrir conversa de teste com este profile" : "Salve o profile antes de testar"}
          >
            <span>Testar</span>
          </button>

          <button className="btn" onClick={run} disabled={runState === "running"} title="Simulação local (não chama o backend)">
            <IconPlay className="icon" />
            <span>Simular</span>
          </button>
        </div>

        <Palette onStartDrag={(type, e) => setPaletteDrag({ type, x: e.clientX, y: e.clientY })} />

        <div
          className="canvas-wrap"
          ref={canvasRef}
          onMouseDown={(e) => {
            const isMiddle = e.button === 1;
            const wantsPan = tool === "pan" || isMiddle;
            if (wantsPan) {
              e.preventDefault();
              setPanState({ startX: e.clientX, startY: e.clientY, startVx: viewport.x, startVy: viewport.y });
              return;
            }
            if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains("canvas-bg") || (e.target as HTMLElement).tagName === "svg") {
              setSelected({ kind: null, id: null });
            }
          }}
          style={{ cursor: panState ? "grabbing" : tool === "pan" ? "grab" : "default" }}
        >
          <div className="canvas-bg" data-style="dots" />

          <svg
            className="canvas-svg"
            style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`, transformOrigin: "0 0" }}
          >
            {workflow.connections.map((c) => {
              const fromAgent = findAgent(c.from.agent);
              const toAgent = findAgent(c.to.agent);
              if (!fromAgent || !toAgent) return null;
              const a = portCoords(fromAgent, c.from.port, "auxiliary");
              const b = portCoords(toAgent, c.to.port, "principal");
              const d = bezierPath(a, b);
              const isActive = c.status === "active";
              const isDone = c.status === "done";
              const isSelected = selected.kind === "connection" && selected.id === c.id;
              return (
                <g key={c.id}>
                  <path
                    d={d}
                    className="conn-path"
                    data-selected={isSelected}
                    data-active={isActive}
                    data-done={isDone}
                  />
                  {isActive && <path d={d} className="conn-pulse" />}
                  <path
                    d={d}
                    className="conn-hit"
                    stroke="transparent"
                    strokeWidth="14"
                    fill="none"
                    onClick={(e) => { e.stopPropagation(); setSelected({ kind: "connection", id: c.id }); }}
                  />
                </g>
              );
            })}
            {connDraft && (() => {
              const fromAgent = findAgent(connDraft.from.agent);
              if (!fromAgent) return null;
              const a = portCoords(fromAgent, connDraft.from.port, connDraft.from.kind);
              const b = { x: connDraft.x, y: connDraft.y };
              return <path d={bezierPath(a, b)} stroke="var(--accent)" strokeWidth="1.75" strokeDasharray="4 4" fill="none" />;
            })()}
          </svg>

          <div
            className="canvas-stage"
            style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}
          >
            {workflow.agents.map((agent) => (
              <AgentNode
                key={agent.id}
                agent={agent}
                density="comfortable"
                selected={selected.kind === "agent" && selected.id === agent.id}
                onSelect={() => setSelected({ kind: "agent", id: agent.id })}
                onStartDrag={(clientX, clientY, ax, ay) => {
                  const stage = screenToStage(clientX, clientY);
                  setAgentDrag({ id: agent.id, offsetX: stage.x - ax, offsetY: stage.y - ay });
                }}
                onRename={(newId) => {
                  if (!newId || newId === agent.id) return;
                  if (workflow.agents.find((a) => a.id === newId)) return;
                  setWorkflow((w) => ({
                    ...w,
                    agents: w.agents.map((a) => a.id === agent.id ? { ...a, id: newId } : a),
                    connections: w.connections.map((c) => ({
                      ...c,
                      from: c.from.agent === agent.id ? { ...c.from, agent: newId } : c.from,
                      to: c.to.agent === agent.id ? { ...c.to, agent: newId } : c.to,
                    })),
                  }));
                  if (selected.id === agent.id) setSelected({ kind: "agent", id: newId });
                }}
                onPortMouseDown={(port, kind) => {
                  if (kind === "auxiliary") {
                    const a = portCoords(agent, port, kind);
                    setConnDraft({ from: { agent: agent.id, port, kind }, x: a.x, y: a.y });
                  }
                }}
                onPortMouseUp={(port, kind) => {
                  if (connDraft && kind === "principal" && connDraft.from.agent !== agent.id) {
                    const newConn: ConnectionData = {
                      id: uid("c"),
                      from: { agent: connDraft.from.agent, port: connDraft.from.port },
                      to: { agent: agent.id, port },
                      status: "idle",
                    };
                    setWorkflow((w) => {
                      const exists = w.connections.find((c) =>
                        c.from.agent === newConn.from.agent && c.from.port === newConn.from.port &&
                        c.to.agent === newConn.to.agent && c.to.port === newConn.to.port
                      );
                      if (exists) return w;
                      return { ...w, connections: [...w.connections, newConn] };
                    });
                    setConnDraft(null);
                  }
                }}
                connectedPorts={connectedPorts}
              />
            ))}
          </div>

          <div className="canvas-toolbar">
            <button className="tool" data-active={tool === "select"} onClick={() => setTool("select")} title="Selecionar (V)">
              <IconCursor className="icon-sm" />
              <span>Selecionar</span>
            </button>
            <button className="tool" data-active={tool === "pan"} onClick={() => setTool("pan")} title="Mover canvas (Space)">
              <IconHand className="icon-sm" />
              <span>Mover</span>
            </button>
          </div>

          <div className="canvas-zoom">
            <button onClick={() => setViewport((v) => ({ ...v, scale: Math.max(0.4, v.scale - 0.1) }))} title="Diminuir zoom">
              <IconMinus className="icon-sm" />
            </button>
            <span className="zoom-label">{Math.round(viewport.scale * 100)}%</span>
            <button onClick={() => setViewport((v) => ({ ...v, scale: Math.min(2.5, v.scale + 0.1) }))} title="Aumentar zoom">
              <IconPlus className="icon-sm" />
            </button>
            <button onClick={() => setViewport({ x: 0, y: 0, scale: 1 })} title="Resetar zoom">
              <IconReset className="icon-sm" />
            </button>
          </div>

          {workflow.agents.length === 0 && (
            <div className="canvas-empty">
              <div>
                <div className="big">Canvas vazio</div>
                <div>Arraste um agente da paleta à esquerda para começar.</div>
              </div>
            </div>
          )}

          <EventDrawer
            open={drawerOpen}
            onToggle={() => setDrawerOpen((o) => !o)}
            eventLog={eventLog}
            runState={runState}
          />
        </div>

        <Inspector
          tab={inspectorTab}
          setTab={setInspectorTab}
          selectedAgent={selectedAgent}
          selectedConn={selectedConn}
          workflow={workflow}
          meta={meta}
          onMetaChange={(patch) => setMeta((m) => ({ ...m, ...patch }))}
          onUpdateAgent={updateAgent}
          onRemoveAgent={removeAgent}
          onRemoveConnection={removeConnection}
        />
      </div>

      {paletteDrag && (
        <div
          className="drag-ghost"
          style={{ left: paletteDrag.x, top: paletteDrag.y }}
        >
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--accent)",
            borderRadius: 10,
            padding: "8px 14px",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "var(--shadow-3)",
          }}>
            <div style={{ width: 22, height: 22, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 5, display: "grid", placeItems: "center" }}>
              {React.createElement((GLYPHS as any)[AGENT_TYPES[paletteDrag.type].glyph] || GlyphPlanner, { size: 13 })}
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>{AGENT_TYPES[paletteDrag.type].label}</span>
          </div>
        </div>
      )}
    </>
  );
}

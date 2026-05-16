import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AGENT_TYPES, SAMPLE_WORKFLOW, SIMULATED_TRACE } from "./data";
import { WorkflowData, SelectedEntity, AgentNodeData, ConnectionData } from "./types";
import { Palette } from "./Palette";
import { Inspector } from "./Inspector";
import { EventDrawer } from "./EventDrawer";
import { AgentNode } from "./AgentNode";
import { GhostActionNode, type GhostAction } from "./GhostActionNode";
import { GLYPHS, GlyphPlanner, IconPlay, IconReset, IconValidate, IconCursor, IconHand, IconMinus, IconPlus } from "@shared/ui/icons/Icons";
import { Rail } from "@shared/ui/Rail";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { useAuth } from "@app/auth-context";
import { canAny } from "@shared/authz";
import { useProfiles, useUpsertProfile } from "@shared/hooks/useProfiles";
import { canvasToProfile, profileToCanvas, emptyCanvas, type CanvasMeta } from "./profileSerializer";
import { useCreateConversationTurn } from "@shared/hooks/useConversation";
import { useEventStream } from "@shared/hooks/useEventStream";
import { useWorkflowTimeline } from "@shared/hooks/useTimeline";
import type { WorkflowEvent } from "@shared/api/events";

const uid = (prefix = "id") => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

// slugifyProfileId derives a backend-friendly profile_id from the
// human-typed agent name. Matches the backend regex (a-z, 0-9, _, -)
// and trims separators from both ends. Used so users don't have to
// fill the id field manually for new profiles.
function slugifyProfileId(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

// Bounding box of a regular agent node on the canvas — matches the CSS
// rule .agent { width: 220px } and the actual rendered height (~92px
// for the planner card with its header + body).
const AGENT_W = 220;
const AGENT_H = 92;

function pointInAgent(stage: { x: number; y: number }, agent: AgentNodeData): boolean {
  return (
    stage.x >= agent.x &&
    stage.x <= agent.x + AGENT_W &&
    stage.y >= agent.y &&
    stage.y <= agent.y + AGENT_H
  );
}

type StreamEventLike = Pick<WorkflowEvent, "subject" | "event_type" | "workflow_id" | "conversation_id" | "agent_id" | "correlation_id" | "occurred_at" | "received_at">;

function streamEventKey(ev: StreamEventLike): string {
  return [
    ev.subject || "",
    ev.event_type || "",
    ev.workflow_id || "",
    ev.conversation_id || "",
    ev.agent_id || "",
    ev.correlation_id || "",
    ev.occurred_at || ev.received_at || "",
  ].join("|");
}

function sortStreamEvents(events: StreamEventLike[]): StreamEventLike[] {
  return [...events].sort((a, b) => {
    const ta = new Date(a.occurred_at || a.received_at || 0).getTime();
    const tb = new Date(b.occurred_at || b.received_at || 0).getTime();
    return ta - tb;
  });
}

// Map a palette agent-type into the shape of a planner action. Generic
// bus types (event/interaction) carry the executor identity via
// need_type; concrete types like http/transform are local-to-planner
// fan-outs and use agent_type directly. Names are deduped against the
// existing actions so dropping the same template twice yields
// rag_query_2, rag_query_3, ...
function paletteTypeToAction(
  paletteType: string,
  existingNames: string[],
): { name: string; agent_type?: string; need_type?: string; description?: string; config?: Record<string, any> } | null {
  const meta = AGENT_TYPES[paletteType];
  if (!meta) return null;
  const baseName = (paletteType.includes(".") ? paletteType.split(".").join("_") : paletteType).replace(/-/g, "_");
  let name = baseName;
  let n = 2;
  while (existingNames.includes(name)) {
    name = `${baseName}_${n++}`;
  }
  const description = meta.description;
  // executor-backed (rag.*, graph.*, channel.*) → emit need via "event"
  if (paletteType === "rag.query" || paletteType === "rag.ingest") {
    return { name, description, agent_type: "event", need_type: paletteType };
  }
  if (paletteType === "graph.memory") {
    return { name, description, agent_type: "event", need_type: "graph.memory.log" };
  }
  if (paletteType === "channel.delivery") {
    return { name, description, agent_type: "event", need_type: "channel.delivery" };
  }
  if (paletteType === "http") {
    return { name, description, agent_type: "http", config: { ...meta.defaultConfig } };
  }
  if (paletteType === "transform") {
    return { name, description, agent_type: "transform", config: { ...meta.defaultConfig } };
  }
  if (paletteType === "interaction") {
    return { name, description, agent_type: "interaction" };
  }
  if (paletteType === "event") {
    return { name, description, agent_type: "event" };
  }
  // unknown — fall through with agent_type set
  return { name, description, agent_type: paletteType };
}

const FALLBACK_PORTS = { principal: ["input"], auxiliary: ["output"] };

function portCoords(agent: AgentNodeData, portName: string, kind: string) {
  const meta = AGENT_TYPES[agent.type];
  const ports = meta?.ports ?? FALLBACK_PORTS;
  const isPrincipal = ports.principal.includes(portName);
  const w = 220;
  const headerH = 36;
  const portRowH = 20;
  const portsList = isPrincipal ? ports.principal : ports.auxiliary;
  const idx = portsList.indexOf(portName);
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
  const { isSuper, hasPermission } = useAuth();
  const canSaveProfile = canAny({ isSuper, hasPermission }, ["workflow_update", "workflow_create"]);
  const { id: routeId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isNew = routeId === "new";
  const hasRouteId = !!routeId && !isNew;

  const { data: profilesList, isLoading: profilesLoading } = useProfiles();
  const upsertMutation = useUpsertProfile();
  const createTurn = useCreateConversationTurn();

  // Real-execution state. simulationWorkflowId is set when the user
  // clicks Simular and a workflow gets spawned via /conversation/turns.
  // useEventStream tracks the matching SSE channel and feeds the
  // event log + per-agent status (effect below).
  const [simulationWorkflowId, setSimulationWorkflowId] = useState<string | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState("Ola, preciso de ajuda com a base de conhecimento.");
  // Resolved backend profile (when editing an existing one). Powers the
  // Inspector "Profile" tab with the rich docs/profiles/*.json view.
  const [loadedProfile, setLoadedProfile] = useState<any>(null);

  const [meta, setMeta] = useState<CanvasMeta>(() => ({
    id: isNew ? "" : routeId || "demo-workflow",
    description: "",
  }));
  const [loadedFromBackend, setLoadedFromBackend] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  // Tracks whether the user has edited the profile_id manually. While
  // false (the default for a fresh agent), the id auto-mirrors the
  // workflow name through slugifyProfileId. The flag flips to true the
  // first time the user types in the id field directly, freezing the
  // value so renaming the agent later doesn't surprise-rename the id.
  const [idManuallyEdited, setIdManuallyEdited] = useState(false);

  const [workflow, setWorkflow] = useState<WorkflowData>(() => {
    if (isNew || hasRouteId) return emptyCanvas("Novo agente");
    return {
      name: SAMPLE_WORKFLOW.name,
      agents: SAMPLE_WORKFLOW.agents.map((a: any) => ({ ...a, status: "idle" })),
      connections: SAMPLE_WORKFLOW.connections.map((c: any) => ({ ...c, status: "idle" })),
    };
  });

  // Hydrate canvas from backend when route carries a profile id.
  // routeId can be either the backend UUID (preferred, stable, no slug
  // leak in the URL) or the legacy profile_id slug — both resolve.
  useEffect(() => {
    if (!hasRouteId || loadedFromBackend) return;
    if (!profilesList) return;
    const match = profilesList.find((p) => p.id === routeId || p.profile_id === routeId);
    if (!match) return;
    const { workflow: loadedWorkflow, meta: loadedMeta } = profileToCanvas(match);
    setWorkflow(loadedWorkflow);
    setMeta(loadedMeta);
    setLoadedProfile(match);
    setLoadedFromBackend(true);
  }, [profilesList, hasRouteId, routeId, loadedFromBackend]);

  useEffect(() => {
    if (idManuallyEdited) return;
    if (hasRouteId && loadedFromBackend) return;
    const suggested = slugifyProfileId(workflow.name || "");
    setMeta((m) => (m.id === suggested ? m : { ...m, id: suggested }));
  }, [workflow.name, idManuallyEdited, hasRouteId, loadedFromBackend]);

  const handleSave = async () => {
    setSaveError(null);
    setSaveOk(null);
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
      const saved = await upsertMutation.mutateAsync(payload);
      setLoadedProfile(saved as any);
      setSaveOk(`Salvo: ${id}`);
      window.setTimeout(() => setSaveOk(null), 3500);
      // Update route to the canonical UUID so reloads land on the
      // stable id, even when the user typed a slug or renamed.
      const canonicalId = (saved as any)?.id || id;
      if (isNew || routeId !== canonicalId) {
        navigate(`/workflows/builder/${encodeURIComponent(canonicalId)}`, { replace: true });
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
  const [inspectorTab, setInspectorTab] = useState(hasRouteId ? "profile" : "config");

  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<"select" | "pan">("select");
  const [panState, setPanState] = useState<{startX: number, startY: number, startVx: number, startVy: number} | null>(null);

  const [agentDrag, setAgentDrag] = useState<{id: string, offsetX: number, offsetY: number} | null>(null);
  const [ghostDrag, setGhostDrag] = useState<{id: string, offsetX: number, offsetY: number} | null>(null);
  const [paletteDrag, setPaletteDrag] = useState<{type: string, x: number, y: number} | null>(null);
  const [connDraft, setConnDraft] = useState<{from: {agent: string, port: string, kind: string}, x: number, y: number} | null>(null);
  // When a palette item is being dragged AND its cursor is over a
  // planner, this holds that planner's id so the AgentNode can render
  // a "drop target" outline. Cleared on drop/cancel.
  const [dropTargetPlannerId, setDropTargetPlannerId] = useState<string | null>(null);

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
        // Recompute drop target every move so hover feedback tracks.
        const stage = screenToStage(e.clientX, e.clientY);
        const planner = workflow.agents.find(
          (a) => a.type === "planner" && pointInAgent(stage, a),
        );
        setDropTargetPlannerId(planner?.id || null);
      }
      if (agentDrag) {
        const stage = screenToStage(e.clientX, e.clientY);
        updateAgent(agentDrag.id, {
          x: Math.round(stage.x - agentDrag.offsetX),
          y: Math.round(stage.y - agentDrag.offsetY),
        });
      }
      if (ghostDrag) {
        const stage = screenToStage(e.clientX, e.clientY);
        const next = {
          x: Math.round(stage.x - ghostDrag.offsetX),
          y: Math.round(stage.y - ghostDrag.offsetY),
        };
        setMeta((m) => ({
          ...m,
          ghost_positions: { ...(m.ghost_positions || {}), [ghostDrag.id]: next },
        }));
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
            // Hit-test against planners first. Dropping a palette item
            // on top of a planner means "add this as one of its
            // actions" instead of creating a top-level agent.
            const targetPlanner = workflow.agents.find(
              (a) => a.type === "planner" && pointInAgent(stage, a),
            );
            if (targetPlanner) {
              const existing = Array.isArray((targetPlanner.config as any)?.actions)
                ? (targetPlanner.config as any).actions
                : [];
              const newAction = paletteTypeToAction(paletteDrag.type, existing.map((a: any) => a?.name).filter(Boolean));
              if (newAction) {
                setWorkflow((w) => ({
                  ...w,
                  agents: w.agents.map((a) => a.id === targetPlanner.id
                    ? {
                        ...a,
                        config: {
                          ...(a.config || {}),
                          actions: [...existing, newAction],
                        },
                      }
                    : a,
                  ),
                }));
                setSelected({ kind: "ghost", id: `${targetPlanner.id}::${newAction.name}` });
              }
            } else {
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
        }
        setPaletteDrag(null);
        setDropTargetPlannerId(null);
      }
      if (agentDrag) setAgentDrag(null);
      if (ghostDrag) setGhostDrag(null);
      if (connDraft) setConnDraft(null);
      if (panState) setPanState(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [paletteDrag, agentDrag, ghostDrag, connDraft, panState, screenToStage, workflow.agents]);

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
    setSimulationWorkflowId(null);
    setSimulationError(null);
    setWorkflow((w) => ({
      ...w,
      agents: w.agents.map((a) => ({ ...a, status: "idle" })),
      connections: w.connections.map((c) => ({ ...c, status: "idle" })),
    }));
  };

  // Real run: spawn the workflow through /api/v1/conversation/turns and
  // wait for the NATS-backed SSE stream to drive the canvas. Requires
  // the profile to be saved (we need a profile_id). The previous mock
  // SIMULATED_TRACE is kept as a fallback for the "demo" scenario when
  // there's no backend profile yet (e.g. unsaved sample workflow).
  const run = async () => {
    stopRun();
    setEventLog([]);
    setSimulationError(null);
    setRunState("running");
    setWorkflow((w) => ({
      ...w,
      agents: w.agents.map((a) => ({ ...a, status: "idle" })),
      connections: w.connections.map((c) => ({ ...c, status: "idle" })),
    }));
    setDrawerOpen(true);

    const profileId = (meta.id || "").trim();
    // Fall back to the canned demo trace when we don't have a saved
    // profile yet (new/unnamed builder session).
    if (!profileId || !loadedFromBackend) {
      setSimulationError("Salve o profile antes de simular para rodar a execução real. Mostrando trace demo.");
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
      return;
    }

    setSimulationMessage("Ola, preciso de ajuda com a base de conhecimento.");
    setSimulationModalOpen(true);
  };

  const confirmRun = async () => {
    const profileId = (meta.id || "").trim();
    const message = simulationMessage.trim();
    if (!profileId || !message) return;
    setSimulationModalOpen(false);
    try {
      const resp = await createTurn.mutateAsync({
        profile_id: profileId,
        conversation_id: `sim_${Date.now().toString(36)}`,
        message,
      });
      setSimulationWorkflowId((resp as any).workflow_id);
    } catch (err: any) {
      setSimulationError(err?.message || "Falha ao spawnar workflow");
      setRunState("error");
    }
  };

  // Stream live events for the spawned workflow and translate them
  // into canvas state changes. Each interaction.pending event marks
  // the referenced agent as running; response/result drive it to done
  // / completes the run.
  const liveStream = useEventStream({
    enabled: !!simulationWorkflowId,
    workflowId: simulationWorkflowId || undefined,
    subjects: [
      "archon.command.>",
      "archon.interaction.>",
      "archon.need.>",
      "archon.response.>",
      "archon.result.>",
    ],
    bufferSize: 200,
  });
  const workflowTimeline = useWorkflowTimeline(simulationWorkflowId || "", {
    enabled: !!simulationWorkflowId,
    limit: 500,
  });
  const processedEventKeys = useRef(new Set<string>());
  useEffect(() => {
    if (!simulationWorkflowId) {
      processedEventKeys.current = new Set();
      return;
    }
    const events = sortStreamEvents([...(workflowTimeline.data || []), ...liveStream.events]);
    for (const ev of events) {
      const key = streamEventKey(ev);
      if (processedEventKeys.current.has(key)) continue;
      processedEventKeys.current.add(key);
      setEventLog((log) => [...log, {
        n: log.length + 1,
        type: ev.event_type,
        subject: ev.subject,
        summary: ev.subject + (ev.agent_id ? ` (${ev.agent_id})` : ""),
        agent: ev.agent_id || null,
        status: "info",
        ts: ev.received_at,
      }]);
      const agentId = ev.agent_id;
      if (ev.event_type === "interaction" && agentId) {
        setWorkflow((w) => ({
          ...w,
          agents: w.agents.map((a) => a.id === agentId ? { ...a, status: "running" } : a),
          connections: w.connections.map((c) =>
            c.to.agent === agentId ? { ...c, status: "active" } : c
          ),
        }));
      } else if (ev.event_type === "response" && agentId) {
        setWorkflow((w) => ({
          ...w,
          agents: w.agents.map((a) => a.id === agentId ? { ...a, status: "done" } : a),
          connections: w.connections.map((c) =>
            c.from.agent === agentId ? { ...c, status: "done" } :
            c.to.agent === agentId && c.status === "active" ? { ...c, status: "done" } : c
          ),
        }));
      } else if (ev.event_type === "result") {
        setRunState("completed");
        setSimulationWorkflowId(null);
      }
    }
  }, [liveStream.events, workflowTimeline.data, simulationWorkflowId]);

  useEffect(() => () => stopRun(), []);

  const selectedAgent = selected.kind === "agent" && selected.id ? findAgent(selected.id) : null;
  const selectedConn = selected.kind === "connection" && selected.id ? workflow.connections.find((c) => c.id === selected.id) || null : null;
  const connectedPorts = new Set<string>();
  for (const c of workflow.connections) {
    connectedPorts.add(c.from.port);
    connectedPorts.add(c.to.port);
  }

  // Ghost nodes: each planner.config.actions[] entry becomes a read-only
  // node attached to its planner. Positioned automatically (fan-out to
  // the right), never persisted, not draggable. Lets us visualize the
  // runtime hub-and-spoke shape of single-planner profiles like
  // archon-assistant without polluting the saved blueprint.
  const ghostActions = useMemo<GhostAction[]>(() => {
    const out: GhostAction[] = [];
    const PLANNER_W = 220;
    const GHOST_W = 200;
    const GHOST_H = 72;
    const GAP_X = 120;
    const GAP_Y = 28;
    const overrides = meta.ghost_positions || {};
    for (const agent of workflow.agents) {
      if (agent.type !== "planner") continue;
      const actions = Array.isArray((agent.config as any)?.actions) ? (agent.config as any).actions : [];
      const baseX = agent.x + PLANNER_W + GAP_X;
      const total = actions.length;
      // Stack vertically, vertically centered around the planner.
      const stackH = total * GHOST_H + (total - 1) * GAP_Y;
      const startY = agent.y + 36 - (stackH - GHOST_H) / 2;
      actions.forEach((a: any, i: number) => {
        if (!a || typeof a !== "object" || !a.name) return;
        const id = `${agent.id}::${a.name}`;
        const auto = { x: baseX, y: startY + i * (GHOST_H + GAP_Y) };
        const pos = overrides[id] || auto;
        out.push({
          id,
          plannerId: agent.id,
          name: a.name,
          description: a.description,
          agentType: a.agent_type,
          needType: a.need_type,
          x: pos.x,
          y: pos.y,
        });
      });
      void GHOST_W;
    }
    return out;
  }, [workflow.agents, meta.ghost_positions]);

  const selectedGhost = selected.kind === "ghost" && selected.id
    ? ghostActions.find((g) => g.id === selected.id) || null
    : null;

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
          <div className="crumbs">
            <DynamicBreadcrumbs mode="inline" includeWorkspace />
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
            onChange={(e) => {
              setIdManuallyEdited(true);
              setMeta((m) => ({ ...m, id: e.target.value }));
            }}
            placeholder="id-do-profile"
            style={{ fontFamily: "var(--font-mono)", fontSize: 12, maxWidth: 200 }}
            readOnly={hasRouteId && loadedFromBackend}
            title={hasRouteId ? "ID do profile (imutável após criação)" : "ID único do profile (a-z, 0-9, _, -)"}
          />

          <div className="spacer" />

          {saveError && (
            <span className="pill" data-tone="err" title={saveError} style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              ⚠ {saveError}
            </span>
          )}
          {saveOk && !saveError && (
            <span className="pill" data-tone="ok" title={saveOk}>
              ✓ {saveOk}
            </span>
          )}
          {simulationError && (
            <span className="pill" data-tone="warn" title={simulationError} style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              ⚠ {simulationError}
            </span>
          )}
          {simulationWorkflowId && (
            <span className="pill" data-tone="run" title={`workflow_id: ${simulationWorkflowId}`}>
              <span className="dot" /> simulando · {liveStream.status}
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
            disabled={upsertMutation.isPending || !canSaveProfile}
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
            {/* Ghost edges: planner.output → action.input. Dashed so the
                user can see at a glance that these are runtime branches,
                not static connections. End slightly before the card so
                the line "lands" instead of disappearing under it. */}
            {ghostActions.map((g) => {
              const planner = findAgent(g.plannerId);
              if (!planner) return null;
              const a = portCoords(planner, "output", "auxiliary");
              const b = { x: g.x - 6, y: g.y + 32 };
              const sel = selected.kind === "ghost" && selected.id === g.id;
              return (
                <g key={`ghost-edge-${g.id}`}>
                  <path d={bezierPath(a, b)} className="ghost-edge" data-selected={sel} />
                  <circle cx={b.x} cy={b.y} r={2.5} className="ghost-edge-end" data-selected={sel} />
                </g>
              );
            })}
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
                dropTarget={dropTargetPlannerId === agent.id}
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
            {ghostActions.map((g) => (
              <GhostActionNode
                key={g.id}
                action={g}
                selected={selected.kind === "ghost" && selected.id === g.id}
                onSelect={() => setSelected({ kind: "ghost", id: g.id })}
                onStartDrag={(clientX, clientY, ax, ay) => {
                  const stage = screenToStage(clientX, clientY);
                  setGhostDrag({ id: g.id, offsetX: stage.x - ax, offsetY: stage.y - ay });
                }}
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
          selectedGhost={selectedGhost}
          workflow={workflow}
          meta={meta}
          profile={loadedProfile}
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

      {simulationModalOpen && (
        <div style={overlayStyle} onClick={() => { setSimulationModalOpen(false); setRunState("idle"); }}>
          <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Mensagem de Simulação</div>
            <div style={{ display: "grid", gap: 10 }}>
              <textarea
                className="search-input"
                placeholder="Digite a mensagem para iniciar a simulação"
                value={simulationMessage}
                onChange={(e) => setSimulationMessage(e.target.value)}
                style={{ minHeight: 96, resize: "vertical" }}
                autoFocus
              />
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                A simulação real inicia uma conversa no backend para este profile.
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => { setSimulationModalOpen(false); setRunState("idle"); }}>
                Cancelar
              </button>
              <button className="btn primary" onClick={confirmRun} disabled={createTurn.isPending || !simulationMessage.trim()}>
                {createTurn.isPending ? "Iniciando..." : "Iniciar Simulação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgb(10 12 16 / 0.55)",
  display: "grid",
  placeItems: "center",
  zIndex: 50,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 620,
  padding: 18,
};

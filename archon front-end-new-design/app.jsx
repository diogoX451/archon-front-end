/* global React, ReactDOM, AGENT_TYPES, CATEGORIES, SAMPLE_WORKFLOW, SIMULATED_TRACE, GLYPHS */
/* global IconPlay, IconReset, IconCheck, IconPlus, IconMinus, IconChev, IconClose, IconSearch, IconSliders, IconTerminal, IconTrash, IconCopy, IconHand, IconCursor, IconValidate, IconShare */
/* global useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakSelect, TweakToggle */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// =============== Helpers ===============

const uid = (prefix = "id") => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

// Get the on-screen position of a port in stage coordinates (before transform)
function portCoords(agent, portName, kind) {
  const isPrincipal = AGENT_TYPES[agent.type].ports.principal.includes(portName);
  const widthCompact = false; // assume default width
  const w = 220;
  const headerH = 36;
  const portRowH = 20; // approx
  const ports = isPrincipal
    ? AGENT_TYPES[agent.type].ports.principal
    : AGENT_TYPES[agent.type].ports.auxiliary;
  const idx = ports.indexOf(portName);
  const x = isPrincipal ? agent.x : agent.x + w;
  const y = agent.y + headerH + 12 + idx * portRowH;
  return { x, y };
}

// Build a smooth bezier between two points
function bezierPath(a, b) {
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5);
  const c1 = { x: a.x + dx, y: a.y };
  const c2 = { x: b.x - dx, y: b.y };
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
}

// =============== App ===============

function App() {
  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "accent": "graphite",
    "canvasStyle": "dots",
    "density": "comfortable",
    "theme": "light"
  }/*EDITMODE-END*/);

  // Apply tweak side-effects
  useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    const accents = {
      graphite: "oklch(0.55 0.13 248)",
      moss:     "oklch(0.52 0.10 155)",
      ember:    "oklch(0.62 0.16 35)",
      slate:    "oklch(0.45 0.02 250)",
    };
    const accentInks = {
      graphite: "oklch(0.40 0.12 248)",
      moss:     "oklch(0.36 0.10 155)",
      ember:    "oklch(0.42 0.14 35)",
      slate:    "oklch(0.30 0.02 250)",
    };
    const accentSofts = {
      graphite: "oklch(0.95 0.025 248)",
      moss:     "oklch(0.95 0.03 155)",
      ember:    "oklch(0.95 0.03 35)",
      slate:    "oklch(0.95 0.005 250)",
    };
    document.documentElement.style.setProperty("--accent", accents[tweaks.accent] || accents.graphite);
    document.documentElement.style.setProperty("--accent-ink", accentInks[tweaks.accent] || accentInks.graphite);
    document.documentElement.style.setProperty("--accent-soft", accentSofts[tweaks.accent] || accentSofts.graphite);
  }, [tweaks]);

  // ----- Workflow state -----
  const [workflow, setWorkflow] = useState(() => ({
    name: SAMPLE_WORKFLOW.name,
    agents: SAMPLE_WORKFLOW.agents.map((a) => ({ ...a, status: "idle" })),
    connections: SAMPLE_WORKFLOW.connections.map((c) => ({ ...c, status: "idle" })),
  }));

  const [selected, setSelected] = useState({ kind: null, id: null }); // {kind: 'agent'|'connection', id}
  const [runState, setRunState] = useState("idle"); // idle | running | completed | error
  const [eventLog, setEventLog] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [inspectorTab, setInspectorTab] = useState("config"); // config | input | rules

  // ----- Canvas viewport -----
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("select"); // select | pan
  const [panState, setPanState] = useState(null);

  // ----- Drag state -----
  // dragging an agent already on the canvas
  const [agentDrag, setAgentDrag] = useState(null); // {id, offsetX, offsetY}
  // dragging a NEW agent type from palette
  const [paletteDrag, setPaletteDrag] = useState(null); // {type, x, y}
  // drawing a connection from a port
  const [connDraft, setConnDraft] = useState(null); // {from:{agent,port,kind}, x, y}

  // ----- Helpers -----
  const findAgent = (id) => workflow.agents.find((a) => a.id === id);
  const updateAgent = (id, patch) => {
    setWorkflow((w) => ({
      ...w,
      agents: w.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  };
  const removeAgent = (id) => {
    setWorkflow((w) => ({
      ...w,
      agents: w.agents.filter((a) => a.id !== id),
      connections: w.connections.filter((c) => c.from.agent !== id && c.to.agent !== id),
    }));
    setSelected({ kind: null, id: null });
  };
  const removeConnection = (id) => {
    setWorkflow((w) => ({ ...w, connections: w.connections.filter((c) => c.id !== id) }));
    setSelected({ kind: null, id: null });
  };

  // ----- Mouse → stage coordinates -----
  const screenToStage = useCallback((sx, sy) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (sx - rect.left - viewport.x) / viewport.scale,
      y: (sy - rect.top - viewport.y) / viewport.scale,
    };
  }, [viewport]);

  // ----- Global mousemove for active drags -----
  useEffect(() => {
    const onMove = (e) => {
      if (paletteDrag) {
        setPaletteDrag((p) => ({ ...p, x: e.clientX, y: e.clientY }));
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
        setConnDraft((c) => ({ ...c, x: stage.x, y: stage.y }));
      }
      if (panState) {
        setViewport((v) => ({
          ...v,
          x: panState.startVx + (e.clientX - panState.startX),
          y: panState.startVy + (e.clientY - panState.startY),
        }));
      }
    };
    const onUp = (e) => {
      if (paletteDrag) {
        // Drop on canvas?
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
        setPaletteDrag(null);
      }
      if (agentDrag) setAgentDrag(null);
      if (connDraft) setConnDraft(null); // canceled (port drop handled separately)
      if (panState) setPanState(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [paletteDrag, agentDrag, connDraft, panState, screenToStage]);

  // ----- Wheel zoom -----
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 50) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setViewport((v) => {
        const factor = e.deltaY < 0 ? 1.08 : 0.93;
        const newScale = Math.max(0.4, Math.min(2.5, v.scale * factor));
        // zoom around cursor
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

  // ----- Keyboard -----
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "Backspace" || e.key === "Delete") {
        if (selected.kind === "agent") removeAgent(selected.id);
        else if (selected.kind === "connection") removeConnection(selected.id);
      } else if (e.key === "Escape") {
        setSelected({ kind: null, id: null });
      } else if (e.code === "Space") {
        setTool("pan");
      }
    };
    const onKeyUp = (e) => { if (e.code === "Space") setTool("select"); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); };
  }, [selected]);

  // ----- Run simulation -----
  const runTimers = useRef([]);
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
      const tm = setTimeout(() => {
        setEventLog((log) => [...log, { ...evt, n: i + 1 }]);
        // status updates
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

  // ----- Selected entity -----
  const selectedAgent = selected.kind === "agent" ? findAgent(selected.id) : null;
  const selectedConn = selected.kind === "connection" ? workflow.connections.find((c) => c.id === selected.id) : null;

  // ----- Density on agents -----
  const density = tweaks.density;

  return (
    <>
    <div
      className="app"
      data-density={density}
      data-inspector={inspectorTab && (selectedAgent || selectedConn || inspectorTab === "input" || inspectorTab === "rules") ? "open" : "open"}
      data-palette={paletteOpen ? "open" : "closed"}
    >
      {/* ============ Topbar ============ */}
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
        />

        <div className="spacer" />

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

        <button className="btn primary" onClick={run} disabled={runState === "running"}>
          <IconPlay className="icon" />
          <span>Executar</span>
          <span className="kbd">⌘↵</span>
        </button>
      </div>

      {/* ============ Palette ============ */}
      <Palette
        onStartDrag={(type, e) => setPaletteDrag({ type, x: e.clientX, y: e.clientY })}
      />

      {/* ============ Canvas ============ */}
      <div
        className="canvas-wrap"
        ref={canvasRef}
        onMouseDown={(e) => {
          // Pan when middle mouse, when tool=pan, or when clicking empty bg with Space held
          const isMiddle = e.button === 1;
          const wantsPan = tool === "pan" || isMiddle;
          if (wantsPan) {
            e.preventDefault();
            setPanState({ startX: e.clientX, startY: e.clientY, startVx: viewport.x, startVy: viewport.y });
            return;
          }
          // empty click → deselect
          if (e.target === canvasRef.current || e.target.classList.contains("canvas-bg") || e.target.tagName === "svg") {
            setSelected({ kind: null, id: null });
          }
        }}
        style={{ cursor: panState ? "grabbing" : tool === "pan" ? "grab" : "default" }}
      >
        <div className="canvas-bg" data-style={tweaks.canvasStyle} />

        {/* SVG layer for connections */}
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
                {/* fat invisible hit target */}
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
          {/* draft connection */}
          {connDraft && (() => {
            const fromAgent = findAgent(connDraft.from.agent);
            if (!fromAgent) return null;
            const a = portCoords(fromAgent, connDraft.from.port, connDraft.from.kind);
            const b = { x: connDraft.x, y: connDraft.y };
            return <path d={bezierPath(a, b)} stroke="var(--accent)" strokeWidth="1.75" strokeDasharray="4 4" fill="none" />;
          })()}
        </svg>

        {/* Stage layer for agents */}
        <div
          className="canvas-stage"
          style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}
        >
          {workflow.agents.map((agent) => (
            <AgentNode
              key={agent.id}
              agent={agent}
              density={density}
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
                  // create connection
                  const newConn = {
                    id: uid("c"),
                    from: { agent: connDraft.from.agent, port: connDraft.from.port },
                    to: { agent: agent.id, port },
                    status: "idle",
                  };
                  // avoid duplicate
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
              connectedPorts={getConnectedPorts(workflow.connections, agent.id)}
            />
          ))}
        </div>

        {/* Canvas toolbar */}
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

        {/* Zoom controls */}
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

        {/* Bottom drawer: event log */}
        <Drawer
          open={drawerOpen}
          onToggle={() => setDrawerOpen((o) => !o)}
          eventLog={eventLog}
          runState={runState}
        />
      </div>

      {/* ============ Inspector ============ */}
      <Inspector
        tab={inspectorTab}
        setTab={setInspectorTab}
        selectedAgent={selectedAgent}
        selectedConn={selectedConn}
        workflow={workflow}
        onUpdateAgent={updateAgent}
        onRemoveAgent={removeAgent}
        onRemoveConnection={removeConnection}
      />
    </div>

    {/* Drag ghost */}
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
            {React.createElement(GLYPHS[AGENT_TYPES[paletteDrag.type].glyph] || GLYPHS.planner, { size: 13 })}
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>{AGENT_TYPES[paletteDrag.type].label}</span>
        </div>
      </div>
    )}

    {/* Tweaks panel */}
    <TweaksPanel title="Tweaks">
      <TweakSection title="Tema">
        <TweakRadio
          label="Plano de fundo"
          value={tweaks.theme}
          onChange={(v) => setTweak("theme", v)}
          options={[{ value: "light", label: "Claro" }, { value: "dimmed", label: "Suave" }]}
        />
        <TweakColor
          label="Acento"
          value={tweaks.accent}
          onChange={(v) => setTweak("accent", v)}
          options={[
            { value: "graphite", color: "oklch(0.55 0.13 248)" },
            { value: "moss",     color: "oklch(0.52 0.10 155)" },
            { value: "ember",    color: "oklch(0.62 0.16 35)" },
            { value: "slate",    color: "oklch(0.45 0.02 250)" },
          ]}
        />
      </TweakSection>
      <TweakSection title="Canvas">
        <TweakRadio
          label="Padrão"
          value={tweaks.canvasStyle}
          onChange={(v) => setTweak("canvasStyle", v)}
          options={[
            { value: "dots", label: "Pontos" },
            { value: "grid", label: "Grade" },
            { value: "blank", label: "Liso" },
          ]}
        />
        <TweakRadio
          label="Densidade"
          value={tweaks.density}
          onChange={(v) => setTweak("density", v)}
          options={[
            { value: "compact", label: "Compacta" },
            { value: "comfortable", label: "Confortável" },
          ]}
        />
      </TweakSection>
    </TweaksPanel>
    </>
  );
}

function getConnectedPorts(connections, agentId) {
  const set = new Set();
  for (const c of connections) {
    if (c.from.agent === agentId) set.add(c.from.port);
    if (c.to.agent === agentId) set.add(c.to.port);
  }
  return set;
}

// =============== Palette ===============

function Palette({ onStartDrag }) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const byCat = {};
    for (const cat of CATEGORIES) byCat[cat] = [];
    for (const [type, meta] of Object.entries(AGENT_TYPES)) {
      if (query) {
        const q = query.toLowerCase();
        if (!meta.label.toLowerCase().includes(q) && !type.includes(q) && !meta.description.toLowerCase().includes(q)) continue;
      }
      byCat[meta.category]?.push({ type, ...meta });
    }
    return byCat;
  }, [query]);

  return (
    <div className="palette">
      <div className="panel-header">
        <span>Paleta de Agentes</span>
        <span style={{ color: "var(--ink-4)", fontFamily: "var(--font-mono)", fontSize: 10.5 }}>
          {Object.keys(AGENT_TYPES).length}
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
        />
      </div>
      {CATEGORIES.map((cat) => groups[cat].length > 0 && (
        <div key={cat}>
          <div className="palette-category">{cat}</div>
          {groups[cat].map((item) => {
            const Glyph = GLYPHS[item.glyph] || GLYPHS.planner;
            return (
              <div
                key={item.type}
                className="palette-item"
                onMouseDown={(e) => { e.preventDefault(); onStartDrag(item.type, e); }}
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
        arraste um item ao canvas. Conecte portas auxiliares (à direita) a portas principais (à esquerda) para definir o fluxo.
      </div>
    </div>
  );
}

// =============== Agent node ===============

function AgentNode({ agent, density, selected, onSelect, onStartDrag, onRename, onPortMouseDown, onPortMouseUp, connectedPorts }) {
  const meta = AGENT_TYPES[agent.type];
  const Glyph = GLYPHS[meta.glyph] || GLYPHS.planner;
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
          if (e.target.tagName === "INPUT") return;
          e.preventDefault();
          // offset = mouse-in-stage - agent.{x,y} (stage coords are scale-independent)
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
          {meta.ports.principal.map((port) => (
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
          {meta.ports.auxiliary.map((port) => (
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

function summaryFor(agent) {
  const c = agent.config || {};
  if (agent.type === "http")    return `${c.method || "GET"} · ${(c.url || "").replace(/^https?:\/\//, "") || "—"}`;
  if (agent.type === "planner") return `${c.provider || "—"} · ${c.model || ""}`;
  if (agent.type === "transform") return c.script ? `${(c.script).slice(0, 28)}…` : "—";
  if (agent.type === "rag-query") return `kb=${c.knowledge_base_id || "—"} · k=${c.top_k || 5}`;
  if (agent.type === "event") return `need=${c.need_type || "—"}`;
  if (agent.type === "interaction") return `${c.channel || "—"} · ${c.template || ""}`;
  if (agent.type === "conversation") return `profile=${c.profile_id || "—"}`;
  return "—";
}

// =============== Inspector ===============

function Inspector({ tab, setTab, selectedAgent, selectedConn, workflow, onUpdateAgent, onRemoveAgent, onRemoveConnection }) {
  return (
    <aside className="inspector">
      <div className="inspector-tabs">
        <button className="inspector-tab" data-active={tab === "config"} onClick={() => setTab("config")}>
          <IconSliders className="icon-sm" /> Inspetor
        </button>
        <button className="inspector-tab" data-active={tab === "input"} onClick={() => setTab("input")}>
          <IconTerminal className="icon-sm" /> Entrada
        </button>
        <button className="inspector-tab" data-active={tab === "rules"} onClick={() => setTab("rules")}>
          <IconShare className="icon-sm" /> Regras
          <span className="badge">{workflow.connections.length}</span>
        </button>
      </div>
      <div className="inspector-body">
        {tab === "config" && (
          selectedAgent ? <AgentInspector agent={selectedAgent} onUpdate={(patch) => onUpdateAgent(selectedAgent.id, patch)} onRemove={() => onRemoveAgent(selectedAgent.id)} /> :
          selectedConn ? <ConnectionInspector conn={selectedConn} workflow={workflow} onRemove={() => onRemoveConnection(selectedConn.id)} /> :
          <WorkflowInspector workflow={workflow} />
        )}
        {tab === "input" && <InputTab workflow={workflow} />}
        {tab === "rules" && <RulesTab workflow={workflow} />}
      </div>
    </aside>
  );
}

function WorkflowInspector({ workflow }) {
  const counts = workflow.agents.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {});
  return (
    <>
      <div className="section-title">Workflow</div>
      <div className="kv-list">
        <div className="kv-row"><span className="k">id</span><span className="v">wf_{Math.abs(hashString(workflow.name)).toString(36).slice(0, 8)}</span></div>
        <div className="kv-row"><span className="k">user_id</span><span className="v">user_123</span></div>
        <div className="kv-row"><span className="k">tenant_id</span><span className="v">acme_corp</span></div>
        <div className="kv-row"><span className="k">agentes</span><span className="v">{workflow.agents.length}</span></div>
        <div className="kv-row"><span className="k">conexões</span><span className="v">{workflow.connections.length}</span></div>
      </div>

      <div className="section-title">Composição</div>
      <div className="kv-list">
        {Object.entries(counts).length === 0 && <div className="kv-row"><span className="k">—</span><span className="v">vazio</span></div>}
        {Object.entries(counts).map(([type, n]) => (
          <div key={type} className="kv-row">
            <span className="k">{type}</span>
            <span className="v">×{n}</span>
          </div>
        ))}
      </div>

      <div className="section-title">Atalhos</div>
      <div className="kv-list">
        <div className="kv-row"><span className="k">⌘ ↵</span><span className="v">executar workflow</span></div>
        <div className="kv-row"><span className="k">Space</span><span className="v">mover canvas</span></div>
        <div className="kv-row"><span className="k">⌫</span><span className="v">excluir seleção</span></div>
        <div className="kv-row"><span className="k">ctrl+scroll</span><span className="v">zoom</span></div>
      </div>

      <div className="empty-state" style={{ padding: "20px 0 0" }}>
        Selecione um agente no canvas para editar config.
      </div>
    </>
  );
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
  return h;
}

function AgentInspector({ agent, onUpdate, onRemove }) {
  const meta = AGENT_TYPES[agent.type];
  const Glyph = GLYPHS[meta.glyph] || GLYPHS.planner;
  const setConfig = (k, v) => onUpdate({ config: { ...agent.config, [k]: v } });

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 7, display: "grid", placeItems: "center" }}>
          <Glyph size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500 }}>{meta.label}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>{agent.id}</div>
        </div>
        <button className="btn ghost" onClick={onRemove} title="Excluir agente"><IconTrash className="icon-sm" /></button>
      </div>

      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 14, lineHeight: 1.55 }}>
        {meta.description}
      </div>

      <div className="section-title">Identificação</div>
      <Field label="ID do agente">
        <input className="field-input" value={agent.id} readOnly />
        <div className="field-hint">Para renomear, dê duplo clique no nome no canvas.</div>
      </Field>
      <Field label="Tipo">
        <input className="field-input" value={agent.type} readOnly />
      </Field>

      <div className="section-title">Configuração</div>
      {agent.type === "http" && (
        <>
          <Field label="Método">
            <select className="field-select" value={agent.config.method || "GET"} onChange={(e) => setConfig("method", e.target.value)}>
              <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option>
            </select>
          </Field>
          <Field label="URL">
            <input className="field-input" value={agent.config.url || ""} onChange={(e) => setConfig("url", e.target.value)} placeholder="https://api…" />
          </Field>
          <Field label="Headers (JSON)">
            <textarea className="field-textarea" value={agent.config.headers || ""} onChange={(e) => setConfig("headers", e.target.value)} placeholder='{"Authorization": "Bearer …"}' />
          </Field>
        </>
      )}
      {agent.type === "planner" && (
        <>
          <Field label="Modo">
            <select className="field-select" value={agent.config.mode || "external"} onChange={(e) => setConfig("mode", e.target.value)}>
              <option value="external">external (LLM)</option>
              <option value="static">static (mock)</option>
            </select>
          </Field>
          <Field label="Provider">
            <select className="field-select" value={agent.config.provider || "openai"} onChange={(e) => setConfig("provider", e.target.value)}>
              <option>openai</option><option>anthropic</option><option>ollama</option>
            </select>
          </Field>
          <Field label="Model">
            <input className="field-input" value={agent.config.model || ""} onChange={(e) => setConfig("model", e.target.value)} />
          </Field>
          <Field label="Instruções">
            <textarea className="field-textarea" value={agent.config.instructions || ""} onChange={(e) => setConfig("instructions", e.target.value)} placeholder="Você é um assistente que…" />
          </Field>
        </>
      )}
      {agent.type === "transform" && (
        <Field label="Script">
          <textarea className="field-textarea" style={{ minHeight: 110 }} value={agent.config.script || ""} onChange={(e) => setConfig("script", e.target.value)} />
          <div className="field-hint">Recebe <code style={{ fontFamily: "var(--font-mono)" }}>input</code>, retorna o objeto resultante.</div>
        </Field>
      )}
      {agent.type === "rag-query" && (
        <>
          <Field label="Knowledge base"><input className="field-input" value={agent.config.knowledge_base_id || ""} onChange={(e) => setConfig("knowledge_base_id", e.target.value)} /></Field>
          <Field label="top_k"><input className="field-input" type="number" value={agent.config.top_k || 5} onChange={(e) => setConfig("top_k", +e.target.value)} /></Field>
          <Field label="min_score"><input className="field-input" type="number" step="0.1" value={agent.config.min_score || 0.5} onChange={(e) => setConfig("min_score", +e.target.value)} /></Field>
        </>
      )}
      {agent.type === "event" && (
        <Field label="need_type"><input className="field-input" value={agent.config.need_type || ""} onChange={(e) => setConfig("need_type", e.target.value)} placeholder="my.custom.event" /></Field>
      )}
      {agent.type === "interaction" && (
        <>
          <Field label="Canal">
            <select className="field-select" value={agent.config.channel || "whatsapp"} onChange={(e) => setConfig("channel", e.target.value)}>
              <option>whatsapp</option><option>telegram</option><option>slack</option>
            </select>
          </Field>
          <Field label="Template"><input className="field-input" value={agent.config.template || ""} onChange={(e) => setConfig("template", e.target.value)} /></Field>
        </>
      )}
      {agent.type === "conversation" && (
        <Field label="profile_id"><input className="field-input" value={agent.config.profile_id || ""} onChange={(e) => setConfig("profile_id", e.target.value)} /></Field>
      )}
      {agent.type === "router" && (
        <Field label="Condição"><textarea className="field-textarea" value={agent.config.condition || ""} onChange={(e) => setConfig("condition", e.target.value)} placeholder="input.score > 0.7 ? 'path_a' : 'path_b'" /></Field>
      )}
      {agent.type === "calculator" && (
        <Field label="Expressão"><input className="field-input" value={agent.config.expression || ""} onChange={(e) => setConfig("expression", e.target.value)} placeholder="input.a + input.b" /></Field>
      )}
      {agent.type === "rag-ingestion" && (
        <>
          <Field label="tenant_id"><input className="field-input" value={agent.config.tenant_id || ""} onChange={(e) => setConfig("tenant_id", e.target.value)} /></Field>
          <Field label="knowledge_base_id"><input className="field-input" value={agent.config.knowledge_base_id || ""} onChange={(e) => setConfig("knowledge_base_id", e.target.value)} /></Field>
        </>
      )}

      <div className="section-title">Portas</div>
      <div className="kv-list">
        {meta.ports.principal.map((p) => (
          <div key={p} className="kv-row"><span className="k">principal</span><span className="v">{p}</span></div>
        ))}
        {meta.ports.auxiliary.map((p) => (
          <div key={p} className="kv-row"><span className="k">auxiliar</span><span className="v">{p}</span></div>
        ))}
      </div>

      {meta.needType && (
        <>
          <div className="section-title">Subject NATS</div>
          <div className="kv-list">
            <div className="kv-row"><span className="k">need</span><span className="v">archon.need.{meta.needType}</span></div>
            <div className="kv-row"><span className="k">response</span><span className="v">archon.response.{`{corr_id}`}</span></div>
          </div>
        </>
      )}
    </>
  );
}

function ConnectionInspector({ conn, workflow, onRemove }) {
  const fromAgent = workflow.agents.find((a) => a.id === conn.from.agent);
  const toAgent = workflow.agents.find((a) => a.id === conn.to.agent);
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 500 }}>Conexão</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>{conn.id}</div>
        </div>
        <button className="btn ghost" onClick={onRemove}><IconTrash className="icon-sm" /></button>
      </div>

      <div className="kv-list">
        <div className="kv-row"><span className="k">from</span><span className="v">{conn.from.agent}.{conn.from.port}</span></div>
        <div className="kv-row"><span className="k">to</span><span className="v">{conn.to.agent}.{conn.to.port}</span></div>
      </div>

      <div className="section-title">Regra de Interação</div>
      <div className="kv-list">
        <div className="kv-row">
          <span className="k">par</span>
          <span className="v">{fromAgent?.type} ↔ {toAgent?.type}</span>
        </div>
        <div className="kv-row">
          <span className="k">tipo</span>
          <span className="v">aux → principal</span>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 14, lineHeight: 1.55 }}>
        Quando <code style={{ fontFamily: "var(--font-mono)" }}>{conn.from.agent}.{conn.from.port}</code> emite um valor, o worker aplica a regra
        e dispara <code style={{ fontFamily: "var(--font-mono)" }}>{conn.to.agent}</code> com esse valor em <code style={{ fontFamily: "var(--font-mono)" }}>{conn.to.port}</code>.
      </div>
    </>
  );
}

function InputTab({ workflow }) {
  const [body, setBody] = useState(JSON.stringify(SAMPLE_WORKFLOW.input, null, 2));
  return (
    <>
      <div className="section-title">Entrada do workflow</div>
      <Field label="JSON">
        <textarea className="field-textarea" style={{ minHeight: 140 }} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="field-hint">Esta carga é enviada ao agente raiz quando o workflow é executado.</div>
      </Field>

      <div className="section-title">cURL</div>
      <div className="kv-list" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
        <div style={{ color: "var(--ink-2)" }}>POST /api/v1/workflows</div>
        <div style={{ color: "var(--ink-3)" }}>Content-Type: application/json</div>
        <div style={{ color: "var(--ink-4)" }}>—</div>
        <div style={{ color: "var(--ink-2)" }}>{`{ "user_id": "user_123",`}</div>
        <div style={{ color: "var(--ink-2)", paddingLeft: 14 }}>{`"agents": […${workflow.agents.length}],`}</div>
        <div style={{ color: "var(--ink-2)", paddingLeft: 14 }}>{`"connections": […${workflow.connections.length}],`}</div>
        <div style={{ color: "var(--ink-2)", paddingLeft: 14 }}>{`"input": {…} }`}</div>
      </div>
    </>
  );
}

function RulesTab({ workflow }) {
  const rules = useMemo(() => {
    const seen = new Map();
    for (const c of workflow.connections) {
      const a = workflow.agents.find((x) => x.id === c.from.agent);
      const b = workflow.agents.find((x) => x.id === c.to.agent);
      if (!a || !b) continue;
      const key = `${a.type}::${b.type}`;
      if (!seen.has(key)) seen.set(key, { a: a.type, b: b.type, n: 0 });
      seen.get(key).n += 1;
    }
    return Array.from(seen.values());
  }, [workflow]);

  return (
    <>
      <div className="section-title">Regras Aplicadas</div>
      {rules.length === 0 && <div className="empty-state">Nenhuma conexão definida ainda.</div>}
      {rules.map((r) => (
        <div key={`${r.a}-${r.b}`} className="kv-list" style={{ marginBottom: 8 }}>
          <div className="kv-row" style={{ alignItems: "center" }}>
            <span className="k" style={{ minWidth: 0, flex: 1, color: "var(--ink-2)" }}>
              <span style={{ fontFamily: "var(--font-mono)" }}>{r.a}</span>
              <span style={{ color: "var(--ink-4)", margin: "0 6px" }}>↔</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>{r.b}</span>
            </span>
            <span className="v" style={{ flexShrink: 0, color: "var(--ink-3)" }}>×{r.n}</span>
          </div>
        </div>
      ))}

      <div className="section-title">Invariantes</div>
      <div className="kv-list">
        <div className="kv-row"><span className="k">linearidade</span><span className="v">✓ cada porta usada ≤ 1×</span></div>
        <div className="kv-row"><span className="k">interação binária</span><span className="v">✓ aux → principal</span></div>
        <div className="kv-row"><span className="k">sem ambiguidade</span><span className="v">✓ 1 regra por par</span></div>
        <div className="kv-row"><span className="k">RHS limpo</span><span className="v">✓ sem ciclos ativos</span></div>
      </div>
    </>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

// =============== Drawer (event log) ===============

function Drawer({ open, onToggle, eventLog, runState }) {
  const bodyRef = useRef(null);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [eventLog]);

  return (
    <div className="drawer" data-open={open}>
      <div className="drawer-head" onClick={onToggle}>
        <IconTerminal className="icon-sm" style={{ color: "var(--ink-3)" }} />
        <span className="title">Event Bus · NATS JetStream</span>
        <span className="meta">
          {runState === "running" && `${eventLog.length}/${SIMULATED_TRACE.length} eventos`}
          {runState === "completed" && `${eventLog.length} eventos · concluído`}
          {runState === "idle" && "aguardando execução"}
        </span>
        <div className="spacer" />
        <IconChev className="icon-sm chev" />
      </div>
      {open && (
        <div className="drawer-body" ref={bodyRef}>
          {eventLog.length === 0 ? (
            <div className="drawer-empty">Clique em <strong style={{ color: "var(--ink-2)" }}>Executar</strong> para ver eventos passando pelo bus.</div>
          ) : eventLog.map((e, i) => (
            <div key={i} className="event-row">
              <span className="t">+{String(e.t).padStart(4, "0")}ms</span>
              <span className="type" data-type={e.type}>{e.type}</span>
              <span>
                <span className="summary">{e.summary}</span>
                <br />
                <span className="subject">{e.subject}</span>
              </span>
              {e.agent && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink-4)" }}>{e.agent}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============== Mount ===============

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

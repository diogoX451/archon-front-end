import { useMemo } from "react";
import type { AgentNodeData, ConnectionData } from "./types";

const AGENT_W = 220;
const AGENT_H = 92;
const MAP_W = 160;
const MAP_H = 100;
const PAD = 16;

const TYPE_COLORS: Record<string, string> = {
  planner: "#6366f1",
  http: "#0ea5e9",
  transform: "#f59e0b",
  "rag.query": "#10b981",
  "rag.ingest": "#059669",
  "graph.memory": "#8b5cf6",
  "channel.delivery": "#ec4899",
  event: "#64748b",
  interaction: "#f97316",
  mcp: "#06b6d4",
  guardrails: "#ef4444",
};

interface MiniMapProps {
  agents: AgentNodeData[];
  connections: ConnectionData[];
  panX: number;
  panY: number;
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
}

export function MiniMap({ agents, connections, panX, panY, zoom, canvasWidth, canvasHeight }: MiniMapProps) {
  const { scale, ox, oy, vx, vy, vw, vh } = useMemo(() => {
    if (agents.length === 0) {
      return { scale: 1, ox: 0, oy: 0, vx: 0, vy: 0, vw: MAP_W, vh: MAP_H };
    }
    const xs = agents.map(a => a.x);
    const ys = agents.map(a => a.y);
    const minX = Math.min(...xs) - PAD;
    const minY = Math.min(...ys) - PAD;
    const maxX = Math.max(...xs) + AGENT_W + PAD;
    const maxY = Math.max(...ys) + AGENT_H + PAD;
    const contentW = Math.max(maxX - minX, 1);
    const contentH = Math.max(maxY - minY, 1);
    const s = Math.min(MAP_W / contentW, MAP_H / contentH);
    const vpX = (-panX / zoom - minX) * s;
    const vpY = (-panY / zoom - minY) * s;
    const vpW = (canvasWidth / zoom) * s;
    const vpH = (canvasHeight / zoom) * s;
    return { scale: s, ox: minX, oy: minY, vx: vpX, vy: vpY, vw: vpW, vh: vpH };
  }, [agents, panX, panY, zoom, canvasWidth, canvasHeight]);

  return (
    <div style={{
      position: "absolute",
      bottom: 52,
      right: 12,
      width: MAP_W,
      height: MAP_H,
      background: "var(--surface)",
      border: "1px solid var(--line-2)",
      borderRadius: 6,
      boxShadow: "var(--shadow-1)",
      overflow: "hidden",
      opacity: 0.9,
      pointerEvents: "none",
      zIndex: 10,
    }}>
      <svg width={MAP_W} height={MAP_H} style={{ display: "block" }}>
        {connections.map(c => {
          const from = agents.find(a => a.id === c.from.agent);
          const to = agents.find(a => a.id === c.to.agent);
          if (!from || !to) return null;
          const x1 = (from.x + AGENT_W - ox) * scale;
          const y1 = (from.y + AGENT_H / 2 - oy) * scale;
          const x2 = (to.x - ox) * scale;
          const y2 = (to.y + AGENT_H / 2 - oy) * scale;
          return (
            <line key={c.id} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="var(--line-2)" strokeWidth={1} />
          );
        })}
        {agents.map(a => (
          <rect key={a.id}
            x={(a.x - ox) * scale}
            y={(a.y - oy) * scale}
            width={Math.max(AGENT_W * scale, 3)}
            height={Math.max(AGENT_H * scale, 2)}
            rx={2}
            fill={TYPE_COLORS[a.type] ?? "#94a3b8"}
            opacity={0.75}
          />
        ))}
        <rect
          x={vx} y={vy}
          width={Math.max(vw, 8)} height={Math.max(vh, 8)}
          rx={2} fill="none"
          stroke="var(--accent)" strokeWidth={1.5} opacity={0.85}
        />
      </svg>
    </div>
  );
}

import { GLYPHS, GlyphPlanner } from "@shared/ui/icons/Icons";
import { AGENT_TYPES } from "./data";

// One planner action rendered as a "ghost" node hanging off the planner.
// Ghost nodes are read-only: not persisted in workflow.agents and never
// land in the saved profile JSON — they're derived purely from
// planner.config.actions and exist to make the runtime fan-out shape
// visible on the canvas.
//
// Visual hint: dashed border, no auxiliary ports, slightly muted.
export interface GhostAction {
  /** Stable id used for selection state. Pattern: ${plannerId}::${actionName}. */
  id: string;
  plannerId: string;
  name: string;
  description?: string;
  agentType?: string;  // event | interaction | (terminal: undefined)
  needType?: string;
  x: number;
  y: number;
}

interface Props {
  action: GhostAction;
  selected: boolean;
  onSelect: () => void;
  onStartDrag?: (clientX: number, clientY: number, ax: number, ay: number) => void;
}

function actionTone(action: GhostAction): "terminal" | "fanout" {
  if (!action.agentType && !action.needType) return "terminal";
  return "fanout";
}

function actionIcon(action: GhostAction) {
  // The semantically meaningful identity of an action is its need_type
  // (rag.query, channel.delivery, graph.memory.log, ...) — that's what
  // the runtime executor actually does. agent_type is often the generic
  // bus ("event"/"interaction") so it doesn't tell the user much. We
  // try need_type first against AGENT_TYPES (where keys are need_type
  // for executor-backed agents); fall back to agent_type; then planner.
  if (action.needType) {
    // exact match (rag.query, rag.ingest, channel.delivery, ...)
    if (AGENT_TYPES[action.needType]) {
      return (GLYPHS as any)[AGENT_TYPES[action.needType].glyph] || GlyphPlanner;
    }
    // prefix match for namespaced needs (graph.memory.log → graph.memory)
    for (const key of Object.keys(AGENT_TYPES)) {
      const meta = AGENT_TYPES[key];
      if (meta.needType && action.needType.startsWith(meta.needType + ".")) {
        return (GLYPHS as any)[meta.glyph] || GlyphPlanner;
      }
      if (key.includes(".") && action.needType.startsWith(key + ".")) {
        return (GLYPHS as any)[meta.glyph] || GlyphPlanner;
      }
    }
  }
  if (action.agentType && AGENT_TYPES[action.agentType]) {
    return (GLYPHS as any)[AGENT_TYPES[action.agentType].glyph] || GlyphPlanner;
  }
  return GlyphPlanner;
}

export function GhostActionNode({ action, selected, onSelect, onStartDrag }: Props) {
  const Glyph = actionIcon(action);
  const tone = actionTone(action);
  return (
    <div
      className="ghost-action"
      data-selected={selected}
      data-tone={tone}
      style={{ left: action.x, top: action.y }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect();
        // Forward drag intent — WorkflowBuilder handles move/release
        // and clamps via the same effect that powers agent dragging.
        if (onStartDrag) onStartDrag(e.clientX, e.clientY, action.x, action.y);
      }}
      title={action.description || action.name}
    >
      <div className="ghost-action-head">
        <div className="ghost-action-glyph"><Glyph size={13} /></div>
        <span className="ghost-action-name">{action.name}</span>
      </div>
      <div className="ghost-action-meta">
        {action.agentType ? (
          <span className="ghost-action-pill">→ {action.agentType}</span>
        ) : (
          <span className="ghost-action-pill" data-terminal="true">terminal</span>
        )}
        {action.needType && (
          <span className="ghost-action-pill mono">{action.needType}</span>
        )}
      </div>
    </div>
  );
}

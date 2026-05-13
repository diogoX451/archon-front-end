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
}

function actionTone(action: GhostAction): "terminal" | "fanout" {
  if (!action.agentType && !action.needType) return "terminal";
  return "fanout";
}

function actionIcon(action: GhostAction) {
  // Reuse the palette glyphs so the type identity is consistent across
  // canvas + palette + inspector. Falls back to the planner icon for
  // terminal actions (complete/ask_user) since they live inside the
  // planner's own turn.
  const targetType = action.agentType;
  if (targetType && AGENT_TYPES[targetType]) {
    return (GLYPHS as any)[AGENT_TYPES[targetType].glyph] || GlyphPlanner;
  }
  return GlyphPlanner;
}

export function GhostActionNode({ action, selected, onSelect }: Props) {
  const Glyph = actionIcon(action);
  const tone = actionTone(action);
  return (
    <div
      className="ghost-action"
      data-selected={selected}
      data-tone={tone}
      style={{ left: action.x, top: action.y }}
      onMouseDown={(e) => { e.stopPropagation(); onSelect(); }}
      title={action.description || action.name}
    >
      <div className="ghost-action-head">
        <div className="ghost-action-glyph"><Glyph size={11} /></div>
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

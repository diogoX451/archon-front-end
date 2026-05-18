import { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export const Icon = ({ d, size = 14, fill = "none", stroke = "currentColor", strokeWidth = 1.6, children, viewBox = "0 0 24 24", ...rest }: IconProps & { d?: string }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {d ? <path d={d} /> : children}
  </svg>
);

// Menu Icons
export const IconOverview = (p: IconProps) => <Icon {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></Icon>;
export const IconConversation = (p: IconProps) => <Icon {...p}><path d="M3 6h12v8H8l-3 3v-3H3z" /><path d="M9 10h12v6h-3l-2 2v-2H9z" transform="translate(0 -1)" /></Icon>;
export const IconEvents = (p: IconProps) => <Icon {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Icon>;
export const IconWorkflows = (p: IconProps) => <Icon {...p}><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6h7M6 8.5v7M18 8.5v7M8.5 18h7"/></Icon>;
export const IconProfiles = (p: IconProps) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></Icon>;
export const IconRAG = (p: IconProps) => <Icon {...p}><path d="M4 6c0-1 4-2 8-2s8 1 8 2v12c0 1-4 2-8 2s-8-1-8-2z"/><path d="M4 6c0 1 4 2 8 2s8-1 8-2M4 12c0 1 4 2 8 2s8-1 8-2"/></Icon>;
export const IconTemplates = (p: IconProps) => <Icon {...p}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></Icon>;
export const IconAgents = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="3"/><circle cx="6" cy="7" r="1.5"/><circle cx="18" cy="7" r="1.5"/><circle cx="6" cy="17" r="1.5"/><circle cx="18" cy="17" r="1.5"/><path d="M9.5 10.5L7 8M14.5 10.5L17 8M9.5 13.5L7 16M14.5 13.5L17 16"/></Icon>;
export const IconExecutions = (p: IconProps) => <Icon {...p}><path d="M7 5l12 7-12 7z"/></Icon>;

// UI Icons
export const IconPlay     = (p: IconProps) => <Icon {...p}><path d="M7 5l12 7-12 7z" /></Icon>;
export const IconPause    = (p: IconProps) => <Icon {...p}><path d="M7 5v14M17 5v14" /></Icon>;
export const IconReset    = (p: IconProps) => <Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></Icon>;
export const IconCheck    = (p: IconProps) => <Icon {...p}><path d="M5 12l5 5 9-11" /></Icon>;
export const IconPlus     = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const IconMinus    = (p: IconProps) => <Icon {...p}><path d="M5 12h14" /></Icon>;
export const IconChev     = (p: IconProps) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>;
export const IconClose    = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>;
export const IconSearch   = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon>;
export const IconSliders  = (p: IconProps) => <Icon {...p}><path d="M4 7h11M19 7h1M4 17h7M15 17h5M14 4v6M10 14v6" /></Icon>;
export const IconLayers   = (p: IconProps) => <Icon {...p}><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5M3 18l9 5 9-5" /></Icon>;
export const IconTerminal = (p: IconProps) => <Icon {...p}><path d="M5 7l4 5-4 5M11 17h8" /></Icon>;
export const IconTrash    = (p: IconProps) => <Icon {...p}><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" /></Icon>;
export const IconCopy     = (p: IconProps) => <Icon {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></Icon>;
export const IconHand     = (p: IconProps) => <Icon {...p}><path d="M8 11V5a2 2 0 1 1 4 0v6M12 11V4a2 2 0 1 1 4 0v7M16 11V6a2 2 0 1 1 4 0v9a6 6 0 0 1-12 0v-2l-2-2a1.5 1.5 0 0 1 2-2l2 2" /></Icon>;
export const IconCursor   = (p: IconProps) => <Icon {...p}><path d="M5 4l6 14 2-6 6-2z" /></Icon>;
export const IconValidate = (p: IconProps) => <Icon {...p}><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></Icon>;
export const IconShare    = (p: IconProps) => <Icon {...p}><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8 11l8-4M8 13l8 4" /></Icon>;

// Agent Glyphs
export const GlyphPlanner = (p: IconProps) => (
  <Icon {...p} size={p.size || 14}>
    <circle cx="12" cy="12" r="3" />
    <circle cx="6" cy="7" r="1.5" />
    <circle cx="18" cy="7" r="1.5" />
    <circle cx="6" cy="17" r="1.5" />
    <circle cx="18" cy="17" r="1.5" />
    <path d="M9.5 10.5L7 8M14.5 10.5L17 8M9.5 13.5L7 16M14.5 13.5L17 16" />
  </Icon>
);
export const GlyphHttp = (p: IconProps) => (
  <Icon {...p} size={p.size || 14}>
    <path d="M3 12h18" />
    <path d="M16 7l5 5-5 5" />
  </Icon>
);
export const GlyphTransform = (p: IconProps) => (
  <Icon {...p} size={p.size || 14}>
    <path d="M9 4c-2 0-2 4-2 8s0 8-2 8" />
    <path d="M15 4c2 0 2 4 2 8s0 8 2 8" />
    <path d="M7 12h10" />
  </Icon>
);
export const GlyphEvent = (p: IconProps) => (
  <Icon {...p} size={p.size || 14}>
    <path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />
  </Icon>
);
export const GlyphInteraction = (p: IconProps) => (
  <Icon {...p} size={p.size || 14}>
    <path d="M4 5h16v11h-9l-4 4v-4H4z" />
    <circle cx="9" cy="11" r="0.5" fill="currentColor" />
    <circle cx="12" cy="11" r="0.5" fill="currentColor" />
    <circle cx="15" cy="11" r="0.5" fill="currentColor" />
  </Icon>
);
export const GlyphRouter = (p: IconProps) => (
  <Icon {...p} size={p.size || 14}>
    <path d="M5 5v6a3 3 0 0 0 3 3h8a3 3 0 0 1 3 3v2" />
    <path d="M16 11l3 3 3-3" transform="translate(-3 4)" />
    <circle cx="5" cy="5" r="1" fill="currentColor" />
  </Icon>
);
export const GlyphCalculator = (p: IconProps) => (
  <Icon {...p} size={p.size || 14}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M8 7h8M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
  </Icon>
);
export const GlyphRag = (p: IconProps) => (
  <Icon {...p} size={p.size || 14}>
    <path d="M4 6c0-1 4-2 8-2s8 1 8 2v12c0 1-4 2-8 2s-8-1-8-2z" />
    <path d="M4 6c0 1 4 2 8 2s8-1 8-2M4 12c0 1 4 2 8 2s8-1 8-2" />
  </Icon>
);
export const GlyphConversation = (p: IconProps) => (
  <Icon {...p} size={p.size || 14}>
    <path d="M3 6h12v8H8l-3 3v-3H3z" />
    <path d="M9 10h12v6h-3l-2 2v-2H9z" transform="translate(0 -1)" />
  </Icon>
);
// Three satellite nodes wired to a central hub — visual cue that the agent
// resolves its tool through the MCP registry instead of acting on its own.
export const GlyphMcp = (p: IconProps) => (
  <Icon {...p} size={p.size || 14}>
    <circle cx="12" cy="12" r="3" />
    <circle cx="5" cy="6" r="1.5" />
    <circle cx="19" cy="6" r="1.5" />
    <circle cx="12" cy="20" r="1.5" />
    <path d="M7 7l3 3M17 7l-3 3M12 15v3" />
  </Icon>
);

export const GLYPHS = {
  planner: GlyphPlanner,
  http: GlyphHttp,
  transform: GlyphTransform,
  event: GlyphEvent,
  interaction: GlyphInteraction,
  router: GlyphRouter,
  calculator: GlyphCalculator,
  rag: GlyphRag,
  conversation: GlyphConversation,
  // Aliases pointing at the closest existing glyph so the backend
  // catalog (graph.memory, channel.delivery) doesn't fall through to
  // the generic planner icon. Replace with bespoke glyphs later.
  graph: GlyphRouter,
  delivery: GlyphInteraction,
  mcp: GlyphMcp,
} as const;

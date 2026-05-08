/* global React */
// Icons + agent type glyphs — minimal geometric SVGs only.

const Icon = ({ d, size = 14, fill = "none", stroke = "currentColor", strokeWidth = 1.6, children, viewBox = "0 0 24 24", ...rest }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {d ? <path d={d} /> : children}
  </svg>
);

// UI icons
const IconPlay     = (p) => <Icon {...p}><path d="M7 5l12 7-12 7z" /></Icon>;
const IconPause    = (p) => <Icon {...p}><path d="M7 5v14M17 5v14" /></Icon>;
const IconReset    = (p) => <Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></Icon>;
const IconCheck    = (p) => <Icon {...p}><path d="M5 12l5 5 9-11" /></Icon>;
const IconPlus     = (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
const IconMinus    = (p) => <Icon {...p}><path d="M5 12h14" /></Icon>;
const IconChev     = (p) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>;
const IconClose    = (p) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>;
const IconSearch   = (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon>;
const IconSliders  = (p) => <Icon {...p}><path d="M4 7h11M19 7h1M4 17h7M15 17h5M14 4v6M10 14v6" /></Icon>;
const IconLayers   = (p) => <Icon {...p}><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5M3 18l9 5 9-5" /></Icon>;
const IconTerminal = (p) => <Icon {...p}><path d="M5 7l4 5-4 5M11 17h8" /></Icon>;
const IconTrash    = (p) => <Icon {...p}><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" /></Icon>;
const IconCopy     = (p) => <Icon {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></Icon>;
const IconHand     = (p) => <Icon {...p}><path d="M8 11V5a2 2 0 1 1 4 0v6M12 11V4a2 2 0 1 1 4 0v7M16 11V6a2 2 0 1 1 4 0v9a6 6 0 0 1-12 0v-2l-2-2a1.5 1.5 0 0 1 2-2l2 2" /></Icon>;
const IconCursor   = (p) => <Icon {...p}><path d="M5 4l6 14 2-6 6-2z" /></Icon>;
const IconValidate = (p) => <Icon {...p}><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></Icon>;
const IconShare    = (p) => <Icon {...p}><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8 11l8-4M8 13l8 4" /></Icon>;

// Agent-type glyphs — small distinctive geometry
const GlyphPlanner = (p) => (
  <Icon {...p} size={p.size || 14}>
    <circle cx="12" cy="12" r="3" />
    <circle cx="6" cy="7" r="1.5" />
    <circle cx="18" cy="7" r="1.5" />
    <circle cx="6" cy="17" r="1.5" />
    <circle cx="18" cy="17" r="1.5" />
    <path d="M9.5 10.5L7 8M14.5 10.5L17 8M9.5 13.5L7 16M14.5 13.5L17 16" />
  </Icon>
);
const GlyphHttp = (p) => (
  <Icon {...p} size={p.size || 14}>
    <path d="M3 12h18" />
    <path d="M16 7l5 5-5 5" />
  </Icon>
);
const GlyphTransform = (p) => (
  <Icon {...p} size={p.size || 14}>
    <path d="M9 4c-2 0-2 4-2 8s0 8-2 8" />
    <path d="M15 4c2 0 2 4 2 8s0 8 2 8" />
    <path d="M7 12h10" />
  </Icon>
);
const GlyphEvent = (p) => (
  <Icon {...p} size={p.size || 14}>
    <path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />
  </Icon>
);
const GlyphInteraction = (p) => (
  <Icon {...p} size={p.size || 14}>
    <path d="M4 5h16v11h-9l-4 4v-4H4z" />
    <circle cx="9" cy="11" r="0.5" fill="currentColor" />
    <circle cx="12" cy="11" r="0.5" fill="currentColor" />
    <circle cx="15" cy="11" r="0.5" fill="currentColor" />
  </Icon>
);
const GlyphRouter = (p) => (
  <Icon {...p} size={p.size || 14}>
    <path d="M5 5v6a3 3 0 0 0 3 3h8a3 3 0 0 1 3 3v2" />
    <path d="M16 11l3 3 3-3" transform="translate(-3 4)" />
    <circle cx="5" cy="5" r="1" fill="currentColor" />
  </Icon>
);
const GlyphCalculator = (p) => (
  <Icon {...p} size={p.size || 14}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M8 7h8M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
  </Icon>
);
const GlyphRag = (p) => (
  <Icon {...p} size={p.size || 14}>
    <path d="M4 6c0-1 4-2 8-2s8 1 8 2v12c0 1-4 2-8 2s-8-1-8-2z" />
    <path d="M4 6c0 1 4 2 8 2s8-1 8-2M4 12c0 1 4 2 8 2s8-1 8-2" />
  </Icon>
);
const GlyphConversation = (p) => (
  <Icon {...p} size={p.size || 14}>
    <path d="M3 6h12v8H8l-3 3v-3H3z" />
    <path d="M9 10h12v6h-3l-2 2v-2H9z" transform="translate(0 -1)" />
  </Icon>
);

const GLYPHS = {
  planner: GlyphPlanner,
  http: GlyphHttp,
  transform: GlyphTransform,
  event: GlyphEvent,
  interaction: GlyphInteraction,
  router: GlyphRouter,
  calculator: GlyphCalculator,
  rag: GlyphRag,
  conversation: GlyphConversation,
};

Object.assign(window, {
  Icon,
  IconPlay, IconPause, IconReset, IconCheck, IconPlus, IconMinus, IconChev,
  IconClose, IconSearch, IconSliders, IconLayers, IconTerminal, IconTrash,
  IconCopy, IconHand, IconCursor, IconValidate, IconShare,
  GLYPHS,
});

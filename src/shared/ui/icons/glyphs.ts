import {
  GlyphPlanner,
  GlyphHttp,
  GlyphTransform,
  GlyphEvent,
  GlyphInteraction,
  GlyphRouter,
  GlyphCalculator,
  GlyphRag,
  GlyphConversation,
  GlyphMcp,
  GlyphGuardrails,
} from "./Icons";

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
  guardrails: GlyphGuardrails,
} as const;

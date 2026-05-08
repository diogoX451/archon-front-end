// Archon agent type catalog + sample workflow
// Loaded as plain script — exposes window.AGENT_TYPES, window.SAMPLE_WORKFLOW, etc.

const AGENT_TYPES = {
  planner: {
    label: "Planner",
    category: "Decisão",
    description: "Toma decisão via LLM (OpenAI, Anthropic, Ollama) ou modo estático.",
    ports: { principal: ["input"], auxiliary: ["output"] },
    needType: "planner.decide",
    glyph: "planner",
    defaultConfig: {
      mode: "external",
      provider: "openai",
      model: "gpt-4",
      instructions: "",
    },
  },
  http: {
    label: "HTTP",
    category: "I/O Externo",
    description: "Chama API externa (GET/POST/PUT/DELETE) e aguarda resposta.",
    ports: { principal: ["trigger"], auxiliary: ["response"] },
    needType: "http",
    glyph: "http",
    defaultConfig: { method: "GET", url: "" },
  },
  transform: {
    label: "Transform",
    category: "Dados",
    description: "Transforma dados via script (map, filter, reshape).",
    ports: { principal: ["input"], auxiliary: ["output"] },
    needType: null, // local
    glyph: "transform",
    defaultConfig: { script: "return input;" },
  },
  event: {
    label: "Event",
    category: "I/O Externo",
    description: "Publica evento e aguarda resposta assíncrona via webhook.",
    ports: { principal: ["trigger"], auxiliary: ["response"] },
    needType: "event",
    glyph: "event",
    defaultConfig: { need_type: "my.custom.event" },
  },
  interaction: {
    label: "Interaction",
    category: "Canais",
    description: "Interage com usuário em canal (WhatsApp, Telegram, Slack).",
    ports: { principal: ["request"], auxiliary: ["response"] },
    needType: "interaction",
    glyph: "interaction",
    defaultConfig: { channel: "whatsapp", template: "menu" },
  },
  router: {
    label: "Router",
    category: "Decisão",
    description: "Roteia execução baseado em condição (path_a, path_b, ...).",
    ports: { principal: ["input"], auxiliary: ["path_a", "path_b", "default"] },
    needType: null,
    glyph: "router",
    defaultConfig: { condition: "" },
  },
  calculator: {
    label: "Calculator",
    category: "Dados",
    description: "Realiza cálculo matemático sobre input numérico.",
    ports: { principal: ["input"], auxiliary: ["output"] },
    needType: null,
    glyph: "calculator",
    defaultConfig: { expression: "" },
  },
  "rag-query": {
    label: "RAG Query",
    category: "RAG",
    description: "Busca semântica em base vetorial. Retorna top-k documentos.",
    ports: { principal: ["input"], auxiliary: ["documents"] },
    needType: "rag.query",
    glyph: "rag",
    defaultConfig: { knowledge_base_id: "", top_k: 5, min_score: 0.5 },
  },
  "rag-ingestion": {
    label: "RAG Ingest",
    category: "RAG",
    description: "Ingere documento (PDF/DOCX/TXT) — chunking + embedding.",
    ports: { principal: ["input"], auxiliary: ["document_id"] },
    needType: "rag.ingest",
    glyph: "rag",
    defaultConfig: { tenant_id: "", knowledge_base_id: "" },
  },
  conversation: {
    label: "Conversation",
    category: "Canais",
    description: "Turno de conversa multi-turn com histórico e contexto.",
    ports: { principal: ["input"], auxiliary: ["reply"] },
    needType: "conversation.turn",
    glyph: "conversation",
    defaultConfig: { profile_id: "" },
  },
};

const CATEGORIES = ["Decisão", "I/O Externo", "Dados", "RAG", "Canais"];

// --- Sample workflow: Assistente de clima (planner → http → transform) ---
const SAMPLE_WORKFLOW = {
  name: "Assistente de Clima",
  user_id: "user_123",
  agents: [
    {
      id: "decisor",
      type: "planner",
      x: 120, y: 180,
      config: {
        mode: "external",
        provider: "openai",
        model: "gpt-4",
        instructions: "Extraia a cidade mencionada na pergunta do usuário.",
      },
    },
    {
      id: "buscar_clima",
      type: "http",
      x: 480, y: 180,
      config: {
        method: "GET",
        url: "https://api.openweathermap.org/data/2.5/weather?q={{city}}",
      },
    },
    {
      id: "formatar",
      type: "transform",
      x: 840, y: 180,
      config: {
        script: "return { weather: input.main, temp: input.temp };",
      },
    },
  ],
  connections: [
    { id: "c1", from: { agent: "decisor", port: "output" }, to: { agent: "buscar_clima", port: "trigger" } },
    { id: "c2", from: { agent: "buscar_clima", port: "response" }, to: { agent: "formatar", port: "input" } },
  ],
  input: { query: "Como está o clima em São Paulo?" },
};

// --- Simulated execution trace, used when user clicks Executar ---
// Each step represents an event on the bus. Worker publishes needs, executors respond.
const SIMULATED_TRACE = [
  { t: 0,    type: "command", subject: "archon.command.spawn",   summary: "Workflow criado · agente raiz: decisor",       agent: null,         status: "info" },
  { t: 80,   type: "fire",    subject: "archon.interaction.pending", summary: "Disparando agente raiz: decisor",           agent: "decisor",    status: "running" },
  { t: 140,  type: "need",    subject: "archon.need.planner.decide", summary: "Need publicado · correlation_id=corr_001",  agent: "decisor",    status: "running" },
  { t: 580,  type: "response",subject: "archon.response.corr_001",   summary: "LLM respondeu · {city: \"São Paulo\"}",      agent: "decisor",    status: "done" },
  { t: 640,  type: "rule",    subject: "rule[planner ↔ http]",       summary: "Regra aplicada · output → trigger",          agent: null,         status: "info" },
  { t: 700,  type: "fire",    subject: "archon.interaction.pending", summary: "Disparando agente: buscar_clima",            agent: "buscar_clima", status: "running" },
  { t: 760,  type: "need",    subject: "archon.need.http",           summary: "GET api.openweathermap.org · corr=corr_002", agent: "buscar_clima", status: "running" },
  { t: 1320, type: "response",subject: "archon.response.corr_002",   summary: "200 OK · {main: \"Sunny\", temp: 25}",       agent: "buscar_clima", status: "done" },
  { t: 1380, type: "rule",    subject: "rule[http ↔ transform]",     summary: "Regra aplicada · response → input",          agent: null,         status: "info" },
  { t: 1440, type: "fire",    subject: "archon.interaction.pending", summary: "Disparando agente: formatar",                agent: "formatar",   status: "running" },
  { t: 1480, type: "local",   subject: "transform.exec",             summary: "Script executado localmente",                agent: "formatar",   status: "done" },
  { t: 1540, type: "result",  subject: "archon.result.{workflow_id}", summary: "Workflow completo · 1540ms · {weather: \"Sunny\", temp: 25}", agent: null, status: "success" },
];

window.AGENT_TYPES = AGENT_TYPES;
window.CATEGORIES = CATEGORIES;
window.SAMPLE_WORKFLOW = SAMPLE_WORKFLOW;
window.SIMULATED_TRACE = SIMULATED_TRACE;

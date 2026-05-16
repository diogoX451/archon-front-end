export type AgentTypeMetadata = {
  label: string;
  category: string;
  description: string;
  ports: {
    principal: string[];
    auxiliary: string[];
  };
  needType: string | null;
  glyph: string;
  defaultConfig: Record<string, any>;
};

// AGENT_TYPES mirrors the backend agent catalog defaults.
// do backend, que é a fonte de verdade. Tipos só existem aqui se houver
// um executor real escutando o subject NATS correspondente. Para mudar
// a lista, edite o seed e re-execute `go run ./cmd/seed-profiles` ou
// reinicie a API — depois sincronize aqui.
//
// Tipos extras (event, interaction) NÃO entram na paleta principal: são
// alvos de `planner.actions[].agent_type` quando o planner faz fan-out.
// Mantemos a metadata para o builder renderizá-los caso apareçam em um
// profile existente.
export const AGENT_TYPES: Record<string, AgentTypeMetadata> = {
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
    description: "Transforma dados via JSONPath, regex ou expressão.",
    ports: { principal: ["input"], auxiliary: ["output"] },
    needType: null,
    glyph: "transform",
    defaultConfig: { expr: "" },
  },
  "rag.query": {
    label: "RAG Query",
    category: "Conhecimento",
    description: "Consulta base RAG e retorna chunks com scores.",
    ports: { principal: ["query"], auxiliary: ["chunks"] },
    needType: "rag.query",
    glyph: "rag",
    defaultConfig: { top_k: 5, min_score_threshold: 0.0 },
  },
  "rag.ingest": {
    label: "RAG Ingest",
    category: "Conhecimento",
    description: "Ingere documento na base RAG (text, PDF, DOCX).",
    ports: { principal: ["document"], auxiliary: ["status"] },
    needType: "rag.ingest",
    glyph: "rag",
    defaultConfig: { knowledge_base_id: "" },
  },
  "graph.memory": {
    label: "Graph Memory",
    category: "Memória",
    description: "Persiste entidades, relações e conceitos em Neo4j.",
    ports: { principal: ["signal"], auxiliary: ["ack"] },
    needType: "graph.memory.log",
    glyph: "graph",
    defaultConfig: {},
  },
  "channel.delivery": {
    label: "Channel Delivery",
    category: "Saída",
    description: "Envia mensagem ao canal (WhatsApp, web, etc.).",
    ports: { principal: ["payload"], auxiliary: ["receipt"] },
    needType: "channel.delivery",
    glyph: "delivery",
    defaultConfig: { channel: "whatsapp" },
  },
  // Runtime-only: alvos de planner.actions[].agent_type, não entram na
  // paleta. Definidos aqui para que profiles legacy renderizem.
  event: {
    label: "Event",
    category: "Runtime",
    description: "Alvo de planner action — publica need genérico.",
    ports: { principal: ["trigger"], auxiliary: ["response"] },
    needType: "event",
    glyph: "event",
    defaultConfig: { need_type: "" },
  },
  interaction: {
    label: "Interaction",
    category: "Runtime",
    description: "Alvo de planner action — interação com canal (botões, formulários).",
    ports: { principal: ["request"], auxiliary: ["response"] },
    needType: "interaction",
    glyph: "interaction",
    defaultConfig: {},
  },
};

// Categorias listadas na paleta. "Runtime" é omitida de propósito —
// event/interaction não devem ser arrastáveis.
export const CATEGORIES = ["Decisão", "I/O Externo", "Dados", "Conhecimento", "Memória", "Saída"];

export const SAMPLE_WORKFLOW = {
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
        expr: "{ weather: input.main, temp: input.temp }",
      },
    },
  ],
  connections: [
    { id: "c1", from: { agent: "decisor", port: "output" }, to: { agent: "buscar_clima", port: "trigger" }, status: "idle" },
    { id: "c2", from: { agent: "buscar_clima", port: "response" }, to: { agent: "formatar", port: "input" }, status: "idle" },
  ],
  input: { query: "Como está o clima em São Paulo?" },
};

export const SIMULATED_TRACE = [
  { t: 0,    type: "command", subject: "archon.command.spawn",   summary: "Workflow criado · agente raiz: decisor",       agent: null,         status: "info" },
  { t: 80,   type: "fire",    subject: "archon.interaction.pending", summary: "Disparando agente raiz: decisor",           agent: "decisor",    status: "running" },
  { t: 140,  type: "need",    subject: "archon.need.planner.decide", summary: "Need publicado · correlation_id=corr_001",  agent: "decisor",    status: "running" },
  { t: 580,  type: "response",subject: "archon.response.corr_001",   summary: 'LLM respondeu · {city: "São Paulo"}',      agent: "decisor",    status: "done" },
  { t: 640,  type: "rule",    subject: "rule[planner ↔ http]",       summary: "Regra aplicada · output → trigger",          agent: null,         status: "info" },
  { t: 700,  type: "fire",    subject: "archon.interaction.pending", summary: "Disparando agente: buscar_clima",            agent: "buscar_clima", status: "running" },
  { t: 760,  type: "need",    subject: "archon.need.http",           summary: "GET api.openweathermap.org · corr=corr_002", agent: "buscar_clima", status: "running" },
  { t: 1320, type: "response",subject: "archon.response.corr_002",   summary: '200 OK · {main: "Sunny", temp: 25}',       agent: "buscar_clima", status: "done" },
  { t: 1380, type: "rule",    subject: "rule[http ↔ transform]",     summary: "Regra aplicada · response → input",          agent: null,         status: "info" },
  { t: 1440, type: "fire",    subject: "archon.interaction.pending", summary: "Disparando agente: formatar",                agent: "formatar",   status: "running" },
  { t: 1480, type: "local",   subject: "transform.exec",             summary: "Script executado localmente",                agent: "formatar",   status: "done" },
  { t: 1540, type: "result",  subject: "archon.result.{workflow_id}", summary: 'Workflow completo · 1540ms · {weather: "Sunny", temp: 25}', agent: null, status: "success" },
];

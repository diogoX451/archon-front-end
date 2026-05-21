export type AgentTypeMetadata = {
  label: string;
  category: string;
  description: string;
  details?: string;
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
    details:
      "Coração de qualquer workflow inteligente. Analisa o contexto recebido e decide qual caminho seguir — usando raciocínio de um LLM (modo externo) ou regras pré-definidas (modo estático). Gera um plano de ações que dispara os agentes subsequentes.",
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
    details:
      "Ponte entre o workflow e qualquer API REST. Suporta interpolação de variáveis do contexto na URL e no corpo da requisição. O retorno da API entra no fluxo como JSON para o próximo agente processar.",
    ports: { principal: ["trigger"], auxiliary: ["response"] },
    needType: "http",
    glyph: "http",
    defaultConfig: { method: "GET", url: "" },
  },
  transform: {
    label: "Transform",
    category: "Dados",
    description: "Transforma dados via JSONPath, regex ou expressão.",
    details:
      "Refatora dados em trânsito sem sair do workflow. Use JSONPath para extrair campos específicos, regex para transformar texto, ou expressões para calcular e remodelar o payload — tudo sem código externo.",
    ports: { principal: ["input"], auxiliary: ["output"] },
    needType: null,
    glyph: "transform",
    defaultConfig: { expr: "" },
  },
  "rag.query": {
    label: "RAG Query",
    category: "Conhecimento",
    description: "Consulta base RAG e retorna chunks com scores.",
    details:
      "Busca semântica vetorial na base de conhecimento indexada. Converte a consulta em embedding, encontra os trechos mais relevantes por similaridade e os retorna com scores para alimentar o contexto de um Planner ou resposta final.",
    ports: { principal: ["query"], auxiliary: ["chunks"] },
    needType: "rag.query",
    glyph: "rag",
    defaultConfig: { top_k: 5, min_score_threshold: 0.0 },
  },
  "rag.ingest": {
    label: "RAG Ingest",
    category: "Conhecimento",
    description: "Ingere documento na base RAG (text, PDF, DOCX).",
    details:
      "Alimenta a base de conhecimento com novos documentos. Chunka, vetoriza e indexa o conteúdo para que consultas RAG futuras o encontrem. Use em workflows de onboarding ou atualização contínua de conhecimento.",
    ports: { principal: ["document"], auxiliary: ["status"] },
    needType: "rag.ingest",
    glyph: "rag",
    defaultConfig: { knowledge_base_id: "" },
  },
  "graph.memory": {
    label: "Graph Memory",
    category: "Memória",
    description: "Persiste entidades, relações e conceitos em Neo4j.",
    details:
      "Memória estruturada persistente entre conversas. Armazena entidades (usuário, produto, pedido) e seus relacionamentos em grafo Neo4j. Permite que o agente lembre de contexto complexo além do histórico linear de mensagens.",
    ports: { principal: ["signal"], auxiliary: ["ack"] },
    needType: "graph.memory.log",
    glyph: "graph",
    defaultConfig: {},
  },
  "channel.delivery": {
    label: "Channel Delivery",
    category: "Saída",
    description: "Envia mensagem ao canal (WhatsApp, web, etc.).",
    details:
      "Último agente do fluxo — entrega a resposta ao canal de origem. Adapta a formatação para cada canal (WhatsApp, web chat, etc.) e encerra o ciclo do workflow retornando o recibo de entrega.",
    ports: { principal: ["payload"], auxiliary: ["receipt"] },
    needType: "channel.delivery",
    glyph: "delivery",
    defaultConfig: { channel: "whatsapp" },
  },
  mcp: {
    label: "MCP Tool",
    category: "I/O Externo",
    description:
      "Invoca uma tool de um MCP server cadastrado para o tenant. O servidor é resolvido pelo registry em tempo de execução.",
    details:
      "Porta de entrada para qualquer capacidade externa via Model Context Protocol. O servidor e a tool são resolvidos em tempo de execução pelo registry do tenant, permitindo integrar ferramentas como busca na web, calendário, CRM e qualquer API compatível com MCP.",
    ports: { principal: ["trigger"], auxiliary: ["response"] },
    needType: "mcp",
    glyph: "mcp",
    defaultConfig: { mcp_name: "", tool: "" },
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

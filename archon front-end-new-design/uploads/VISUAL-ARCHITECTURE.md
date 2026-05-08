# Archon Platform — Visual Architecture Guide

## 1. Complete System Architecture

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                         CLIENT LAYER                                         ║
║  ┌─────────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────────┐       ║
║  │ Web Browser │  │ Mobile App   │  │ Bot      │  │ IoT Device     │       ║
║  └──────┬──────┘  └──────┬───────┘  └────┬─────┘  └────────┬───────┘       ║
║         │                │               │                 │                │
║         └────────────────┴───────────────┴─────────────────┘                ║
║                            │                                                ║
║                       HTTP REST (gRPC)                                       ║
║                            │                                                ║
╠════════════════════════════════════════════════════════════════════════════╣
║                     API GATEWAY LAYER                                       ║
║  ┌──────────────────────────────────────────────────────────────────┐      ║
║  │ Archon API (cmd/api:8080)                                        │      ║
║  │                                                                   │      ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │      ║
║  │  │ Health Check │  │ Workflows    │  │ Planning / RAG       │  │      ║
║  │  │ Docs (Swagger)  │ Agents       │  │ Conversation         │  │      ║
║  │  │              │  │ Connections  │  │ Rules                │  │      ║
║  │  │              │  │ Status       │  │ Webhooks             │  │      ║
║  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │      ║
║  │         │                │                     │                │      ║
║  │         └────────────────┴─────────────────────┘                │      ║
║  │                          │                                      │      ║
║  │                    Validation & Routing                         │      ║
║  └──────────────────────────┬───────────────────────────────────────┘      ║
║                             │                                              ║
║                        Events (JSON)                                        ║
║                             │                                              ║
╠════════════════════════════════════════════════════════════════════════════╣
║                    EVENT BUS LAYER (NATS JetStream)                        ║
║  ┌──────────────────────────────────────────────────────────────────┐      ║
║  │ Command Stream          Execution Stream       Result Stream     │      ║
║  │ ┌────────────────────┐  ┌─────────────────┐  ┌──────────────┐   │      ║
║  │ │archon.command.spawn   │archon.response.*   │archon.result.*   │      ║
║  │ │archon.command.add_*   │archon.need.*    │  │              │   │      ║
║  │ │archon.command.connect │               │  │              │   │      ║
║  │ │archon.command.define  │               │  │              │   │      ║
║  │ └────────────────────┘  └─────────────────┘  └──────────────┘   │      ║
║  └──────────────────────────────────────────────────────────────────┘      ║
║         ▲                       ▲                       ▼                   ║
║         │ Publish              │ Consume/Publish       │ Consume            ║
║         │                       │                       │                   ║
╠════════════════════════════════════════════════════════════════════════════╣
║                    ORCHESTRATION LAYER (Redis + Worker)                    ║
║  ┌──────────────────────────────────────────────────────────────────┐      ║
║  │ Worker (cmd/worker)                                              │      ║
║  │                                                                   │      ║
║  │  ┌─────────────────┐  ┌──────────────┐  ┌────────────────────┐ │      ║
║  │  │ Event Consumer  │→ │ State Machine│→ │ Rule Engine        │ │      ║
║  │  │ (NATS Listener) │  │ (Interaction│  │ (Lafont 89)        │ │      ║
║  │  │                 │  │  Nets)      │  │ Workflow Graph     │ │      ║
║  │  └─────────────────┘  └──────────────┘  └────────────────────┘ │      ║
║  │         │ Consume              │ Read/Write              │      │      ║
║  │         │ Commands             │ State/Rules             │      │      ║
║  │         └──────────────────────┴──────────────────────────┘      │      ║
║  └──────────────────────────────────────────────────────────────────┘      ║
║         ▼                                          ▼                       ║
║  ┌──────────────────────────────────┐    ┌──────────────────────────┐     ║
║  │ Redis Store                       │    │ NATS Event Bus           │     ║
║  │ • workflow:{id}                   │    │ • Publish Needs          │     ║
║  │ • workflow:{id}:agents            │    │ • Publish Results        │     ║
║  │ • workflow:{id}:state             │    │                          │     ║
║  │ • rules:{a}:{b}                   │    │                          │     ║
║  │ • conversation:profiles:{id}      │    │                          │     ║
║  └──────────────────────────────────┘    └──────────────────────────┘     ║
║                                                     │                      ║
║                                          archon.need.{need_type}           ║
║                                                     │                      ║
╠════════════════════════════════════════════════════════════════════════════╣
║                      EXECUTOR LAYER (Specialized Workers)                  ║
║                                                                              ║
║  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         ║
║  │ HTTP Executor    │  │ Planner Executor │  │ RAG Executor     │         ║
║  │ (cmd/http-*:n)   │  │ (cmd/planner-*:n)│  │ (cmd/rag-*:n)    │         ║
║  │                  │  │                  │  │                  │         ║
║  │ • Execute HTTP   │  │ • Call LLM       │  │ • Ingest docs    │         ║
║  │ • Retry logic    │  │ • Parse output   │  │ • Embed text     │         ║
║  │ • Response map   │  │ • Format schema  │  │ • Query vectors  │         ║
║  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘         ║
║           │                     │                      │                   ║
║  ┌────────┴──────┐  ┌───────────┴────────┐  ┌─────────┴──────────┐        ║
║  │ Event Executor│  │ Interaction Executor   │ Graph Memory Ex.   │        ║
║  │ (cmd/channel-*)   │ (cmd/conversation-*) │ (cmd/graph-*)      │        ║
║  │                  │                      │                    │        ║
║  │ • Dispatch      │  │ • Multi-turn       │  │ • Relationships    │        ║
║  │ • Confirmation  │  │ • Context manage   │  │ • Graph queries    │        ║
║  │ • Track status  │  │ • History track    │  │ • Fact storage     │        ║
║  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘         ║
║           │                     │                      │                   ║
║           └─────────────────────┴──────────────────────┘                   ║
║                    Publish archon.response.*                                ║
║                                                                              ║
╠════════════════════════════════════════════════════════════════════════════╣
║                    EXTERNAL SERVICES LAYER                                  ║
║  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         ║
║  │ External APIs    │  │ LLM Services     │  │ Data Stores      │         ║
║  │ • Weather API    │  │ • OpenAI GPT-4   │  │ • PostgreSQL     │         ║
║  │ • Payment Gw     │  │ • Anthropic      │  │ • MongoDB        │         ║
║  │ • CRM System     │  │ • Ollama         │  │ • Redis Cache    │         ║
║  │ • ...            │  │                  │  │ • ...            │         ║
║  └──────────────────┘  └──────────────────┘  └──────────────────┘         ║
║                                                                              ║
║  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         ║
║  │ Vector Stores    │  │ Message Queues   │  │ Comms Channels   │         ║
║  │ • Qdrant         │  │ • Kafka          │  │ • WhatsApp       │         ║
║  │ • Pinecone       │  │ • RabbitMQ       │  │ • Telegram       │         ║
║  │ • Milvus         │  │ • AWS SQS        │  │ • Slack          │         ║
║  └──────────────────┘  └──────────────────┘  └──────────────────┘         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Request-Response Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│ REQUEST PHASE (Synchronous)                                                │
└────────────────────────────────────────────────────────────────────────────┘

  CLIENT                API GATEWAY           STATE STORE           NATS
    │                       │                      │                  │
    │  POST /api/v1/        │                      │                  │
    │  workflows            │                      │                  │
    ├──────────────────────>│                      │                  │
    │                       │ Validate             │                  │
    │                       │ Generate ID          │                  │
    │                       │ Build Event          │                  │
    │                       │                      │                  │
    │                       ├─────────────────────────────────────────>│
    │                       │          archon.command.spawn            │
    │  202 Accepted         │                      │                  │
    │<──────────────────────┤                      │                  │
    │  {workflow_id}        │                      │                  │

┌────────────────────────────────────────────────────────────────────────────┐
│ EXECUTION PHASE (Asynchronous)                                             │
└────────────────────────────────────────────────────────────────────────────┘

  WORKER                STATE STORE          NATS              EXECUTORS
    │                      │                  │                    │
    │<─────────────────────────────────────────────────────────────┤
    │        Consumer: archon.command.spawn                        │
    │                                                               │
    │  CREATE WORKFLOW STATE                                       │
    │  ├─────────────────────────────────────────>                │
    │  │  workflow:{id}                                           │
    │  │  workflow:{id}:agents                                    │
    │  │  workflow:{id}:state                                     │
    │                                                               │
    │  IDENTIFY ROOT AGENT (input from workflow)                  │
    │  FIRE ROOT AGENT                                            │
    │                                                               │
    │  Publish Need                                                │
    │  ├───────────────────────────────────────────>              │
    │                   archon.need.planner                        │
    │                                                               │
    │                                    Consumer: planner-executor│
    │                                                               │
    │                                    │ Process Need           │
    │                                    │ Call LLM               │
    │                                    │ Generate Response      │
    │                                    │                        │
    │                    Publish Response                          │
    │<───────────────────────────────────┤                        │
    │        archon.response.{corr_id}                            │
    │                                                               │
    │  Apply Interaction Rule                                      │
    │  Fire Next Agent                                             │
    │  ├────────────────────────────────────────────>             │
    │              archon.need.http                               │
    │                                                               │
    │                                    Consumer: http-executor  │
    │                                    │ Make HTTP Call         │
    │                                    │ Parse Response         │
    │                                    │                        │
    │                    Publish Response                          │
    │<───────────────────────────────────┤                        │
    │        archon.response.{corr_id}                            │
    │                                                               │
    │  Apply Interaction Rule                                      │
    │  WORKFLOW COMPLETE                                           │
    │  ├─────────────────────────────────────────>               │
    │            archon.result.{workflow_id}                     │
    │                                                               │

┌────────────────────────────────────────────────────────────────────────────┐
│ RESULT RETRIEVAL PHASE (Synchronous)                                       │
└────────────────────────────────────────────────────────────────────────────┘

  CLIENT                API GATEWAY       STATE STORE
    │                       │                  │
    │  GET /api/v1/         │                  │
    │  workflows/{id}/result│                  │
    ├──────────────────────>│                  │
    │                       │ Query Result     │
    │                       ├─────────────────>│
    │                       │                  │
    │                       │<─────────────────┤
    │                       │  {result_data}   │
    │  200 OK               │                  │
    │  {result_data}        │                  │
    │<──────────────────────┤                  │
```

---

## 3. Agent Interaction Net Example

```
WORKFLOW INPUT:
{
  "query": "Qual é o clima em São Paulo?"
}

AGENTS & CONNECTIONS:
┌─────────────────────────────────────────────────────────┐
│  Step 1: PLANNER (root agent, receives workflow input)  │
│  ┌──────────────────────┐                               │
│  │ type: "planner"      │                               │
│  │ input: query         │◄─── workflow.input            │
│  │ output: decision     │                               │
│  └──────────┬───────────┘                               │
│             │                                           │
│  CONNECTION: planner.output → http_call.trigger         │
│             │                                           │
│  Step 2: HTTP (makes API call)                          │
│  ┌──────────────────────────────────────────┐           │
│  │ type: "http"                             │           │
│  │ trigger: {url, method, headers}          │           │
│  │ response: {status, body, headers}        │           │
│  └──────────┬───────────────────────────────┘           │
│             │                                           │
│  CONNECTION: http_call.response → formatter.input       │
│             │                                           │
│  Step 3: FORMATTER (transforms response)                │
│  ┌──────────────────────────────────────────┐           │
│  │ type: "transform"                        │           │
│  │ input: {status, body}                    │           │
│  │ output: {weather, temperature, ...}      │           │
│  └──────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘

EXECUTION TRACE:

Time 0ms:
  Worker receives archon.command.spawn
  Creates workflow in Redis
  Identifies planner as root (has input from workflow)
  
Time 50ms:
  Worker fires planner agent
  Publishes: archon.need.planner
  {
    "correlation_id": "corr_001",
    "need_type": "planner.decide",
    "input": {"query": "Qual é o clima..."}
  }

Time 100ms:
  Planner executor consumes need
  Calls OpenAI API
  Returns decision: {"city": "São Paulo"}
  Publishes: archon.response.corr_001
  
Time 150ms:
  Worker receives response
  Applies rule: Planner ↔ HTTP
  Updates http_call.trigger with planner output
  Fires http agent
  Publishes: archon.need.http
  {
    "correlation_id": "corr_002",
    "url": "https://api.weather.com/weather?q=São Paulo",
    "method": "GET"
  }

Time 200ms:
  HTTP executor consumes need
  Makes HTTP call to weather API
  Returns: {"main": "Sunny", "temp": 25}
  Publishes: archon.response.corr_002

Time 250ms:
  Worker receives response
  Applies rule: HTTP ↔ Transform
  Updates formatter.input with http response
  Fires formatter agent
  Transform executes (local computation)
  Returns: {"weather": "Sunny", "temperature": 25}

Time 300ms:
  No more agents to fire
  Workflow complete
  Publishes: archon.result.{workflow_id}
  {
    "output": {"weather": "Sunny", "temperature": 25},
    "status": "completed",
    "duration_ms": 300
  }

Time 350ms:
  Client polls: GET /api/v1/workflows/{id}/result
  Gets: {"weather": "Sunny", "temperature": 25}
```

---

## 4. Interaction Nets Rules Visualization

```
RULE SYSTEM (Bidirectional Interaction)

Rule Notation: A ↔ B
  - Fired when output of A is connected to input of B
  - A's auxiliary port (output) meets B's principal port (input)

Example Rules:
───────────────────────────────────────────────────────────────

1. Planner ↔ HTTP
   ┌─────────────────────────────────────────────────────┐
   │ BEFORE:                                             │
   │  Planner.output ──┐                                 │
   │                   │                                 │
   │                   └──> HTTP.trigger                 │
   │                                                     │
   │ AFTER (Rewrite):                                    │
   │  Planner is consumed                                │
   │  HTTP receives decision                             │
   │  HTTP.trigger = Planner.output                      │
   │  HTTP agent fires                                   │
   └─────────────────────────────────────────────────────┘

2. HTTP ↔ Transform
   ┌─────────────────────────────────────────────────────┐
   │ BEFORE:                                             │
   │  HTTP.response ──┐                                  │
   │                  │                                  │
   │                  └──> Transform.input               │
   │                                                     │
   │ AFTER (Rewrite):                                    │
   │  HTTP is consumed                                   │
   │  Transform receives HTTP response                   │
   │  Transform.input = HTTP.response                    │
   │  Transform agent fires                              │
   └─────────────────────────────────────────────────────┘

3. Calculator ↔ Calculator (self-interaction allowed)
   ┌─────────────────────────────────────────────────────┐
   │ When two calculators are connected:                 │
   │  Calc1.output ──> Calc2.input                       │
   │                                                     │
   │ Result: Calc1 executes, passes to Calc2             │
   │ Calc2 executes with Calc1's output                  │
   └─────────────────────────────────────────────────────┘

INVARIANT CHECKS:
───────────────────────────────────────────────────────────────

✓ Linearity
  Each port used at most once in execution
  
  ┌─── Output.A only connects to ONE input
  │
  A ──────┐
          ├──> C (allowed)
  B ──────┴
  
  ✗ NOT allowed:
  A ──────┬──> C (A.output used twice)
          └──> D

✓ Binary Interaction
  Only principal ports (input/trigger/request) trigger interaction
  
  Allowed:  HTTP.response → Transform.input     (http ends)
  Allowed:  Planner.output → HTTP.trigger       (planner ends)
  
  NOT allowed: HTTP.response ↔ Transform.response (both auxiliary)

✓ No Ambiguity
  Maximum one rule per pair of agent types
  
  Allowed:  Rule[Planner ↔ HTTP] defined once
  NOT allowed: Multiple conflicting rules for same pair

✓ RHS Clean
  Right-hand side of rule cannot introduce active principal↔principal pairs
  
  Allowed:  A → B (safe)
  NOT allowed: Rewrite creates B.input ↔ C.input (would loop)
```

---

## 5. Deployment Topology (Kubernetes)

```
ARCHON KUBERNETES CLUSTER
───────────────────────────────────────────────────────────────

NAMESPACE: archon-production
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ INGRESS / LOAD BALANCER                             ││
│  │ archon-ingress (tcp/443 + http/80)                  ││
│  └──────────────────┬──────────────────────────────────┘│
│                     │                                   │
│  ┌──────────────────▼──────────────────────────────────┐│
│  │ API GATEWAY DEPLOYMENT (replicas: 3)                ││
│  │ ┌────────────────────────────────────────────────┐  ││
│  │ │ archon-api-0      Service: archon-api:8080    │  ││
│  │ ├────────────────────────────────────────────────┤  ││
│  │ │ archon-api-1                                  │  ││
│  │ ├────────────────────────────────────────────────┤  ││
│  │ │ archon-api-2                                  │  ││
│  │ └────────────────────────────────────────────────┘  ││
│  └────────────────────┬─────────────────────────────────┘│
│                       │                                  │
│  ┌────────────────────▼────────────────────────────────┐│
│  │ NATS JETSTREAM (StatefulSet, replicas: 3)          ││
│  │ ┌──────────────────────────────────────────────┐   ││
│  │ │ nats-0                                       │   ││
│  │ ├──────────────────────────────────────────────┤   ││
│  │ │ nats-1         Service: nats-cluster:4222   │   ││
│  │ ├──────────────────────────────────────────────┤   ││
│  │ │ nats-2                                       │   ││
│  │ └──────────────────────────────────────────────┘   ││
│  └────────┬──────────────────────┬────────────────────┘│
│           │                      │                    │
│  ┌────────▼──────────────────┐   │                    │
│  │ REDIS (StatefulSet)       │   │                    │
│  │ ┌────────────────────────┐│   │                    │
│  │ │ redis-0 (master)      ││   │                    │
│  │ │ Service: redis:6379   ││   │                    │
│  │ ├────────────────────────┤│   │                    │
│  │ │ redis-1 (replica)     ││   │                    │
│  │ ├────────────────────────┤│   │                    │
│  │ │ redis-2 (replica)     ││   │                    │
│  │ └────────────────────────┘│   │                    │
│  └──────────────────────────┘    │                    │
│                                  │                    │
│  ┌──────────────────────────────▼─────────────────┐  │
│  │ WORKER DEPLOYMENT (replicas: 5 → HPA 50)      │  │
│  │ ┌───────────────────────────────────────────┐  │  │
│  │ │ archon-worker-0                           │  │  │
│  │ ├───────────────────────────────────────────┤  │  │
│  │ │ archon-worker-1                           │  │  │
│  │ ├───────────────────────────────────────────┤  │  │
│  │ │ archon-worker-2                           │  │  │
│  │ ├───────────────────────────────────────────┤  │  │
│  │ │ ... (auto-scaled based on CPU/Memory)     │  │  │
│  │ └───────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │ EXECUTOR DEPLOYMENTS                        │  │
│  │ ┌────────────────────────────────────────┐  │  │
│  │ │ http-executor (replicas: 10 → HPA 30) │  │  │
│  │ │ planner-executor (replicas: 5 → HPA 20)  │  │
│  │ │ rag-ingestion (replicas: 3)            │  │  │
│  │ │ rag-query (replicas: 5 → HPA 15)       │  │  │
│  │ │ conversation-turn (replicas: 3)        │  │  │
│  │ │ channel-delivery (replicas: 5)         │  │  │
│  │ └────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │ OBSERVABILITY                               │  │
│  │ ┌────────────────────────────────────────┐  │  │
│  │ │ Prometheus (metrics scraping)          │  │  │
│  │ │ Grafana (dashboards)                   │  │  │
│  │ │ Jaeger (distributed tracing)           │  │  │
│  │ │ ELK Stack (logs: ES + Kibana)          │  │  │
│  │ └────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
└──────────────────────────────────────────────────────┘

DATA LAYER (External to cluster)
┌──────────────────────────────────────────────────────────┐
│ • Vector Store (Qdrant / Pinecone)                       │
│ • LLM Services (OpenAI, Anthropic)                       │
│ • External APIs (Weather, CRM, Payment, etc)            │
│ • PostgreSQL / MongoDB (Application Data)               │
│ • S3 / GCS (Document Storage)                           │
│ • Message Queues (Kafka / RabbitMQ)                     │
└──────────────────────────────────────────────────────────┘
```

---

## 6. Multi-tenant Data Isolation

```
REQUEST: POST /api/v1/rag/ingest

Input:
{
  "tenant_id": "acme_corp",
  "knowledge_base_id": "kb_docs",
  "document_id": "doc_001",
  "content": "..."
}

DATA STORAGE HIERARCHY:
────────────────────────────────────────────

Redis Keys:
  rag:tenants:acme_corp:kbs:kb_docs:docs:doc_001
  ├─ vector_id: vec_xyz789
  ├─ chunk_count: 5
  ├─ created_at: 2025-05-07...
  └─ metadata: {...}

Vector Store (Qdrant/Pinecone):
  Collection: rag_vectors
  ├─ Namespace: acme_corp::kb_docs
  │  ├─ Point ID: vec_xyz789
  │  │  ├─ Vector: [0.123, 0.456, ...]
  │  │  ├─ Metadata: {
  │  │  │   tenant_id: "acme_corp",
  │  │  │   kb_id: "kb_docs",
  │  │  │   doc_id: "doc_001"
  │  │  │ }
  │  │  └─ Chunk: "..."
  │  └─ ...
  └─ ...

QUERY ISOLATION:
  GET /api/v1/rag/query?tenant_id=acme_corp&kb_ids=kb_docs

  1. Only searches namespace: acme_corp::kb_docs
  2. Metadata filter prevents cross-tenant leakage
  3. Access control:
     - User acme_corp user_1
     - Can access acme_corp data
     - Cannot access other tenant data

COMPLIANCE:
  ✓ Data segregation at application level
  ✓ Metadata prevents leakage
  ✓ Audit logs include tenant_id
  ✓ Encryption at rest (TLS in transit)
  ✓ GDPR ready (user_id in queries for audit)
```

---

## 7. Error Handling & Recovery Flow

```
FAILURE SCENARIOS:
───────────────────────────────────────────────────────────

Scenario 1: Executor Timeout (30s)
┌─────────────────────────────────────────────────────────┐
│                                                         │
│ Worker fires HTTP agent (t=0)                           │
│   ├─ Publishes archon.need.http (correlation_id=X)    │
│   ├─ Sets timeout: 30 seconds                           │
│   └─ Waits for archon.response.X                        │
│                                                         │
│ HTTP Executor consumes (t=5)                            │
│   ├─ Makes HTTP call to external API                    │
│   └─ External API is slow...                            │
│                                                         │
│ ... TIMEOUT (t=31)                                      │
│   ├─ Worker detects timeout                             │
│   ├─ Publishes archon.result.{workflow_id}             │
│   │  status: "TIMEOUT"                                  │
│   │  error: "HTTP executor timeout after 30s"           │
│   └─ Workflow marked as failed                          │
│                                                         │
│ Recovery Options:                                       │
│   1. Manual retry: POST /api/v1/workflows/{id}/retry   │
│   2. Auto-retry config: {"max_retries": 3}             │
│   3. Circuit breaker: Disable executor for 5 min        │
│                                                         │
└─────────────────────────────────────────────────────────┘

Scenario 2: Redis Failure
┌─────────────────────────────────────────────────────────┐
│                                                         │
│ Worker tries to READ state (Redis DOWN)                │
│   ├─ Connection refused                                │
│   ├─ Retries: 3 attempts (exponential backoff)         │
│   └─ After 3 retries → Circuit breaker OPEN            │
│                                                         │
│ API Gateway behavior:                                  │
│   ├─ New POST /workflows → 503 Service Unavailable    │
│   ├─ GET /workflows/{id} → 503 Service Unavailable    │
│   └─ Status page shows "Redis Offline"                 │
│                                                         │
│ Automatic Recovery:                                     │
│   ├─ Health check every 10s                            │
│   ├─ Redis comes back online                            │
│   ├─ Circuit breaker closes                             │
│   └─ Requests resume                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘

Scenario 3: NATS Consumer Lag
┌─────────────────────────────────────────────────────────┐
│                                                         │
│ Situation:                                              │
│   • API publishes 1000 workflows/sec                   │
│   • Worker processes only 500 workflows/sec            │
│   → Consumer lag grows                                  │
│                                                         │
│ Automatic Scaling (HPA):                               │
│   ├─ Monitor: NATS consumer lag                        │
│   ├─ Trigger: lag > 1000 messages                      │
│   ├─ Action: Scale worker replicas (5 → 10 → 15)      │
│   └─ Result: Processing rate ↑ (1500/sec)             │
│      → Lag stabilizes                                   │
│                                                         │
│ Dashboard Alert:                                        │
│   ├─ Grafana graph shows lag trend                     │
│   ├─ Alert sent to ops team                            │
│   └─ Recommendation: Add more worker nodes              │
│                                                         │
└─────────────────────────────────────────────────────────┘

Scenario 4: Invalid Agent Configuration
┌─────────────────────────────────────────────────────────┐
│                                                         │
│ Client POSTs invalid config:                            │
│   {                                                     │
│     "agents": [                                         │
│       {                                                 │
│         "id": "http1",                                  │
│         "type": "http",                                 │
│         "config": {"url": "NOT_A_URL"}  ✗ Invalid     │
│       }                                                 │
│     ]                                                   │
│   }                                                     │
│                                                         │
│ API Gateway Response (400):                             │
│   {                                                     │
│     "error_code": "INVALID_AGENT_CONFIG",              │
│     "message": "Agent http1: invalid URL format",      │
│     "details": {                                        │
│       "agent_id": "http1",                              │
│       "error": "url must be absolute HTTP/HTTPS"       │
│     }                                                   │
│   }                                                     │
│                                                         │
│ No workflow created → Client fixes and retries         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

**Last Updated**: Maio 7, 2026  
**Version**: 2.0

# Archon Platform Design — Uma Plataforma Conectando APIs

## 1. Visão Geral da Plataforma

O **Archon** é uma plataforma de orquestração de APIs baseada em **Interaction Nets** (teoria de Lafont 1989). Ela permite que usuários criem workflows complexos conectando múltiplas APIs e serviços sem acoplamento direto, utilizando um modelo de execução declarativo e altamente composável.

### Conceito Central
- **Desacoplamento**: APIs e serviços comunicam-se via eventos (NATS), não chamadas diretas.
- **Declaratividade**: Fluxos são descritos como grafos de agentes e conexões.
- **Escalabilidade**: Executores distribuídos processam tasks independentemente.
- **Extensibilidade**: Novos agentes e tipos de execução podem ser adicionados sem modificar o núcleo.

---

## 2. Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT APPLICATIONS                      │
│                    (Web, Mobile, Bot, IoT)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP REST
                       │
┌─────────────────────▼──────────────────────────────────────┐
│                    ARCHON API GATEWAY                       │
│    (POST /api/v1/workflows, /api/v1/plan, /api/v1/rag)    │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
           Events                          Queries
               │                               │
    ┌──────────▼──────────────┐       ┌────────▼────────┐
    │   NATS JetStream        │       │   Redis Store   │
    │  Event Bus (Subjects)   │       │  (State + Rules)│
    └──────────┬──────────────┘       └────────┬────────┘
               │                               │
    ┌──────────▼──────────────────────────────▼────────┐
    │         WORKER / EXECUTION ENGINE                │
    │  • Consome eventos de comando                    │
    │  • Aplica regras de Interaction Nets             │
    │  • Publica needs e respostas                     │
    │  • Atualiza estado no Redis                      │
    └──────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴────────────┐
        │                       │
    ┌───▼────┐          ┌──────▼─────┐
    │ Needs  │          │ Responses  │
    │ Queue  │          │ (Webhook)  │
    └───┬────┘          └──────┬─────┘
        │                      │
    ┌───▼────────────────────────────┐
    │  EXTERNAL EXECUTORS             │
    │  • HTTP/REST APIs               │
    │  • LLM Services (OpenAI, etc)   │
    │  • Databases (SQL, NoSQL)       │
    │  • Message Queues (Kafka)       │
    │  • User Interactions (WhatsApp) │
    └────────────────────────────────┘
```

---

## 3. Componentes Principais

### 3.1 API Gateway (`/cmd/api`)

**Responsabilidade**: Aceitar requisições HTTP e traduzi-las em eventos.

**Rotas Implementadas**:

#### Health & Documentation
- `GET /health` → Status da plataforma
- `GET /openapi.yaml` → Spec OpenAPI 3.0
- `GET /swagger` → Swagger UI

#### Workflows (Orquestração)
- `POST /api/v1/workflows` → Criar workflow com agentes e conexões
- `GET /api/v1/workflows/{id}` → Buscar workflow
- `GET /api/v1/workflows/{id}/status` → Status de execução
- `GET /api/v1/workflows/{id}/result` → Resultado final
- `POST /api/v1/workflows/{id}/agents` → Adicionar agente dinamicamente
- `POST /api/v1/workflows/{id}/connections` → Conectar portas entre agentes

#### Planning (Planejamento via LLM)
- `POST /api/v1/plan` → Gerar plano automático a partir de objetivo
  - Salva regras de execução
  - Spawn workflow
  - Adiciona agentes
  - Define conexões

#### Conversation (Multi-turn)
- `GET /api/v1/conversation/profiles` → Listar perfis de conversa
- `GET /api/v1/conversation/profiles/{id}` → Buscar perfil
- `POST /api/v1/conversation/turns` → Iniciar turno de conversa
- `POST /api/v1/conversation/events/requested` → Publicar evento de turno solicitado

#### RAG (Retrieval-Augmented Generation)
- `POST /api/v1/rag/ingest` → Ingerir documento (PDF, DOCX, TXT)
- `POST /api/v1/rag/query` → Consultar base semântica

#### Rules (Regras de Interação)
- `POST /api/v1/rules` → Definir regra de interação entre agentes
- `GET /api/v1/rules` → Listar todas as regras
- `GET /api/v1/rules/{a}/{b}` → Buscar regra específica (agente A com agente B)

#### Webhooks (Respostas Externas)
- `POST /api/v1/webhooks/needs/{correlation_id}` → Webhook de resposta externa

### 3.2 Event Bus (NATS JetStream)

**Responsabilidade**: Fila de eventos distribuída para desacoplamento de componentes.

**Subjects (Tópicos)**:

**Comandos** (API → Worker)
- `archon.command.spawn` → Criar novo workflow
- `archon.command.add_agent` → Adicionar agente
- `archon.command.connect` → Conectar portas
- `archon.command.define_rule` → Definir regra

**Execução**
- `archon.interaction.pending` → Interação aguardando

**I/O Externo**
- `archon.need.{need_type}` → Publica necessidade de execução externa
- `archon.response.{correlation_id}` → Resposta de executor externo

**Resultados**
- `archon.result.{workflow_id}` → Resultado final de workflow

### 3.3 Worker (`/cmd/worker`)

**Responsabilidade**: Consumir eventos, aplicar regras, orquestrar execução.

**Ciclo de vida**:
1. Consome evento `archon.command.spawn`
2. Cria workflow no Redis com agentes e conexões
3. Dispara agente raiz (aquele com `input` do workflow)
4. Monitora interações entre agentes
5. Aplica regras de Interaction Nets
6. Publica `archon.need.*` para executores externos
7. Aguarda respostas em `archon.response.*`
8. Atualiza estado e dispara próximas interações
9. Publica resultado em `archon.result.*`

### 3.4 State Store (Redis)

**Responsabilidade**: Persistência de estado e configurações.

**Estruturas armazenadas**:
- `workflow:{id}` → Estado do workflow
- `workflow:{id}:agents` → Agentes do workflow
- `workflow:{id}:connections` → Conexões entre agentes
- `workflow:{id}:state` → Estado de execução
- `rules:{agent_type_a}:{agent_type_b}` → Regras de interação
- `conversation:profiles:{profile_id}` → Perfis de conversa
- `rag:documents:{knowledge_base_id}` → Índice de documentos

### 3.5 Executores Especializados (`/cmd/*-executor`)

**Responsabilidade**: Processar tipos específicos de needs.

**Tipos disponíveis**:

#### HTTP Executor (`/cmd/http-executor`)
- Executa chamadas HTTP GET/POST/PUT/DELETE
- Envia requests a APIs externas
- Retorna resposta como JSON

#### Planner Executor (`/cmd/planner-executor`)
- Processa decisões via LLM (OpenAI)
- Gera ações a partir de estado do workflow
- Suporta modo "static" para testes

#### RAG Ingestion Executor (`/cmd/rag-ingestion-executor`)
- Ingere documentos (PDF, DOCX, TXT)
- Realiza chunking e embedding
- Persiste em vetor store

#### RAG Query Executor (`/cmd/rag-query-executor`)
- Busca similaridade semântica
- Retorna documentos relevantes
- Suporta filtros por tenant/knowledge base

#### Channel Delivery Executor (`/cmd/channel-delivery-executor`)
- Entrega mensagens em canais (WhatsApp, Telegram, etc)
- Gerencia confirmação de entrega

#### Conversation Turn Executor (`/cmd/conversation-turn-executor`)
- Executa turnos de conversa multi-turn
- Gerencia histórico e contexto
- Publica eventos de turno

#### Graph Memory Executor (`/cmd/graph-memory-executor`)
- Processa facts e relacionamentos
- Mantém grafo de conhecimento

---

## 4. Modelo de Execução: Interaction Nets

### 4.1 Conceitos Fundamentais

**Interaction Nets** (Lafont 1989) é um modelo de computação baseado em reescrita de grafos. No Archon:

1. **Agentes** são nós do grafo (símbolos)
2. **Conexões** são arestas (ligações entre portas)
3. **Regras** definem como símbolos interagem (reescrita)
4. **Execução** é aplicação iterativa de regras até atingir normal form

### 4.2 Invariantes

- **Linearidade**: Cada porta interna usada no máximo uma vez
- **Interação Binária**: Apenas portas principais conectadas geram interação
- **Sem Ambiguidade**: Uma regra por par de símbolos
- **RHS Limpo**: Lado direito da regra não gera pares principal↔principal ativos

### 4.3 Portas de Agentes

Cada agente tipo tem duas categorias de porta:

| Agente | Principal | Auxiliares | Comportamento |
|--------|-----------|-----------|---------------|
| `calculator` | `input` | `output` | Realiza cálculo matemático |
| `transform` | `input` | `output` | Transforma dados (map/filter) |
| `http` | `trigger` | `response` | Chama API externa, aguarda resposta |
| `event` | `trigger` | `response` | Publica evento, aguarda resposta assíncrona |
| `interaction` | `request` | `response` | Interage com usuário (menu, buttons) |
| `planner` | `input` | `output` | Toma decisão via LLM ou static |
| `router` | `input` | `path_a, path_b, ...` | Roteia baseado em condição |

### 4.4 Exemplo de Fluxo

```
Usuário → [Planner] → [HTTP API] → [Formatter] → Resposta

1. Planner recebe input do workflow
   - Decide qual ação tomar
   - Publica need para LLM: `archon.need.planner`
   - Aguarda resposta: `archon.response.{correlation_id}`

2. Resposta do LLM retorna
   - Worker aplica regra Planner↔HTTP
   - HTTP agent recebe output do Planner
   - HTTP publica need: `archon.need.http`
   - Chamada HTTP é feita
   - Resposta retorna: `archon.response.{correlation_id}`

3. HTTP agent conecta ao Formatter
   - Worker aplica regra HTTP↔Transform
   - Transform processa resposta
   - Publica resultado: `archon.result.{workflow_id}`
```

---

## 5. Padrões de Integração

### 5.1 Sincronismo vs Assincronia

#### Síncrono (HTTP Executor)
```
API Gateway
    ↓
[HTTP Agent] → Call API (espera)
    ↓
Resposta → Próximo agente
```

#### Assíncrono (Event Executor)
```
API Gateway
    ↓
[Event Agent] → Publica evento
    ↓
Webhook externo processa
    ↓
Chama /webhooks/needs/{correlation_id}
    ↓
Workflow continua
```

### 5.2 Padrão: Pipeline Sequencial

```json
{
  "user_id": "user_123",
  "input": {"query": "Qual é o clima?"},
  "agents": [
    {
      "id": "decision",
      "type": "planner",
      "config": {
        "mode": "external",
        "need_type": "planner.decide",
        "provider": "openai",
        "model": "gpt-4"
      }
    },
    {
      "id": "executor",
      "type": "http",
      "config": {
        "method": "GET",
        "url": "https://api.weather.com/current"
      }
    },
    {
      "id": "formatter",
      "type": "transform",
      "config": {
        "script": "return {weather: input.main}"
      }
    }
  ],
  "connections": [
    {"from": "decision.output", "to": "executor.trigger"},
    {"from": "executor.response", "to": "formatter.input"}
  ]
}
```

### 5.3 Padrão: Roteamento Condicional

```json
{
  "agents": [
    {"id": "router", "type": "planner"},
    {"id": "branch_a", "type": "http", "config": {...}},
    {"id": "branch_b", "type": "http", "config": {...}},
    {"id": "merge", "type": "transform"}
  ],
  "connections": [
    {"from": "router.output", "to": "branch_a.trigger"},
    {"from": "router.output", "to": "branch_b.trigger"},
    {"from": "branch_a.response", "to": "merge.input"},
    {"from": "branch_b.response", "to": "merge.input"}
  ]
}
```

### 5.4 Padrão: Conversa Multi-turn

```
[Turno 1] → Gera resposta → Aguarda próximo turno
[Turno 2] → Processa contexto + histórico → Nova resposta
...
```

**Requisição**:
```json
POST /api/v1/conversation/turns
{
  "profile_id": "weather_assistant",
  "conversation_id": "conv_123",
  "user_id": "user_456",
  "message": "Qual é o clima agora?",
  "history": [...turnos anteriores...],
  "context": {...}
}
```

### 5.5 Padrão: Ingestão e Consulta RAG

```
1. Ingestão
   POST /api/v1/rag/ingest
   - Documento + Tenant + KnowledgeBase
   - Chunking automático
   - Embedding via encoder
   - Persistência em vetor store

2. Consulta
   POST /api/v1/rag/query
   - Query → Embedding
   - Busca similaridade (top-k)
   - Retorna documentos relevantes com score
```

---

## 6. Fluxo de Requisição Completo

### 6.1 Criar e Executar Workflow

```
1. Cliente → POST /api/v1/workflows
   {
     "user_id": "user_123",
     "agents": [...],
     "connections": [...],
     "input": {...}
   }

2. API Gateway
   - Valida requisição
   - Gera workflow_id (UUID)
   - Constrói SpawnEvent

3. Publica em NATS
   archon.command.spawn ← SpawnEvent

4. Worker consome
   - Cria workflow no Redis
   - Identifica agente raiz (input principal vem do workflow)
   - Publica primeiro need se necessário
   - Publica status "spawning"

5. Cliente → GET /api/v1/workflows/{workflow_id}/status
   - Retorna status atual ("running", "blocked", "completed", etc)

6. External Executor consome need
   - Processa (HTTP, LLM, etc)
   - Retorna resposta

7. Worker recebe resposta
   - Aplica regra de interação
   - Dispara próximo agente
   - Publica novo need ou resultado

8. Cliente → GET /api/v1/workflows/{workflow_id}/result
   - Retorna resultado final
```

### 6.2 Diagrama de Sequência

```
┌────────┐    ┌──────────┐    ┌────────┐    ┌──────────┐    ┌──────────┐
│ Client │    │   API    │    │  NATS  │    │  Worker  │    │ Executor │
└────────┘    └──────────┘    └────────┘    └──────────┘    └──────────┘
    │              │               │             │               │
    │ POST /workflows    │               │             │
    ├─────────────────>│               │             │
    │              │   publish           │             │
    │              ├──────────────────>│             │
    │              │   202 Accepted      │             │
    │<─────────────┤               │             │
    │              │               │ consume      │
    │              │               │<────────────┤
    │              │               │   spawn      │
    │              │               │ create state │
    │              │               │              │
    │              │               │ publish need │
    │              │               ├─────────────>│
    │              │               │              │ execute
    │              │               │              │ (HTTP call)
    │              │               │              │
    │              │               │<─────────────┤
    │              │               │   response   │
    │              │               │              │
    │ GET /workflows/{id}/result  │             │
    ├─────────────────>│               │             │
    │              │   query state      │             │
    │              ├───────────────────>│             │
    │              │<───────────────────┤             │
    │              │   state + result    │             │
    │<─────────────┤               │             │
    │              │               │             │
```

---

## 7. Segurança e Multi-tenancy

### 7.1 Isolamento de Tenant

- **TenantID** obrigatório em RAG/Conversation
- **UserID** obrigatório em workflows
- **Redis keys** incluem tenant para isolamento
- **NATS subjects** podem filtrar por tenant (future)

### 7.2 Autenticação (Future)

- [ ] JWT token validation no API Gateway
- [ ] Role-based access control (RBAC)
- [ ] Audit logging de ações críticas
- [ ] Rate limiting por tenant

---

## 8. Escalabilidade e Operações

### 8.1 Escalabilidade Horizontal

**API Gateway**
- Stateless → múltiplas instâncias via load balancer
- Persistência apenas em Redis/NATS

**Workers**
- Consumem do NATS JetStream (consumer groups)
- Processamento paralelo via múltiplas instâncias

**Executores**
- Deployment independente por tipo
- Horizontal scaling via K8s HPA

### 8.2 Monitoramento

**Métricas Esperadas**:
- Taxa de workflows criados/concluídos
- Latência de execução por agente tipo
- Taxa de falha de executores externos
- Tamanho de fila de needs

**Tracing**:
- Cada evento leva `EventID` e `CorrelationID`
- Logs estruturados com IDs correlados

### 8.3 Deployment (Kubernetes)

```yaml
# API Gateway
kind: Deployment
metadata:
  name: archon-api
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: archon:api
        env:
        - name: NATS_URL
          value: nats://nats-cluster:4222
        - name: REDIS_URL
          value: redis://redis-cluster:6379

# Worker
kind: Deployment
metadata:
  name: archon-worker
spec:
  replicas: 5
  template:
    spec:
      containers:
      - name: worker
        image: archon:worker

# HTTP Executor
kind: Deployment
metadata:
  name: http-executor
spec:
  replicas: 10
  template:
    spec:
      containers:
      - name: executor
        image: archon:http-executor

# Autoscaling
kind: HorizontalPodAutoscaler
metadata:
  name: worker-autoscaler
spec:
  scaleTargetRef:
    kind: Deployment
    name: archon-worker
  minReplicas: 5
  maxReplicas: 50
  targetCPUUtilizationPercentage: 70
```

---

## 9. Roadmap de Features

### Phase 1 (✅ Done)
- [x] Workflows básicos com agentes
- [x] HTTP executor
- [x] Planner executor (OpenAI)
- [x] RAG ingest/query
- [x] Conversation multi-turn

### Phase 2 (In Progress)
- [ ] Conversation profiles com estado persistente
- [ ] Event executor para integrações assíncronas
- [ ] Graph memory executor para relacionamentos

### Phase 3 (Planned)
- [ ] Visual workflow builder (UI)
- [ ] Custom agent type registration
- [ ] Conditional routing baseado em schema
- [ ] Batch processing (processar N workflows)

### Phase 4 (Future)
- [ ] Distributed tracing (Jaeger)
- [ ] GraphQL API
- [ ] Webhooks customizados
- [ ] ML-powered auto-planner
- [ ] Integrações nativas (Zapier, Make.com)

---

## 10. Casos de Uso

### 10.1 Assistente de Atendimento Multicanal
```
Usuário (WhatsApp)
    ↓
[Conversation Executor] (perfil configurado)
    ↓
[Planner] (LLM decide ação)
    ↓
├→ [HTTP] (consultar base dados)
├→ [RAG] (buscar FAQ)
└→ [Event] (disparar ticket)
    ↓
Resposta formatada → WhatsApp
```

### 10.2 Agregação de Dados de Múltiplas APIs
```
Solicitação
    ↓
[Planner] (decide quais APIs chamar)
    ↓
[HTTP-1] (API A)  [HTTP-2] (API B)  [HTTP-3] (API C)
    ↓                 ↓                  ↓
[Merge] (une resultados)
    ↓
Resultado agregado
```

### 10.3 Document Processing Pipeline
```
PDF/DOCX upload
    ↓
[RAG Ingest] (extrai texto, chunks, embeddings)
    ↓
Redis/Vetor Store
    ↓
Query → [RAG Query] (busca similaridade)
    ↓
Resultados + Metadata
```

### 10.4 Decision Automation
```
Evento de negócio
    ↓
[Planner] (analisa via LLM)
    ↓
├→ [HTTP] (se precisa dados)
├→ [RAG] (se precisa contexto)
└→ [Event] (dispara ação)
    ↓
Decisão tomada → Notificação
```

---

## 11. Troubleshooting

### Problema: Workflow fica em estado "blocked"
**Causa**: Agente aguardando resposta que não vem
**Solução**: 
- Verifique se executor está rodando
- Verifique NATS subject matching
- Verifique correlation_id na resposta

### Problema: Executor tira timeout
**Causa**: Serviço externo lento ou indisponível
**Solução**:
- Aumente timeout no agente config
- Implemente retry logic
- Use circuit breaker pattern

### Problema: RAG query retorna resultados ruins
**Causa**: Embedding model não adequado ou docs mal processados
**Solução**:
- Revise chunks (tamanho/overlap)
- Teste similarity threshold
- Use retriever customizado

---

## 12. Exemplos Práticos

### 12.1 Weather Assistant
```bash
curl -X POST http://localhost:8080/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "agents": [
      {
        "id": "decision",
        "type": "planner",
        "config": {
          "mode": "external",
          "need_type": "planner.weather",
          "provider": "openai",
          "model": "gpt-4",
          "instructions": "Você é um assistente de clima. Analise a query e retorne a cidade."
        }
      },
      {
        "id": "fetch",
        "type": "http",
        "config": {
          "method": "GET",
          "url": "https://api.openweathermap.org/data/2.5/weather?q={{city}}&appid=YOUR_KEY"
        }
      }
    ],
    "connections": [
      {"from": "decision.output", "to": "fetch.trigger"}
    ],
    "input": {"query": "Como está o clima em São Paulo?"}
  }'
```

### 12.2 Conversa Multi-turn
```bash
# Turno 1
curl -X POST http://localhost:8080/api/v1/conversation/turns \
  -H "Content-Type: application/json" \
  -d '{
    "profile_id": "weather_assistant",
    "conversation_id": "conv_001",
    "user_id": "user_123",
    "message": "Quero saber o clima",
    "context": {}
  }'

# Turno 2
curl -X POST http://localhost:8080/api/v1/conversation/turns \
  -H "Content-Type: application/json" \
  -d '{
    "profile_id": "weather_assistant",
    "conversation_id": "conv_001",
    "user_id": "user_123",
    "message": "em São Paulo",
    "history": [
      {"role": "assistant", "content": "Em qual cidade?"},
      {"role": "user", "content": "Quero saber o clima"}
    ],
    "context": {}
  }'
```

### 12.3 Ingestão RAG
```bash
curl -X POST http://localhost:8080/api/v1/rag/ingest \
  -F "file=@documento.pdf" \
  -F "tenant_id=tenant_001" \
  -F "knowledge_base_id=kb_docs" \
  -F "document_id=doc_001"
```

### 12.4 Consulta RAG
```bash
curl -X POST http://localhost:8080/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "tenant_001",
    "knowledge_base_ids": ["kb_docs"],
    "query": "Como funciona a API?",
    "top_k": 5,
    "min_score_threshold": 0.5
  }'
```

---

## 13. Conclusão

O **Archon** é uma plataforma de orquestração declarativa que permite conectar APIs e serviços sem acoplamento. Baseada em teoria de computação sólida (Interaction Nets), oferece:

✅ **Desacoplamento** entre serviços via event bus  
✅ **Composabilidade** de workflows complexos  
✅ **Extensibilidade** via novos tipos de agentes  
✅ **Escalabilidade** horizontal de todos componentes  
✅ **Observabilidade** via IDs correlacionados  
✅ **Multi-tenancy** nativo  

Ideal para: Automação de processos, agregação de APIs, processamento de conversas, document processing, decision automation.

---

**Last Updated**: Maio 7, 2026  
**Version**: 2.0 (Multi-executor architecture)

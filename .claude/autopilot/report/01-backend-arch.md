# 01 — Arquitetura Backend (Go) — Auditoria Autopilot

> Gerado pelo tick 1 da auditoria autopilot (m1) em 2026-06-05.
> Fonte: análise estática de /home/dioguin/Documentos/Projetos/archon.

## Sumário Executivo

Archon é um orquestrador de workflows baseado em **NATS** com arquitetura multi-executor. O backend (cmd/api) funciona como hub de autenticação, roteamento API e gerenciamento de estado, enquanto **executores independentes** (processos Go) consomem eventos NATS para tarefas especializadas (conversas, entrega, CRM, planner/RAG).

**Estado geral**: arquitetura estável com débitos observáveis: duplicação de executores (-new vs antigos), módulos condicionais por env var, e billing sem enforcement.

---

## 1. Domínios/Módulos em `internal/*`

| Domínio | Estado | Evidência | Débito |
|---------|--------|-----------|--------|
| **auth** | Completo | internal/core/auth (Service + RBAC) + cmd/api/main.go:156 EnableAuth() | Múltiplos Enable*() causam remount de chi.Router |
| **api** | Completo | internal/api/server.go (1123 linhas), handlers em 7 arquivos | Handlers duplicados em /api/v1 + /api/v1/t/{tenant} |
| **conversation** | Completo | internal/conversation/{session.go, contracts/, dialogue_policy.go, blueprint.go} | conversation-turn-executor vs hitl-executor-new ambos consomem conversation.turn.requested |
| **workflow** | Completo | internal/workflow/signals/conversation.go (717 linhas) | Monolítico: extrai intent/slots/entities tudo junto |
| **rag** | Completo | internal/rag/{chunking/, document/, embedding/, ranking/, vectorstore/} | 9 submódulos sem separação clara; backends hardcoded |
| **channel** | Completo | internal/channel/{credential, audit, delivery, evolution/} | Condicionado a ARCHON_EVOLUTION_BASE_URL (main.go:277) |
| **crm** | Completo | internal/crm/{service.go, card_service.go, ports.go} | OK — cards com analytics + público /c/{slug} |
| **reactive** | Completo | internal/reactive/{deliberative.go, reactor.go, profile.go} | 503 se reactiveService == nil |
| **catalog** | Completo | internal/core/catalog + adapters/catalog/postgres | Seeding idempotente via SyncProfilesFromDir (main.go:210) |
| **core/billing** | **Parcial** | internal/core/billing/{plans.go, ports.go} — 4 tiers | **SEM enforcement** — limites definidos, nunca validados |
| **core/admin** | Completo | internal/core/admin (audit middleware) | Condicional main.go:226 |
| **core/service** | Completo | internal/core/service/{executor.go (1074L), planner_service.go (496L)} | Monolítico |
| **events** | Completo | internal/events/nats/ — JetStream | 11 subjects hardcoded; sem ACLs pub/sub |
| **store** | Completo | internal/store/{redis/, postgres/} | — |
| **llmconfig** | Completo | adapters/llmconfig/postgres | 503 sem ARCHON_CRYPTO_KEYS |
| **mcpconfig** | Completo | adapters/mcpconfig/postgres + OAuth 2.1 (main.go:301) | — |
| **config** | Completo | internal/config/config.go (467L) | 80+ env vars sem schema validation |
| **crypto** | Mínimo | internal/crypto (keyring AES-GCM) | Rejeita production sem keyring |
| **observability** | Completo | internal/observability — OTel + Prometheus (main.go:88) | Opt-in, não obrigatório |
| **ratelimit** | Completo | internal/ratelimit — token bucket per-tenant | Aplicado SÓ a /conversation/turns (server.go:517-527) |
| **executorruntime** | Completo | internal/executorruntime | Compartilhado por todos os executores |
| **engine** | **Stub** | internal/core/engine/ (~50 linhas, 2 arquivos) | Órfão — não usado |

---

## 2. Executores NATS

| Executor | Entrada NATS | Saída | Status |
|----------|--------------|-------|--------|
| conversation-turn-executor | `conversation.turn.requested` | `archon.command.spawn` + `conversation.turn.completed` + `message.delivery.requested` | Ativo |
| **conversation-turn-executor-new** | ? | ? | **Duplicado/experimental — binário 27MB sem source em cmd/** |
| hitl-executor | `conversation.handoff.requested` | `conversation.handoff.in_progress` | Ativo (wrapper fino 4.4KB) |
| **hitl-executor-new** | ? | ? | **Duplicado/experimental — binário 25MB sem source** |
| planner-executor | `archon.command.spawn` | `archon.result.completed` | Ativo |
| channel-delivery-executor | `message.delivery.requested` | webhook HTTP callback | Ativo (WhatsApp/Web/API) |
| crm-executor | `archon.need.crm.*` | webhook | Ativo (search/create/update_status) |
| http-executor | `archon.need.http.*` | webhook | Ativo |
| mcp-executor | `archon.need.mcp.*` | webhook | Ativo (token refresh em 401) |
| rag-ingestion-executor | `rag.ingest.requested` | vector store | Ativo |
| rag-query-executor | `rag.query.requested` | `rag.query.results` | Ativo |
| graph-memory-executor | `conversation.memory.log` | Neo4j upserts | Ativo |
| worker | — | purge sessões Redis stale | Ativo |

**Débito**: binários `-new` compilados 39min após os antigos (mai 31), sem source correspondente em cmd/. Limpar ou rastrear (`git log --all -- "*-new*"`).

---

## 3. Rotas API (internal/api/server.go:360-809)

Grupos: Auth público, Tenants (super-admin, inclui PATCH /tenants/{id}/plan + GET /tenants/{id}/usage — billing), Roles/Permissions RBAC, Users, Workflows, Conversation (turns com rate limit), Catalog, Events/SSE, RAG, Rules, Channel (+WhatsApp Evolution), Admin Audit, LLM Config, MCP Config + OAuth 2.1, Usage Analytics, Handoffs, Trail/Graph, CRM (contatos+cartões+público /c/{slug}), Reactive, Uploads (MinIO).

**Padrão**: todo serviço opcional registra rotas só se campo != nil; handlers retornam 503 caso contrário.

**Espelho tenant-prefixed**: /api/v1/t/{tenant} duplica todas as rotas (server.go:664-809) — duplicação estrutural.

---

## 4. Serviços Condicionais (ligação)

| Serviço | Env Vars chave |
|---------|----------------|
| Auth | ARCHON_AUTH_REQUIRE, ARCHON_AUTH_JWT_SECRET |
| Postgres | ARCHON_POSTGRES_URL |
| NATS | NATS_URL (fatal se ausente) |
| Redis | REDIS_ADDR |
| Channel Credentials / LLM Config / MCP | ARCHON_CRYPTO_KEYS (keyring) |
| Evolution WhatsApp | EVOLUTION_BASE_URL, EVOLUTION_API_KEY |
| Password Reset | MAILTRAP_TOKEN |
| Delivery | ARCHON_DELIVERY_TOKEN, ARCHON_WEBHOOK_HMAC_SECRET |
| Observability | ARCHON_OBS_OTEL_ENABLED, ARCHON_OBS_PROM_ENABLED |

**Débito**: cada `Enable*()` reconstrói chi.Router inteiro (ex.: server.go:847) — O(N) remounts no startup com 15+ serviços.

---

## 5. Débitos Arquiteturais

| # | Débito | Severidade | Ação sugerida |
|---|--------|-----------|----------------|
| A | Executores `-new` duplicados sem source | Média | Limpar binários ou migrar source para cmd/ |
| B | Enable*/remount O(N) do router | Baixa | Defer route mounting até setup final |
| C | **Billing sem enforcement** — `Limits.ExecutionsAllowed()` (plans.go:74) existe mas nunca é chamado | **Alta** | Validar em conversation-turn-executor; incrementar tenant_usage; 429 quando exceder |
| D | Handlers monolíticos (7 arquivos) + duplicação /api/v1 vs /t/{tenant} | Média | Refactor por domínio |
| E | workflow/signals/conversation.go monolítico (717L) | Baixa | Separar intent/slots/entities |
| F | Session loss → history loss (executor:250-257) | Média | Persistir history fora do Redis session |
| G | Módulos órfãos: internal/core/engine (stub), test.json, info-ppc.pdf na raiz | Baixa | Limpar |
| H | 80+ env vars sem schema validation | Baixa | Validação de config no startup |
| I | Rate limit só em /conversation/turns | Média | Estender a endpoints públicos (/c/{slug}/contact!) |

---

## 6. Billing (commit a044fe4) — detalhe

Tiers em internal/core/billing/plans.go:
- **free**: 50 exec/mês, 1 agente, 0 RAG, 0 LLM tokens, CRM ✓, Cards ✓
- **starter**: 500 exec, 5 agentes, 1GB RAG, 500k tokens
- **growth**: 2000 exec, 20 agentes, 5GB RAG, 2M tokens, GraphMemory ✓, MultiTenant ✓
- **enterprise**: ilimitado (-1)

Implementado: models ✓, handlers CRUD ✓ (handlers_billing.go:27-75), tabela tenant_usage ✓ (INSERT ON CONFLICT).
**Faltando: enforcement** — nenhum executor chama `ExecutionsAllowed()`; free tier roda ilimitado hoje.

---

## Conclusão

Arquitetura sólida (hub API + executores NATS + Postgres/Redis/Neo4j). Débitos prioritários:
1. **Billing enforcement** (alta — receita/abuso)
2. Rate limit no endpoint público /c/{slug}/contact (spam de contatos no CRM)
3. Dedup executores -new
4. Refactor handlers/router

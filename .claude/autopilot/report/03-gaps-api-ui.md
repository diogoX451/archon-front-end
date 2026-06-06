# 03 — Gaps API↔UI — Auditoria Autopilot

> Gerado pelo tick 2 da auditoria autopilot (m3) em 2026-06-05.

## Tabela 1 — Endpoints Backend SEM consumer no Frontend

| Prioridade | Método | Rota | Domínio | Impacto |
|-----------|--------|------|---------|--------|
| 🔴 P0 | PATCH | /api/v1/tenants/{id}/plan | Billing | Super-admin edita plano manualmente; sem self-service |
| 🔴 P0 | GET | /api/v1/tenants/{id}/usage | Billing | Nenhuma tela mostra uso/limites do tenant |
| 🔴 P0 | GET | /api/v1/trail/* (7 endpoints) | Audit Trail | Causal graph + why + blocked — zero consumer |
| 🔴 P0 | GET | /api/v1/graph/* (3 endpoints) | Audit Graph | Neo4j analytics — zero consumer |
| 🔴 P0 | POST | /api/v1/handoffs/{id}/assign | HITL | Atribuição a operador humano sem UI |
| 🔴 P0 | POST | /api/v1/handoffs/{id}/close | HITL | Fechamento de handoff sem UI |
| 🟠 P1 | GET | /api/v1/usage/summary | Analytics | Dashboard de uso existe no back, sem tela |
| 🟠 P1 | GET | /api/v1/usage/timeseries | Analytics | Gráfico histórico sem consumer |
| 🟠 P1 | GET | /api/v1/usage/breakdown | Analytics | Breakdown por agent/model sem consumer |
| 🟠 P1 | GET | /api/v1/usage/pricing | Analytics | Pricing calculado sem consumer |
| 🟠 P1 | GET | /api/v1/me/data | LGPD | Acesso a dados pessoais (Art.18) sem UI |
| 🟠 P1 | POST | /api/v1/me/data/export | LGPD | Portabilidade de dados sem UI |
| 🟠 P1 | DELETE | /api/v1/me | LGPD | Deleção de conta sem UI |
| 🟠 P1 | GET | /api/v1/me/activity | LGPD | Atividade do usuário sem UI |
| 🟠 P1 | GET | /api/v1/rag/dashboard | RAG | Dashboard de RAG sem consumer |
| 🟠 P1 | GET | /api/v1/rag/ingestions | RAG | Histórico de ingestões sem consumer |
| 🟠 P1 | GET | /api/v1/rag/queries | RAG | Log de queries sem consumer |
| 🟠 P1 | GET | /api/v1/rag/knowledge-bases/{id}/coverage | RAG | Coverage de KB sem consumer |
| 🟠 P1 | POST | /api/v1/crm/contacts/{id}/interactions | CRM | Link conversa→contato sem UI |
| 🟠 P1 | GET | /api/v1/crm/contacts/{id}/interactions | CRM | Histórico de interações sem UI |
| 🟠 P1 | GET | /api/v1/crm/cards/{id}/qrcode | CRM | QR code do cartão sem UI |
| 🟡 P2 | GET | /api/v1/crm/contacts/stats | CRM | Stats de contatos (possível bug URL) |
| 🟡 P2 | GET | /api/v1/reactive/process | Reactive | Agente reativo sem integração na UI |
| 🟡 P2 | GET | /api/v1/reactive/profiles/* | Reactive | Profiles do reactive agent sem UI |
| 🟡 P2 | GET | /api/v1/conversations/{id}/timeline | Conversations | Timeline visual de conversa sem UI |
| 🟡 P2 | POST | /api/v1/conversations/{id}/turns/{id}/regenerate | Conversations | Regeneração de turn sem UI |
| 🟡 P2 | POST/GET | /api/v1/rules | Rules | Sistema de regras sem UI |

**Total: ~51 endpoints sem consumer**

---

## Tabela 2 — Chamadas do Frontend SEM endpoint correspondente

| Arquivo:linha | URL | Problema |
|---|---|---|
| auth.ts:74 | `/auth/verify-email?token=` | Backend sem esse exato endpoint (conflito com reset-password flow) |
| auth.ts:77 | `/auth/resend-verification` | Endpoint não documentado no backend |
| channels.ts:43 | `/api/v1/channel/conversations?conversation_id={id}` | Backend espera path param, não query string |
| handoffs.ts:34 | `?tenant_id=` | Backend não documenta `tenant_id` como query param |

---

## Tabela 3 — Features Parcialmente Implementadas

| Feature | Falta no Frontend | Falta no Backend |
|---------|------------------|-----------------|
| **Billing/Planos** | Telas self-service de plano, limites visíveis, histórico | Enforcement de limites no executor de conversas; auto-billing |
| **Usage Analytics** | Dashboard de consumo, alertas de custo, gráficos | Alertas em tempo real, usage by-model breakdown |
| **HITL Handoffs** | Fila visual de operadores, notificações SSE, roteamento | Escalação automática, notificação push para operador |
| **MCP OAuth** | Wizard visual passo-a-passo, revogação por scope | Callback de autorização mais explícito |
| **Trail/Audit** | Viewer de causal graph, "por que bloqueou?", timeline visual | — (backend completo) |
| **RAG Management** | Dashboard de coverage, monitoring de ingestões | — (backend completo) |
| **Conversation History** | Timeline visual, regeneração de turn, deleção | — (backend completo) |
| **LGPD Privacy** | Telas de export, atividade, solicitação de deleção | — (backend completo) |

---

## Destaques

### Billing — P0
Frontend tem `updateTenantPlan()` em tenants.ts mas é super-admin only. Sem:
- Página de upgrade/downgrade self-service
- Exibição de limites do plano atual
- Contador de execuções restantes no mês
- Notificação ao atingir 80%/100% do limite

### HITL — P0 crítico
HandoffsPage lista handoffs mas:
- Sem fila de operadores com SLA
- Sem notificação em tempo real (SSE)
- Sem atribuição visual (botão assign não implementado na UI apesar de existir no backend)
- Sem contexto da conversa original no handoff

### Trail/Audit — P0 compliance
7 endpoints de trail + 3 de graph existem no backend (Neo4j). Zero consumidos na UI.
Impossível responder "por que o agente tomou essa decisão?" via interface.

### LGPD — P1 legal
5 endpoints de /me/* existem. AccountPrivacyPage existe mas não chama nenhum deles.
Risco legal: usuários não conseguem exercer direitos LGPD Art. 18 pela interface.

### RAG — P1
Dashboard, ingestions, queries, coverage existem no back (e em rag.ts). RagPage não consome nenhum.
Tenant não consegue monitorar saúde das suas knowledge bases.

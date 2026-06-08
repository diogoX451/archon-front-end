# Archon — Relatório de Débitos e Roadmap

> Gerado pelo autopilot em 2026-06-05. Branch: autopilot/2026-06-05-audit.
> Fontes: 01-backend-arch.md, 02-frontend-arch.md, 03-gaps-api-ui.md, 04-browser-dashboard.md, 05-browser-crm.md, 06-browser-conversas.md, 07-qualidade.md, 09-mercado-competitivo.md, 10-oportunidades-mercado.md.

---

## Visão Geral

Archon tem **arquitetura técnica superior** à maioria dos concorrentes (NATS event-driven, audit trail causal, graph memory, MCP nativo, CRM integrado, multi-tenant RBAC, billing model). O problema central é **superioridade técnica não convertida em produto utilizável**: 51 endpoints de backend sem consumer na UI, billing sem enforcement, CRM contatos sem CRUD pela UI, cards com falha silenciosa, conversas duplicadas na UI, vínculos de canal quebrados, workflow result inconsistente, HITL sem SLA visual, RAG sem dashboard, e zero testes no frontend.

---

## P0 — Quebrado / Bloqueador Crítico

Estes itens bloqueiam receita, compliance ou segurança hoje.

### P0-1 — Billing sem enforcement (PERDA DE RECEITA)
**Onde**: `internal/core/billing/plans.go:74` — `ExecutionsAllowed()` existe mas nunca é chamado
**Impacto**: Free tier executa ilimitado; sem limite no conversation-turn-executor ou planner
**Fix backend**: Chamar `plan.Limits.ExecutionsAllowed(currentUsage)` em `conversation-turn-executor` antes de processar turn; retornar 429 se excedido; incrementar `tenant_usage` em cada execução
**Fix frontend**: Tela self-service de planos + exibição de consumo + call-to-action de upgrade
**Esforço**: M (3-4 semanas total)

### P0-2 — Endpoint público /c/{slug}/contact sem rate limit (SPAM NO CRM)
**Onde**: `internal/api/server.go:655` — `POST /c/{slug}/contact` sem rate limiter
**Impacto**: Qualquer pessoa pode flooder o CRM com contatos falsos; sem custo para atacante
**Fix**: Aplicar `s.limiter` no endpoint público (IP-based, ~10 req/hora por IP); adicionar captcha opcional
**Esforço**: P (1-2 dias)

### P0-3 — Jaeger UI exposta publicamente sem autenticação
**Onde**: Servidor produção `137.184.98.58:16686` — porta aberta, sem auth
**Impacto**: Traces contêm tenant_id, payloads LLM, dados de clientes — visíveis para qualquer um com o IP
**Fix**: Bloquear porta 16686 no firewall; acessar via SSH tunnel ou proxy com autenticação básica
**Esforço**: P (1 hora)

### P0-4 — LGPD Art. 18 inacessível via UI (RISCO LEGAL)
**Onde**: `src/pages/AccountPrivacyPage.tsx` — página existe mas não chama endpoints `/api/v1/me/*`
**Impacto**: Usuários não conseguem exercer direito de acesso, portabilidade e deleção de dados pela interface
**Fix**: Conectar AccountPrivacyPage aos endpoints já existentes: `GET /me/data`, `POST /me/data/export`, `DELETE /me`, `GET /me/activity`
**Esforço**: P (2-3 dias)

### P0-5 — URL errada em channels.ts (BUG ATIVO)
**Onde**: produção `/channels` → aba "Vínculos" mostra `An error occurred`; URL antiga `GET /api/v1/channel/conversations?conversation_id=...` retorna 405, enquanto o endpoint correto por path responde 200
**Impacto**: Função de ver/gerenciar vínculos conversa→canal retorna erro; feature de channel conversation quebrada na UI
**Fix**: Garantir deploy com `/api/v1/channel/conversations/${id}` (path param), propagar tenant selecionado pelo super-admin e exibir erro específico
**Esforço**: P (< 1 dia)

### P0-6 — CRM Contatos sem CRUD de criação pela UI
**Onde**: produção `/crm/contacts` carrega lista/stats/filtros, mas não existe botão "+ Novo Contato"
**Impacto**: CRM integrado vira leitura vazia/manual; usuário não consegue cadastrar contato pelo produto
**Fix**: Implementar create/edit/delete no frontend usando endpoints existentes `/api/v1/crm/contacts`, com estados de erro e atualização otimista/invalidations
**Esforço**: P (2-4 dias)

---

## P1 — Incompleto / Feature Prometida sem UI

Endpoints implementados no backend, sem consumer no frontend.

### P1-1 — HITL sem fila visual e sem SLA
**Onde**: `/handoffs` carrega, mas produção está com 0 handoffs; sem SLA/prioridade/notificação e sem seed seguro para validar assign/close ponta a ponta
**Fix**: Fila visual com SLA configurável, notificação SSE, contexto completo da conversa e cenário seed de auditoria para validar assign/close sem tocar dados reais
**Esforço**: M (2-3 semanas)

### P1-2 — Dashboard de observabilidade de agentes
**Onde**: Endpoints `/api/v1/trail/*` (7), `/api/v1/graph/*` (3), `/api/v1/usage/*` (7) — zero consumer
**Débito browser**: `/workflows` lista workflows, mas `/workflows/result?id=...` retorna `workflow not found`; o drawer de auditoria do mesmo ID mostra eventos
**Fix**: Tela de audit trail com causal graph visual, fallback para eventos quando state/result não existir, "por que o agente tomou essa decisão?", custo por execução
**Esforço**: M (3-4 semanas)

### P1-3 — RAG dashboard e monitoring
**Onde**: Endpoints `/api/v1/rag/dashboard`, `/rag/ingestions`, `/rag/queries`, `/rag/coverage` — zero consumer
**Fix**: Dashboard de saúde das knowledge bases: coverage, ingestões, queries com baixo score, gaps
**Esforço**: M (2-3 semanas)

### P1-4 — Analytics de uso por tenant
**Onde**: Módulo `src/shared/api/usage.ts` implementado mas não usado em nenhuma tela
**Fix**: Dashboard de consumo: execuções/mês, tokens LLM, RAG bytes — com barras de limite do plano
**Esforço**: M (2-3 semanas)

### P1-5 — QR Code de cartão sem UI
**Onde**: Endpoint `GET /api/v1/crm/cards/{id}/qrcode` não tem consumer; CRMCardsPage não exibe QR
**Fix**: Botão "Ver QR Code" no cartão, modal com imagem e botão de download
**Esforço**: P (2-3 dias)

### P1-6 — Interações CRM (link conversa → contato) sem UI
**Onde**: Endpoints `/api/v1/crm/contacts/{id}/interactions` (GET e POST) sem consumer
**Fix**: Tab "Interações" no detalhe do contato mostrando conversas vinculadas + botão de vincular
**Esforço**: P (3-5 dias)

### P1-7 — CI/CD backend inexistente
**Onde**: Repositório archon sem `.github/workflows/`
**Impacto**: Zero gate antes de merge/deploy; deploy manual via SSH como único controle
**Fix**: GitHub Actions: `go vet` + `golangci-lint` + `go test ./... -race` + docker build + deploy via compose
**Esforço**: P (2-3 dias)

### P1-8 — Frontend sem testes
**Onde**: Nenhum arquivo `*.test.*`, sem vitest/jest configurado
**Fix**: Instalar vitest + @testing-library/react; começar por hooks críticos (useAuth, useWorkflows) e pages de billing/CRM
**Esforço**: M (ongoing — começar com 20% coverage)

### P1-9 — Conversas duplicadas na UI
**Onde**: `/conversation` e `GET /api/v1/conversations?cursor=true` retornam múltiplas linhas por `conversation_id`
**Impacto**: histórico fica poluído e ações como abrir/deletar conversa ficam ambíguas
**Fix**: Agrupar por `conversation_id` no backend ou normalizar no consumer até o endpoint ser corrigido; retornar `message_count` real e preview do último turno
**Esforço**: P (1-2 dias)

### P1-10 — CRM Cards com falha silenciosa
**Onde**: produção `/crm/cards`; `useCreateCard`/`useUpdateCard` sem `onError`, e criar cartão pela UI não fecha formulário nem mostra erro
**Impacto**: usuário acredita que a ação travou; suporte não recebe evidência clara de erro
**Fix**: Adicionar feedback de erro em hooks/forms, invalidar query em sucesso e preservar payload de erro de API para debug
**Esforço**: P (1-2 dias)

### P1-11 — Smoke autenticado do dashboard sem credencial read-only
**Onde**: missão m4; `/dashboard` e rotas protegidas redirecionam corretamente para `/login`, mas não havia auth vault/sessão/credencial para validar dashboard autenticado
**Impacto**: auditoria recorrente não consegue diferenciar regressão real de ausência de credencial
**Fix**: Criar usuário/tenant seed read-only para smoke tests de produção e salvar perfil seguro no `agent-browser auth`
**Esforço**: P (1 dia)

---

## P2 — Evolução / Features de Mercado

Não quebrado, mas necessário para crescimento.

| # | Feature | Esforço | Impacto | Notas |
|---|---------|---------|---------|-------|
| P2-1 | Self-service billing + Stripe | M | Alto | Modelos de plano prontos; falta enforcement + UI |
| P2-2 | Broadcast WhatsApp + segmentação CRM | M | Alto | Diferencial vs WATI/ManyChat sem CRM integrado |
| P2-3 | Integração HubSpot/Salesforce/Pipedrive | M | Alto | Bloqueador de vendas enterprise |
| P2-4 | MCP Server Marketplace | M | Médio | Backend OAuth já pronto; falta catálogo UI |
| P2-5 | ROI Analytics por tenant | M | Médio | Vendável como feature enterprise |
| P2-6 | OTel SampleRatio reduzir (1.0 → 0.1) | P | Médio | Overhead em produção com volume |
| P2-7 | Prometheus + Grafana na stack prod | P | Médio | Métricas definidas, scraper ausente |
| P2-8 | Flow Builder Visual No-Code | G | Alto | Planejamento agora; dev 3-4 meses |
| P2-9 | WhatsApp Cloud API oficial (dual) | G | Alto | Compliance enterprise; 2-3 meses |
| P2-10 | Executores -new sem source (limpeza) | P | Baixo | Binários orphaned (conversation-turn-new, hitl-new) |

---

## Débitos de Qualidade Técnica

| Débito | Severidade | Ação |
|--------|-----------|------|
| cmd/api cobertura 5.2% | Alta | Testes de smoke TestMain + health-check |
| 78 `any` types no frontend | Média | Tipar conversation.ts, profiles, rag progressivamente |
| ConversationPage 961 linhas | Baixa | Refactor em submódulos |
| Dois modelos de profiles (ConversationProfileV2 vs listConversationProfiles) | Média | Documentar qual usar; deprecar o antigo |
| Enable* remonta chi.Router O(N) | Baixa | Defer route setup até setupRoutes() final |
| Token GitHub embutido na URL remote do servidor prod | **Alta** | Revogar token; usar deploy key ou fine-grained token |

---

## Roadmap Recomendado

### Sprint Imediata (1-2 semanas) — Correções P0
1. Rate limit em `/c/{slug}/contact` (P, 1-2 dias)
2. Fechar porta 16686 Jaeger (P, 1 hora)
3. Corrigir URL channels.ts:43 (P, < 1 dia)
4. Conectar AccountPrivacyPage aos endpoints LGPD (P, 2-3 dias)
5. Implementar CRUD mínimo em `/crm/contacts` (P, 2-4 dias)
6. CI/CD backend básico (P, 2-3 dias)

### Sprint 1 (3-4 semanas) — Billing + Observabilidade
1. Enforcement de limites por plano no conversation-turn-executor
2. UI self-service de planos (consumo + upgrade)
3. Dashboard de observabilidade de agentes (trail + usage)
4. HITL fila visual com SLA + notificação SSE

### Sprint 2 (3-4 semanas) — RAG + CRM + Qualidade
1. RAG dashboard gerenciável (coverage, ingestions, queries)
2. QR Code UI no CRMCardsPage
3. Interações CRM (link conversa → contato)
4. Instalar vitest + primeiros testes de hooks críticos

### Sprint 3 (4-6 semanas) — Crescimento
1. Broadcast WhatsApp + segmentação por CRM
2. Analytics de negócio por tenant (ROI Dashboard)
3. Integração HubSpot (connector bidirecional)

### Médio Prazo (2-4 meses) — Diferenciação de Mercado
1. MCP Server Marketplace
2. Flow Builder Visual No-Code (planejamento começa agora)
3. WhatsApp Cloud API oficial (dual Baileys/Meta)

---

## Kanban — Próximas Ações Concretas

Ver `.claude/autopilot/report/KANBAN.md` para board de tarefas implementáveis.

---

*Gerado por autopilot/2026-06-05-audit — missões m1-m10 consolidadas; m4 concluída com limitação explícita por ausência de credencial autenticada.*

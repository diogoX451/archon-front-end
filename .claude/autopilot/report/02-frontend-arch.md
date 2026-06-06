# 02 — Arquitetura Frontend (React/Vite) — Auditoria Autopilot

> Gerado pelo tick 2 da auditoria autopilot (m2) em 2026-06-05.

## Resumo Executivo

React 18 + React Router 6 + TanStack Query + Vite. 34 rotas, todas com componentes implementados (sem placeholders). 27 módulos de API tipados. AuthContext global + React Query para server state. i18n pt-BR/en 100%.

---

## 1. Rotas e Páginas

| Rota | Componente | Linhas | Estado |
|------|-----------|--------|--------|
| `/` | LandingPage | 677 | Completa |
| `/login` | LoginPage | 297 | Completa |
| `/signup` | SignupPage | 140 | Completa |
| `/forgot-password` | ForgotPasswordPage | 74 | Completa |
| `/reset-password` | ResetPasswordPage | 100 | Completa |
| `/auth/verify-email` | VerifyEmailPage | 46 | Completa |
| `/privacy` | PrivacyPolicyPage | — | Completa |
| `/terms` | TermsPage | — | Completa |
| `/dpo` | DpoPage | — | Completa |
| `/c/:slug` | PublicCardPage | 783 | Completa |
| `/dashboard` | DashboardPage | 295 | Completa |
| `/conversation` | ConversationPage | 961 | Completa — **muito grande** |
| `/handoffs` | HandoffsPage | 608 | Parcial (sem fila/atribuição visual) |
| `/crm/contacts` | CRMContactsPage | 249 | Completa |
| `/crm/cards` | CRMCardsPage | 583 | Completa |
| `/workflows` | WorkflowsPage | 345 | Completa |
| `/workflows/builder` | WorkflowBuilder | — | Completa |
| `/workflows/builder/:id` | WorkflowBuilder | — | Completa |
| `/workflows/result` | WorkflowResultPage | 590 | Completa |
| `/profiles` | ProfilesPage | 363 | Completa |
| `/tenants` | TenantsPage | 208 | Parcial (sem self-service de plano) |
| `/rag` | RagPage | 397 | Parcial (sem dashboard/coverage/monitoring) |
| `/events` | EventsPage | 236 | Completa |
| `/templates` | TemplatesPage | 268 | Incerto (tab sem switch claro, linha 24) |
| `/roles` | RolesPage | 477 | Parcial (sem role-templates editor) |
| `/permissions` | PermissionsPage | 383 | Parcial (sem catálogo editável) |
| `/channels` | ChannelsPage | 903 | Completa — **muito grande** |
| `/admin-audit` | AdminAuditPage | 332 | Parcial (sem trail/causal graph) |
| `/llm-config` | LLMConfigPage | 716 | Parcial (pricing/usage condicional) |
| `/mcp-config` | MCPConfigPage | 804 | Parcial (sem wizard OAuth visual) |
| `/admin/mcp/connected` | MCPOAuthResultPage | — | Completa |
| `/admin/mcp/error` | MCPOAuthResultPage | — | Completa |
| `/account/privacy` | AccountPrivacyPage | 262 | Parcial (sem export/deleção/atividade) |

---

## 2. Módulos API (src/shared/api/*)

| Módulo | Endpoints | Tipagem |
|--------|-----------|---------|
| auth.ts | /auth/login, /logout, /signup, /verify-email, /forgot-password, /reset-password | LoginResponse, MeResponse |
| client.ts | — | fetchClient<T>() — Bearer/Cookie + CSRF |
| workflows.ts | /api/v1/workflows, /{id}/(status/result/agents/connections) | WorkflowState, WorkflowStatusResponse |
| profiles.ts | /api/v1/profiles | ConversationProfileV2 |
| conversation.ts | /api/v1/conversation/profiles, /turns | **GenericObject (mal tipado)** |
| conversationsHistory.ts | /api/v1/conversations, /{id} | ConversationRow |
| rag.ts | /api/v1/rag/(ingest/query/dashboard/knowledge-bases/*) | RagDashboardResponse |
| channels.ts | /api/v1/channel/(conversations/credentials), /channels/whatsapp | ChannelLink, ChannelCredential |
| events.ts | /api/v1/(workflows/{id}/timeline, events/timeline, events/workflows) | WorkflowEvent |
| agents.ts | /api/v1/agents/templates | AgentTemplate[] |
| roles.ts | /api/v1/roles (CRUD) + /effective-permissions | Role, EffectivePermission |
| permissions.ts | /api/v1/permissions | Permission[] |
| users.ts | /api/v1/users (CRUD) + /status + /roles | User |
| tenants.ts | /api/v1/tenants (CRUD) + /status + /plan | Tenant, PlanTier |
| crm.ts | /api/v1/crm/(contacts/cards/*), /c/{slug} | Contact, BusinessCard |
| kbs.ts | /api/v1/rag/knowledge-bases | KnowledgeBase |
| handoffs.ts | /api/v1/handoffs, /{id}/(close/assign) | Handoff |
| llmConfig.ts | /api/v1/llm-configs | LLMConfig |
| mcpConfig.ts | /api/v1/mcp-configs, /mcp/{id}/oauth/* | MCPConfig |
| usage.ts | /api/v1/usage/(summary/breakdown/pricing/timeseries) | UsageSummary |
| health.ts | /health | HealthResponse |
| token.ts | — | LocalStorage/SessionStorage |

---

## 3. Estado Global

- **AuthContext** (`src/app/auth-context.tsx`): user, permissions(Set), activeTenantSlug, isSuper, isTenantAdmin, loading. login/logout/hasPermission/setActiveTenantSlug.
- **React Query** (QueryClient staleTime 10s): 28+ custom hooks em src/shared/hooks/
- **Tour System**: TourContext + TourOrchestrator (nav, rag, workflowBuilder tours)
- **Sem Redux/Zustand** — estado local + RQ

---

## 4. i18n

- Framework: i18next + react-i18next + browser-languagedetector
- Idiomas: pt-BR (fallback) + en — ambos 100% completos (198 linhas)
- Detecção: localStorage → navigator → pt-BR
- Cobertura: nav, breadcrumbs, tour, common

---

## 5. Componentes Compartilhados

| Componente | Reutilização |
|-----------|--------------|
| DynamicBreadcrumbs | 29 páginas |
| Feedback (toast/confirm hook) | 28 páginas |
| TimelineDrawer | 2 páginas |
| ProfileDetail + Drawer | 2 páginas |
| AppShell / Rail | 1x global |
| JsonBlock | 3x |

---

## 6. Config/Env

```
VITE_ARCHON_API_URL (ou VITE_API_URL) → API_BASE_URL
VITE_ARCHON_AUTH_MODE = "cookie" | "bearer" (default bearer)
```
Proxy dev: /auth, /api, /health, /c/* → API_BASE_URL  
Build: tsc + vite build + scripts/build-seo.mjs (SEO metadata)

---

## 7. Débitos

| # | Débito | Severidade |
|---|--------|-----------|
| A | 78 instâncias de `any` — conversation.ts, profiles, rag | Média |
| B | ConversationPage (961L), ChannelsPage (903L), MCPConfigPage (804L) — muito grandes | Baixa |
| C | Dois modelos de profiles: ConversationProfileV2 vs listConversationProfiles | Média |
| D | Handoff usa CamelCase (ID, TenantID) vs snake_case do resto | Baixa |
| E | conversation.ts retorna GenericObject — sem tipo específico | Média |
| F | Sem testes unitários/e2e em nenhum componente | Alta |
| G | Tour system sem hook de estado read-only externo | Baixa |
| H | CSRF manual sem proteção a race conditions em mutations paralelas | Baixa |
| I | TemplatesPage: tab state sem switch renderizado claro (linha 24) | Baixa |

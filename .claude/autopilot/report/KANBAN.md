# Archon — Kanban de Próximas Ações

> Consolidado a partir dos relatórios `01`–`10` do autopilot em `2026-06-06`.

## Fazer Agora — P0

| ID | Tarefa | Origem | Critério de aceite |
|---|---|---|---|
| P0-1 | Aplicar enforcement de billing no executor de conversas | `01-backend-arch.md`, `03-gaps-api-ui.md` | Free tier bloqueia execução excedente com 429 e uso mensal é incrementado |
| P0-2 | Adicionar rate limit em `POST /c/{slug}/contact` | `01-backend-arch.md`, `05-browser-crm.md` | Endpoint público limita flood por IP e mantém fluxo legítimo funcionando |
| P0-3 | Fechar Jaeger público em `:16686` | `07-qualidade.md` | Porta não responde externamente; acesso só via túnel/proxy autenticado |
| P0-4 | Conectar Account Privacy aos endpoints LGPD | `03-gaps-api-ui.md` | Usuário consegue consultar, exportar e solicitar deleção dos próprios dados |
| P0-5 | Corrigir vínculos em `/channels` | `06-browser-conversas.md` | Aba "Vínculos" usa `/api/v1/channel/conversations/{id}` e não mostra erro genérico |
| P0-6 | Implementar CRUD mínimo em `/crm/contacts` | `05-browser-crm.md` | UI permite criar/editar/deletar contato e lista atualiza sem reload manual |

## Próximo Sprint — P1

| ID | Tarefa | Origem | Critério de aceite |
|---|---|---|---|
| P1-1 | Deduplicar conversas por `conversation_id` | `06-browser-conversas.md` | Lista mostra uma linha por conversa com preview do último turno e contagem real |
| P1-2 | Corrigir feedback de erro em CRM Cards | `05-browser-crm.md` | Falhas de `create/update` exibem toast/erro inline e não ficam silenciosas |
| P1-3 | Corrigir result trace de workflows listados | `06-browser-conversas.md` | `/workflows/result?id=...` abre resultado ou fallback de eventos para o mesmo ID |
| P1-4 | Criar smoke autenticado read-only para dashboard | `04-browser-dashboard.md` | Existe conta/seed auditável para validar `/dashboard` sem tocar dados reais |
| P1-5 | Implementar fila HITL com SLA e notificações | `03-gaps-api-ui.md`, `06-browser-conversas.md` | Handoffs têm prioridade/SLA, notificação e cenário seed para assign/close |
| P1-6 | Criar dashboard RAG gerenciável | `03-gaps-api-ui.md`, `10-oportunidades-mercado.md` | UI mostra coverage, ingestions, queries de baixo score e gaps |
| P1-7 | Adicionar CI/CD backend | `07-qualidade.md` | PR roda `go vet`, lint, `go test ./... -race`, build Docker |
| P1-8 | Iniciar testes frontend | `02-frontend-arch.md`, `07-qualidade.md` | Vitest configurado e hooks críticos cobertos inicialmente |

## Backlog Estratégico — P2

| ID | Tarefa | Origem | Critério de aceite |
|---|---|---|---|
| P2-1 | Self-service billing com Stripe | `10-oportunidades-mercado.md` | Plano, consumo e upgrade funcionam na UI |
| P2-2 | Broadcast WhatsApp com segmentação CRM | `10-oportunidades-mercado.md` | Campanha segmentada dispara para lista de contatos com auditoria |
| P2-3 | Integrações HubSpot/Salesforce/Pipedrive | `09-mercado-competitivo.md`, `10-oportunidades-mercado.md` | Primeiro conector bidirecional sincroniza contatos e eventos |
| P2-4 | MCP Server Marketplace | `10-oportunidades-mercado.md` | Tenant instala/desinstala servidores MCP por catálogo visual |
| P2-5 | ROI Analytics por tenant | `10-oportunidades-mercado.md` | Dashboard mostra custo, economia e conversões por período |
| P2-6 | Flow Builder Visual No-Code | `09-mercado-competitivo.md`, `10-oportunidades-mercado.md` | Builder permite desenhar fluxo sem editar JSON/manual profile |
| P2-7 | WhatsApp Cloud API oficial em modo dual | `10-oportunidades-mercado.md` | Tenant escolhe Baileys ou Meta Cloud API conforme compliance |

## Higiene Técnica

| ID | Tarefa | Origem | Critério de aceite |
|---|---|---|---|
| Q-1 | Remover token GitHub de URL remota no servidor prod | `07-qualidade.md` | Token revogado e deploy usa deploy key ou token fine-grained |
| Q-2 | Reduzir OTel sample ratio em produção | `07-qualidade.md` | Sample ratio configurável e menor que `1.0` em produção |
| Q-3 | Instalar Prometheus/Grafana no deploy | `07-qualidade.md` | Métricas existentes são raspadas e visíveis em dashboard |
| Q-4 | Tipar progressivamente `GenericObject`/`any` críticos | `02-frontend-arch.md` | APIs de conversation/profiles/rag têm contratos TypeScript explícitos |
| Q-5 | Limpar executores `-new` órfãos | `01-backend-arch.md` | Binários sem source deixam de ser gerados/implantados |

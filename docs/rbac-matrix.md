# RBAC Matrix (Front-end x Back-end)

Fonte do catálogo no back-end: `internal/core/auth/permissions_catalog.go`  
Fonte de proteção de rotas no back-end: `internal/api/server.go` (`Authorize("...")`)

## Menu lateral

| Item | Regra de acesso |
|---|---|
| Workflows (`/workflows`) | `workflow_list` |
| Agentes (`/templates`) | `conversation_profile_list` |
| Execuções (`/events`) | `workflow_list` |
| Bases RAG (`/rag`) | `rag_read` ou `rag_query` ou `rag_ingest` |
| Usuários (`/profiles`) | `user_list` |
| Papéis (`/roles`) | `role_list` |
| Permissões (`/permissions`) | `superOnly` + `permission_list` |
| Tenants (`/tenants`) | `superOnly` |

## Usuários (`/profiles`)

| Ação | Permissão |
|---|---|
| Ver lista | `user_list` |
| Novo usuário | `user_create` |
| Editar / Ativar / Inativar | `user_update` |
| Associar/Desassociar papéis | `role_associate` |

## Papéis (`/roles`)

| Ação | Permissão |
|---|---|
| Ver lista | `role_list` |
| Novo papel | `role_create` |
| Editar papel | `role_update` |
| Excluir papel | `role_delete` |
| Toggle de permissões do papel | `role_associate` |

## Agentes (`/templates`) e Builder (`/workflows/builder`)

| Ação | Permissão |
|---|---|
| Ver lista de agentes | `conversation_profile_list` |
| Novo agente | `workflow_create` ou `workflow_update` |
| Excluir agente | `workflow_create` ou `workflow_update` |
| Salvar no builder | `workflow_create` ou `workflow_update` |

## RAG (`/rag`)

| Ação | Permissão |
|---|---|
| Ver dashboard/listas/cobertura | `rag_read` |
| Criar base / Excluir base / Ingerir documento | `rag_ingest` |

## Conversa (`/conversation`)

| Ação | Permissão |
|---|---|
| Nova conversa / Enviar mensagem | `conversation_turn` |

## Regras globais

- `super-admin`: bypass total no front (`isSuper`).
- `tenant_admin`: **sem bypass automático**; respeita `permissions` retornadas pelo `/auth/me`.

## Observações

- `Tenants` segue como `superOnly` no front. Hoje não existe `tenant_*` no catálogo padrão de permissões.
- Esta matriz cobre os controles já aplicados no front. Se novas ações surgirem (ex.: excluir conversa, editar turn, regenerar), devem ser mapeadas para chaves explícitas no catálogo.

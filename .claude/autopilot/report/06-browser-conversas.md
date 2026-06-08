# Browser Audit — Conversas, Agentes, WhatsApp e HITL
_Autopilot tick · missão m6 · 2026-06-06_

## Resumo executivo

| Área | Estado | Achados principais |
|---|---|---|
| Conversas (`/conversation`) | **Parcial** | Chat abre e auditoria funciona; listagem duplica `conversation_id` por turn |
| Agentes / Builder (`/templates`, `/workflows/builder`) | **Parcial** | Profiles e canvas carregam; simulação real existe, mas trace estruturado falha para workflows listados |
| WhatsApp / Evolution (`/channels`) | **Parcial** | QR renderiza para tenant `fluency`; vínculos de conversa quebram na UI |
| HITL (`/handoffs`) | **Sem dados para validar ponta a ponta** | Endpoint e tela carregam, mas fila está vazia em produção |

Escopo executado com `agent-browser` em `https://archon.almexa.com.br`, usando conta super-admin de auditoria. Não foram criados, deletados, atribuídos ou encerrados registros reais. Ações mutáveis foram evitadas; apenas validações locais e telas/modal de leitura foram acionados.

---

## 1. Conversas (`/conversation`)

**Estado: PARCIAL**

### O que funciona
- Login e navegação protegida funcionam.
- Lista de profiles carrega: `agente-simples`, `archon-assistant`, `general-assistant`, `meu-calendario`, `fluency-vendas`.
- Selecionar conversa existente abre o chat.
- Chat renderiza histórico real para `conv_mpu6t78f` com 24 turnos no tenant `fluency`.
- Botões de edição/regeneração aparecem nos turnos correspondentes.
- Drawer "Auditoria" funciona para conversa e mostrou 45 eventos filtráveis.
- Painel "Perfil" abre e retorna estado vazio controlado: "Nenhuma memória acumulada ainda para este contato."

### BUG-CONV-1 — Listagem de conversas duplica `conversation_id`

**Prioridade: P1**

Evidência por UI:
- `/conversation` mostra várias linhas repetidas para o mesmo ID, por exemplo `conv_mpu6t78f` aparece duas vezes com previews diferentes.
- IDs `e2e-suggest-*`, `e2e-final4-*`, `e2e-v5-*`, `e2e-clean2-*` aparecem múltiplas vezes.

Evidência por API, usando o token da sessão browser:

```json
{
  "status": 200,
  "total": 50,
  "unique": 15,
  "duplicates": [
    ["conv_mpu6t78f", 2],
    ["e2e-suggest-1780081198", 6],
    ["e2e-final4-1780075694", 7],
    ["e2e-v5-1780074719", 6],
    ["e2e-final3-1780073213", 7],
    ["e2e-clean2-1780072544", 7],
    ["e2e-worker-1780072104", 6]
  ]
}
```

**Impacto**: a tela vende "Histórico de conversas", mas está listando snapshots/turnos agregados incorretamente como se fossem conversas separadas. Isso torna busca, deleção e navegação perigosas: o usuário pode clicar/deletar uma linha achando que é uma conversa isolada.

**Fix provável**: corrigir `GET /api/v1/conversations?cursor=true` para agrupar por `conversation_id` e retornar uma linha por conversa, com `message_count` real e `preview` do último turno.

### Observação — trace ausente nos turnos

Na conversa `conv_mpu6t78f`, `GET /api/v1/conversations/{id}/turns?tenant=fluency` retornou 24 turnos, mas nenhum `workflow_id`. Por isso o chat não exibe link "Ver trace" nesses turnos, mesmo existindo eventos de auditoria por `workflow_id` na tela de workflows.

---

## 2. Agentes e Builder

**Estado: PARCIAL**

### Agents (`/templates`)

Funciona:
- Lista carrega 5 profiles via API.
- Profiles visíveis:
  - `fluency-vendas` (tenant `fluency`)
  - `agente-simples`
  - `archon-assistant`
  - `general-assistant`
  - `meu-calendario`
- Ação "Abrir" navega para o builder do profile.
- Ação "Excluir profile" existe, mas não foi acionada.

### Builder (`/workflows/builder`)

Funciona:
- Builder carrega sample "Assistente de Clima" com planner + HTTP + transform.
- Simulação do sample roda em modo demo local e mostra 12 eventos no Event Bus.
- Abrir `fluency-vendas` mostra profile salvo real:
  - planner `fluency_planner`
  - modelo `openai · gpt-5-mini`
  - ghost actions: `complete`, `ask_user`, `search_context`, `mcp__calendario__suggest_time`, `mcp__calendario__create_event`, `handoff`
  - `search_context` publica `need: rag.query`
  - `handoff` publica `need: human_handoff`
- Botão "Testar" fica habilitado para profile salvo.
- Botão "Simular" abre modal de simulação real com mensagem default.
- A simulação real não foi iniciada para não criar conversa/workflow novo em produção.

### BUG-AGENT-1 — Trace estruturado falha para workflows listados

**Prioridade: P1**

Evidência:
- `/workflows` carrega 200 workflows/leads, 2 em atendimento, 88% de conclusão, 0 com problema.
- Primeiro workflow listado: `663613a5-c885-4a0c-87c9-34de6416b662`.
- Abrir `/workflows/result?id=663613a5-c885-4a0c-87c9-34de6416b662` resulta em:

```text
workflow not found: 663613a5-c885-4a0c-87c9-34de6416b662
```

- O drawer "Auditoria" do mesmo workflow funciona e mostra 6 eventos:
  - `conversation.turn.requested`
  - `archon.command.spawn` com `profile=fluency-vendas`
  - `archon.audit.channel.link.create`
  - `conversation.turn.completed` com `status=completed`
  - `conversation.memory.log`
  - `archon.audit.conversation.turn.requested`

**Impacto**: a observabilidade principal fica inconsistente. A lista prova que o workflow existe nos eventos, mas a tela de trace estruturado não consegue reconstituir o workflow state/result.

**Fix provável**: alinhar `/api/v1/workflows/{id}`, `/status`, `/result` com a fonte da listagem `/api/v1/events/workflows`, ou fazer `WorkflowResultPage` cair para timeline/eventos quando o state/result não existir.

---

## 3. WhatsApp / Evolution (`/channels`)

**Estado: PARCIAL**

### O que funciona
- Aba WhatsApp carrega tenants para super-admin.
- Validação local do formulário vazio funciona: mostra "Nome de exibição é obrigatório." sem chamar API.
- Tenant `almexa`: nenhum número conectado.
- Varredura read-only por tenants mostrou uma instância existente no tenant `fluency`:
  - `id`: `60421296-414f-4bfe-81f1-598feda26c84`
  - `instance_name`: `1e25d7f0-amanda`
  - `status`: `active`
  - `state`: `close`
- Selecionar tenant `fluency` mostra a instância como "desconectado".
- Botão "QR" abre modal.
- QR Code renderiza como imagem e status fica "aguardando".

### BUG-CHAN-1 — Aba Vínculos quebra com erro genérico

**Prioridade: P0/P1**

Evidência UI:
- Em `/channels`, aba "Vínculos", buscar por `conv_mpu6t78f` fica em "Carregando..." e depois mostra apenas:

```text
An error occurred
```

Evidência API:
- Endpoint correto por path responde:
  - `GET /api/v1/channel/conversations/conv_mpu6t78f?tenant=almexa` → `200 []`
  - `GET /api/v1/channel/conversations/conv_mpu6t78f?tenant=fluency` → `200` com vínculo `Channel: api`, `Status: active`
- URL antiga citada no relatório m3 responde:
  - `GET /api/v1/channel/conversations?conversation_id=conv_mpu6t78f&tenant=almexa` → `405`

**Impacto**: o usuário não consegue ver/gerenciar vínculos de canal pela UI e recebe erro genérico sem diagnóstico. Isso afeta WhatsApp/API channel routing.

**Fix provável**:
- Garantir que produção esteja usando `GET /api/v1/channel/conversations/{conversation_id}?tenant={slug}`.
- Propagar corretamente o tenant selecionado pelo super-admin para a aba "Vínculos"; hoje a aba aparenta usar apenas `activeTenantSlug` da sessão, enquanto WhatsApp tem seletor próprio.
- Exibir mensagem específica com status/código em vez de "An error occurred".

---

## 4. HITL (`/handoffs`)

**Estado: SEM DADOS PARA VALIDAR PONTA A PONTA**

O que funciona:
- `/handoffs` carrega sem erro.
- Métricas carregam: Em atendimento 0, Pendentes 0, Encerrados 0, Total 0.
- Filtros e busca existem.
- Endpoint confirmado:

```json
{
  "status": 200,
  "tenant": "almexa",
  "count": 0
}
```

Limitação:
- Como a fila está vazia, não foi possível validar atribuição, fechamento, SLA ou contexto da conversa sem criar dados artificiais.
- O código local tem UI para `Atribuir` e `Encerrar atendimento`, mas a produção auditada não tinha handoff real para testar.

Débito mantido:
- Falta visão operacional de SLA, prioridade, idade de fila e notificação em tempo real.
- Falta cenário seed/teste para auditar HITL ponta a ponta em produção sem alterar dados reais.

---

## Bugs para o Kanban

| ID | Descrição | Prioridade |
|---|---|---|
| BUG-CONV-1 | `/api/v1/conversations?cursor=true` retorna múltiplas linhas por `conversation_id`, duplicando conversas na UI | P1 |
| BUG-AGENT-1 | `/workflows` lista workflows que `/workflows/result` não consegue carregar (`workflow not found`) | P1 |
| BUG-CHAN-1 | Aba `/channels` → "Vínculos" mostra erro genérico; produção ainda parece desalinhada com path-param do backend | P0/P1 |
| GAP-HITL-1 | `/handoffs` sem dados reais/seed e sem SLA visual; não dá para validar assign/close sem mutação | P1 |

---

## Evidências operacionais

- App auditado: `https://archon.almexa.com.br`
- API consultada via sessão autenticada: `https://api.almexa.com.br`
- Tenant principal da sessão: `almexa`
- Tenant com WhatsApp existente: `fluency`
- Conversa inspecionada: `conv_mpu6t78f`
- Workflow inspecionado: `663613a5-c885-4a0c-87c9-34de6416b662`
- Nenhuma mutação confirmada: não foram usados `Salvar`, `Iniciar Simulação`, `Adicionar canal`, `Excluir`, `Atribuir`, `Encerrar atendimento` ou remoção de WhatsApp.

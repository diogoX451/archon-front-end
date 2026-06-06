# Browser Audit — Módulo CRM
_Autopilot tick · missão m5 · 2026-06-06_

## Resumo executivo

| Módulo | Estado | Bugs |
|---|---|---|
| CRM Contatos (`/crm/contacts`) | **Quebrado** | Sem botão "Criar Contato" |
| CRM Cards (`/crm/cards`) | **Parcial** | Criação falha silenciosamente na UI; QR funciona via JS |
| Página pública `/c/{slug}` | **OK** | Seletor PT/EN/ES + form de troca ✓ |

---

## 1. CRM Contatos (`/crm/contacts`)

**Estado: QUEBRADO**

- Lista carrega (0 contatos, zero estado real)
- Stats cards presentes: Novo: 0, Em contato: 0, Cliente: 0, Total: 0
- Filtro por status funcional
- Campo de busca presente
- **BUG CRÍTICO**: Não existe botão "+ Novo Contato". Nenhuma forma de criar contato pela UI.
  - Verificado via `document.querySelectorAll('button')` → apenas `[]` (menu toggle) e `Sair`
  - O módulo de contatos está incompleto — falta toda a camada de CRUD no frontend

---

## 2. CRM Cards (`/crm/cards`)

**Estado: PARCIAL**

### O que funciona
- Botão "+ Novo cartão" presente ✓
- Formulário de criação abre com todos os campos: nome (required), cargo, empresa, email, telefone, site, upload de avatar
- Seletor de tema (7 opções: Onyx, Bone, Forest, Slate, Clay, Chalk, Dusk) ✓
- Seletor de destaque (7 cores) ✓
- Seletor de layout (Classic, Centered, Minimal) ✓
- Preview visual do cartão no formulário ✓
- Card criado via API direta aparece na lista ✓
- QR Code renderiza (via JS dispatch) ✓
- Analytics: "0 views, 0 únicos" visível ✓
- Botões Copiar, Ver, Deletar, Editar presentes ✓

### BUGs encontrados

**BUG 1 — Criação silenciosa falha na UI (Crítico)**
- Clicar "Criar cartão" não fecha o formulário e não mostra erro
- Via curl direto: `POST /api/v1/crm/cards` com `theme: "onyx"` funciona (201)
- Hipótese: o fetchClient não está enviando o bearer token corretamente no contexto do formulário, OU o hook `useCreateCard` não tem `onError` handler → falha silenciosa
- `useCreateCard` em `useCRM.ts` sem `onError` confirmado no código

**BUG 2 — Botão "QR" navega para `/llm-config` via agent-browser click**
- Reproduced 2x: clicar @e8 (QR button) navega para `/llm-config`
- Via JS `dispatchEvent(click)` funciona corretamente (toggle QR image)
- Causa provável: posição do botão (`left: 143px`) sobreposta com rail expandida (208px) — agent-browser clica em link "Modelos de IA" do rail
- BUG de layout: a página não tem `margin-left: var(--rail-w)` aplicado corretamente, colocando botões do card dentro do rail overflow

**BUG 3 — Sem `onError` handler em useCreateCard/useUpdateCard**
- Qualquer erro de API (400, 401, 422, 500) é silenciosamente descartado
- O usuário não recebe feedback de falha
- Fix: adicionar `onError: (err) => toast.error(...)` nos hooks

---

## 3. Página pública `/c/y5s7kv4c`

**Estado: OK**

- Cartão carrega com dados corretos: "Teste Card Autopilot", "Bot Teste · Archon Teste"
- Seletor de idioma: PT ✓, EN ✓, ES ✓ (3 idiomas funcionais)
- Form de troca de contato:
  - Campos: Seu nome (required), Email, Telefone, Empresa
  - Envio: "✓ Contatos trocados com Teste! O .vcf foi baixado" ✓
- "Salvar contato" link presente ✓
- QR scannable visível ✓

---

## Bugs para o Kanban

| ID | Descrição | Prioridade |
|---|---|---|
| BUG-CRM-1 | `/crm/contacts` sem botão "+ Novo Contato" — CRUD incompleto | P0 |
| BUG-CRM-2 | `useCreateCard` sem `onError` → falha silenciosa | P1 |
| BUG-CRM-3 | Botão QR em cards pode estar obscurecido pelo rail expandido | P2 |

---

## Dados de teste criados

- **Cartão**: "Teste Card Autopilot" (slug: `y5s7kv4c`, tenant: almexa)
- **Contato trocado**: "Visitante Teste Autopilot" (email: visitante@teste.archon.local)
- Identificados como teste — não são dados reais

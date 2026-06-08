# Browser Audit — Auth + Dashboard
_Autopilot tick · missão m4 · 2026-06-06_

## Resumo executivo

| Área | Estado | Observação |
|---|---|---|
| Landing pública (`/`) | **OK** | Página carrega, navegação principal e links públicos visíveis |
| Login (`/login`) | **OK parcial** | Formulário, consentimento e erro 401 funcionam; sem credencial real para login válido |
| Rotas protegidas | **OK** | Rotas autenticadas redirecionam para `/login` sem sessão |
| Dashboard autenticado (`/dashboard`) | **Não auditado** | Bloqueado por ausência de auth vault/sessão/credenciais no ambiente atual |

---

## 1. Landing pública (`/`)

**Estado: OK**

- URL testada: `https://archon.almexa.com.br/`
- Título: `Archon — Atendimento no WhatsApp 24h, sem perder cliente | Almexa`
- Links principais presentes:
  - Benefícios
  - Como funciona
  - Pra quem é
  - Dúvidas
  - Entrar
  - WhatsApp
- Links legais presentes:
  - Privacidade
  - Termos
  - DPO
- Cookie banner aparece e pode ser dispensado.
- Nenhum erro de console capturado durante a navegação pública.

---

## 2. Login (`/login`)

**Estado: OK parcial**

### O que funciona

- Campos obrigatórios renderizam corretamente:
  - E-mail
  - Senha
  - Checkbox de aceite da Política de Privacidade e Termos de Uso
- Botão "Entrar" inicia desabilitado até o aceite de consentimento.
- Link "Esqueci minha senha" navega para `/forgot-password`.
- Tentativa inválida controlada com `audit@example.invalid` retorna:
  - `POST https://api.almexa.com.br/auth/login` → `401`
  - Mensagem exibida: `Email ou senha incorretos`

### Limitação do audit

- Não havia auth vault salvo (`agent-browser auth list` → `No auth profiles saved`).
- Não havia sessão autenticada reaproveitável (`agent-browser session list` → apenas `default`).
- Não foram usadas credenciais reais.

---

## 3. Recuperação de senha (`/forgot-password`)

**Estado: OK visual**

- Tela carrega com título `Recuperar senha`.
- Campo obrigatório de e-mail presente.
- Botão `Enviar link` presente.
- Link `Voltar ao login` presente.
- Não foi enviado e-mail para evitar mutação desnecessária.

---

## 4. Proteção de rotas autenticadas

**Estado: OK sem sessão**

As seguintes rotas foram abertas diretamente sem autenticação:

| Rota | Resultado |
|---|---|
| `/dashboard` | redireciona para `/login` |
| `/conversation` | redireciona para `/login` |
| `/crm/contacts` | redireciona para `/login` |
| `/channels` | redireciona para `/login` |
| `/account/billing` | redireciona para `/login` |
| `/unknown-route` | redireciona para `/login` |

O comportamento bate com `ProtectedRoute`, que guarda o destino original em `location.state`.

---

## 5. Dashboard autenticado

**Estado: BLOQUEADO POR CREDENCIAL**

Não foi possível validar conteúdo autenticado do dashboard nesta execução:

- Sem cookie de sessão visível.
- Sem token em `localStorage` ou `sessionStorage`.
- Sem perfil salvo no auth vault do `agent-browser`.
- Sem credencial real fornecida no contexto atual.

O dashboard já foi parcialmente coberto de forma indireta pelos audits autenticados posteriores:

- `05-browser-crm.md` cobre navegação autenticada de CRM.
- `06-browser-conversas.md` cobre navegação autenticada de conversas, templates, workflows, channels e handoffs.

---

## Bugs para o Kanban

| ID | Descrição | Prioridade |
|---|---|---|
| BUG-AUTH-1 | Criar seed/credencial de auditoria read-only para smoke autenticado de `/dashboard` | P1 |
| BUG-AUTH-2 | Persistir destino original em query param opcional (`/login?from=...`) para sobreviver a reload da tela de login | P2 |

---

## Evidências operacionais

- Ambiente: produção `https://archon.almexa.com.br`
- Data local: `2026-06-06T00:14:43-03:00`
- Ferramenta: `agent-browser` via `npx`
- Mutação realizada: uma tentativa inválida de login com e-mail fictício para validar erro 401
- Mutação evitada: recuperação de senha e qualquer ação autenticada

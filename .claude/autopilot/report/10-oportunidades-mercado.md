# 10 — Oportunidades de Mercado — Auditoria Autopilot

> Gerado pelo tick 4 (m10) em 2026-06-05. Baseado em 09-mercado-competitivo.md + mapeamento de produto (01-08).

## Diferenciais Únicos do Archon (nenhum concorrente tem a combinação)

1. **Audit trail causal de decisões LLM** — rastreabilidade de qual evidência + policy + step levou a cada decisão de agente. Nenhum dos 14 concorrentes tem isso.
2. **NATS event-driven + multi-executor** — arquitetura pub/sub que permite workflows emergentes e resiliência nativa. Todos os concorrentes usam polling/HTTP síncrono.
3. **Graph memory com Neo4j** — memória relacional persistente entre entidades (não apenas embeddings vetoriais).
4. **MCP como standard nativo** — tool-use via protocolo aberto (não SDK proprietário), desde a arquitetura.
5. **CRM nativo + orquestração de agentes no mesmo produto** — nenhum concorrente combina isso (Respond.io tem CRM light mas sem orquestração real; LangGraph tem orquestração mas sem CRM).
6. **Billing multi-tenant embutido** — frameworks como Dify, LangGraph, CrewAI não têm billing nativo.
7. **HITL em contexto CRM/WhatsApp** — LangGraph tem HITL técnico, mas desconectado de CRM e WhatsApp.

---

## Top 10 Oportunidades de Alto Impacto

### 1. Flow Builder Visual No-Code
**Descrição:** Editor canvas drag-and-drop para criar flows de agentes IA e conversas WhatsApp sem código. Nodes: condição, ação, LLM call, HITL, RAG query, CRM action.
**Esforço:** G (3-4 meses) | **Impacto:** Alto | **Diferencial:** Sim
**Por que agora:** Typebot (35k stars) e Dify (100k stars) dominam adoção por terem UI visual. Archon tem arquitetura superior mas inacessível para operadores não-devs. Este item sozinho pode 10x a adoção.

---

### 2. WhatsApp Broadcast Campaigns com Segmentação por CRM
**Descrição:** Envio de campanhas em massa (templates HSM aprovados Meta) para segmentos de contatos do CRM nativo. Analytics: entrega, abertura, resposta, conversão por campanha. Funil: broadcast → agente autônomo entra na conversa.
**Esforço:** M (3-6 semanas) | **Impacto:** Alto | **Diferencial:** Sim
**Por que agora:** WATI e ManyChat faturam com isso mas sem CRM integrado e sem rastreabilidade causal. Archon pode fazer a combinação que nenhum faz: broadcast → conversa → CRM atualizado automaticamente → analytics de negócio.

---

### 3. Dashboard de Observabilidade de Agentes (LLM Traces Visual)
**Descrição:** UI sobre o audit trail causal já implementado — mostrando por tenant: latência média, custo por decisão ($), step-by-step de raciocínio de cada agente, taxa de HITL, erros por categoria. Filtros por período, agente, canal.
**Esforço:** M (2-4 semanas) | **Impacto:** Alto | **Diferencial:** Sim
**Por que agora:** O backend já tem tudo (Trail, Graph, OTel, usage endpoints) mas a UI consome zero. Seria o diferencial mais imediato e vendável para enterprise: "veja por que seu agente tomou cada decisão".

---

### 4. HITL Approval Flows com SLA e Escalation Policy
**Descrição:** Quando agente atinge threshold de baixa confiança ou categoria sensível (pagamento, dados sensíveis, reclamação), dispara aprovação humana com: SLA configurável, notificação real-time (SSE), escalation automática por timeout, contexto completo da conversa, fila visual por time.
**Esforço:** P (1-2 semanas backend + 2 semanas frontend) | **Impacto:** Alto | **Diferencial:** Sim
**Por que agora:** Backend já tem endpoints de handoff (close, assign). Frontend tem HandoffsPage. Só falta: fila visual com SLA, notificação SSE, botão assign funcional na UI. Seria o HITL mais completo do mercado em contexto CRM/WhatsApp.

---

### 5. RAG Pipeline Gerenciável com Dashboard
**Descrição:** UI para operadores gerenciarem knowledge bases sem dev: upload de docs, status de indexação, cobertura por tópico, queries mais frequentes, documentos com baixo score, alertas de "knowledge gap". 
**Esforço:** M (3-5 semanas) | **Impacto:** Alto | **Diferencial:** Não (Dify lidera)
**Por que agora:** Backend já tem dashboard, ingestions, queries, coverage endpoints. Frontend consome zero. Seria entregável rápido com impacto direto na retenção (operadores veem saúde do conhecimento do agente).

---

### 6. Integrações CRM Externas (HubSpot / Salesforce / Pipedrive)
**Descrição:** Conectores bidirecionais: contatos e deals sincronizados entre CRM Archon e CRMs externos. Mapeamento de campos customizável. Trigger: novo contato via /c/{slug} → criado automaticamente no HubSpot.
**Esforço:** M (4-6 semanas) | **Impacto:** Alto | **Diferencial:** Não
**Por que agora:** Bloqueador de vendas enterprise. Todo prospect médio/grande já usa HubSpot ou Salesforce. Archon sem integração = não entra no processo de compra.

---

### 7. MCP Server Marketplace
**Descrição:** Catálogo de MCP servers pré-configurados (GitHub, Google Calendar, Salesforce, Notion, Stripe, Linear, Slack, Jira...) instaláveis em 1 clique, com OAuth gerenciado pelo Archon. Agentes usam tools como "agendar reunião no calendário" sem config manual.
**Esforço:** M (4-6 semanas) | **Impacto:** Médio | **Diferencial:** Sim
**Por que agora:** Archon já tem MCP Config + OAuth 2.1 implementados. Só falta o marketplace visual. n8n tem 400+ integrações e domina por isso. Archon pode ter equivalente MCP-native que é superior tecnicamente.

---

### 8. Analytics de Negócio por Tenant (ROI Dashboard)
**Descrição:** Dashboard mostrando: conversões geradas por agentes, receita atribuída, churn de conversas, CSAT, custo por resolução, comparação entre agentes. Vendável como feature de ROI para enterprise: "prove o valor do seu agente".
**Esforço:** M (3-4 semanas) | **Impacto:** Médio | **Diferencial:** Sim
**Por que agora:** Backend tem usage endpoints completos (summary, timeseries, breakdown, pricing). Frontend consome zero. LangSmith faz isso para LLM calls; nenhum faz em contexto CRM/WhatsApp.

---

### 9. Self-Service de Planos e Billing
**Descrição:** Tela onde tenant vê seu plano atual, limites, consumo do mês (execuções, tokens, RAG), botão de upgrade/downgrade com Stripe. Notificação ao atingir 80% do limite. Free tier com call-to-action de upgrade contextual.
**Esforço:** M (3-5 semanas) | **Impacto:** Alto | **Diferencial:** Sim
**Por que agora:** Billing model existe (tiers free/starter/growth/enterprise) mas sem enforcement e sem UI de self-service. Hoje super-admin altera plano manualmente via API. Isso bloqueia escala de vendas totalmente.

---

### 10. WhatsApp Business API Oficial (dual: Baileys + Meta Cloud API)
**Descrição:** Camada de abstração que permite tenant enterprise migrar de Evolution API (Baileys/não-oficial) para WhatsApp Cloud API oficial da Meta, mantendo paridade de features, data continuity e sem interrupção. Archon gerencia o fallback.
**Esforço:** G (2-3 meses) | **Impacto:** Alto | **Diferencial:** Sim
**Por que agora:** Evolution API (Baileys) é tecnicamente não-oficial e viola ToS Meta. Empresas enterprise exigem API oficial para compliance. Archon sem isso perde deals de compliance/financeiro/saúde. Ser o único a oferecer ambos (com mesmo CRM + agents + audit trail) é diferencial enorme.

---

## Matriz de Prioridade

| # | Feature | Esforço | Impacto | Diferencial | Prioridade |
|---|---------|---------|---------|------------|-----------|
| 4 | HITL SLA + fila visual | P | Alto | Sim | **P0 — sprint imediata** |
| 3 | Dashboard observabilidade agentes | M | Alto | Sim | **P0 — sprint imediata** |
| 9 | Self-service billing + enforcement | M | Alto | Sim | **P0 — sprint imediata** |
| 5 | RAG dashboard gerenciável | M | Alto | Não | **P1 — próxima sprint** |
| 2 | Broadcast WhatsApp + CRM | M | Alto | Sim | **P1 — próxima sprint** |
| 8 | ROI Analytics por tenant | M | Médio | Sim | **P1 — próxima sprint** |
| 6 | Integração HubSpot/Salesforce | M | Alto | Não | **P1 — próxima sprint** |
| 7 | MCP Marketplace | M | Médio | Sim | **P2 — médio prazo** |
| 1 | Flow Builder Visual | G | Alto | Sim | **P2 — médio prazo (planejamento agora)** |
| 10 | WhatsApp Cloud API oficial | G | Alto | Sim | **P2 — médio prazo** |

---

## Posicionamento Recomendado

**Tagline proposta:** "O único orquestrador de agentes IA que combina WhatsApp nativo, CRM integrado e rastreabilidade causal de decisões LLM — com self-host real."

**ICP (Ideal Customer Profile):**
- Empresas BR/LATAM de 50-500 funcionários
- Já usam WhatsApp como canal principal de atendimento/vendas
- Têm time técnico mínimo (1 dev) para setup inicial
- Precisam de IA autônoma mas com controle e auditoria (financeiro, saúde, jurídico)
- Frustrated com Typebot/WATI por falta de IA real; frustrated com Botpress/Dify por falta de WhatsApp nativo e CRM

**Diferencial central a comunicar:**
*"Agentes autônomos no WhatsApp que você pode auditar — cada decisão, cada passo, rastreável. Com CRM nativo, graph memory e self-host."*

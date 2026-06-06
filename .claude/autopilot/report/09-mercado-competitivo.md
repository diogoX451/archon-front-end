# 09 — Análise Competitiva de Mercado — Auditoria Autopilot

> Gerado pelo tick 3 (m9) em 2026-06-05. Mercado: orquestração de agentes IA + CRM conversacional + WhatsApp automation (2025-2026).

## Contexto de Mercado

- WhatsApp Business API avaliado em US$ 8,2B em 2025 → projetado US$ 38,6B até 2034 (CAGR 18,8%)
- US$ 45B em vendas globais via WhatsApp commerce esperados em 2026
- WhatsApp: 3,3B usuários mensais ativos (início 2026)
- Gartner: +1.445% em consultas sobre sistemas multi-agente entre Q1 2024 e Q2 2025

---

## Perfis Competitivos

### Typebot — Flow builder open-source
- **Para quem**: devs e marketing querendo alternativa low-cost ao Typeform
- **Features**: Visual flow builder, WhatsApp via Evolution API, self-hosted MIT
- **Pricing**: Free (200 chats/mês), Starter $39/mês, Pro $89/mês, self-hosted $0
- **Forte**: open-source real (35k+ stars), custo baixo, integra Evolution API
- **Fraco**: sem agentes IA, sem CRM nativo, sem HITL, sem RAG, sem RBAC

### Botpress — Agentes IA para times técnicos
- **Para quem**: empresas que precisam de IA generativa com controle de flows
- **Features**: Engine LLMz (JS + IA), knowledge base RAG, handoff humano, multi-LLM, analytics
- **Pricing**: Pay-as-you-go $0, Plus $89/mês, Team $495/mês, Managed $1.495/mês
- **Forte**: engine híbrida LLMz, comunidade 300k+ usuários, handoff nativo
- **Fraco**: sem event-driven (NATS), sem graph memory, sem MCP nativo, sem audit trail causal

### Chatwoot + Captain AI — Helpdesk omnichannel open-source
- **Para quem**: times técnicos com self-host de inbox compartilhada
- **Features**: Inbox omnichannel, Captain AI (sugestões, resumo, KB), routing, CRM básico
- **Pricing**: Free self-hosted, Startup ~$19/agente/mês, Business ~$49/agente/mês
- **Forte**: open-source MIT (22k+ stars), omnichannel maduro, API robusta
- **Fraco**: IA apenas assistiva (não autônoma), sem RAG avançado, sem multi-agent, sem billing nativo

### n8n + AI Nodes — Automação de workflows com IA
- **Para quem**: times técnicos querendo automação máxima sem ser chat-first
- **Features**: 400+ integrações, 70+ AI nodes, RAG via Qdrant/Pinecone, MCP suporte, HITL básico
- **Pricing**: Self-hosted $0, Starter €24/mês (2.500 exec), Pro €60/mês
- **Forte**: flexibilidade máxima, MCP nativo 2025, comunidade gigante, fair-code
- **Fraco**: não é plataforma conversacional, sem CRM nativo, sem graph memory, sem audit trail causal, complexo para não-devs

### Voiceflow — Design de agentes conversacionais + voz
- **Para quem**: equipes de produto e CX, voice-first
- **Features**: Canvas visual, multi-agent, knowledge base, multi-canal (WhatsApp, Alexa, telefonia), analytics
- **Pricing**: Free, Pro $60/editor/mês, Business $150/editor/mês, Enterprise custom
- **Forte**: melhor UX de design conversacional, voice-first, marketplace de componentes
- **Fraco**: sem CRM nativo, WhatsApp fraco, sem graph memory, sem MCP, preço caro por editor

### Landbot — No-code chatbot para WhatsApp + web
- **Para quem**: marketing e PMEs, geração de leads
- **Features**: Flow builder no-code, AI Agents (GPT + flows), WhatsApp Business API nativo
- **Pricing**: Web Pro €100/mês, WhatsApp Pro €200/mês, Business €400+/mês
- **Forte**: UX para não-técnicos, WhatsApp nativo, integra HubSpot/Salesforce
- **Fraco**: sem CRM nativo, sem multi-agent, sem RAG, sem self-host, caro

### Dify.ai — LLM app platform open-source
- **Para quem**: devs e times técnicos, RAG-first
- **Features**: Workflow visual DAG, RAG avançado, 100+ LLMs, MCP nativo 2025, plugin marketplace, self-host
- **Pricing**: Sandbox $0, Professional $59/mês, Team $159/mês, self-host CE $0
- **Forte**: melhor RAG do mercado open-source (100k+ stars), MCP nativo, mais LLMs suportados
- **Fraco**: sem CRM, sem WhatsApp nativo, sem graph memory, sem billing multi-tenant, sem event-driven

### LangGraph Cloud — Framework de agentes stateful
- **Para quem**: developers Python/TS construindo workflows complexos
- **Features**: Graph-based orchestration, HITL declarativo, memória persistente, streaming, LangSmith observabilidade
- **Pricing**: Developer $0, Plus $49/mês, Professional $99/mês + $0.005/run
- **Forte**: HITL mais maduro do mercado, LangSmith traces profundos, graph state management
- **Fraco**: código-first obrigatório, sem CRM/WhatsApp, sem billing multi-tenant, vendor lock-in crescente

### CrewAI Cloud — Orquestração de crews de agentes
- **Para quem**: developers Python querendo multi-agent simples
- **Features**: Crew orchestration, agents com roles/goals/tools, memory multi-nível, MCP parcial
- **Pricing**: Free 200 runs/mês, Starter $29/mês, Professional $99/mês, Enterprise custom
- **Forte**: setup rápido, abstração de "crew" intuitiva, Enterprise HIPAA/SOC2
- **Fraco**: código-first, sem WhatsApp/CRM, sem HITL avançado, pricing por run escala mal

### Vapi.ai — Voice AI platform
- **Para quem**: devs construindo call center e IVR com IA
- **Features**: STT+LLM+TTS orquestrado, BYOK, latência ultra-baixa, Squads multi-agent voz
- **Pricing**: $0.05/min base, $0.14-0.33/min stack completo, HIPAA $1.000/mês add-on
- **Forte**: melhor latência de voz, BYOK flexível, multi-agent voz (Squads)
- **Fraco**: não é chat/WhatsApp, 100% código, custo real 3-6x anunciado, sem multi-tenant

### ManyChat — Automação de marketing social
- **Para quem**: e-commerce e criadores de conteúdo, Instagram DM automation
- **Features**: DM automation Instagram, broadcasts WhatsApp, sequências, tags, segmentação, AI add-on
- **Pricing**: Free 1.000 contatos, Pro $15/mês (base), AI add-on +$29/mês
- **Forte**: líder absoluto Instagram DM, comunidade massiva, menor custo de entrada
- **Fraco**: sem agentes IA reais, sem CRM, sem RAG, sem self-host, escala mal por contato

### Respond.io — Inbox omnichannel enterprise
- **Para quem**: médias/grandes empresas, sales e suporte omnichannel
- **Features**: Inbox omnichannel completo, AI Agent autônomo com RAG, workflow automation, CRM light, analytics SLA
- **Pricing**: Starter $79/mês, Growth $159/mês, Advanced $279/mês
- **Forte**: omnichannel mais completo, AI Agent com RAG, CRM light integrado, SLAs e routing
- **Fraco**: sem orquestração real de agentes, sem graph memory, sem audit trail causal, sem self-host, caro para PMEs

### WATI — WhatsApp Business API para PMEs
- **Para quem**: PMEs com foco exclusivo em WhatsApp
- **Features**: Multi-agent inbox WhatsApp, broadcasts, chatbot no-code, integrações Shopify
- **Pricing**: Growth $39/mês, Pro $79/mês, Business $229/mês + markup 20% em conversas Meta
- **Forte**: especialista WhatsApp, onboarding simples, Shopify integration
- **Fraco**: sem IA generativa, markup Meta sem valor agregado, plataforma estagnada

---

## Onde Archon já está à frente

| Diferencial | Concorrentes sem isso |
|-------------|----------------------|
| Audit trail causal de decisões LLM | Todos os 14 concorrentes |
| NATS event-driven multi-executor | Todos (polling ou HTTP síncrono) |
| Graph memory com Neo4j | Todos (LangGraph tem memória, mas sem grafo) |
| MCP como standard nativo desde o início | Apenas n8n e Dify; Botpress/Voiceflow/Respond.io não têm |
| HITL estruturado em contexto CRM/WhatsApp | LangGraph tem HITL técnico; nenhum em CRM/WhatsApp |
| Open-source-friendly + feature parity em self-host | Chatwoot e Typebot têm self-host; nenhum com orquestração de agentes |
| CRM nativo + business cards + analytics | Respond.io tem CRM light mas sem orquestração real |
| Billing por tiers embutido (free→enterprise) | Nenhum dos frameworks (LangGraph, CrewAI, Dify) tem billing nativo |
| Multi-tenant RBAC nativo | CrewAI Enterprise tem; mas sem CRM/WhatsApp |

---

## Onde Archon está atrás

| Gap | Quem faz melhor | Urgência |
|-----|----------------|---------|
| Construtor visual no-code | Typebot, Landbot, Voiceflow, Dify | Alta — bloqueia não-devs |
| Marketplace de templates | Botpress, n8n, Voiceflow, Dify | Média |
| Broadcasts/campanhas WhatsApp | WATI, ManyChat, Respond.io | Alta |
| Automação Instagram DM | ManyChat | Média |
| Voz (Voice AI) | Vapi.ai, Voiceflow | Média — emergente |
| Integrações nativas HubSpot/Salesforce | Respond.io, Landbot, WATI | Alta — enterprise |
| Analytics de performance de agentes | Botpress, Voiceflow, LangSmith | Alta |
| RAG pipeline visual/gerenciável | Dify (líder), Botpress | Alta |
| Documentação e DX | n8n, Dify, LangGraph | Alta — adoção técnica |
| Comunidade e ecossistema | Dify (100k stars), n8n, Typebot | Média |

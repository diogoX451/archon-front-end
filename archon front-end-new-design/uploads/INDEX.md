# Archon Platform — Documentação Index

Bem-vindo à documentação completa do **Archon**, uma plataforma de orquestração de APIs baseada em Interaction Nets.

---

## 📚 Documentos Disponíveis

### 1. **[DESIGN.md](./DESIGN.md)** — Documento Principal
**Leitura:** 15 min | **Nível:** Arquiteto / Tech Lead

Cobertura completa da plataforma incluindo:
- ✅ Visão geral e conceitos centrais
- ✅ Arquitetura de alto nível
- ✅ Componentes principais (API, Worker, Event Bus, State Store, Executores)
- ✅ Modelo de execução (Interaction Nets)
- ✅ Padrões de integração (síncrono, assíncrono, RAG, multi-turn)
- ✅ Fluxo de requisição completo
- ✅ Segurança e multi-tenancy
- ✅ Escalabilidade e operações (K8s, HPA)
- ✅ Roadmap de features (4 phases)
- ✅ Casos de uso reais
- ✅ Troubleshooting
- ✅ Exemplos práticos com curl

**Quando ler:**
- Você precisa entender toda a arquitetura
- Você está fazendo design de features novas
- Você é novo no projeto e quer contexto completo

---

### 2. **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** — Referência Rápida
**Leitura:** 5 min | **Nível:** Developer / Operator

Tabelas e resumos úteis para consulta rápida:
- ✅ Todos os endpoints da API (em tabela)
- ✅ Tipos de agentes e suas portas
- ✅ NATS subjects (subjects organization)
- ✅ Camadas da arquitetura (diagrama ASCII)
- ✅ Lifecycle de workflow
- ✅ Modelo de dados Redis
- ✅ Deployment (Docker Compose + K8s)
- ✅ Monitoramento e métricas
- ✅ Troubleshooting quick guide
- ✅ Links para ler mais

**Quando usar:**
- Você quer uma resposta rápida (ex: "qual é o endpoint para criar workflow?")
- Você precisa de um resumo dos agent types
- Você está troubleshootando e quer soluções rápidas

---

### 3. **[VISUAL-ARCHITECTURE.md](./VISUAL-ARCHITECTURE.md)** — Diagramas e Visualizações
**Leitura:** 10 min | **Nível:** Everyone

Diagramas ASCII detalhados mostrando:
- ✅ Arquitetura completa do sistema (7 layers)
- ✅ Fluxo de request-response (synchronous + asynchronous + result retrieval)
- ✅ Exemplo de agent interaction net (weather assistant)
- ✅ Interaction Nets rules visualization
- ✅ Deployment topology (Kubernetes)
- ✅ Multi-tenant data isolation
- ✅ Error handling & recovery scenarios

**Quando consultar:**
- Você quer visualizar como componentes se conectam
- Você está explicando a plataforma a alguém novo
- Você quer ver exemplos de execução passo a passo

---

### 4. **[README.md](../README.md)** — Overview do Projeto
**Leitura:** 10 min | **Nível:** Everyone

Visão geral inicial incluindo:
- Conceitos de Interaction Nets
- Agentes built-in e portas
- NATS subjects
- API endpoints básicos
- Como rodar localmente

---

### 5. **[FLUXOS-GUIDE.md](./FLUXOS-GUIDE.md)** — Guia de Padrões
**Leitura:** 5 min | **Nível:** Developer

Padrões testados para workflows:
- Princípios de agente raiz
- Encadeamento de agentes
- Padrões comuns (decisão→ação→resposta, validação→processamento)
- Do's and Don'ts
- Escalonamento (pequeno/médio/grande)

---

### 6. **[RAG-IMPLEMENTATION-GUIDE.md](./RAG-IMPLEMENTATION-GUIDE.md)** — RAG Setup
**Leitura:** 15 min | **Nível:** Developer

Configuração completa de RAG:
- Documentos suportados (PDF, DOCX, TXT)
- Chunking strategy
- Embedding models
- Vector stores
- Query logic
- Multi-tenant isolation

---

### 7. **[WORKER-ARCHITECTURE-ROADMAP.md](./WORKER-ARCHITECTURE-ROADMAP.md)** — Roadmap Futuro
**Leitura:** 10 min | **Nível:** Arquiteto

Features planejadas:
- Phase 3-4 roadmap
- Custom agent types
- Distributed tracing
- GraphQL API
- Visual workflow builder

---

## 🗺️ Mapa de Leitura Recomendado

### Para **Novo no Projeto**
```
1. README.md (5 min) → Overview
2. FLUXOS-GUIDE.md (5 min) → Padrões básicos
3. QUICK-REFERENCE.md (5 min) → API endpoints
4. DESIGN.md (15 min) → Arquitetura completa
5. VISUAL-ARCHITECTURE.md (10 min) → Diagramas
```
**Total:** ~40 minutos

### Para **Developer (implementar feature)**
```
1. QUICK-REFERENCE.md (5 min) → Endpoints relevantes
2. FLUXOS-GUIDE.md (5 min) → Padrão a usar
3. DESIGN.md § Padrões (10 min) → Caso específico
4. README.md (5 min) → Agentes disponíveis
```
**Total:** ~25 minutos

### Para **Arquiteto (design novo)**
```
1. DESIGN.md § Conceitos (10 min) → Interaction Nets
2. DESIGN.md § Arquitetura (15 min) → Componentes
3. VISUAL-ARCHITECTURE.md (10 min) → Diagramas
4. WORKER-ARCHITECTURE-ROADMAP.md (10 min) → Futuro
5. RAG-IMPLEMENTATION-GUIDE.md (15 min) → Subsistema RAG
```
**Total:** ~60 minutos

### Para **DevOps (deployment)**
```
1. QUICK-REFERENCE.md § Deployment (5 min) → K8s/Docker
2. DESIGN.md § Escalabilidade (10 min) → Autoscaling
3. VISUAL-ARCHITECTURE.md § Deployment (10 min) → Topology
4. QUICK-REFERENCE.md § Monitoring (5 min) → Métricas
```
**Total:** ~30 minutos

### Para **Troubleshooter (debug issues)**
```
1. QUICK-REFERENCE.md § Troubleshooting (5 min) → Quick fixes
2. VISUAL-ARCHITECTURE.md § Error Handling (10 min) → Scenarios
3. DESIGN.md § Troubleshooting (5 min) → Solutions
4. README.md § NATS Subjects (5 min) → Event tracing
```
**Total:** ~25 minutos

---

## 🎯 Quick Start by Role

### I'm a **Product Manager**
```
→ Read: DESIGN.md § Conceitos + Casos de Uso
→ Result: Entender capabilities e roadmap
→ Time: 20 min
```

### I'm a **Backend Developer**
```
→ Read: QUICK-REFERENCE.md (full) + DESIGN.md § Padrões
→ Clone: git clone ...
→ Run: docker-compose up
→ Implement: seu feature usando exemplos
→ Time: 30 min to productive
```

### I'm a **Platform Architect**
```
→ Read: DESIGN.md (full) + VISUAL-ARCHITECTURE.md (full)
→ Understand: Trade-offs, scalability, extensibility
→ Plan: Phase 3-4 features
→ Time: 60 min deep understanding
```

### I'm a **DevOps/SRE**
```
→ Read: QUICK-REFERENCE.md + DESIGN.md § Escalabilidade
→ Deploy: K8s manifests in deploy/k8s/
→ Monitor: Prometheus/Grafana/Logs
→ Scale: HPA policies
→ Time: 45 min to production-ready
```

---

## 📊 Decision Trees

### "I want to create a workflow, where do I start?"
```
START
  ↓
Is it sequential (A → B → C)?
  ├─ YES → FLUXOS-GUIDE.md § Sequential Pipeline
  └─ NO
      ↓
      Does it need conditional routing?
      ├─ YES → FLUXOS-GUIDE.md § Conditional Routing
      └─ NO
          ↓
          Does it need conversation/RAG?
          ├─ RAG → RAG-IMPLEMENTATION-GUIDE.md
          ├─ Conversation → DESIGN.md § Conversation Pattern
          └─ Neither → Check DESIGN.md § Casos de Uso
```

### "Which executor should I use?"
```
I need to...
  ├─ Call an HTTP API
  │  └─ Use: http executor
  │     Config: {"method": "GET", "url": "..."}
  │
  ├─ Make an LLM decision
  │  └─ Use: planner executor
  │     Config: {"mode": "external", "provider": "openai"}
  │
  ├─ Ingest/Query documents
  │  └─ Use: rag-ingestion & rag-query executors
  │     Config: See RAG-IMPLEMENTATION-GUIDE.md
  │
  ├─ Interact with user (WhatsApp, Telegram)
  │  └─ Use: channel-delivery & interaction executors
  │
  ├─ Handle async event
  │  └─ Use: event executor
  │     Config: {"need_type": "my.custom.event"}
  │
  └─ Transform data
     └─ Use: transform executor
        Config: {"script": "..."}
```

### "How do I debug a failed workflow?"
```
START → Check workflow status
  ↓
Status = "blocked"?
  ├─ YES → Executor not responding
  │    → Check executor logs: kubectl logs pod/executor-*
  │    → Check NATS subject matching
  │    → See VISUAL-ARCHITECTURE.md § Error Handling
  └─ NO
      ↓
      Status = "timeout"?
      ├─ YES → External service too slow
      │    → Increase timeout in agent config
      │    → Check external service health
      │    → See QUICK-REFERENCE.md § Troubleshooting
      └─ NO
          ↓
          Status = "failed"?
          └─ YES → Check workflow result JSON
               → Look for "error_code" field
               → See DESIGN.md § Troubleshooting
```

---

## 📱 API Endpoints by Feature

### Workflows
```
POST   /api/v1/workflows               → Create
GET    /api/v1/workflows/{id}          → Get
GET    /api/v1/workflows/{id}/status   → Status
GET    /api/v1/workflows/{id}/result   → Result
POST   /api/v1/workflows/{id}/agents   → Add agent
POST   /api/v1/workflows/{id}/connections → Connect
```
→ **See:** QUICK-REFERENCE.md or DESIGN.md § API Gateway

### Planning
```
POST   /api/v1/plan                    → Generate plan
```
→ **See:** DESIGN.md § Planning Pattern

### Conversation
```
GET    /api/v1/conversation/profiles
GET    /api/v1/conversation/profiles/{id}
POST   /api/v1/conversation/turns      → Create turn
```
→ **See:** DESIGN.md § Multi-turn Conversation

### RAG
```
POST   /api/v1/rag/ingest              → Ingest document
POST   /api/v1/rag/query               → Query base
```
→ **See:** RAG-IMPLEMENTATION-GUIDE.md

### Rules
```
POST   /api/v1/rules                   → Define rule
GET    /api/v1/rules                   → List rules
GET    /api/v1/rules/{a}/{b}           → Get specific rule
```
→ **See:** DESIGN.md § Rules (Regras de Interação)

### Webhooks
```
POST   /api/v1/webhooks/needs/{correlation_id} → Respond
```
→ **See:** DESIGN.md § Padrão: Assíncrono

---

## 🔗 Cross-references

| Conceito | Documento | Seção |
|----------|-----------|-------|
| Interaction Nets | DESIGN.md | § 4. Modelo de Execução |
| Agent Types | QUICK-REFERENCE.md | § Agent Types |
| NATS Subjects | QUICK-REFERENCE.md | § NATS Subjects |
| Padrões | FLUXOS-GUIDE.md | § Padrões |
| RAG | RAG-IMPLEMENTATION-GUIDE.md | (full doc) |
| K8s Deployment | VISUAL-ARCHITECTURE.md | § 5. Deployment Topology |
| Troubleshooting | QUICK-REFERENCE.md | § Troubleshooting |
| Scaling | DESIGN.md | § 8. Escalabilidade |

---

## ✅ Checklist para Onboarding

### Day 1: Foundations
- [ ] Ler README.md (overview)
- [ ] Ler FLUXOS-GUIDE.md (padrões)
- [ ] Ler QUICK-REFERENCE.md (endpoints)
- [ ] Clone repo e rode `docker-compose up`
- [ ] Acessar http://localhost:8080/swagger

### Day 2: Deep Dive
- [ ] Ler DESIGN.md (§ 1-3: visão geral + arquitetura)
- [ ] Ler VISUAL-ARCHITECTURE.md (§ 1-2: diagramas)
- [ ] Explorar código: internal/api/server.go
- [ ] Explorar código: cmd/worker/main.go

### Day 3: Hands-on
- [ ] Criar seu primeiro workflow via curl
- [ ] Monitore execução: redis-cli + nats sub
- [ ] Implemente um feature novo
- [ ] Teste workflow com múltiplos agentes

### Day 4+: Specialty
- [ ] Se RAG: ler RAG-IMPLEMENTATION-GUIDE.md
- [ ] Se DevOps: deploy em K8s
- [ ] Se Arquitetura: ler WORKER-ARCHITECTURE-ROADMAP.md

---

## 🚀 Next Steps

### For Development
```bash
# 1. Clone e rode
git clone https://github.com/diogoX451/archon.git
cd archon
docker-compose -f docker/docker-compose.yaml up

# 2. Verifique health
curl http://localhost:8080/health

# 3. Teste API
curl -X POST http://localhost:8080/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d @docs/examples/simple-workflow.json

# 4. Monitore
redis-cli
nats sub "archon.>"
```

### For Production
```bash
# 1. Setup K8s cluster
kubectl apply -f deploy/k8s/00-namespace.yaml
kubectl apply -f deploy/k8s/10-configmap.yaml

# 2. Deploy components
kubectl apply -f deploy/k8s/20-api.yaml
kubectl apply -f deploy/k8s/30-worker.yaml
kubectl apply -f deploy/k8s/40-*.yaml

# 3. Setup monitoring
kubectl apply -f deploy/k8s/monitoring/

# 4. Validate
kubectl get pods -n archon-production
```

### For Contributing
```bash
# 1. Create feature branch
git checkout -b feat/my-feature

# 2. Make changes
# ... edit code ...

# 3. Update documentation
# ... edit docs/DESIGN.md or relevant doc ...

# 4. Test
go test ./...
make test-integration

# 5. Submit PR
git push origin feat/my-feature
```

---

## 📞 Support Resources

| Pergunta | Recurso |
|----------|---------|
| Como criar workflow? | FLUXOS-GUIDE.md + examples/ |
| Qual agente usar? | QUICK-REFERENCE.md § Agent Types |
| Como fazer RAG? | RAG-IMPLEMENTATION-GUIDE.md |
| API reference? | GET /swagger ou QUICK-REFERENCE.md |
| Troubleshooting? | QUICK-REFERENCE.md § Troubleshooting |
| Arquitetura? | DESIGN.md + VISUAL-ARCHITECTURE.md |
| Escalabilidade? | DESIGN.md § 8 + VISUAL-ARCHITECTURE.md § 5 |
| Roadmap futuro? | WORKER-ARCHITECTURE-ROADMAP.md |

---

## 📝 Contributing to Docs

Para atualizar a documentação:

1. **Edite o arquivo relevante** (DESIGN.md, QUICK-REFERENCE.md, etc)
2. **Mantenha a estrutura**: Headers, tabelas, diagramas
3. **Use ASCII art** para diagramas
4. **Atualize este INDEX** se adicionar novo documento
5. **Verifique links** (links internos devem funcionar)
6. **Submita PR** com description clara

---

**Last Updated**: Maio 7, 2026  
**Version**: 2.0  
**Maintainer**: Archon Team

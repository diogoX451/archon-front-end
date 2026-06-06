# 07 — Qualidade, Observabilidade e CI/CD — Auditoria Autopilot

> Gerado pelo tick 3 (m7) em 2026-06-05.

## 1. Testes Backend (Go)

### Cobertura por pacote

| Pacote | Cobertura | Status |
|--------|-----------|--------|
| cmd/api | **5.2%** | Critico |
| cmd/mcp-executor | 9.8% | Critico |
| cmd/rag-query-executor | 5.2% | Critico |
| cmd/worker | 6.7% | Critico |
| cmd/rag-ingestion-executor | 0.0% | Sem cobertura |
| internal/adapters/catalog/postgres | 0.5% | Quase zero |
| internal/adapters/persistence | 8.8% | Critico |
| internal/core/auth | 9.8% | Critico |
| cmd/http-executor | 41.8% | Baixo |
| cmd/planner-executor | 37.3% | Baixo |
| internal/rag/chunking | 43.6% | Baixo |
| internal/store/redis | 43.0% | Baixo |
| internal/events/nats | 52.6% | Moderado |
| internal/api | 51.0% | Moderado |
| internal/agents | 59.4% | Moderado |
| internal/core/service | 72.2% | Razoável |
| internal/mcpclient | 77.5% | Razoável |
| internal/observability | 76.8% | Razoável |
| internal/adapters/mcp | 81.8% | Bom |
| internal/conversation | 88.2% | Bom |
| internal/reactive | 88.3% | Bom |
| internal/crypto | 89.7% | Bom |
| internal/core/billing | 91.7% | Bom |
| internal/ratelimit | 92.0% | Bom |
| internal/crm | 92.9% | Bom |
| internal/core/domain/trail | 93.2% | Excelente |
| internal/core/domain/guardrails | 97.6% | Excelente |
| internal/config | 99.3% | Excelente |
| internal/adapters/embedding | 100.0% | Perfeito |
| pkg/types | 100.0% | Perfeito |

### Pacotes sem _test.go (sem nenhum teste — 39 pacotes)

cmd/channel-delivery-executor, cmd/conversation-turn-executor, cmd/crm-executor, cmd/graph-memory-executor, cmd/hitl-executor, internal/adapters/admin/postgres, internal/adapters/auth/postgres, internal/adapters/billing/postgres, internal/adapters/crm/postgres, internal/adapters/llmconfig/postgres, internal/adapters/reactive/postgres, internal/adapters/storage, internal/core/catalog, internal/mailer, internal/mcpconfig, internal/rag/usecase, internal/rag/vectorstore/qdrant, internal/store/postgres, internal/workflow/signals, e outros.

**Padrão**: domain/adapters de lógica têm boa cobertura; entrypoints cmd/* e adapters Postgres estão críticos.

---

## 2. Testes Frontend (React)

**Zero testes.** Nenhum framework configurado.

- Sem vitest, jest, @testing-library, playwright nas dependências
- Nenhum arquivo *.test.* ou *.spec.* no repositório
- Scripts: apenas `dev`, `build`, `preview`, `doctor` (react-doctor = linter, não teste)

---

## 3. Observabilidade em Produção

### OTel/Jaeger
- `ARCHON_OBS_OTEL_ENABLED=true`, endpoint `jaeger:4318`, `SAMPLE_RATIO=1.0`
- **Problema**: SampleRatio=1.0 em produção = 100% traces → overhead crescente com volume
- Jaeger UI: `http://137.184.98.58:16686` retorna 200 — **sem autenticação, porta pública**
- Traces contêm dados de clientes (tenant_id, payloads LLM) — risco de privacidade

### Prometheus
- `ARCHON_OBS_PROM_ENABLED=true` → endpoint `/metrics` ativo no processo Go
- **Sem container Prometheus** na stack — métricas geradas e descartadas
- Sem Grafana, sem dashboards, sem alertas

---

## 4. CI/CD

| Repo | Status |
|------|--------|
| archon (backend) | **Sem nenhum workflow CI/CD** — `.github/workflows/` não existe |
| archon-front-end | Apenas `react-doctor.yml` em PRs — sem lint mandatório, sem type-check, sem testes |

**Deploy**: manual via SSH confirmado. Riscos:
- Sem rollback automatizado
- Sem gate de qualidade antes da produção
- Sem ambiente de staging
- Race condition se dois deploys simultâneos
- Sem audit log de deploys (quem/quando)

---

## 5. Débitos de Qualidade

| Área | Estado | Risco | Ação sugerida |
|------|--------|-------|----------------|
| cmd/api cobertura 5.2% | Crítico | Alto | Testes de smoke: TestMain + health-check |
| Frontend zero testes | Sem cobertura | Alto | instalar vitest + @testing-library; hooks e pages críticos primeiro |
| Prometheus sem scraper | Métricas descartadas | Médio | Adicionar serviço prometheus no compose |
| OTel SampleRatio=1.0 | Overhead em produção | Médio | `ARCHON_OBS_OTEL_SAMPLE_RATIO=0.1` |
| Jaeger porta 16686 pública | Dados de clientes expostos | **Alto** | Bloquear no firewall; acessar via SSH tunnel |
| CI/CD backend inexistente | Zero gate | Alto | GitHub Actions: go vet + golangci-lint + go test -race + docker build |
| CI/CD frontend incompleto | tsc não mandatório | Médio | Adicionar tsc -b + vitest run no workflow PR |
| Deploy manual via SSH | Humano como único gate | Alto | Pipeline: build imagem → push registry → deploy via compose pull |
| 39 pacotes sem _test.go | Adapters DB, mailer, rag | Médio | Priorizar: rag/usecase, store/postgres, mailer |

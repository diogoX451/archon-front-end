---
id: regras-da-auditoria-7dee20
title: Regras da auditoria
tags: audit,safety
by: user
ts: 2026-06-06T01:30:19.300990+00:00
---

- Modo AUDITORIA: missões m1–m8 levantam débitos, NÃO corrigir código nas missões de análise (exceção: relatório final commitado na branch autopilot)
- Relatórios em .claude/autopilot/report/*.md
- agent-browser para m4–m6 em produção: somente leitura — não deletar/alterar dados reais de clientes; dados de teste criados devem ser removidos
- Nunca tocar main; commits só em autopilot/2026-06-05-audit

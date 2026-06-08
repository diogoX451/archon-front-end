---
id: api-container-cors-fix-sempre-usar-env-f-c84fbd
title: API container CORS fix — sempre usar --env-file
tags: prod,cors,docker,gotcha
by: claude
ts: 2026-06-07T08:24:53.760049+00:00
---

Container archon-api-1 iniciado sem --env-file /root/archon/.env usa CORS defaults (localhost:5173 apenas). Frontend em archon.almexa.com.br recebe 'Failed to fetch'. Fix: ssh archon-prod && cd /root/archon/docker && docker compose --env-file /root/archon/.env -f docker-compose.yaml up -d --no-build --force-recreate api. Verificar: docker exec archon-api-1 env | grep CORS.

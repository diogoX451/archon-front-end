---
id: repos-e-produ-o-f091bc
title: Repos e produção
tags: arch,deploy
by: user
ts: 2026-06-06T01:30:19.275557+00:00
---

- Backend Go: /home/dioguin/Documentos/Projetos/archon (github diogoX451/archon)
- Frontend React/Vite: /home/dioguin/Documentos/Projetos/archon-front-end (dual remote GitHub+GitLab)
- Produção: API https://api.almexa.com.br | App https://archon.almexa.com.br | servidor `ssh archon-prod` (alias em ~/.ssh/config, chave ~/.ssh/almexa)
- Deploy backend: no servidor, /root/archon → git pull --ff-only → cd docker → docker compose --env-file /root/archon/.env -f docker-compose.yaml build <svc> && up -d --no-build --force-recreate <svc>
- IMPORTANTE: sempre usar --env-file /root/archon/.env senão interpolação ${VAR} cai em defaults (ex.: neo4j auth quebra)
- Página pública cartão: /c/{slug} (GET card, POST contact) — slug teste: 4nn9abpn

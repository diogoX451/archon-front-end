# archon-front-end

Front-end de controle operacional do Archon, focado em conversa/eventos/workflows/RAG.

## Stack

- React 18 + TypeScript
- Vite
- React Router
- TanStack Query
- Zod (pronto para validações adicionais)

## Arquitetura (escalável)

- `src/app`: bootstrap, providers e roteamento
- `src/pages`: composição das telas
- `src/features`: módulos de domínio (base para crescer por recurso)
- `src/shared`: api client, utilitários e UI base reutilizável
- `src/templates`: payloads prontos para simulações
- `src/styles`: tema e tokens visuais

## Telas incluídas

- Overview
- Conversation (POST `/api/v1/conversation/turns`)
- Events (POST `/api/v1/conversation/events/requested`)
- Workflows (GET status)
- Workflow Result (GET result)
- Profiles (GET list)
- RAG (POST query)
- Templates (payloads prontos)

## Rodar

```bash
cd /home/dioguin/Documentos/Projetos/archon-front-end
cp .env.example .env
npm install
npm run dev
```

Por padrão usa `VITE_ARCHON_API_URL=` (vazio), para chamar a API na mesma origem
ou via proxy do Vite no `npm run dev`.

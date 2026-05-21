# Wikigouv LMS + IA (ARTF)

Plateforme web institutionnelle de formation réglementaire (KYC, LCB/FT, conformité, inspection), avec SSO Keycloak obligatoire.

## Stack

- Frontend: Next.js + React + TypeScript + Tailwind
- Backend: NestJS + TypeScript
- DB: MySQL + Sequelize
- IAM/SSO: Keycloak (OIDC)
- Storage: MinIO (S3 compatible)
- Vector Store (phase 2): Qdrant / pgvector

## Structure

- `apps/web`: frontend Next.js
- `apps/api`: API NestJS
- `infrastructure`: docker compose local (mysql, keycloak, minio, qdrant)
- `docs`: architecture, keycloak, migration, api, ai
- `views`, `wikigouv.js`: legacy v1 conservée temporairement

## Démarrage local

1. Installer dépendances:
```bash
npm install
```

2. Copier `.env.example` vers `.env` et adapter.

3. Démarrer l’infra:
```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

4. API:
```bash
npm --workspace @wikigouv/api run db:migrate
npm --workspace @wikigouv/api run db:seed
npm run dev:api
```

5. Web:
```bash
npm run dev:web
```

6. Full dev:
```bash
npm run dev
```

## Keycloak (dev)

- Realm: `wikigouv`
- Clients:
  - `wikigouv-web` (public, code + PKCE)
  - `wikigouv-api` (resource server audience)
  - `wikigouv-admin-service` (confidential, optionnel)
- Rôles:
  - `SUPER_ADMIN`, `ADMIN`, `FORMATEUR`, `AGENT`, `DIRECTION`, `AUDITEUR`

Voir `docs/KEYCLOAK.md`.

## Commandes utiles

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run test:e2e
npm --workspace @wikigouv/api run db:migrate
npm --workspace @wikigouv/api run db:seed
```

Pour e2e admin mock (sans Keycloak réel), activez avant lancement web:
`NEXT_PUBLIC_E2E_MOCK_AUTH=true`

## Logs NestJS (inspiration Laravel `storage/logs`)

- Sortie console JSON structurÃ©e
- Fichier global: `logs/api/wikigouv-api.log`
- Fichier erreurs: `logs/api/wikigouv-api-error.log`
- Variables:
  - `LOG_LEVEL=info`
  - `LOG_DIR=./logs/api`

## Parcours MVP disponible

- Catalogue filtrable: `/courses`
- Parcours apprenant: `/learn/:courseId`
- Quiz MVP: `/quizzes/:quizId`
- Dashboard rôle-based: `/dashboard`

## Legacy

Ancienne version Express/EJS conservée pour migration:
```bash
npm run legacy:start
npm run legacy:dev
```

# Migration depuis V1

## Etat initial

- V1: app Express + EJS mono-fichier principal (`wikigouv.js`)
- Données JSON locales (`catalogue.json`, `employees.json`, `participants.json`)
- Pas de SSO Keycloak intégré de bout en bout
- Pas de base SQL ni ORM

## Strategie

1. Créer la nouvelle base cible sans casser V1.
2. Introduire monorepo (`apps/web`, `apps/api`).
3. Mettre SSO Keycloak comme unique auth.
4. Migrer données métier utiles de JSON vers Sequelize/MySQL.
5. Retirer progressivement les routes legacy.
6. Reprendre les patterns UX Rocket LMS (catalogue, parcours, quiz, dashboard) en implémentation NestJS + EJS.

## Elements conserves temporairement

- `wikigouv.js` + `views/*` legacy
- workflows n8n OCR existants

## Elements a migrer

- Catalogue formation JSON -> tables `Course`, `Module`, `Lesson`
- Participants/employees -> `UserProfile` (mapping Keycloak `sub`)
- Flux apprenant (inscription/progression/reprise) -> endpoints LMS sécurisés
- Quiz MVP (attempt/submit/result) -> routes typées + audit

## Elements supprimes/neutralises a terme

- Auth locale / sessions locales
- Ecriture JSON métier en production
- Endpoints non typés

## Migration Blade (Laravel) -> EJS (NestJS)

- Les patterns Blade `@extends` et `@include` sont transposés via layouts + partials EJS.
- Arborescence UI cible: `views/layouts`, `views/partials`, `views/pages`.
- Pages auth (`/login`, `/register`, `/forgot-password`, `/reset-password`) en mode Keycloak-only.
- Pages sensibles (`/dashboard`, `/documents`, `/audit-logs`) protégées par guard web et journalisées.
- Exclusions explicites: commerce, paiement, coupons, affiliation, store, mobile native.


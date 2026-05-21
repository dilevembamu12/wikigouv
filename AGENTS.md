# AGENTS
Ce document définit les règles d'exécution pour les agents Codex sur Wikigouv ARTF, avec transposition Laravel Rocket LMS vers NestJS/Next.js dans un contexte institutionnel.

## 1. Vision et périmètre

### 1.1 Mission Wikigouv
Wikigouv est une plateforme web institutionnelle de formation réglementaire, certification interne et assistance IA documentaire pour les agents ARTF et l'écosystème FinTraX.

### 1.2 Ce que Wikigouv N’EST PAS
Wikigouv n'est pas un produit commercial de vente de cours: aucun panier, transaction, cashback, affiliation, ni client natif hors web.

### 1.3 Décisions figées (non négociables)
Stack figée: NestJS + TypeScript, MySQL + Sequelize, Next.js + TypeScript, Keycloak OIDC/SSO obligatoire, architecture IA provider-agnostic, web-only responsive.

## 2. Architecture cible

### 2.1 Structure repo attendue
`apps/web`, `apps/api`, `packages/shared`, `infrastructure`, `docs`. Toute nouvelle feature doit respecter cette séparation.

### 2.2 Frontend (Next.js) règles
Routes par rôle, état loading/error/empty, flux SSO Keycloak, aucun secret serveur dans le bundle client.

### 2.3 Backend (NestJS) règles
Modules métiers isolés, contrôleurs minces, services testables, guards auth/roles/permissions sur endpoints sensibles.

### 2.4 Base de données (MySQL + Sequelize)
Migrations versionnées, seeders idempotents, conventions SQL stables, transactions pour opérations critiques.

### 2.5 Stockage fichiers (S3/MinIO abstraction)
Fichiers pédagogiques via abstraction `FileAsset`, possibilité cloud privé/souverain sans changer métier.

### 2.6 IA/RAG architecture
`LLMProvider` + `VectorStoreProvider` abstraits, pipeline RAG: upload->extract->chunk->embed->retrieve->answer cité.

## 3. Migration Laravel -> NestJS

### 3.1 Mapping concepts (Controller, Service, Model, Policy, Middleware, Job, Event)
Controller Laravel -> Controller Nest; Service métier explicite; Eloquent Model -> Sequelize Model; Policy -> Guards+Permissions; Middleware -> Nest middleware/guards; Job/Event -> queues/events Nest.

### 3.2 Mapping base de données (migrations/seeders)
Migrations Laravel deviennent migrations Sequelize CLI atomiques; seeders convertis idempotents avec clés stables.

### 3.3 Mapping vues/UX legacy vers Next.js
Vue Blade/EJS -> pages Next.js composables; conserver intention UX (header/footer, formulaires, parcours) avec design institutionnel.

### 3.4 Stratégie incrémentale sans régression
Migrer module par module (auth, users, courses, quiz, docs, IA), garder parité fonctionnelle avant suppression legacy.

### 3.5 Checklist migration par module
1) inventaire routes, 2) mapping données, 3) API Nest, 4) page Next, 5) tests, 6) audit sécurité, 7) doc.

## 4. IAM/SSO Keycloak

### 4.1 Règles OIDC obligatoires
Authorization Code Flow + PKCE uniquement; interdits: Implicit Flow, ROPC, login local.

### 4.2 Realm/clients/claims
Realm `wikigouv`; clients `wikigouv-web`, `wikigouv-api`, `wikigouv-admin-service`; claims standards et rôles client.

### 4.3 Validation JWT côté API
Validation signature JWKS + issuer + audience + expiration, puis extraction rôles depuis `resource_access.wikigouv-api.roles`.

### 4.4 Interdits IAM
Aucun mot de passe applicatif, aucun secret client côté navigateur, aucun bypass guard en prod.

### 4.5 Procédure d’onboarding utilisateur
Créer user Keycloak, assigner rôle client, premier login -> sync `UserProfile`, compléter attributs métier côté app.

## 5. RBAC et permissions

### 5.1 Rôles standards
SUPER_ADMIN, ADMIN, FORMATEUR, AGENT, DIRECTION, AUDITEUR.

### 5.2 Matrice permissions (tableau)
| Rôle | Permissions clés |
|---|---|
| SUPER_ADMIN | toutes permissions |
| ADMIN | USER_MANAGE, COURSE_*, DOCUMENT_*, AUDIT_LOG_VIEW |
| FORMATEUR | COURSE_CREATE/UPDATE, LESSON_*, QUIZ_CREATE, AI_QUIZ_GENERATE |
| AGENT | COURSE_READ, QUIZ_SUBMIT, AI_ASSISTANT_USE |
| DIRECTION | DASHBOARD_VIEW, analytics lecture |
| AUDITEUR | lecture + audit logs |

### 5.3 Guards NestJS (Roles + Permissions)
Toujours empiler `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard` sur endpoints sensibles.

### 5.4 Cas limites et décisions
En cas de rôle manquant: refuser (403) et tracer audit. Aucun fallback permissif.

## 6. Normes de code backend

### 6.1 DTO validation
DTO avec class-validator, pipe global whitelist+forbidNonWhitelisted+transform.

### 6.2 Services et repositories
Logique métier en services; accès DB via SequelizeService/repositories dédiés.

### 6.3 Gestion d’erreurs
Erreurs Nest explicites (400/401/403/404), sans stack trace exposée.

### 6.4 Logging applicatif
Logs structurés pino, corrélés request-id, sans secrets.

### 6.5 Audit logs (actions sensibles)
Journaliser création/modification/suppression, changements rôles, certificats, documents, IA sensible.

## 7. Normes de code frontend

### 7.1 Data fetching et gestion d’état
Appels API via `NEXT_PUBLIC_API_URL`, gestion erreurs réseau systématique.

### 7.2 États UX obligatoires (loading/error/empty)
Chaque page data-driven affiche explicitement ces 3 états.

### 7.3 Accessibilité minimale
Labels formulaires, contrastes lisibles, navigation clavier, messages erreurs compréhensibles.

### 7.4 Sécurité front (tokens, secrets)
Aucun secret sensible côté client; token Bearer transmis uniquement aux endpoints API officiels.

## 8. Normes DB Sequelize

### 8.1 Nommage tables/colonnes
Tables snake_case explicites, colonnes stables, conventions homogènes.

### 8.2 Migrations idempotentes
Jamais modifier migration exécutée; créer migration corrective.

### 8.3 Seeders idempotents
`ignoreDuplicates` + IDs déterministes pour rejouabilité CI.

### 8.4 Transactions et contraintes
Transactions pour workflows multi-écritures; contraintes uniques/index cohérents.

### 8.5 Indexation minimale
Indexer clés de jointure, colonnes de filtrage fréquent, et audits temporels.

## 9. Règles IA/RAG

### 9.1 Sources autorisées
Uniquement documents VALIDATED et référentiels internes approuvés.

### 9.2 Citations obligatoires
Toute réponse normative inclut source(s), section(s), version(s).

### 9.3 Anti-hallucination
Si preuve insuffisante: refuser explicitement et proposer démarche d'analyse.

### 9.4 Validation humaine obligatoire
Quiz/cas générés par IA restent en brouillon jusqu'à validation formateur/admin.

### 9.5 Journalisation IA
Tracer prompt utile, contexte documentaire, modèle, réponse, citations, décision utilisateur.

## 10. Sécurité & conformité

### 10.1 Secrets et variables d’environnement
Secrets hors Git, `.env` et `.env.example` synchronisés, rotation périodique.

### 10.2 CORS, helmet, rate limiting
CORS strict par environnement, helmet activé, limites globales + endpoints IA.

### 10.3 Upload sécurisé
Whitelist MIME, limite taille, quarantaine/scan antimalware prévu.

### 10.4 PII et données sensibles
Collecte minimale, accès RBAC, journal d'accès, rétention maîtrisée.

### 10.5 Politique de rétention
Définir durée par type (audit, conversations IA, certificats, pièces uploadées) + purge contrôlée.

## 11. Tests obligatoires

### 11.1 Backend (minimum)
Tests guards JWT/RBAC, création profil, cours, quiz, certificats, upload et IA mock.

### 11.2 Frontend (minimum)
Rendu par rôle, états non authentifié/unauthorized, catalogue, progression.

### 11.3 Contrats API
Vérifier schémas de réponses clés et codes HTTP attendus.

### 11.4 Données de test
Seeders dédiés, stables, rejouables en CI/local.

### 11.5 Gate qualité CI
Bloquer merge si build/lint/test échouent.

## 12. Playbooks opérationnels

### 12.1 Ajouter endpoint API sécurisé
Créer DTO -> service -> controller, appliquer guards/permissions, ajouter audit, tests et doc API.

### 12.2 Ajouter page frontend protégée
Créer page + AuthProvider/RequireAuth, gérer loading/error/empty, brancher API token.

### 12.3 Ajouter migration + seeder
Créer migration atomique + seeder idempotent, exécuter migrate/seed, valider rollback.

### 12.4 Ajouter rôle/permission Keycloak
Créer rôle client `wikigouv-api`, mapper permission API, tester 401/403/200.

### 12.5 Ajouter fonctionnalité IA avec citations
Définir source VALIDATED, retrieval, prompt, sortie citée, audit, test hallucination négative.

## 13. Definition of Done

### 13.1 Checklist technique
Code typé, architecture respectée, migrations/seeders fournis, endpoints documentés.

### 13.2 Checklist sécurité
Guards actifs, secrets protégés, logs et audit couvrent actions sensibles.

### 13.3 Checklist UX
États loading/error/empty présents, messages clairs, parcours principal complet.

### 13.4 Checklist documentation
README/docs mis à jour dans la même PR.

## 14. Anti-patterns interdits

### 14.1 Backend
Fat controllers, bypass DTO, routes sensibles sans guards, ORM multiple.

### 14.2 Frontend
Erreurs runtime non gérées, secret côté client, appels API hors contrat.

### 14.3 IAM
Login local, secrets exposés, rôles non alignés Keycloak/API.

### 14.4 IA
Réponse sans citation, documents non validés, modèle unique hardcodé.

### 14.5 DevOps
Déploiement sans migration, pas de backup avant purge, merge sans CI verte.

## 15. Commandes standard du projet

### 15.1 Setup local
`npm install` puis `docker compose -f infrastructure/docker-compose.yml up -d`.

### 15.2 Démarrage
`npm run dev:api` et `npm run dev:web`.

### 15.3 DB migrate/seed
`npm run db:migrate` puis `npm run db:seed`.

### 15.4 Build/lint/test
`npm run build`, `npm run lint`, `npm run test`.

### 15.5 Dépannage fréquent
Vérifier env, état Docker, Keycloak realm, audience JWT, logs API/web.

## 16. Gouvernance de contribution

### 16.1 Convention commits
Commits atomiques orientés domaine (`feat(lms): ...`, `fix(auth): ...`).

### 16.2 Revue de code
Priorité aux risques sécurité/régression, tests requis, docs synchronisées.

### 16.3 Gestion incidents / rollback
Runbook: détecter, contenir, rollback DB/app, communiquer impact et correctif.

### 16.4 Postmortem modèle
Contexte, timeline, cause racine, actions correctives, prévention, responsable et échéance.

## Règles critiques MUST
- [MUST 01] Le backend MUST être en NestJS + TypeScript strict.
  - Pourquoi: Assure maintenabilité institutionnelle.
  - Comment: Activer strict TS, modules Nest, DTO validés.
  - Exemple: `lms.module.ts` + DTO class-validator.
  - Contre-exemple: Routes Express sans validation de payload.
- [MUST 02] La base MUST être MySQL + Sequelize.
  - Pourquoi: Décision technique figée du programme.
  - Comment: Utiliser migrations Sequelize CLI idempotentes.
  - Exemple: `npm run db:migrate` avant démarrage API.
  - Contre-exemple: Mélanger Prisma/PostgreSQL dans ce repo.
- [MUST 03] L'authentification MUST passer par Keycloak OIDC.
  - Pourquoi: Centralise l'identité et la conformité IAM.
  - Comment: Code Flow + PKCE côté web, JWT côté API.
  - Exemple: `/login` redirige Keycloak, API vérifie JWKS.
  - Contre-exemple: Créer un formulaire login local avec mot de passe.
- [MUST 04] L'API MUST valider issuer/audience/JWKS.
  - Pourquoi: Empêche l'acceptation de tokens frauduleux.
  - Comment: Configurer `JWT_ISSUER`, `JWT_AUDIENCE`, `JWKS_URI`.
  - Exemple: Token `wikigouv-api` accepté uniquement.
  - Contre-exemple: Accepter un JWT non signé ou mauvaise audience.
- [MUST 05] Les endpoints sensibles MUST journaliser dans AuditLog.
  - Pourquoi: Trace réglementaire et auditabilité.
  - Comment: Logger actor/action/entity/ip/userAgent.
  - Exemple: `COURSE_DELETE` consigne un audit complet.
  - Contre-exemple: Supprimer un cours sans trace serveur.
- [MUST 06] Les contenus IA MUST citer leurs sources.
  - Pourquoi: Réduit hallucination et risque juridique.
  - Comment: Inclure références documentaires VALIDATED.
  - Exemple: Réponse IA cite document et section.
  - Contre-exemple: Réponse IA normative sans référence.
- [MUST 07] Les documents MUST être validés avant usage RAG.
  - Pourquoi: Contrôle qualité réglementaire.
  - Comment: Statut `VALIDATED` requis au retrieval.
  - Exemple: Assistant lit uniquement documents validés.
  - Contre-exemple: Interroger des documents `UPLOADED` non vérifiés.
- [MUST 08] Le frontend MUST gérer loading/error/empty.
  - Pourquoi: Stabilité UX pour agents terrain.
  - Comment: États explicites sur chaque page data-driven.
  - Exemple: `/courses` affiche message réseau en erreur.
  - Contre-exemple: Crash runtime `Failed to fetch` non géré.
- [MUST 09] Les seeders MUST être ré-exécutables.
  - Pourquoi: Évite échec d'industrialisation CI/CD.
  - Comment: Utiliser `ignoreDuplicates` + identifiants stables.
  - Exemple: Seeder users relançable sans conflit unique.
  - Contre-exemple: Seeder qui casse au 2e run.
- [MUST 10] Les variables env MUST être synchronisées `.env` et `.env.example`.
  - Pourquoi: Onboarding fiable de l'équipe.
  - Comment: Ajouter chaque nouvelle clé dans les 2 fichiers.
  - Exemple: Ajout `JWT_AUDIENCE` dans les deux.
  - Contre-exemple: Clé présente localement mais absente de l'exemple.
- [MUST 11] Chaque action métier MUST passer par service applicatif.
  - Pourquoi: Sépare contrôleurs et logique métier.
  - Comment: Controller mince, service testable.
  - Exemple: `ParticipantsService.register()` centralise règles.
  - Contre-exemple: SQL direct dispersé dans controllers.
- [MUST 12] Les rôles MUST être extraits de Keycloak client roles.
  - Pourquoi: RBAC cohérent entre IAM et API.
  - Comment: Lire `resource_access.wikigouv-api.roles`.
  - Exemple: `FORMATEUR` active `COURSE_CREATE`.
  - Contre-exemple: Rôles locaux non alignés Keycloak.
- [MUST 13] Les DTO MUST valider whitelisting et types.
  - Pourquoi: Bloque payloads non conformes.
  - Comment: `ValidationPipe(whitelist, forbidNonWhitelisted)`.
  - Exemple: Champ inconnu rejeté en 400.
  - Contre-exemple: Accepter attributs arbitraires.
- [MUST 14] Les uploads MUST filtrer type et taille.
  - Pourquoi: Réduit vecteurs d'attaque fichiers.
  - Comment: MIME whitelist + limite taille + scan futur.
  - Exemple: PDF uniquement dans upload réglementaire.
  - Contre-exemple: Accepter exécutable renommé en PDF.
- [MUST 15] La plateforme MUST rester web-only responsive.
  - Pourquoi: Contrainte produit institutionnelle.
  - Comment: Next.js responsive, aucune app native.
  - Exemple: UI mobile web dans même codebase.
  - Contre-exemple: Créer module React Native/Flutter.
- [MUST 16] Les routes API MUST être préfixées `/api`.
  - Pourquoi: Convention claire et stable.
  - Comment: `app.setGlobalPrefix('api')`.
  - Exemple: `/api/courses/public`.
  - Contre-exemple: Exposer `/courses` sans prefix global.
- [MUST 17] Les actions CRUD cours MUST être protégées par permissions.
  - Pourquoi: Empêche modifications non autorisées.
  - Comment: `COURSE_CREATE/UPDATE/DELETE` via guard.
  - Exemple: Agent lit, formateur édite.
  - Contre-exemple: Route publique d'édition sans token.
- [MUST 18] Le provisioning user MUST créer/sync UserProfile au 1er login.
  - Pourquoi: Associe identité IAM au contexte applicatif.
  - Comment: `/auth/sync-profile` + claims standard.
  - Exemple: Agent nouvellement connecté profilé auto.
  - Contre-exemple: Demander création manuelle DB.
- [MUST 19] Les erreurs MUST être explicites et non bavardes.
  - Pourquoi: Support opérationnel et sécurité.
  - Comment: Messages métier, logs détaillés côté serveur.
  - Exemple: `Course not found` + audit interne.
  - Contre-exemple: Retourner stack trace au frontend.
- [MUST 20] Les migrations MUST versionner tout changement de schéma.
  - Pourquoi: Traçabilité DB et rollback.
  - Comment: 1 migration par évolution atomique.
  - Exemple: Ajout table `participants` migrée.
  - Contre-exemple: Modifier table manuellement en prod.
- [MUST 21] Les modules Nest MUST rester orientés domaine.
  - Pourquoi: Lisibilité et scalabilité organisationnelle.
  - Comment: `lms`, `users`, `documents`, `ai` séparés.
  - Exemple: Service quiz dans `lms`.
  - Contre-exemple: Mettre toute logique dans `app.module`.
- [MUST 22] Les tests MUST couvrir RBAC, auth, flux critiques.
  - Pourquoi: Réduit régression sur zones sensibles.
  - Comment: Unit + intégration sur guards et endpoints.
  - Exemple: Test `RolesGuard` + submit quiz.
  - Contre-exemple: Aucun test sur sécurité API.
- [MUST 23] Les secrets MUST rester hors frontend.
  - Pourquoi: Évite fuite de clés.
  - Comment: Exposer seulement `NEXT_PUBLIC_*` non sensibles.
  - Exemple: ClientId public, secret côté API.
  - Contre-exemple: Publier `KEYCLOAK_ADMIN_CLIENT_SECRET` web.
- [MUST 24] Les réponses IA MUST signaler l'absence d'information.
  - Pourquoi: Transparence réglementaire.
  - Comment: Message explicite si aucune source valide.
  - Exemple: "Information indisponible dans base validée".
  - Contre-exemple: Inventer une règle LCB/FT.
- [MUST 25] Les playbooks MUST être exécutables pas-à-pas.
  - Pourquoi: Réduit ambiguïté opérateur.
  - Comment: Chaque procédure inclut commandes et critères.
  - Exemple: Playbook ajout endpoint sécurisé en 7 étapes.
  - Contre-exemple: Conseils génériques sans étapes.
- [MUST 26] La nomenclature DB MUST être stable et explicite.
  - Pourquoi: Facilite requêtes et audits.
  - Comment: snake_case SQL, conventions constantes.
  - Exemple: `employee_profiles`, `created_at` logique claire.
  - Contre-exemple: Mélanger camelCase et snake_case aléatoire.
- [MUST 27] Les données PII MUST être minimisées.
  - Pourquoi: Conformité protection données.
  - Comment: Collecter uniquement nécessaire à la formation.
  - Exemple: Nom/email pro/direction pour cohorte.
  - Contre-exemple: Stocker données privées non utiles.
- [MUST 28] Les dashboards MUST refléter indicateurs vérifiables.
  - Pourquoi: Décision basée sur données fiables.
  - Comment: Source API + définitions d'indicateurs documentées.
  - Exemple: Taux complétion par direction explicité.
  - Contre-exemple: KPIs non traçables ou calcul opaque.
- [MUST 29] La migration Laravel MUST conserver l'intention fonctionnelle.
  - Pourquoi: Évite perte métier durant refonte.
  - Comment: Mapper fonctionnalités avant réécriture.
  - Exemple: Policy Laravel -> Guard Nest équivalent.
  - Contre-exemple: Réécriture technique sans parité métier.
- [MUST 30] Chaque PR MUST inclure checklist DoD complétée.
  - Pourquoi: Standardise qualité de livraison.
  - Comment: Template PR avec preuves tests/risques.
  - Exemple: PR mentionne tests passés et impacts.
  - Contre-exemple: Merge sans validation structurée.

## Règles critiques MUST NOT
- [MUST NOT 01] Le projet MUST NOT implémenter de login/password local.
  - Pourquoi: Keycloak est la source d'identité.
  - Comment: Supprimer endpoints de mot de passe applicatif.
  - Exemple: Bouton login redirige Keycloak uniquement.
  - Contre-exemple: Route `/auth/login-local` en production.
- [MUST NOT 02] Le projet MUST NOT contenir de mécanismes de monétisation (panier, coupons, transaction).
  - Pourquoi: Produit institutionnel non commercial.
  - Comment: Retirer modèles et écrans commerciaux.
  - Exemple: Catalogue sans prix ni checkout.
  - Contre-exemple: Ajouter Stripe ou wallet cours.
- [MUST NOT 03] Le projet MUST NOT publier de secret dans Git.
  - Pourquoi: Risque compromission critique.
  - Comment: Utiliser env + coffre secrets.
  - Exemple: `LLM_API_KEY` absent du repo.
  - Contre-exemple: Committer clé API dans `.env.example`.
- [MUST NOT 04] Le frontend MUST NOT stocker refresh token de façon non sécurisée.
  - Pourquoi: Limite vol de session.
  - Comment: Utiliser mécanismes OIDC recommandés.
  - Exemple: Session gérée via Keycloak JS et flux PKCE.
  - Contre-exemple: LocalStorage permanent de refresh token brut.
- [MUST NOT 05] L'IA MUST NOT répondre sans source sur règles réglementaires.
  - Pourquoi: Risque de mauvaise décision métier.
  - Comment: Forcer citation ou refus de réponse.
  - Exemple: Réponse avec référence document validé.
  - Contre-exemple: Conseil juridique inventé.
- [MUST NOT 06] Les migrations MUST NOT être modifiées après exécution partagée.
  - Pourquoi: Préserve historique DB.
  - Comment: Créer nouvelle migration corrective.
  - Exemple: `202604...add-index-fix.js`.
  - Contre-exemple: Éditer une migration déjà exécutée en équipe.
- [MUST NOT 07] Les contrôleurs MUST NOT porter logique métier complexe.
  - Pourquoi: Code non testable et fragile.
  - Comment: Déplacer règles vers services.
  - Exemple: Controller appelle `LmsService`.
  - Contre-exemple: Boucles scoring quiz écrites dans controller.
- [MUST NOT 08] Le code MUST NOT ignorer les erreurs réseau frontend.
  - Pourquoi: Évite crash utilisateur.
  - Comment: Afficher état erreur + action de reprise.
  - Exemple: Message "API indisponible" sur `/courses`.
  - Contre-exemple: Unhandled runtime `Failed to fetch`.
- [MUST NOT 09] Les seeders MUST NOT dépendre d'ordre implicite fragile.
  - Pourquoi: Exécution CI doit être stable.
  - Comment: Prévoir idempotence et dépendances explicites.
  - Exemple: Seed users avant relations associées.
  - Contre-exemple: Seeder qui suppose IDs auto-incrément cachés.
- [MUST NOT 10] Les routes sensibles MUST NOT être publiques sans guard.
  - Pourquoi: Sécurité IAM/RBAC obligatoire.
  - Comment: Appliquer `JwtAuthGuard` + permissions.
  - Exemple: DELETE cours protégé par `COURSE_DELETE`.
  - Contre-exemple: Endpoint suppression ouvert anonymement.
- [MUST NOT 11] L'application MUST NOT créer de client natif hors web responsive.
  - Pourquoi: Contrainte produit web-only.
  - Comment: Limiter au responsive web.
  - Exemple: Next.js unique canal client.
  - Contre-exemple: Repo `mobile/` Flutter.
- [MUST NOT 12] Les données MUST NOT être dupliquées sans source de vérité.
  - Pourquoi: Évite incohérences métier.
  - Comment: UserProfile applicatif + identité Keycloak séparées.
  - Exemple: Claims syncés sans cloner password.
  - Contre-exemple: Table users locale concurrente IAM.
- [MUST NOT 13] Les commits MUST NOT inclure artefacts build inutiles.
  - Pourquoi: Réduit bruit et conflits.
  - Comment: Gitignore dist/.next/cache.
  - Exemple: PR propre sans binaire.
  - Contre-exemple: Commit dossier `.next` complet.
- [MUST NOT 14] Les réponses API MUST NOT exposer stack traces.
  - Pourquoi: Sécurité et UX.
  - Comment: Mapper erreurs vers messages métier.
  - Exemple: Retour 400/404 explicite.
  - Contre-exemple: Retourner `TypeError` complet au client.
- [MUST NOT 15] Le backend MUST NOT bypasser validation DTO.
  - Pourquoi: Prévenir corruption de données.
  - Comment: Toujours passer par pipes validation.
  - Exemple: Payload filtré automatiquement.
  - Contre-exemple: `any` body injecté sans contrôle.
- [MUST NOT 16] Les fichiers uploadés MUST NOT être exécutables côté serveur.
  - Pourquoi: Réduit risques RCE.
  - Comment: Stockage objet non exécutable + MIME check.
  - Exemple: PDF stocké MinIO sans interprétation.
  - Contre-exemple: Exécuter contenu upload directement.
- [MUST NOT 17] Les permissions MUST NOT être codées en dur dans le frontend.
  - Pourquoi: RBAC doit être serveur-centric.
  - Comment: UI lit rôles, serveur décide réellement.
  - Exemple: Bouton caché + API revalide.
  - Contre-exemple: Autoriser action juste car bouton visible.
- [MUST NOT 18] L'équipe MUST NOT modifier Keycloak manuellement sans traçabilité.
  - Pourquoi: Évite dérive IAM.
  - Comment: Maintenir export realm + scripts.
  - Exemple: Ajout rôle via script documenté.
  - Contre-exemple: Changement console non historisé.
- [MUST NOT 19] Le RAG MUST NOT indexer documents non validés.
  - Pourquoi: Conformité documentaire.
  - Comment: Filtre strict statut `VALIDATED`.
  - Exemple: Chunking uniquement post-validation.
  - Contre-exemple: Indexer brouillon interne sensible.
- [MUST NOT 20] Le projet MUST NOT mélanger plusieurs ORM concurrents.
  - Pourquoi: Complexifie maintenance.
  - Comment: Standard unique Sequelize.
  - Exemple: Toutes nouvelles tables via Sequelize.
  - Contre-exemple: Nouvelle feature en Prisma.
- [MUST NOT 21] Les noms de rôles MUST NOT diverger entre Keycloak et API.
  - Pourquoi: RBAC cassé sinon.
  - Comment: Conserver enum aligné client roles.
  - Exemple: `FORMATEUR` identique partout.
  - Contre-exemple: `TRAINER` côté API et `FORMATEUR` côté IAM.
- [MUST NOT 22] Les scripts DB MUST NOT supprimer des données sans backup.
  - Pourquoi: Risque perte institutionnelle.
  - Comment: Procédure sauvegarde avant purge.
  - Exemple: Export avant archive massive.
  - Contre-exemple: `DELETE` global sans snapshot.
- [MUST NOT 23] Le code MUST NOT ignorer audit sur actions sensibles.
  - Pourquoi: Traçabilité réglementaire requise.
  - Comment: Hook audit dans services critiques.
  - Exemple: Révocation certificat auditée.
  - Contre-exemple: Modification rôle sans journal.
- [MUST NOT 24] Les PR MUST NOT passer sans tests minimaux.
  - Pourquoi: Empêche regressions.
  - Comment: Gate CI bloquante build/lint/test.
  - Exemple: Pipeline rouge => merge bloqué.
  - Contre-exemple: Fusion manuelle malgré échecs.
- [MUST NOT 25] Les docs MUST NOT contredire le code actif.
  - Pourquoi: Onboarding fiable.
  - Comment: Mettre à jour docs dans même PR.
  - Exemple: Nouveau endpoint documenté immédiatement.
  - Contre-exemple: Route livrée non documentée.
- [MUST NOT 26] Le frontend MUST NOT appeler des endpoints hors `/api`.
  - Pourquoi: Cohérence sécurité et observabilité.
  - Comment: Concentrer trafic applicatif sur API officielle.
  - Exemple: `/api/participants/register`.
  - Contre-exemple: Appeler service interne ad-hoc non protégé.
- [MUST NOT 27] Les données RH MUST NOT inclure infos non nécessaires.
  - Pourquoi: Principe minimisation PII.
  - Comment: Limiter au besoin formation.
  - Exemple: Direction, rôle, objectifs seulement.
  - Contre-exemple: Collecter données familiales inutiles.
- [MUST NOT 28] L'implémentation MUST NOT dépendre d'un unique provider IA.
  - Pourquoi: Évite verrouillage fournisseur.
  - Comment: Interface `LLMProvider` abstraite.
  - Exemple: Basculer OpenAI/Ollama par env.
  - Contre-exemple: Appeler SDK provider en dur partout.
- [MUST NOT 29] Le système MUST NOT autoriser CORS permissif en production.
  - Pourquoi: Surface d'attaque accrue.
  - Comment: Whitelist origines institutionnelles.
  - Exemple: `CORS_ORIGIN=https://lms.artf.cg`.
  - Contre-exemple: `CORS_ORIGIN=*` en prod.
- [MUST NOT 30] Les déploiements MUST NOT omettre migration contrôlée.
  - Pourquoi: Risque schéma incohérent.
  - Comment: Exécuter migrate avant montée API.
  - Exemple: Pipeline: backup->migrate->healthcheck.
  - Contre-exemple: Déployer binaire sans migration DB.

## Exemples concrets ARTF/FinTraX
- Exemple 01: Cohorte AGENT-DR-2026 inscrite sur parcours FinTraX supervision.
- Exemple 02: Formateur ARTF publie module LCB/FT avec quiz de 20 questions.
- Exemple 03: Direction suit taux de complétion par service DISE.
- Exemple 04: Audit interne vérifie trace `COURSE_DELETE` avec IP et userAgent.
- Exemple 05: Agent reçoit refus IA faute de document VALIDATED sur thème demandé.
- Exemple 06: Synchronisation profil Keycloak au premier login agent terrain.
- Exemple 07: Workflow n8n OCR pré-remplit NIU avant validation humaine.
- Exemple 08: Dashboard affiche certificats actifs par direction ARTF.
- Exemple 09: Rôle FORMATEUR autorise `COURSE_CREATE` mais pas `SETTINGS_MANAGE`.
- Exemple 10: Admin archive un document obsolète version 1.2.
- Exemple 11: Quiz échoué déclenche notification de remédiation pédagogique.
- Exemple 12: Simulation de cas transfert suspect évaluée avec citations.
- Exemple 13: Révocation certificat journalisée pour contrôle interne.
- Exemple 14: Import agents OCR nettoyé avant affectation aux parcours.
- Exemple 15: API refuse token audience non `wikigouv-api`.
- Exemple 16: Assistant IA cite procédure inspection ARTF section 4.2.
- Exemple 17: Matrice RBAC empêche AGENT de supprimer un cours.
- Exemple 18: Migration ajoute index sur `enrollments(userId,courseId)`.
- Exemple 19: Validation DTO bloque champ inattendu dans création participant.
- Exemple 20: Seeders rejoués sans doublon sur `user_profiles`.

## Tableau route sensible -> guard/permission -> audit requis
| Route sensible | Guards | Permission | Audit requis |
|---|---|---|---|
| GET /api/courses/public | JwtAuthGuard + RolesGuard + PermissionsGuard | COURSE_READ | Consultation catalogue (optionnel agrégé) |
| POST /api/courses/public | JwtAuthGuard + RolesGuard + PermissionsGuard | COURSE_CREATE | COURSE_CREATE avec actor/entity |
| PATCH /api/courses/public/:id | JwtAuthGuard + RolesGuard + PermissionsGuard | COURSE_UPDATE | COURSE_UPDATE avant/après |
| DELETE /api/courses/public/:id | JwtAuthGuard + RolesGuard + PermissionsGuard | COURSE_DELETE | COURSE_DELETE obligatoire |
| POST /api/participants/register | Validation DTO + contrôles métier | N/A (public contrôlé) ou permission dédiée | REGISTER_PARTICIPANT |
| GET /api/employees | JwtAuthGuard recommandé selon politique | USER_MANAGE ou lecture RH | EMPLOYEE_LIST accès journalisé |
| POST /api/ai/assistant/chat | JwtAuthGuard + PermissionsGuard | AI_ASSISTANT_USE | AI_CHAT prompt/context/réponse |
| POST /api/documents/:id/validate | JwtAuthGuard + PermissionsGuard | DOCUMENT_VALIDATE | DOCUMENT_VALIDATE + validateur |

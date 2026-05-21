# Architecture Wikigouv

## Vue d’ensemble

- `apps/web`: UI LMS institutionnelle (responsive web only)
- `apps/api`: API NestJS (modules métiers + sécurité + audit)
- `MySQL`: source transactionnelle LMS
- `Keycloak`: IAM/SSO (source d’identité)
- `MinIO`: objets pédagogiques
- `Qdrant/pgvector`: recherche sémantique (phase 2)

## Flux Auth

1. User ouvre `/login` sur web.
2. Redirection Keycloak (code + PKCE).
3. Front reçoit token OIDC.
4. Front appelle API avec `Authorization: Bearer`.
5. API valide JWT via `issuer/audience/JWKS`.
6. Guards appliquent rôles + permissions.
7. Profil applicatif est synchronisé (`keycloakUserId`).

## Modules API

- `auth`: JWT guard, roles guard, permissions guard
- `users`: `/me`, sync profil
- `lms`: catalogue filtrable, CRUD cours, enrollments, progression/reprise, quiz MVP, certificats
- `documents`: upload/process/validate (MVP structure)
- `ai`: assistant, quiz generator, case simulator (MVP structure)
- `analytics`: indicateurs globaux + dashboard par rôle
- `audit`: journalisation des actions sensibles

## Flux LMS MVP

1. Agent consulte `/courses` avec filtres (q/level/status) et pagination.
2. Agent s’inscrit (`POST /courses/:id/enroll`).
3. Agent suit les leçons (`POST /lessons/:id/complete`), progression recalculée.
4. Agent reprend la session via `nextLessonId` (`GET /courses/:id/progress`).
5. Agent lance un quiz (`POST /quizzes/:id/start`), soumet (`POST /quiz-attempts/:id/submit`) et lit le résultat.
6. Actions sensibles journalisées dans `audit_logs`.

## Flux IA (phase 2 cible)

1. Upload document -> extraction texte -> chunks.
2. Embeddings -> vector store.
3. Question agent -> retrieval chunks VALIDATED.
4. Prompt contextualisé -> LLM provider.
5. Réponse + citations.
6. Journalisation.

## Durcissement implémenté (phase 2)

- Endpoints IA protégés par rate limiting applicatif.
- Upload documents contrôlé (type MIME, taille max 10MB).
- Audit log sur actions documentaires sensibles (upload/process/validate).

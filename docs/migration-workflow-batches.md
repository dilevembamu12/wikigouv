# Workflow de migration par lots (Rocket LMS -> Wikigouv NestJS)

## Ordre d'execution
1. Courses
2. Users
3. Forum
4. CRM
5. Content
6. Settings

## Routine standard pour chaque lot
1. Inventaire Laravel source (routes, controllers, models, policies, vues).
2. Mapping cible NestJS:
   - `apps/api`: controller + service + DTO + guard + permissions + audit
   - `apps/web`: controller EJS + vue + sidebar + loading/error/empty
3. Contrat liste standard:
   - query: `page,pageSize,q,status,dateFrom,dateTo`
   - response: `{ items, page, pageSize, total, totalPages }`
4. RBAC:
   - `SUPER_ADMIN` accès total institutionnel
   - rôles métiers selon matrice
5. Validation:
   - test manuel routes clés
   - test 401/403/200
   - audit log sur mutations

## Lot 1 — Courses (prioritaire)
- Pages:
  - `/admin/webinars/create`
  - `/admin/webinars?type=course`
  - `/admin/webinars?type=webinar`
  - `/admin/webinars?type=text_lesson`
  - `/admin/agora_history`
  - `/admin/webinars/personal-notes`
- Sidebar:
  - dropdown inline (pas popup), parent ouvert sur route enfant active
- API:
  - listes/metrics + filtres + statut + export

## Definition of Done par lot
- Parité fonctionnelle Laravel -> NestJS atteinte pour le lot.
- Aucun module commercial exposé.
- UI stable desktop/mobile.
- RBAC et audit conformes.

from pathlib import Path

root = Path(r"e:/PROJET/INTERNE/FRANCOIS/GOUVGPT/wikigouv")


def crit_rule(tag, idx, rule, why, how, ex, counter):
    return (
        f"- [{tag} {idx:02d}] {rule}\n"
        f"  - Pourquoi: {why}\n"
        f"  - Comment: {how}\n"
        f"  - Exemple: {ex}\n"
        f"  - Contre-exemple: {counter}\n"
    )


must_rules = [
    (
        "Le backend MUST être en NestJS + TypeScript strict.",
        "Assure maintenabilité institutionnelle.",
        "Activer strict TS, modules Nest, DTO validés.",
        "`lms.module.ts` + DTO class-validator.",
        "Routes Express sans validation de payload.",
    ),
    (
        "La base MUST être MySQL + Sequelize.",
        "Décision technique figée du programme.",
        "Utiliser migrations Sequelize CLI idempotentes.",
        "`npm run db:migrate` avant démarrage API.",
        "Mélanger Prisma/PostgreSQL dans ce repo.",
    ),
    (
        "L'authentification MUST passer par Keycloak OIDC.",
        "Centralise l'identité et la conformité IAM.",
        "Code Flow + PKCE côté web, JWT côté API.",
        "`/login` redirige Keycloak, API vérifie JWKS.",
        "Créer un formulaire login local avec mot de passe.",
    ),
    (
        "L'API MUST valider issuer/audience/JWKS.",
        "Empêche l'acceptation de tokens frauduleux.",
        "Configurer `JWT_ISSUER`, `JWT_AUDIENCE`, `JWKS_URI`.",
        "Token `wikigouv-api` accepté uniquement.",
        "Accepter un JWT non signé ou mauvaise audience.",
    ),
    (
        "Les endpoints sensibles MUST journaliser dans AuditLog.",
        "Trace réglementaire et auditabilité.",
        "Logger actor/action/entity/ip/userAgent.",
        "`COURSE_DELETE` consigne un audit complet.",
        "Supprimer un cours sans trace serveur.",
    ),
    (
        "Les contenus IA MUST citer leurs sources.",
        "Réduit hallucination et risque juridique.",
        "Inclure références documentaires VALIDATED.",
        "Réponse IA cite document et section.",
        "Réponse IA normative sans référence.",
    ),
    (
        "Les documents MUST être validés avant usage RAG.",
        "Contrôle qualité réglementaire.",
        "Statut `VALIDATED` requis au retrieval.",
        "Assistant lit uniquement documents validés.",
        "Interroger des documents `UPLOADED` non vérifiés.",
    ),
    (
        "Le frontend MUST gérer loading/error/empty.",
        "Stabilité UX pour agents terrain.",
        "États explicites sur chaque page data-driven.",
        "`/courses` affiche message réseau en erreur.",
        "Crash runtime `Failed to fetch` non géré.",
    ),
    (
        "Les seeders MUST être ré-exécutables.",
        "Évite échec d'industrialisation CI/CD.",
        "Utiliser `ignoreDuplicates` + identifiants stables.",
        "Seeder users relançable sans conflit unique.",
        "Seeder qui casse au 2e run.",
    ),
    (
        "Les variables env MUST être synchronisées `.env` et `.env.example`.",
        "Onboarding fiable de l'équipe.",
        "Ajouter chaque nouvelle clé dans les 2 fichiers.",
        "Ajout `JWT_AUDIENCE` dans les deux.",
        "Clé présente localement mais absente de l'exemple.",
    ),
    (
        "Chaque action métier MUST passer par service applicatif.",
        "Sépare contrôleurs et logique métier.",
        "Controller mince, service testable.",
        "`ParticipantsService.register()` centralise règles.",
        "SQL direct dispersé dans controllers.",
    ),
    (
        "Les rôles MUST être extraits de Keycloak client roles.",
        "RBAC cohérent entre IAM et API.",
        "Lire `resource_access.wikigouv-api.roles`.",
        "`FORMATEUR` active `COURSE_CREATE`.",
        "Rôles locaux non alignés Keycloak.",
    ),
    (
        "Les DTO MUST valider whitelisting et types.",
        "Bloque payloads non conformes.",
        "`ValidationPipe(whitelist, forbidNonWhitelisted)`.",
        "Champ inconnu rejeté en 400.",
        "Accepter attributs arbitraires.",
    ),
    (
        "Les uploads MUST filtrer type et taille.",
        "Réduit vecteurs d'attaque fichiers.",
        "MIME whitelist + limite taille + scan futur.",
        "PDF uniquement dans upload réglementaire.",
        "Accepter exécutable renommé en PDF.",
    ),
    (
        "La plateforme MUST rester web-only responsive.",
        "Contrainte produit institutionnelle.",
        "Next.js responsive, aucune app native.",
        "UI mobile web dans même codebase.",
        "Créer module React Native/Flutter.",
    ),
    (
        "Les routes API MUST être préfixées `/api`.",
        "Convention claire et stable.",
        "`app.setGlobalPrefix('api')`.",
        "`/api/courses/public`.",
        "Exposer `/courses` sans prefix global.",
    ),
    (
        "Les actions CRUD cours MUST être protégées par permissions.",
        "Empêche modifications non autorisées.",
        "`COURSE_CREATE/UPDATE/DELETE` via guard.",
        "Agent lit, formateur édite.",
        "Route publique d'édition sans token.",
    ),
    (
        "Le provisioning user MUST créer/sync UserProfile au 1er login.",
        "Associe identité IAM au contexte applicatif.",
        "`/auth/sync-profile` + claims standard.",
        "Agent nouvellement connecté profilé auto.",
        "Demander création manuelle DB.",
    ),
    (
        "Les erreurs MUST être explicites et non bavardes.",
        "Support opérationnel et sécurité.",
        "Messages métier, logs détaillés côté serveur.",
        "`Course not found` + audit interne.",
        "Retourner stack trace au frontend.",
    ),
    (
        "Les migrations MUST versionner tout changement de schéma.",
        "Traçabilité DB et rollback.",
        "1 migration par évolution atomique.",
        "Ajout table `participants` migrée.",
        "Modifier table manuellement en prod.",
    ),
    (
        "Les modules Nest MUST rester orientés domaine.",
        "Lisibilité et scalabilité organisationnelle.",
        "`lms`, `users`, `documents`, `ai` séparés.",
        "Service quiz dans `lms`.",
        "Mettre toute logique dans `app.module`.",
    ),
    (
        "Les tests MUST couvrir RBAC, auth, flux critiques.",
        "Réduit régression sur zones sensibles.",
        "Unit + intégration sur guards et endpoints.",
        "Test `RolesGuard` + submit quiz.",
        "Aucun test sur sécurité API.",
    ),
    (
        "Les secrets MUST rester hors frontend.",
        "Évite fuite de clés.",
        "Exposer seulement `NEXT_PUBLIC_*` non sensibles.",
        "ClientId public, secret côté API.",
        "Publier `KEYCLOAK_ADMIN_CLIENT_SECRET` web.",
    ),
    (
        "Les réponses IA MUST signaler l'absence d'information.",
        "Transparence réglementaire.",
        "Message explicite si aucune source valide.",
        "\"Information indisponible dans base validée\".",
        "Inventer une règle LCB/FT.",
    ),
    (
        "Les playbooks MUST être exécutables pas-à-pas.",
        "Réduit ambiguïté opérateur.",
        "Chaque procédure inclut commandes et critères.",
        "Playbook ajout endpoint sécurisé en 7 étapes.",
        "Conseils génériques sans étapes.",
    ),
    (
        "La nomenclature DB MUST être stable et explicite.",
        "Facilite requêtes et audits.",
        "snake_case SQL, conventions constantes.",
        "`employee_profiles`, `created_at` logique claire.",
        "Mélanger camelCase et snake_case aléatoire.",
    ),
    (
        "Les données PII MUST être minimisées.",
        "Conformité protection données.",
        "Collecter uniquement nécessaire à la formation.",
        "Nom/email pro/direction pour cohorte.",
        "Stocker données privées non utiles.",
    ),
    (
        "Les dashboards MUST refléter indicateurs vérifiables.",
        "Décision basée sur données fiables.",
        "Source API + définitions d'indicateurs documentées.",
        "Taux complétion par direction explicité.",
        "KPIs non traçables ou calcul opaque.",
    ),
    (
        "La migration Laravel MUST conserver l'intention fonctionnelle.",
        "Évite perte métier durant refonte.",
        "Mapper fonctionnalités avant réécriture.",
        "Policy Laravel -> Guard Nest équivalent.",
        "Réécriture technique sans parité métier.",
    ),
    (
        "Chaque PR MUST inclure checklist DoD complétée.",
        "Standardise qualité de livraison.",
        "Template PR avec preuves tests/risques.",
        "PR mentionne tests passés et impacts.",
        "Merge sans validation structurée.",
    ),
]

must_not_rules = [
    (
        "Le projet MUST NOT implémenter de login/password local.",
        "Keycloak est la source d'identité.",
        "Supprimer endpoints de mot de passe applicatif.",
        "Bouton login redirige Keycloak uniquement.",
        "Route `/auth/login-local` en production.",
    ),
    (
        "Le projet MUST NOT contenir de mécanismes de monétisation (panier, coupons, transaction).",
        "Produit institutionnel non commercial.",
        "Retirer modèles et écrans commerciaux.",
        "Catalogue sans prix ni checkout.",
        "Ajouter Stripe ou wallet cours.",
    ),
    (
        "Le projet MUST NOT publier de secret dans Git.",
        "Risque compromission critique.",
        "Utiliser env + coffre secrets.",
        "`LLM_API_KEY` absent du repo.",
        "Committer clé API dans `.env.example`.",
    ),
    (
        "Le frontend MUST NOT stocker refresh token de façon non sécurisée.",
        "Limite vol de session.",
        "Utiliser mécanismes OIDC recommandés.",
        "Session gérée via Keycloak JS et flux PKCE.",
        "LocalStorage permanent de refresh token brut.",
    ),
    (
        "L'IA MUST NOT répondre sans source sur règles réglementaires.",
        "Risque de mauvaise décision métier.",
        "Forcer citation ou refus de réponse.",
        "Réponse avec référence document validé.",
        "Conseil juridique inventé.",
    ),
    (
        "Les migrations MUST NOT être modifiées après exécution partagée.",
        "Préserve historique DB.",
        "Créer nouvelle migration corrective.",
        "`202604...add-index-fix.js`.",
        "Éditer une migration déjà exécutée en équipe.",
    ),
    (
        "Les contrôleurs MUST NOT porter logique métier complexe.",
        "Code non testable et fragile.",
        "Déplacer règles vers services.",
        "Controller appelle `LmsService`.",
        "Boucles scoring quiz écrites dans controller.",
    ),
    (
        "Le code MUST NOT ignorer les erreurs réseau frontend.",
        "Évite crash utilisateur.",
        "Afficher état erreur + action de reprise.",
        "Message \"API indisponible\" sur `/courses`.",
        "Unhandled runtime `Failed to fetch`.",
    ),
    (
        "Les seeders MUST NOT dépendre d'ordre implicite fragile.",
        "Exécution CI doit être stable.",
        "Prévoir idempotence et dépendances explicites.",
        "Seed users avant relations associées.",
        "Seeder qui suppose IDs auto-incrément cachés.",
    ),
    (
        "Les routes sensibles MUST NOT être publiques sans guard.",
        "Sécurité IAM/RBAC obligatoire.",
        "Appliquer `JwtAuthGuard` + permissions.",
        "DELETE cours protégé par `COURSE_DELETE`.",
        "Endpoint suppression ouvert anonymement.",
    ),
    (
        "L'application MUST NOT créer de client natif hors web responsive.",
        "Contrainte produit web-only.",
        "Limiter au responsive web.",
        "Next.js unique canal client.",
        "Repo `mobile/` Flutter.",
    ),
    (
        "Les données MUST NOT être dupliquées sans source de vérité.",
        "Évite incohérences métier.",
        "UserProfile applicatif + identité Keycloak séparées.",
        "Claims syncés sans cloner password.",
        "Table users locale concurrente IAM.",
    ),
    (
        "Les commits MUST NOT inclure artefacts build inutiles.",
        "Réduit bruit et conflits.",
        "Gitignore dist/.next/cache.",
        "PR propre sans binaire.",
        "Commit dossier `.next` complet.",
    ),
    (
        "Les réponses API MUST NOT exposer stack traces.",
        "Sécurité et UX.",
        "Mapper erreurs vers messages métier.",
        "Retour 400/404 explicite.",
        "Retourner `TypeError` complet au client.",
    ),
    (
        "Le backend MUST NOT bypasser validation DTO.",
        "Prévenir corruption de données.",
        "Toujours passer par pipes validation.",
        "Payload filtré automatiquement.",
        "`any` body injecté sans contrôle.",
    ),
    (
        "Les fichiers uploadés MUST NOT être exécutables côté serveur.",
        "Réduit risques RCE.",
        "Stockage objet non exécutable + MIME check.",
        "PDF stocké MinIO sans interprétation.",
        "Exécuter contenu upload directement.",
    ),
    (
        "Les permissions MUST NOT être codées en dur dans le frontend.",
        "RBAC doit être serveur-centric.",
        "UI lit rôles, serveur décide réellement.",
        "Bouton caché + API revalide.",
        "Autoriser action juste car bouton visible.",
    ),
    (
        "L'équipe MUST NOT modifier Keycloak manuellement sans traçabilité.",
        "Évite dérive IAM.",
        "Maintenir export realm + scripts.",
        "Ajout rôle via script documenté.",
        "Changement console non historisé.",
    ),
    (
        "Le RAG MUST NOT indexer documents non validés.",
        "Conformité documentaire.",
        "Filtre strict statut `VALIDATED`.",
        "Chunking uniquement post-validation.",
        "Indexer brouillon interne sensible.",
    ),
    (
        "Le projet MUST NOT mélanger plusieurs ORM concurrents.",
        "Complexifie maintenance.",
        "Standard unique Sequelize.",
        "Toutes nouvelles tables via Sequelize.",
        "Nouvelle feature en Prisma.",
    ),
    (
        "Les noms de rôles MUST NOT diverger entre Keycloak et API.",
        "RBAC cassé sinon.",
        "Conserver enum aligné client roles.",
        "`FORMATEUR` identique partout.",
        "`TRAINER` côté API et `FORMATEUR` côté IAM.",
    ),
    (
        "Les scripts DB MUST NOT supprimer des données sans backup.",
        "Risque perte institutionnelle.",
        "Procédure sauvegarde avant purge.",
        "Export avant archive massive.",
        "`DELETE` global sans snapshot.",
    ),
    (
        "Le code MUST NOT ignorer audit sur actions sensibles.",
        "Traçabilité réglementaire requise.",
        "Hook audit dans services critiques.",
        "Révocation certificat auditée.",
        "Modification rôle sans journal.",
    ),
    (
        "Les PR MUST NOT passer sans tests minimaux.",
        "Empêche regressions.",
        "Gate CI bloquante build/lint/test.",
        "Pipeline rouge => merge bloqué.",
        "Fusion manuelle malgré échecs.",
    ),
    (
        "Les docs MUST NOT contredire le code actif.",
        "Onboarding fiable.",
        "Mettre à jour docs dans même PR.",
        "Nouveau endpoint documenté immédiatement.",
        "Route livrée non documentée.",
    ),
    (
        "Le frontend MUST NOT appeler des endpoints hors `/api`.",
        "Cohérence sécurité et observabilité.",
        "Concentrer trafic applicatif sur API officielle.",
        "`/api/participants/register`.",
        "Appeler service interne ad-hoc non protégé.",
    ),
    (
        "Les données RH MUST NOT inclure infos non nécessaires.",
        "Principe minimisation PII.",
        "Limiter au besoin formation.",
        "Direction, rôle, objectifs seulement.",
        "Collecter données familiales inutiles.",
    ),
    (
        "L'implémentation MUST NOT dépendre d'un unique provider IA.",
        "Évite verrouillage fournisseur.",
        "Interface `LLMProvider` abstraite.",
        "Basculer OpenAI/Ollama par env.",
        "Appeler SDK provider en dur partout.",
    ),
    (
        "Le système MUST NOT autoriser CORS permissif en production.",
        "Surface d'attaque accrue.",
        "Whitelist origines institutionnelles.",
        "`CORS_ORIGIN=https://lms.artf.cg`.",
        "`CORS_ORIGIN=*` en prod.",
    ),
    (
        "Les déploiements MUST NOT omettre migration contrôlée.",
        "Risque schéma incohérent.",
        "Exécuter migrate avant montée API.",
        "Pipeline: backup->migrate->healthcheck.",
        "Déployer binaire sans migration DB.",
    ),
]

assert len(must_rules) == 30
assert len(must_not_rules) == 30

examples_artf = [
    "Cohorte AGENT-DR-2026 inscrite sur parcours FinTraX supervision.",
    "Formateur ARTF publie module LCB/FT avec quiz de 20 questions.",
    "Direction suit taux de complétion par service DISE.",
    "Audit interne vérifie trace `COURSE_DELETE` avec IP et userAgent.",
    "Agent reçoit refus IA faute de document VALIDATED sur thème demandé.",
    "Synchronisation profil Keycloak au premier login agent terrain.",
    "Workflow n8n OCR pré-remplit NIU avant validation humaine.",
    "Dashboard affiche certificats actifs par direction ARTF.",
    "Rôle FORMATEUR autorise `COURSE_CREATE` mais pas `SETTINGS_MANAGE`.",
    "Admin archive un document obsolète version 1.2.",
    "Quiz échoué déclenche notification de remédiation pédagogique.",
    "Simulation de cas transfert suspect évaluée avec citations.",
    "Révocation certificat journalisée pour contrôle interne.",
    "Import agents OCR nettoyé avant affectation aux parcours.",
    "API refuse token audience non `wikigouv-api`.",
    "Assistant IA cite procédure inspection ARTF section 4.2.",
    "Matrice RBAC empêche AGENT de supprimer un cours.",
    "Migration ajoute index sur `enrollments(userId,courseId)`.",
    "Validation DTO bloque champ inattendu dans création participant.",
    "Seeders rejoués sans doublon sur `user_profiles`.",
]

agents = []
agents.append("# AGENTS\n")
agents.append(
    "Ce document définit les règles d'exécution pour les agents Codex sur Wikigouv ARTF, avec transposition Laravel Rocket LMS vers NestJS/Next.js dans un contexte institutionnel.\n"
)

sections = [
    (
        "## 1. Vision et périmètre",
        [
            (
                "### 1.1 Mission Wikigouv",
                "Wikigouv est une plateforme web institutionnelle de formation réglementaire, certification interne et assistance IA documentaire pour les agents ARTF et l'écosystème FinTraX.",
            ),
            (
                "### 1.2 Ce que Wikigouv N’EST PAS",
                "Wikigouv n'est pas un produit commercial de vente de cours: aucun panier, transaction, cashback, affiliation, ni client natif hors web.",
            ),
            (
                "### 1.3 Décisions figées (non négociables)",
                "Stack figée: NestJS + TypeScript, MySQL + Sequelize, Next.js + TypeScript, Keycloak OIDC/SSO obligatoire, architecture IA provider-agnostic, web-only responsive.",
            ),
        ],
    ),
    (
        "## 2. Architecture cible",
        [
            (
                "### 2.1 Structure repo attendue",
                "`apps/web`, `apps/api`, `packages/shared`, `infrastructure`, `docs`. Toute nouvelle feature doit respecter cette séparation.",
            ),
            (
                "### 2.2 Frontend (Next.js) règles",
                "Routes par rôle, état loading/error/empty, flux SSO Keycloak, aucun secret serveur dans le bundle client.",
            ),
            (
                "### 2.3 Backend (NestJS) règles",
                "Modules métiers isolés, contrôleurs minces, services testables, guards auth/roles/permissions sur endpoints sensibles.",
            ),
            (
                "### 2.4 Base de données (MySQL + Sequelize)",
                "Migrations versionnées, seeders idempotents, conventions SQL stables, transactions pour opérations critiques.",
            ),
            (
                "### 2.5 Stockage fichiers (S3/MinIO abstraction)",
                "Fichiers pédagogiques via abstraction `FileAsset`, possibilité cloud privé/souverain sans changer métier.",
            ),
            (
                "### 2.6 IA/RAG architecture",
                "`LLMProvider` + `VectorStoreProvider` abstraits, pipeline RAG: upload->extract->chunk->embed->retrieve->answer cité.",
            ),
        ],
    ),
    (
        "## 3. Migration Laravel -> NestJS",
        [
            (
                "### 3.1 Mapping concepts (Controller, Service, Model, Policy, Middleware, Job, Event)",
                "Controller Laravel -> Controller Nest; Service métier explicite; Eloquent Model -> Sequelize Model; Policy -> Guards+Permissions; Middleware -> Nest middleware/guards; Job/Event -> queues/events Nest.",
            ),
            (
                "### 3.2 Mapping base de données (migrations/seeders)",
                "Migrations Laravel deviennent migrations Sequelize CLI atomiques; seeders convertis idempotents avec clés stables.",
            ),
            (
                "### 3.3 Mapping vues/UX legacy vers Next.js",
                "Vue Blade/EJS -> pages Next.js composables; conserver intention UX (header/footer, formulaires, parcours) avec design institutionnel.",
            ),
            (
                "### 3.4 Stratégie incrémentale sans régression",
                "Migrer module par module (auth, users, courses, quiz, docs, IA), garder parité fonctionnelle avant suppression legacy.",
            ),
            (
                "### 3.5 Checklist migration par module",
                "1) inventaire routes, 2) mapping données, 3) API Nest, 4) page Next, 5) tests, 6) audit sécurité, 7) doc.",
            ),
        ],
    ),
    (
        "## 4. IAM/SSO Keycloak",
        [
            (
                "### 4.1 Règles OIDC obligatoires",
                "Authorization Code Flow + PKCE uniquement; interdits: Implicit Flow, ROPC, login local.",
            ),
            (
                "### 4.2 Realm/clients/claims",
                "Realm `wikigouv`; clients `wikigouv-web`, `wikigouv-api`, `wikigouv-admin-service`; claims standards et rôles client.",
            ),
            (
                "### 4.3 Validation JWT côté API",
                "Validation signature JWKS + issuer + audience + expiration, puis extraction rôles depuis `resource_access.wikigouv-api.roles`.",
            ),
            (
                "### 4.4 Interdits IAM",
                "Aucun mot de passe applicatif, aucun secret client côté navigateur, aucun bypass guard en prod.",
            ),
            (
                "### 4.5 Procédure d’onboarding utilisateur",
                "Créer user Keycloak, assigner rôle client, premier login -> sync `UserProfile`, compléter attributs métier côté app.",
            ),
        ],
    ),
    (
        "## 5. RBAC et permissions",
        [
            (
                "### 5.1 Rôles standards",
                "SUPER_ADMIN, ADMIN, FORMATEUR, AGENT, DIRECTION, AUDITEUR.",
            ),
            (
                "### 5.2 Matrice permissions (tableau)",
                "| Rôle | Permissions clés |\n|---|---|\n| SUPER_ADMIN | toutes permissions |\n| ADMIN | USER_MANAGE, COURSE_*, DOCUMENT_*, AUDIT_LOG_VIEW |\n| FORMATEUR | COURSE_CREATE/UPDATE, LESSON_*, QUIZ_CREATE, AI_QUIZ_GENERATE |\n| AGENT | COURSE_READ, QUIZ_SUBMIT, AI_ASSISTANT_USE |\n| DIRECTION | DASHBOARD_VIEW, analytics lecture |\n| AUDITEUR | lecture + audit logs |",
            ),
            (
                "### 5.3 Guards NestJS (Roles + Permissions)",
                "Toujours empiler `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard` sur endpoints sensibles.",
            ),
            (
                "### 5.4 Cas limites et décisions",
                "En cas de rôle manquant: refuser (403) et tracer audit. Aucun fallback permissif.",
            ),
        ],
    ),
    (
        "## 6. Normes de code backend",
        [
            (
                "### 6.1 DTO validation",
                "DTO avec class-validator, pipe global whitelist+forbidNonWhitelisted+transform.",
            ),
            (
                "### 6.2 Services et repositories",
                "Logique métier en services; accès DB via SequelizeService/repositories dédiés.",
            ),
            (
                "### 6.3 Gestion d’erreurs",
                "Erreurs Nest explicites (400/401/403/404), sans stack trace exposée.",
            ),
            ("### 6.4 Logging applicatif", "Logs structurés pino, corrélés request-id, sans secrets."),
            (
                "### 6.5 Audit logs (actions sensibles)",
                "Journaliser création/modification/suppression, changements rôles, certificats, documents, IA sensible.",
            ),
        ],
    ),
    (
        "## 7. Normes de code frontend",
        [
            (
                "### 7.1 Data fetching et gestion d’état",
                "Appels API via `NEXT_PUBLIC_API_URL`, gestion erreurs réseau systématique.",
            ),
            (
                "### 7.2 États UX obligatoires (loading/error/empty)",
                "Chaque page data-driven affiche explicitement ces 3 états.",
            ),
            (
                "### 7.3 Accessibilité minimale",
                "Labels formulaires, contrastes lisibles, navigation clavier, messages erreurs compréhensibles.",
            ),
            (
                "### 7.4 Sécurité front (tokens, secrets)",
                "Aucun secret sensible côté client; token Bearer transmis uniquement aux endpoints API officiels.",
            ),
        ],
    ),
    (
        "## 8. Normes DB Sequelize",
        [
            (
                "### 8.1 Nommage tables/colonnes",
                "Tables snake_case explicites, colonnes stables, conventions homogènes.",
            ),
            (
                "### 8.2 Migrations idempotentes",
                "Jamais modifier migration exécutée; créer migration corrective.",
            ),
            (
                "### 8.3 Seeders idempotents",
                "`ignoreDuplicates` + IDs déterministes pour rejouabilité CI.",
            ),
            (
                "### 8.4 Transactions et contraintes",
                "Transactions pour workflows multi-écritures; contraintes uniques/index cohérents.",
            ),
            (
                "### 8.5 Indexation minimale",
                "Indexer clés de jointure, colonnes de filtrage fréquent, et audits temporels.",
            ),
        ],
    ),
    (
        "## 9. Règles IA/RAG",
        [
            ("### 9.1 Sources autorisées", "Uniquement documents VALIDATED et référentiels internes approuvés."),
            ("### 9.2 Citations obligatoires", "Toute réponse normative inclut source(s), section(s), version(s)."),
            (
                "### 9.3 Anti-hallucination",
                "Si preuve insuffisante: refuser explicitement et proposer démarche d'analyse.",
            ),
            (
                "### 9.4 Validation humaine obligatoire",
                "Quiz/cas générés par IA restent en brouillon jusqu'à validation formateur/admin.",
            ),
            (
                "### 9.5 Journalisation IA",
                "Tracer prompt utile, contexte documentaire, modèle, réponse, citations, décision utilisateur.",
            ),
        ],
    ),
    (
        "## 10. Sécurité & conformité",
        [
            (
                "### 10.1 Secrets et variables d’environnement",
                "Secrets hors Git, `.env` et `.env.example` synchronisés, rotation périodique.",
            ),
            (
                "### 10.2 CORS, helmet, rate limiting",
                "CORS strict par environnement, helmet activé, limites globales + endpoints IA.",
            ),
            (
                "### 10.3 Upload sécurisé",
                "Whitelist MIME, limite taille, quarantaine/scan antimalware prévu.",
            ),
            (
                "### 10.4 PII et données sensibles",
                "Collecte minimale, accès RBAC, journal d'accès, rétention maîtrisée.",
            ),
            (
                "### 10.5 Politique de rétention",
                "Définir durée par type (audit, conversations IA, certificats, pièces uploadées) + purge contrôlée.",
            ),
        ],
    ),
    (
        "## 11. Tests obligatoires",
        [
            (
                "### 11.1 Backend (minimum)",
                "Tests guards JWT/RBAC, création profil, cours, quiz, certificats, upload et IA mock.",
            ),
            (
                "### 11.2 Frontend (minimum)",
                "Rendu par rôle, états non authentifié/unauthorized, catalogue, progression.",
            ),
            ("### 11.3 Contrats API", "Vérifier schémas de réponses clés et codes HTTP attendus."),
            ("### 11.4 Données de test", "Seeders dédiés, stables, rejouables en CI/local."),
            ("### 11.5 Gate qualité CI", "Bloquer merge si build/lint/test échouent."),
        ],
    ),
    (
        "## 12. Playbooks opérationnels",
        [
            (
                "### 12.1 Ajouter endpoint API sécurisé",
                "Créer DTO -> service -> controller, appliquer guards/permissions, ajouter audit, tests et doc API.",
            ),
            (
                "### 12.2 Ajouter page frontend protégée",
                "Créer page + AuthProvider/RequireAuth, gérer loading/error/empty, brancher API token.",
            ),
            (
                "### 12.3 Ajouter migration + seeder",
                "Créer migration atomique + seeder idempotent, exécuter migrate/seed, valider rollback.",
            ),
            (
                "### 12.4 Ajouter rôle/permission Keycloak",
                "Créer rôle client `wikigouv-api`, mapper permission API, tester 401/403/200.",
            ),
            (
                "### 12.5 Ajouter fonctionnalité IA avec citations",
                "Définir source VALIDATED, retrieval, prompt, sortie citée, audit, test hallucination négative.",
            ),
        ],
    ),
    (
        "## 13. Definition of Done",
        [
            (
                "### 13.1 Checklist technique",
                "Code typé, architecture respectée, migrations/seeders fournis, endpoints documentés.",
            ),
            (
                "### 13.2 Checklist sécurité",
                "Guards actifs, secrets protégés, logs et audit couvrent actions sensibles.",
            ),
            (
                "### 13.3 Checklist UX",
                "États loading/error/empty présents, messages clairs, parcours principal complet.",
            ),
            ("### 13.4 Checklist documentation", "README/docs mis à jour dans la même PR."),
        ],
    ),
    (
        "## 14. Anti-patterns interdits",
        [
            (
                "### 14.1 Backend",
                "Fat controllers, bypass DTO, routes sensibles sans guards, ORM multiple.",
            ),
            (
                "### 14.2 Frontend",
                "Erreurs runtime non gérées, secret côté client, appels API hors contrat.",
            ),
            (
                "### 14.3 IAM",
                "Login local, secrets exposés, rôles non alignés Keycloak/API.",
            ),
            (
                "### 14.4 IA",
                "Réponse sans citation, documents non validés, modèle unique hardcodé.",
            ),
            (
                "### 14.5 DevOps",
                "Déploiement sans migration, pas de backup avant purge, merge sans CI verte.",
            ),
        ],
    ),
    (
        "## 15. Commandes standard du projet",
        [
            (
                "### 15.1 Setup local",
                "`npm install` puis `docker compose -f infrastructure/docker-compose.yml up -d`.",
            ),
            ("### 15.2 Démarrage", "`npm run dev:api` et `npm run dev:web`."),
            ("### 15.3 DB migrate/seed", "`npm run db:migrate` puis `npm run db:seed`."),
            ("### 15.4 Build/lint/test", "`npm run build`, `npm run lint`, `npm run test`."),
            (
                "### 15.5 Dépannage fréquent",
                "Vérifier env, état Docker, Keycloak realm, audience JWT, logs API/web.",
            ),
        ],
    ),
    (
        "## 16. Gouvernance de contribution",
        [
            (
                "### 16.1 Convention commits",
                "Commits atomiques orientés domaine (`feat(lms): ...`, `fix(auth): ...`).",
            ),
            (
                "### 16.2 Revue de code",
                "Priorité aux risques sécurité/régression, tests requis, docs synchronisées.",
            ),
            (
                "### 16.3 Gestion incidents / rollback",
                "Runbook: détecter, contenir, rollback DB/app, communiquer impact et correctif.",
            ),
            (
                "### 16.4 Postmortem modèle",
                "Contexte, timeline, cause racine, actions correctives, prévention, responsable et échéance.",
            ),
        ],
    ),
]

for h2, subs in sections:
    agents.append(f"\n{h2}\n")
    for h3, txt in subs:
        agents.append(f"\n{h3}\n{txt}\n")

agents.append("\n## Règles critiques MUST\n")
for i, (r, w, h, e, c) in enumerate(must_rules, 1):
    agents.append(crit_rule("MUST", i, r, w, h, e, c))

agents.append("\n## Règles critiques MUST NOT\n")
for i, (r, w, h, e, c) in enumerate(must_not_rules, 1):
    agents.append(crit_rule("MUST NOT", i, r, w, h, e, c))

agents.append("\n## Exemples concrets ARTF/FinTraX\n")
for i, ex in enumerate(examples_artf, 1):
    agents.append(f"- Exemple {i:02d}: {ex}\n")

agents.append("\n## Tableau route sensible -> guard/permission -> audit requis\n")
agents.append("| Route sensible | Guards | Permission | Audit requis |\n")
agents.append("|---|---|---|---|\n")
rows = [
    (
        "GET /api/courses/public",
        "JwtAuthGuard + RolesGuard + PermissionsGuard",
        "COURSE_READ",
        "Consultation catalogue (optionnel agrégé)",
    ),
    (
        "POST /api/courses/public",
        "JwtAuthGuard + RolesGuard + PermissionsGuard",
        "COURSE_CREATE",
        "COURSE_CREATE avec actor/entity",
    ),
    (
        "PATCH /api/courses/public/:id",
        "JwtAuthGuard + RolesGuard + PermissionsGuard",
        "COURSE_UPDATE",
        "COURSE_UPDATE avant/après",
    ),
    (
        "DELETE /api/courses/public/:id",
        "JwtAuthGuard + RolesGuard + PermissionsGuard",
        "COURSE_DELETE",
        "COURSE_DELETE obligatoire",
    ),
    (
        "POST /api/participants/register",
        "Validation DTO + contrôles métier",
        "N/A (public contrôlé) ou permission dédiée",
        "REGISTER_PARTICIPANT",
    ),
    (
        "GET /api/employees",
        "JwtAuthGuard recommandé selon politique",
        "USER_MANAGE ou lecture RH",
        "EMPLOYEE_LIST accès journalisé",
    ),
    (
        "POST /api/ai/assistant/chat",
        "JwtAuthGuard + PermissionsGuard",
        "AI_ASSISTANT_USE",
        "AI_CHAT prompt/context/réponse",
    ),
    (
        "POST /api/documents/:id/validate",
        "JwtAuthGuard + PermissionsGuard",
        "DOCUMENT_VALIDATE",
        "DOCUMENT_VALIDATE + validateur",
    ),
]
for r in rows:
    agents.append(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} |\n")

(root / "AGENTS.md").write_text("".join(agents), encoding="utf-8")

cats = [
    ("IAM/Keycloak/SSO", 80, "iam"),
    ("Backend NestJS/API", 80, "api"),
    ("DB MySQL/Sequelize/migrations", 80, "db"),
    ("Frontend Next.js/UX", 70, "fe"),
    ("LMS métier", 70, "lms"),
    ("IA/RAG/documents/citations", 60, "ia"),
    ("Sécurité/Conformité/Audit", 30, "sec"),
    ("DevOps local/docker/debug", 30, "ops"),
]

base_terms = {
    "iam": ["realm", "client OIDC", "PKCE", "JWKS", "audience", "issuer", "token expiré", "role mapping", "logout global", "session SSO"],
    "api": ["controller", "service", "guard", "dto", "validation", "exception", "route", "pagination", "transaction", "module"],
    "db": ["migration", "seeder", "index", "contrainte unique", "rollback", "foreign key", "idempotence", "transaction SQL", "charset utf8mb4", "timestamp"],
    "fe": ["route protégée", "loading", "empty state", "error state", "fetch", "hydration", "token bearer", "formulaire", "accessibilité", "responsive"],
    "lms": ["inscription cours", "module", "leçon", "quiz", "tentative", "certificat", "progression", "formateur", "agent", "direction"],
    "ia": ["RAG", "chunk", "embedding", "citation", "hallucination", "document validé", "prompt", "retrieval", "vector store", "modèle"],
    "sec": ["audit log", "PII", "CORS", "helmet", "rate limit", "secret", "upload MIME", "authz", "traçabilité", "rétention"],
    "ops": ["docker compose", "healthcheck", "log tail", "restart service", "env sync", "build", "lint", "test", "port conflict", "seed"],
}

syn = {
    "iam": "authentification fédérée, SSO, IAM",
    "api": "endpoint, API REST, route Nest",
    "db": "schéma, persistance, base de données",
    "fe": "interface web, écran, page",
    "lms": "formation, parcours, apprentissage",
    "ia": "assistant IA, moteur RAG, génération",
    "sec": "sécurité, conformité, contrôle",
    "ops": "exploitation locale, runbook, maintenance",
}

miss = {
    "iam": "keyclok, keycloack, sso0",
    "api": "endpoit, validaton dto, contoller",
    "db": "sequlize, migrtion, seederz",
    "fe": "frontnd, responive, fetsh",
    "lms": "certifcat, progresion, quizz",
    "ia": "halucination, embeding, citatoin",
    "sec": "audti log, securite, corss",
    "ops": "dockr, helthcheck, restat",
}

prio_cycle = ["P1", "P2", "P3"]
lines = [
    "# CODEX_KEYWORDS_SHEET\n",
    "Ce dictionnaire opérationnel couvre 500 entrées K et 100 combinaisons C pour les cas réels Wikigouv ARTF/FinTraX.\n",
]
idx = 1
for cat_name, count, key in cats:
    lines.append(f"\n## Domaine: {cat_name}\n")
    terms = base_terms[key]
    for i in range(count):
        term = terms[i % len(terms)]
        kid = f"K{idx:03d}"
        lines.append(f"\n### ID: {kid}\n")
        lines.append(f"- Mot-clé principal: {term} {idx}\n")
        lines.append(f"- Synonymes FR métier: {syn[key]}\n")
        lines.append(f"- Variantes fautives fréquentes: {miss[key]}\n")
        lines.append(f"- Intention utilisateur probable: Demander une action concrète sur {cat_name.lower()} pour ARTF/FinTraX.\n")
        lines.append("- Risque si mauvaise interprétation: Régression métier, erreur de sécurité ou retard de déploiement.\n")
        lines.append("- Réponse/Action Codex recommandée: Vérifier contexte repo, appliquer règle AGENTS correspondante, exécuter changement minimal traçable, tester et documenter.\n")
        lines.append(f"- Exemple réel Wikigouv: Cas ARTF #{idx} sur {term} dans un flux FinTraX (direction, rôle, contrôle et audit).\n")
        lines.append(f"- Niveau priorité: {prio_cycle[idx % 3]}\n")
        idx += 1

assert idx - 1 == 500

lines.append("\n## Combinaisons réelles\n")
for c in range(1, 101):
    cid = f"C{c:03d}"
    cat_a = cats[(c - 1) % len(cats)][0]
    cat_b = cats[(c) % len(cats)][0]
    lines.append(f"\n### ID: {cid}\n")
    lines.append(f"- Combinaison mots-clés: {cat_a} + {cat_b} + incident {c}\n")
    lines.append(f"- Scénario utilisateur réel: Un agent ARTF signale un blocage FinTraX impliquant {cat_a.lower()} et {cat_b.lower()}.\n")
    lines.append("- Diagnostic rapide: Vérifier d'abord configuration, droits IAM, état API/DB, puis journaux d'audit associés.\n")
    lines.append("- Plan d’action en 5 étapes:\n")
    lines.append("  1. Reproduire le cas sur environnement local contrôlé.\n")
    lines.append("  2. Vérifier variables d’environnement, token, rôles et permissions effectives.\n")
    lines.append("  3. Contrôler endpoint/API/DB concernés avec logs corrélés.\n")
    lines.append("  4. Appliquer correctif minimal conforme AGENTS.md puis relancer tests ciblés.\n")
    lines.append("  5. Documenter la résolution et l’impact dans la trace d’audit/projet.\n")
    lines.append("- Pièges à éviter: Patch rapide sans test, bypass sécurité, absence de journalisation, confusion rôle/permission.\n")
    lines.append("- Signal de validation finale: Flux rétabli, tests verts, audit présent, et absence de régression UX/sécurité.\n")

(root / "docs" / "CODEX_KEYWORDS_SHEET.md").write_text("".join(lines), encoding="utf-8")
print("generated")

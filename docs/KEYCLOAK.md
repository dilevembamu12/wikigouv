# Keycloak - Wikigouv

## Realm

- `wikigouv` (configurable via env)

## Clients

1. `wikigouv-web`
- Type: public
- Flow: Authorization Code + PKCE
- Redirect URI dev: `http://localhost:3000/*`
- Logout redirect URI dev: `http://localhost:3000/login`

2. `wikigouv-api`
- Audience API
- Client roles:
  - `SUPER_ADMIN`, `ADMIN`, `FORMATEUR`, `AGENT`, `DIRECTION`, `AUDITEUR`

3. `wikigouv-admin-service` (optionnel)
- Type: confidential
- Service account activé uniquement si besoin Admin API

## Claims / mappings

- `sub`, `email`, `given_name`, `family_name`, `name`
- roles préférés dans `resource_access.wikigouv-api.roles`
- `sub` dépend du scope OIDC `basic` (Keycloak 25+): ce scope doit être présent dans les scopes par défaut du realm/client.

### Important: scopes par défaut à conserver

- `basic`
- `profile`
- `email`
- `roles`
- `web-origins`
- `acr`
- `wikigouv-api-audience`

Si `basic` est absent, l'access token peut ne pas contenir `sub`.

## Sécurité

- Pas de password local dans Wikigouv
- Pas d’Implicit Flow
- Pas de ROPC
- Validation JWT par `issuer + audience + JWKS`
- Rôles Keycloak mappés côté API vers permissions métier (RBAC fin)
- Toutes les routes LMS sensibles exigent `JwtAuthGuard + RolesGuard + PermissionsGuard`

## Réimport du realm (dev)

Le `start-dev --import-realm` n'écrase généralement pas un realm existant.
Si `wikigouv` existe déjà, supprimer/recréer le realm pour appliquer les changements de `realm-wikigouv.json`, puis se reconnecter pour obtenir un nouveau token.

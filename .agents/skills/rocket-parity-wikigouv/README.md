# rocket-parity-wikigouv

Skill local pour exécuter des passes de parité Rocket LMS 1:1 dans Wikigouv.

## Invocation côté Codex

Utiliser dans le prompt:

- `utilise le skill rocket-parity-wikigouv`
- `applique rocket-parity-wikigouv sur /admin/webinars/:id/edit/course`

## Audit rapide local

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/rocket-parity-wikigouv/scripts/quick-parity-audit.ps1 -Target webinars-create-content.ejs
```

Ce script affiche:
- les champs `name=""` côté vue
- les mappings controller web
- les endpoints API
- la présence des champs clés côté modèle Sequelize

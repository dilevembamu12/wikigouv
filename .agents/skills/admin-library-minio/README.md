# admin-library-minio

Skill local pour industrialiser la gestion `/admin/library` avec MinIO, parité Rocket et sécurité RBAC.

## Invocation dans Codex

- `utilise le skill admin-library-minio`
- `applique admin-library-minio sur /admin/library`

## Audit rapide local

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/admin-library-minio/scripts/quick-library-audit.ps1
```

Ce script vérifie rapidement:
- routes/controllers library
- guards/RBAC write roles
- variables env MinIO library
- endpoints picker/presign/items
- présence des assets JS/CSS liés


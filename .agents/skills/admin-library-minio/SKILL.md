---
name: admin-library-minio
description: >
  Implémenter et maintenir la parité Rocket du filemanager /admin/library
  (MinIO), avec mode picker, RBAC staff configurable, sécurité CSP, et UX
  fiable pour upload/preview/rename/move/delete.
---

# Admin Library MinIO

## Quand utiliser ce skill

Utiliser ce skill pour toute demande liée à:
- `/admin/library`
- file manager admin
- picker de fichiers pour formulaires
- upload/preview/move/rename/delete sur MinIO
- RBAC d'écriture (`LIBRARY_WRITE_ROLES`)
- erreurs CSP/Swal/scripts bloqués

## Objectif

Garantir une implémentation robuste et exploitable en production:
1. parité visuelle et fonctionnelle Rocket du filemanager
2. persistance MinIO correcte (bucket/prefix/sanitation)
3. mode picker réutilisable pour formulaires admin
4. sécurité (guards, RBAC, CSP, erreurs maîtrisées)

## Procédure standard

1. **Vérifier routes web**
- `GET /admin/library`
- `GET /admin/library/items`
- `POST /admin/library/upload`
- `POST /admin/library/folder`
- `POST /admin/library/rename`
- `POST /admin/library/move`
- `POST /admin/library/delete`
- `GET /admin/library/presign`
- Alias compat: `/admin/webinars/library/items`

2. **Vérifier sécurité**
- `WebAuthGuard` actif sur toutes les routes
- contrôle rôles d'écriture via `LIBRARY_WRITE_ROLES`
- write actions => 403 JSON explicite si non autorisé

3. **Vérifier MinIO**
- bucket configuré (`MINIO_LIBRARY_BUCKET`, ex: `general`)
- prefix cible respecté (`Fintrax/Library/...`)
- sanitation anti traversal (`..`, paths absolus, slashs invalides)
- preview basé sur clé réelle existante

4. **Vérifier UI/JS**
- JS externe uniquement (pas inline non autorisé)
- SweetAlert local (pas CDN)
- actions actives: upload, new folder, rename, move, delete, preview
- états `loading/error/empty` cohérents
- thumbnails/list/sort fonctionnels

5. **Vérifier mode picker**
- `?picker=1&target=<id>&folder=<prefix>`
- `postMessage` => `{ type: 'LIBRARY_FILE_SELECTED', target, key }`
- branchement sur formulaires cours/catégories

## Checklist de validation

- accès staff authentifié OK
- lecture items OK
- upload OK (MIME/taille)
- dossier création OK
- rename/move/delete OK
- preview presigned OK (pas de `NoSuchKey`)
- picker injecte la clé dans le bon input
- pas d’erreurs CSP console

## Erreurs fréquentes

- bucket/prefix incohérents (clé stockée != clé lue en preview)
- action write exposée sans check rôle
- CDN Swal bloqué par CSP
- mode picker sans `postMessage` ou target perdu
- thumbnails non générés faute d’URL presigned valide

## Raccourci d'utilisation

- `utilise admin-library-minio pour auditer /admin/library`
- `passe complète Rocket filemanager + RBAC + picker`


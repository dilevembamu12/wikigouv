---
name: rocket-parity-wikigouv
description: >
  Exécuter des passes de parité Rocket LMS 1:1 dans Wikigouv (NestJS + EJS), avec
  couverture complète routes/controllers/dto/ajax/views/assets, persistance field-by-field,
  et validation UI/API sans gap.
---

# Rocket Parity Wikigouv

## Quand utiliser ce skill

Utiliser ce skill quand la demande contient:
- "parité Rocket", "0 gap", "pixel perfect Rocket"
- migration d'un écran Blade Rocket vers vues `apps/web/views`
- correction d'un flux où les champs ne se préremplissent/persistent pas
- alignement route web + route API + DTO + modèle + JS + UX

## Objectif

Livrer un écran/fonction **fidèle Rocket** avec:
1. Parité visuelle (classes, labels, spacing, menus d'action, empty/error states)
2. Parité fonctionnelle (création, édition, suppression, listing, filtres, pagination)
3. Parité données (préremplissage et sauvegarde field-by-field)
4. Parité intégration (RBAC guard, API, assets JS, feedback UX)

## Procédure standard (ordre obligatoire)

1. **Inventaire source Rocket**
- Identifier la vue canonique (Blade) + contrôleur + JS utilitaire.
- Lister tous les champs exacts + conditions d'affichage + actions.

2. **Audit backend Wikigouv**
- Vérifier modèle Sequelize + colonne DB + migration.
- Vérifier endpoints API (GET/POST/PATCH/DELETE) et payloads.
- Vérifier guards/permissions.

3. **Audit web controller**
- Vérifier mapping `form -> controller web -> API`.
- Vérifier normalisation (types numériques, booléens, slug, arrays).

4. **Audit vue + JS**
- Vérifier `name=""` de chaque champ.
- Vérifier préremplissage depuis DB.
- Vérifier dynamique JS (toggle, dépendances, modales, picker, confirmations).
- Vérifier CSP: pas de CDN bloqué, pas d'inline script non autorisé.

5. **Corrections**
- Corriger persistance field-by-field.
- Corriger préremplissage edit.
- Corriger erreurs UX (messages opaques, save failed non explicite).

6. **Validation**
- Build API + Web.
- Tests manuels ciblés sur le flux exact.
- Vérifier rechargement écran = données intactes.

## Checklist field-by-field (obligatoire)

Pour chaque écran Rocket, valider:
- champ visible
- champ posté (`name`)
- champ reçu (`@Body`)
- champ transmis à API
- champ persisté DB
- champ relu DB
- champ réaffiché en edit

Si un seul maillon manque => parité non atteinte.

## Contrats techniques Wikigouv

- Backend: NestJS + Sequelize uniquement
- DB: migration dédiée pour tout nouveau champ
- API sensible: guards RBAC actifs
- Front: états loading/error/empty
- Erreurs: message utile sans stack exposée

## Convention de livraison

Toujours répondre avec:
1. Ce qui a été corrigé (haut niveau)
2. Fichiers touchés
3. Vérification effectuée (build/tests)
4. Ce qu'il reste éventuellement

## Erreurs fréquentes à éviter

- Champ affiché mais non persisté
- `Number(x) || null` qui supprime la valeur `0`
- Slug auto qui écrase la valeur existante en édition
- Données array stockées string non rechargées côté UI
- CDN SweetAlert bloqué par CSP

## Raccourci d'utilisation

Dans le prompt:
- "Utilise le skill `rocket-parity-wikigouv` sur `/admin/webinars/:id/edit/course`"
- "Passe field-by-field complète sans gap"


#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/www/wwwroot/wikigouv.gouvgpt.com"
BRANCH="main"
REMOTE="origin"
HEALTH_WEB_URL="http://127.0.0.1:3000/"
HEALTH_API_URL="http://127.0.0.1:4000/api/health"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

rollback() {
  if [[ -n "${PREV_COMMIT:-}" ]]; then
    log "Rollback automatique vers ${PREV_COMMIT}"
    git reset --hard "${PREV_COMMIT}" || true
    pm2 restart wikigouv-api wikigouv-web || pm2 restart all || true
  fi
}

trap 'log "Erreur ligne ${LINENO}"; rollback; exit 1' ERR

log "Debut deploiement Wikigouv (${BRANCH})"
cd "${APP_DIR}"

command -v git >/dev/null 2>&1 || { log "git manquant"; exit 1; }
command -v npm >/dev/null 2>&1 || { log "npm manquant"; exit 1; }
command -v pm2 >/dev/null 2>&1 || { log "pm2 manquant"; exit 1; }
command -v curl >/dev/null 2>&1 || { log "curl manquant"; exit 1; }

if [[ ! -f package.json ]]; then
  log "package.json introuvable dans ${APP_DIR}"
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${CURRENT_BRANCH}" != "${BRANCH}" ]]; then
  log "Branche courante=${CURRENT_BRANCH}, bascule vers ${BRANCH}"
  git checkout "${BRANCH}"
fi

PREV_COMMIT="$(git rev-parse HEAD)"
log "Commit avant deploiement: ${PREV_COMMIT}"

if [[ -n "$(git status --porcelain)" ]]; then
  STASH_NAME="pre-deploy-$(date '+%Y%m%d-%H%M%S')"
  log "Modifications locales detectees, stash ${STASH_NAME}"
  git stash push -u -m "${STASH_NAME}" >/dev/null
fi

log "Mise a jour code source"
git fetch --prune "${REMOTE}"
git reset --hard "${REMOTE}/${BRANCH}"

log "Preparation dossiers logs"
mkdir -p logs/api logs/web

log "Installation dependances (npm ci)"
npm ci

log "Build monorepo"
npm run build

log "Migrations base"
npm run db:migrate

log "Seed idempotent (si supporte)"
npm run db:seed || log "Seed ignore (non bloquant)"

log "Redemarrage PM2"
if [[ -f ecosystem.config.js ]]; then
  pm2 startOrReload ecosystem.config.js --env production
else
  pm2 restart wikigouv-api wikigouv-web || pm2 restart all
fi
pm2 save

log "Healthcheck API ${HEALTH_API_URL}"
curl -fsS "${HEALTH_API_URL}" >/dev/null

log "Healthcheck WEB ${HEALTH_WEB_URL}"
curl -fsS "${HEALTH_WEB_URL}" >/dev/null

NEW_COMMIT="$(git rev-parse HEAD)"
log "Deploiement termine. Commit actif: ${NEW_COMMIT}"

param(
  [string]$ComposeFile = "infrastructure/docker-compose.yml"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$message) {
  Write-Host ""
  Write-Host "==> $message" -ForegroundColor Cyan
}

Write-Step "Arrêt de la stack locale"
docker compose -f $ComposeFile down

Write-Step "Recherche des volumes MySQL Wikigouv"
$volumes = docker volume ls --format "{{.Name}}" | Where-Object { $_ -match "wikigouv.*mysql.*data|mysql_data" }

if (-not $volumes) {
  Write-Host "Aucun volume MySQL trouvé. On continue." -ForegroundColor Yellow
} else {
  foreach ($volume in $volumes) {
    Write-Host "Suppression volume: $volume" -ForegroundColor Yellow
    docker volume rm $volume | Out-Null
  }
}

Write-Step "Redémarrage de la stack locale"
docker compose -f $ComposeFile up -d

Write-Step "Vérification endpoint OIDC"
Start-Sleep -Seconds 8
try {
  $oidc = Invoke-WebRequest -Uri "http://localhost:8080/realms/wikigouv/.well-known/openid-configuration" -UseBasicParsing -TimeoutSec 20
  Write-Host "OIDC OK (HTTP $($oidc.StatusCode))" -ForegroundColor Green
} catch {
  Write-Host "OIDC non prêt immédiatement. Vérifie les logs keycloak: docker logs -f wikigouv_keycloak_local" -ForegroundColor Yellow
}

Write-Step "Terminé"
Write-Host "Realm rechargé depuis infrastructure/keycloak/realm-wikigouv.json (si import appliqué)." -ForegroundColor Green


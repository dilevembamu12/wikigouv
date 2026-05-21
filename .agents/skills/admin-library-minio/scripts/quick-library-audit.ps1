param()

$ErrorActionPreference = "Stop"

Write-Host "== Admin Library MinIO Quick Audit =="

$root = Resolve-Path "."

Write-Host "`n[1] Recherche controller/routes library"
$webCtrl = "$root\apps\web\src\controllers"
if (Test-Path $webCtrl) {
  Select-String -Path "$webCtrl\*.ts" -Pattern "admin/library|library/items|library/upload|library/folder|library/rename|library/move|library/delete|library/presign|webinars/library/items|WebAuthGuard|LIBRARY_WRITE_ROLES" |
    ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
}

Write-Host "`n[2] Recherche service MinIO library"
$apiSrc = "$root\apps\api\src"
if (Test-Path $apiSrc) {
  Select-String -Path "$apiSrc\**\*.ts" -Pattern "MINIO_LIBRARY_BUCKET|library|minio|presign|signed|bucket|Fintrax|Library" |
    ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
}

Write-Host "`n[3] Variables env library"
$envFiles = @("$root\.env", "$root\.env.example")
foreach ($f in $envFiles) {
  if (Test-Path $f) {
    Write-Host "`nFile: $f"
    Select-String -Path $f -Pattern "^LIBRARY_WRITE_ROLES=|^MINIO_LIBRARY_BUCKET=|^MINIO_|^S3_" |
      ForEach-Object { $_.Line.Trim() }
  }
}

Write-Host "`n[4] Assets UI library"
$publicDir = "$root\apps\web\public"
if (Test-Path $publicDir) {
  Get-ChildItem -Path $publicDir -Recurse -File |
    Where-Object { $_.Name -match "library|sweetalert2" } |
    Select-Object -ExpandProperty FullName
}

Write-Host "`n[OK] Audit termine."

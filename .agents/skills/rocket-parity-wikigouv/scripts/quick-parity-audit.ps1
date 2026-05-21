param(
  [Parameter(Mandatory = $false)]
  [string]$Target = "webinars-create-content.ejs"
)

$ErrorActionPreference = "Stop"

Write-Host "== Rocket Parity Quick Audit =="
Write-Host "Target: $Target"

$root = Resolve-Path "."

Write-Host "`n[1] Champs HTML name=..."
Get-ChildItem -Path "$root\apps\web\views" -Recurse -File |
  Where-Object { $_.FullName -like "*$Target*" -or $_.Name -eq $Target } |
  ForEach-Object {
    Write-Host "`nFile: $($_.FullName)"
    Select-String -Path $_.FullName -Pattern 'name="[^"]+"' | ForEach-Object {
      $_.Line.Trim()
    }
  }

Write-Host "`n[2] Endpoints cours (web controller)"
Select-String -Path "$root\apps\web\src\controllers\webinars.controller.ts" -Pattern "webinars/create|edit/course|@Body|metadata|categoryId|subCategoryIds|accessDays|capacity|points|tags" |
  ForEach-Object { "$($_.LineNumber): $($_.Line.Trim())" }

Write-Host "`n[3] Endpoints cours (api controller)"
Select-String -Path "$root\apps\api\src\admin\admin.controller.ts" -Pattern "education/courses|createCourse|updateCourse|metadata" |
  ForEach-Object { "$($_.LineNumber): $($_.Line.Trim())" }

Write-Host "`n[4] Modele Sequelize Course"
Select-String -Path "$root\apps\api\src\database\sequelize.service.ts" -Pattern "Course =|metadata|slug|categoryId|createdById" |
  ForEach-Object { "$($_.LineNumber): $($_.Line.Trim())" }

Write-Host "`n[OK] Audit rapide termine."

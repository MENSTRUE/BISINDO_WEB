\
$ErrorActionPreference = "Stop"

$folders = @(
    "frontend\src\assets",
    "frontend\src\components\ui",
    "frontend\src\components\camera",
    "frontend\src\components\recognition",
    "frontend\src\components\landmarks",
    "frontend\src\components\transcript",
    "frontend\src\components\navigation",
    "frontend\src\layouts",
    "frontend\src\pages",
    "frontend\src\hooks",
    "frontend\src\services",
    "frontend\src\utils",
    "frontend\src\constants",
    "frontend\src\styles",
    "frontend\public",
    "backend\app\api",
    "backend\app\core",
    "backend\app\inference",
    "backend\app\models",
    "backend\app\preprocessing",
    "backend\app\schemas",
    "backend\app\services",
    "backend\model_files\v1",
    "backend\model_files\v2",
    "docs"
)

foreach ($folder in $folders) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
}

Write-Host "BISINDO web project structure created."

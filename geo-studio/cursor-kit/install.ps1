# Install cursor-kit into current project (PowerShell)
param(
    [string]$KitRoot = $PSScriptRoot
)

$Proj = Get-Location
Write-Host "Installing cursor-kit from $KitRoot into $Proj"

# .cursor (merge)
$cursorDest = Join-Path $Proj ".cursor"
if (-not (Test-Path $cursorDest)) { New-Item -ItemType Directory -Path $cursorDest | Out-Null }
Copy-Item -Recurse -Force (Join-Path $KitRoot ".cursor\*") $cursorDest

# directories
@("specs", "tasks", "bridge", "eval\task_validation", "eval\golden_cases\example", "scripts") | ForEach-Object {
    $p = Join-Path $Proj $_
    if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
}

# templates (no overwrite)
$copyIfMissing = @(
    @("specs\SPEC-TEMPLATE.yaml", "specs"),
    @("tasks\TASK-TEMPLATE.yaml", "tasks"),
    @("project.config.yaml", "."),
    @("STANDARDS.md", "."),
    @("scripts\validate_task.py", "scripts"),
    @("eval\task_validation\TEMPLATE.checklist.md", "eval\task_validation"),
    @("eval\golden_cases\example\example-001.json", "eval\golden_cases\example")
)
foreach ($item in $copyIfMissing) {
    $src = Join-Path $KitRoot $item[0]
    $destDir = Join-Path $Proj $item[1]
    $dest = Join-Path $destDir (Split-Path $item[0] -Leaf)
    if ((Test-Path $src) -and -not (Test-Path $dest)) {
        Copy-Item $src $dest
        Write-Host "  + $dest"
    }
}

# bridge always refresh (small files)
Copy-Item -Force (Join-Path $KitRoot "bridge\*") (Join-Path $Proj "bridge\")

Write-Host ""
Write-Host "Done. Next in Cursor:"
Write-Host "  @.cursor/AGENTS.md @specs/SPEC-TEMPLATE.yaml"
Write-Host ""
Write-Host "Optional: pip install pyyaml  # for scripts/validate_task.py"

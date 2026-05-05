<#
PowerShell helper to run the per-frame runner inside WSL if available.
Run: .\run-local.ps1
#>

Write-Host "Per-frame local runner helper"

# Recommend WSL for Windows users
if (Get-Command wsl -ErrorAction SilentlyContinue) {
    Write-Host "Detected WSL. To run in WSL, open a WSL shell and run './run-local.sh' inside 'services/perframe'."
    Write-Host "Example (PowerShell):"
    Write-Host "  wsl bash -lc 'cd /mnt/c/$(Get-Location -replace '\\','/'); cd services/perframe; ./run-local.sh'"
    Write-Host "(Path conversion may require adjusting the /mnt/c/ path for your repo location.)"
} else {
    Write-Host "WSL not found. To run natively on Windows, install Python 3.11+, ffmpeg, and Visual C++ Build Tools or use Conda."
    Write-Host "See services/perframe/README_NO_DOCKER.md for full instructions."
}

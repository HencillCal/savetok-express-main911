param(
  [string]$ProjectRef,
  [string]$BitlyToken,
  [string]$RepoRoot = "C:\Users\Jinwiil Onginjo\Desktop\savetok-express-main"
)

Set-StrictMode -Version Latest

function Abort([string]$msg) {
  Write-Host "ERROR: $msg" -ForegroundColor Red
  exit 1
}

# Prompt for missing inputs
if (-not $ProjectRef) {
  $ProjectRef = Read-Host "Enter Supabase project-ref (leave empty if already linked)"
}
if (-not $BitlyToken) {
  $BitlyToken = Read-Host -AsSecureString "Enter BITLY_TOKEN (will not echo)" | ConvertFrom-SecureString
  # ConvertFrom-SecureString returns encrypted string; for simplicity ask plain if encrypted format not wanted
  try {
    $BitlyToken = Read-Host "Re-enter BITLY_TOKEN (plain text)"
  } catch {}
}

# Ensure repo path
if (-not (Test-Path $RepoRoot)) {
  Write-Host "Repo root path $RepoRoot not found." -ForegroundColor Yellow
  $alt = Read-Host "Enter repo root path (or press Enter to abort)"
  if (-not $alt) { Abort "Repo root not found." }
  $RepoRoot = $alt
}

Set-Location $RepoRoot
Write-Host "Working directory:" (Get-Location)

# Verify function source exists
if (-not (Test-Path .\supabase\functions\tinyurl-tools\index.ts)) {
  Abort "Function source file not found at supabase/functions/tinyurl-tools/index.ts. Run this from the repo root or set -RepoRoot correctly."
}

# Check Docker
$dockerOk = $false
try {
  docker --version | Out-Null
  docker info | Out-Null
  $dockerOk = $true
} catch {
  Write-Host "Docker not running or not available." -ForegroundColor Yellow
}

if (-not $dockerOk) {
  # Try to start Docker Desktop if present
  $possiblePaths = @("C:\Program Files\Docker\Docker\Docker Desktop.exe", "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe")
  $started = $false
  foreach ($p in $possiblePaths) {
    if (Test-Path $p) {
      Write-Host "Attempting to start Docker Desktop at $p..." -ForegroundColor Cyan
      Start-Process -FilePath $p -WindowStyle Minimized
      Start-Sleep -Seconds 6
      # give it time to start
      for ($i=0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        try { docker info | Out-Null; $dockerOk = $true; break } catch {}
      }
      if ($dockerOk) { $started = $true; break }
    }
  }
  if (-not $dockerOk) {
    Write-Host "Docker is not running. The Supabase CLI builds functions with Docker." -ForegroundColor Yellow
    $cont = Read-Host "Continue anyway (deploy may fail) ? [y/N]"
    if ($cont -ne 'y' -and $cont -ne 'Y') { Abort "Please start Docker and re-run the script." }
  }
}

# Ensure supabase CLI available via npx
try {
  npx --version | Out-Null
} catch {
  Abort "npx is not available. Install Node/npm or use PowerShell with npm available." }

# Link project (optional) - will succeed if already linked
if ($ProjectRef) {
  Write-Host "Linking project: $ProjectRef" -ForegroundColor Cyan
  npx supabase link --project-ref $ProjectRef
} else {
  Write-Host "No project-ref provided; assuming project already linked in this repo." -ForegroundColor Cyan
}

# Set the secret
Write-Host "Setting BITLY_TOKEN secret in Supabase..." -ForegroundColor Cyan
$n = npx supabase secrets set BITLY_TOKEN="$BitlyToken" --project-ref $ProjectRef
Write-Host $n

# Deploy function
Write-Host "Deploying tinyurl-tools function..." -ForegroundColor Cyan
try {
  npx supabase functions deploy tinyurl-tools --project-ref $ProjectRef --debug
} catch {
  Write-Host "Deploy command finished with errors (see output above)." -ForegroundColor Yellow
}

# Invoke function for smoke test
Write-Host "Invoking tinyurl-tools (shorten via Bitly) for smoke test..." -ForegroundColor Cyan
try {
  npx supabase functions invoke tinyurl-tools --project-ref $ProjectRef --body '{"action":"shorten","url":"https://example.com","provider":"bitly"}'
} catch {
  Write-Host "Invoke failed or returned error; check function logs." -ForegroundColor Yellow
}

Write-Host "Tailing function logs (Ctrl+C to stop)..." -ForegroundColor Cyan
npx supabase functions logs tinyurl-tools --project-ref $ProjectRef --tail

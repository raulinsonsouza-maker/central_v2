# Deploy rápido: build no PC → envia .next → reinicia PM2 na VPS.
# Uso (PowerShell, na raiz do projeto):
#   npm run deploy:vps
#   npm run deploy:vps -- -SkipBuild
#   npm run deploy:vps -- -GitPull -Migrate
#
# Pré-requisito: SSH sem senha (chave) para root@VPS_HOST
# Config: deploy/vps.local.env (copie de deploy/vps.env.example)

param(
  [switch]$SkipBuild,
  [switch]$GitPull,
  [switch]$Migrate,
  [string]$VpsHost,
  [string]$VpsUser,
  [string]$VpsPath,
  [string]$Pm2App = "central-inout"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Load-EnvFile($path) {
  if (-not (Test-Path $path)) { return @{} }
  $vars = @{}
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $i = $line.IndexOf("=")
    if ($i -lt 1) { return }
    $k = $line.Substring(0, $i).Trim()
    $v = $line.Substring($i + 1).Trim().Trim('"').Trim("'")
    $vars[$k] = $v
  }
  return $vars
}

$cfg = Load-EnvFile (Join-Path $Root "deploy\vps.local.env")
if (-not $cfg.Count) {
  $cfg = Load-EnvFile (Join-Path $Root "deploy\vps.env.example")
}

if (-not $VpsHost) { $VpsHost = $cfg["VPS_HOST"] }
if (-not $VpsUser) { $VpsUser = $cfg["VPS_USER"] }
if (-not $VpsPath) { $VpsPath = $cfg["VPS_PATH"] }
if ($cfg["PM2_APP"]) { $Pm2App = $cfg["PM2_APP"] }

if (-not $VpsHost -or -not $VpsUser -or -not $VpsPath) {
  Write-Error "Configure deploy/vps.local.env (copie de deploy/vps.env.example)"
}

$Remote = "${VpsUser}@${VpsHost}"
Write-Host "==> Deploy para $Remote:$VpsPath"

if ($GitPull) {
  Write-Host "==> git pull na VPS"
  ssh $Remote "cd '$VpsPath' && git pull"
}

if (-not $SkipBuild) {
  Write-Host "==> npm run build (local)"
  npm run build
  if (-not (Test-Path ".next")) {
    Write-Error "Build falhou: pasta .next não encontrada"
  }
}

Write-Host "==> Enviando .next para a VPS (pode levar 1-3 min)"
ssh $Remote "rm -rf '$VpsPath/.next'"
scp -r ".next" "${Remote}:${VpsPath}/"

if ($Migrate) {
  Write-Host "==> prisma migrate deploy na VPS"
  ssh $Remote "cd '$VpsPath' && npx prisma migrate deploy"
}

Write-Host "==> pm2 restart $Pm2App"
ssh $Remote "pm2 restart '$Pm2App' --update-env && pm2 save"

Write-Host "==> Deploy concluído — https://hub.prospectads.com.br"

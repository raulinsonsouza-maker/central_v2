#!/usr/bin/env bash
# Deploy manual na VPS Debian após git pull.
# Uso: ./scripts/deploy-vps.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APP_NAME="central-inout"

echo "==> Deploy em $ROOT"

if [ ! -f .env ]; then
  echo "Erro: arquivo .env não encontrado. Copie de .env.example e configure."
  exit 1
fi

echo "==> Instalando dependências"
npm ci

echo "==> Prisma generate + migrate"
npx prisma generate
npx prisma migrate deploy

echo "==> Build Next.js"
npm run build

echo "==> Reiniciando PM2"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME"
else
  pm2 start ecosystem.config.cjs
fi

pm2 save

echo "==> Deploy concluído"
pm2 status "$APP_NAME"

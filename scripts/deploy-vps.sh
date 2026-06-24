#!/usr/bin/env bash
# Deploy manual na VPS Debian após git pull.
# Reinicia APENAS o processo PM2 "central-inout" — não mexe em outros serviços.
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

# Carrega PORT do .env (default 5000)
APP_PORT="5000"
if grep -qE '^PORT=' .env; then
  APP_PORT="$(grep -E '^PORT=' .env | tail -1 | cut -d= -f2- | tr -d '"'"'"' | tr -d ' ')"
fi

port_in_use() {
  ss -tln 2>/dev/null | grep -q ":${1} " || netstat -tln 2>/dev/null | grep -q ":${1} "
}

if port_in_use "$APP_PORT"; then
  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    echo "==> Porta $APP_PORT em uso (provavelmente por $APP_NAME — ok)"
  else
    echo "Erro: porta $APP_PORT já está em uso por outro serviço."
    echo "Defina PORT=<porta_livre> no .env e ajuste o upstream no nginx."
    exit 1
  fi
fi

echo "==> Instalando dependências"
npm ci

echo "==> Prisma generate + migrate"
npx prisma generate
npx prisma migrate deploy

echo "==> Build Next.js"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
npm run build

echo "==> Reiniciando apenas PM2: $APP_NAME (porta $APP_PORT)"
export PORT="$APP_PORT"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start ecosystem.config.cjs
fi

pm2 save

echo "==> Deploy concluído (outros processos PM2/docker/nginx não foram alterados)"
pm2 status "$APP_NAME"

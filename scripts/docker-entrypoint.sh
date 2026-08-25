#!/bin/sh
set -e
echo "==> prisma migrate deploy"
npx prisma migrate deploy
echo "==> starting next on :${PORT:-5010}"
exec npx next start -H 0.0.0.0 -p "${PORT:-5010}"

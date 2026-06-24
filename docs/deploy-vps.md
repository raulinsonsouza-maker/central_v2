# Deploy na VPS Debian

Repositório: [github.com/raulinsonsouza-maker/central_v2](https://github.com/raulinsonsouza-maker/central_v2)

Stack: **Node 20 + PM2 + PostgreSQL (Docker) + nginx + certbot**

## 1. Preparar a VPS (uma vez)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx certbot python3-certbot-nginx ufw docker.io docker-compose-plugin

# Node.js 20 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

sudo systemctl enable --now docker
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 2. Clonar o projeto

```bash
sudo mkdir -p /var/www/central-inout
sudo chown $USER:$USER /var/www/central-inout
git clone https://github.com/raulinsonsouza-maker/central_v2.git /var/www/central-inout
cd /var/www/central-inout
```

## 3. Banco de dados

```bash
docker compose up -d
```

Troque a senha padrão `admin` em produção (ajuste `POSTGRES_PASSWORD` no `docker-compose.yml` e `DATABASE_URL` no `.env`).

## 4. Variáveis de ambiente

```bash
cp .env.example .env
nano .env
```

Mínimo em produção:

```env
NODE_ENV=production
DATABASE_URL="postgresql://postgres:SENHA_FORTE@127.0.0.1:5432/inout_central?schema=public"
ADMIN_SECRET="token-forte-admin"
SYNC_CRON_TOKEN="token-forte-sync"
```

Credenciais de API podem ficar no banco (Admin > Integrações) ou no `.env`.

Logos: sem `BLOB_READ_WRITE_TOKEN`, arquivos vão para `public/logos/` (persistem entre deploys).

## 5. Primeiro deploy

```bash
chmod +x scripts/deploy-vps.sh
./scripts/deploy-vps.sh
pm2 startup   # executar o comando que o PM2 imprimir (com sudo)
```

## 6. nginx + HTTPS

```bash
sudo cp deploy/nginx-central.conf.example /etc/nginx/sites-available/central-inout
sudo nano /etc/nginx/sites-available/central-inout   # ajuste server_name
sudo ln -sf /etc/nginx/sites-available/central-inout /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d seu-dominio.com.br
```

## 7. Sync diário (cron)

Ver [sync-cron.md](./sync-cron.md) — seção **VPS Debian**.

## 8. Atualizações (deploy manual)

```bash
ssh usuario@sua-vps
cd /var/www/central-inout
git pull
./scripts/deploy-vps.sh
```

## 9. Migrar dados do Replit (opcional)

```bash
# No Replit: pg_dump ...
docker exec -i inout_central_db psql -U postgres -d inout_central < backup.sql
cd /var/www/central-inout && npx prisma migrate deploy
```

## Checklist pós-deploy

- [ ] `pm2 status` — app online
- [ ] `curl -I https://seu-dominio/clientes` — HTTP 200
- [ ] Admin acessível com `ADMIN_SECRET`
- [ ] `npm run sync:daily` — teste manual do sync

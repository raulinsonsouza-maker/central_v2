# Sync diário — Meta Ads, Google Ads e GA4

Este documento descreve a rotina de sincronização diária às **05:00 horário de Brasília (America/Sao_Paulo)**, que busca os dados de Meta Ads, Google Ads e GA4 na API de cada plataforma e persiste no banco, mantendo os dashboards atualizados todos os dias.

## Decisão de host

A aplicação pode rodar em dois cenários:

| Host | Como o cron é disparado |
|------|-------------------------|
| **Vercel** | Cron configurado no próprio projeto via `vercel.json`. A Vercel chama a URL do deployment (GET) no horário agendado. **Recomendado** se o deploy já for na Vercel. |
| **VPS / VM / Docker / outro** | Cron externo (crontab do SO, GitHub Actions ou outro agendador) faz POST (ou GET) na URL do endpoint em produção. Ver [Caminho B](#caminho-b-deploy-fora-da-vercel) abaixo. |

---

## Horário e timezone

Todos os crons rodam entre **05:00h e 05:40h Brasília (BRT = UTC-3)**.

| Sync | Horário BRT | Expressão cron (UTC) |
|------|------------|----------------------|
| Meta Ads | 05:00h | `0 8 * * *` |
| Google Ads | 05:20h | `20 8 * * *` |
| GA4 / Analytics | 05:40h | `40 8 * * *` |

---

## Caminho A — Deploy na Vercel

### Configuração no repositório

O arquivo **`vercel.json`** na raiz já define os três Cron Jobs:

| Path | Schedule | Horário BRT |
|------|----------|-------------|
| `/api/sync/meta` | `0 8 * * *` | 05:00h |
| `/api/sync/google-ads` | `20 8 * * *` | 05:20h |
| `/api/sync/analytics` | `40 8 * * *` | 05:40h |

Cada rota aceita **GET** (usado pela Vercel ao disparar o cron) e **POST** (para chamadas manuais ou crons externos). A autenticação é feita por:

- Header `Authorization: Bearer <token>` (a Vercel envia `CRON_SECRET` assim)
- Header `x-cron-token: <token>`
- Query `?token=<token>`

Todos são validados contra a variável de ambiente **`SYNC_CRON_TOKEN`**.

### Variáveis de ambiente na Vercel

1. **SYNC_CRON_TOKEN** (obrigatório em produção)
   - Gere um valor seguro: `openssl rand -hex 32`
   - Adicione em **Project Settings → Environment Variables** para Production.
   - **CRON_SECRET:** defina com o **mesmo valor** de `SYNC_CRON_TOKEN`. A Vercel envia esse valor no header `Authorization: Bearer` ao chamar o cron.

2. Confirme também: **META_ACCESS_TOKEN**, **GOOGLE_ADS_DEVELOPER_TOKEN**, **GOOGLE_CLIENT_EMAIL**, **GOOGLE_PRIVATE_KEY**, **DATABASE_URL**.

Após o deploy, os três crons passam a rodar automaticamente todos os dias a partir de 05:00h BRT.

---

## Caminho B — Deploy fora da Vercel (VPS, Docker, etc.)

### Endpoints

| Sync | URL |
|------|-----|
| Meta Ads | `POST https://<seu-dominio>/api/sync/meta` |
| Google Ads | `POST https://<seu-dominio>/api/sync/google-ads` |
| GA4 | `POST https://<seu-dominio>/api/sync/analytics` |

**Autenticação:** envie o token em um dos formatos:
- Header: `x-cron-token: SEU_SYNC_CRON_TOKEN`
- Header: `Authorization: Bearer SEU_SYNC_CRON_TOKEN`
- Query: `?token=SEU_SYNC_CRON_TOKEN`

### Crontab (05:00h BRT)

Para servidor em UTC (BRT = UTC-3):

```cron
# Meta Ads — 05:00h BRT (08:00 UTC)
0 8 * * * curl -s -X POST "https://seu-dominio.com/api/sync/meta" -H "x-cron-token: SEU_TOKEN" > /dev/null 2>&1

# Google Ads — 05:20h BRT (08:20 UTC)
20 8 * * * curl -s -X POST "https://seu-dominio.com/api/sync/google-ads" -H "x-cron-token: SEU_TOKEN" > /dev/null 2>&1

# GA4 / Analytics — 05:40h BRT (08:40 UTC)
40 8 * * * curl -s -X POST "https://seu-dominio.com/api/sync/analytics" -H "x-cron-token: SEU_TOKEN" > /dev/null 2>&1
```

### Exemplo de chamada manual (curl)

```bash
# Sync Meta — todos os clientes
curl -X POST "https://seu-dominio.com/api/sync/meta" \
  -H "x-cron-token: SEU_SYNC_CRON_TOKEN"

# Sync Meta — cliente específico
curl -X POST "https://seu-dominio.com/api/sync/meta" \
  -H "x-cron-token: SEU_SYNC_CRON_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clienteId": "id-do-cliente"}'

# Sync Google Ads — todos os clientes
curl -X POST "https://seu-dominio.com/api/sync/google-ads" \
  -H "x-cron-token: SEU_SYNC_CRON_TOKEN"

# Sync GA4 — todos os clientes
curl -X POST "https://seu-dominio.com/api/sync/analytics" \
  -H "x-cron-token: SEU_SYNC_CRON_TOKEN"
```

---

## Configurar SYNC_CRON_TOKEN em produção

1. Gere um token forte: `openssl rand -hex 32`
2. Guarde em cofre de segredos (1Password, variáveis do host, etc.); **não** commite no repositório.
3. No painel do host (Vercel, servidor, etc.):
   - Defina **SYNC_CRON_TOKEN** com esse valor.
   - Na Vercel, defina também **CRON_SECRET** com o mesmo valor.

---

## Operação

### Onde ver os logs

- **Vercel:** Dashboard do projeto → **Logs**. Filtre por path `/api/sync/meta`, `/api/sync/google-ads` ou `/api/sync/analytics`, ou por horário próximo de 05:00h BRT (08:00 UTC).
- **Outro host:** Logs do servidor (stdout/stderr) ou do agendador.

### Como reexecutar o sync manualmente

1. **Pela aplicação:** em **Administração** > **Clientes**, use o botão **Sincronizar** do cliente desejado.
2. **Pela API** (ver exemplos acima em Caminho B).

### Resumo para a equipe

- **O quê:** Sync diário das APIs de Meta Ads, Google Ads e GA4 para o Postgres; os dashboards leem do banco, então ficam atualizados após cada sync.
- **Quando:** Todos os dias entre **05:00h e 05:40h horário de Brasília**.
- **Onde configurar:** `vercel.json` (Vercel) ou crontab (outro host); variável **SYNC_CRON_TOKEN** (e **CRON_SECRET** na Vercel) em produção.

# Deployment - Bare Metal (Laptop)

Deploy em laptop para eventos ao vivo (~70 pessoas).

## Requisitos

- Node.js 20+
- PostgreSQL 14+
- Docker (opcional)

## Opções de Deployment

### 1. Serverless Local ( recomendado)

Simples, mesmo código do deploy serverless.

```bash
# Instalar serverless-offline
npm install -g serverless-offline

# Rodar local
serverless offline
```

### 2. Node.js Direto

API server simples para development.

```bash
# Install deps
npm install

# Build
npm run build

# Run
node dist/handlers/index.js
```

## Setup Completo

### Banco de Dados

```bash
# PostgreSQL com Docker
docker run -d \
  --name vespera-db \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=vespera \
  -p 5432:5432 \
  postgres:14

# URL de conexão
DATABASE_URL="postgresql://postgres:secret@localhost:5432/vespera"
```

### Variáveis de Ambiente

```bash
# .env
DATABASE_URL="postgresql://postgres:secret@localhost:5432/vespera"
MERCADOPAGO_ACCESS_TOKEN="ME..."
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@vespera.com"
```

### Migration

```bash
npx prisma migrate dev
```

### Teste Local

```bash
# Terminal 1: API (com cron de expiração)
npm run dev

# Terminal 2: Teste
curl http://localhost:3000/dev/events
```

## Produção (Laptop)

Para eventos ao vivo, considere:

### PM2 + Nginx

```bash
# Install PM2
npm install -g pm2

# Start
pm2 start serverless Offline --name vespera

# Com Nginx como reverse proxy na porta 80
serverless offline --httpPort 3000
```

### Script de Startup

```bash
#!/bin/bash
# start.sh

export DATABASE_URL="postgresql://..."
export MERCADOPAGO_ACCESS_TOKEN="..."
export RESEND_API_KEY="..."
export RESEND_FROM_EMAIL="..."

pm2 start serverless-offline --name vespera
```

### healthcheck

```bash
curl http://localhost:3000/dev/health
```

## Firewall

Para segurança:

```bash
#ufw allow 80/tcp
#ufw allow 443/tcp
#ufw enable
```

## Monitoramento

```bash
# Logs
pm2 logs vespera

# Status
pm2 status
```

## Troubleshooting

### DB Connection Error

```bash
# Verificar PostgreSQL
docker ps
docker logs vespera-db
```

### Port Already in Use

```bash
# Alterar porta
serverless offline --httpPort 3001
```

### PixPayment Error

Verificar `MERCADOPAGO_ACCESS_TOKEN` válido no painel Mercado Pago (Sandbox ou Produção).
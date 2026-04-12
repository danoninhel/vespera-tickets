# Vespera Tickets - Backend

Sistema de venda de ingressos para eventos pequenos (~70 pessoas) com pagamentos Pix via Mercado Pago.

## Quick Start

```bash
cd backend
npm install
docker-compose up -d
npx prisma migrate dev
npm run dev
```

## Endpoints

| Método | Path | Descrição |
|--------|------|------------|
| POST | /events | Criar evento |
| GET | /events | Listar eventos |
| GET | /events/:id | Detalhes do evento |
| PUT | /events/:id/lotes | Adicionar lotes |
| POST | /orders | Criar pedido + pagamento Pix |
| POST | /webhook | Confirmação de pagamento |

## Fluxo

```
1. Admin cria evento (via API ou banco)
2. Admin adiciona lotes ao evento
3. Usuário cria pedido → POST /orders
   - Order com status PENDING
   - Vagas reservadas no lote
   - QR Code Pix gerado (expira em 10min)
4. Usuário efetua pagamento Pix
5. Mercado Pago envia webhook
6. Sistema cria tickets + envía email
7. CronJob expira pedidos não pagos (10min)
```

## Technical Decisions

### Banco de Dados
- PostgreSQL com Prisma ORM
- Coluna `reserved` em lotes controla concorrência
- Transações com `$transaction` para atomicidade

### Pagamentos
- Mercado Pago com Pix
- Webhook idempotente (confirma apenas orders PENDING)
- QR Code expire em 10 minutos

### Lotes
- Múltiplos lotes por evento
- Venda sempre no lote mais antigo disponível (position)
- Auto-avança para próximo lote quando lotado

### Tickets
- Criados apenas após pagamento confirmado
- Código único por ticket para entrada

### Cron Job (Expiração)
- Função scheduled via serverless (rate: rate(10 minutes))
- Executa `expireOrders()` a cada 10 minutos
- Marca pedidos PENDING expirados como EXPIRED
- Libera vagas reservadas nos lotes

## Variáveis de Ambiente

```env
DATABASE_URL="postgresql://..."
MERCADOPAGO_ACCESS_TOKEN="..."
RESEND_API_KEY="..."
RESEND_FROM_EMAIL="noreply@vespera.com"
```

## Deployment

### Serverless (AWS Lambda)

```bash
serverless deploy
```

### Bare Metal (Laptop)

Voir `documents/DEPLOY.md` para instruções detalhadas.

## Estrutura

```
backend/
├── src/
│   ├── handlers/      # HTTP handlers
│   ├── services/    # Business logic
│   ├── lib/        # Prisma, config
│   └── types/       # TypeScript types
├── serverless.yml
├── prisma/schema.prisma
├── docker-compose.yml
└── package.json
```

## Testes

```bash
npm test
```
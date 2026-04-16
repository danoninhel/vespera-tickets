# Specification

## What's Needed to Develop

### Features
- **Events**: Create, list, detail via API
  - Fields: title, description, image_url, capacity, metadata
  - Requires: artists (1+), lotes (1+)
- **Lotes**: Multiple per event
  - Fields: name, price (cents), total, reserved, position
  - Auto-sell: lowest position first
- **Orders**: Buy flow
  - Create → reserve spots → generate Pix → wait payment
  - Expires in 10 minutes, status: PENDING → PAID/EXPIRED
- **Tickets**: Created after payment
  - Fields: name, email, code (UUID), checked_in
- **Cron**: Expire pending orders every minute, release reserved spots

### Database Tables
```
events (id, title, description, image_url, capacity, metadata, created_at)
  └─ lotes (id, event_id, name, price, total, reserved, position)
  └─ orders (id, event_id, status, ticket_quantity, expires_at, payment_id)
        └─ tickets (id, order_id, name, email, code, checked_in)
  └─ event_artists (event_id, artist_id)
        └─ artists (id, name)
```

---

## What's Developed

### Backend
- Fastify + TypeScript
- Prisma + PostgreSQL
- SQL transactions (reserved column concurrency control)
- Mercado Pago (Pix)
- Resend (email)

### Frontend
- React + Vite + TailwindCSS, mobile-first

### API
| Method | Path | Description |
|--------|------|-------------|
| GET | /events | List events |
| GET | /events/:id | Event details |
| POST | /events | Create event |
| POST | /orders | Create order |
| POST | /webhook | Payment confirmation |
| GET | /health | Health check |

---

## Business Logic

1. **Buy flow**: Create order → Reserve lot spots (atomic SQL) → Generate Pix → Wait webhook → Create tickets
2. **Concurrency**: `reserved` column prevents overselling (atomic update)
3. **Expiration**: Cron runs every minute, sets EXPIRED, releases reserved
4. **Idempotency**: Webhook uses `payment_id` unique constraint
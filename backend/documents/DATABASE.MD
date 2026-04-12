# Database Design

## 🧱 Tabelas

### events

* id (uuid pk)
* title
* description
* image_url
* capacity
* metadata (jsonb)
* created_at

---

### artists

* id
* name

---

### event_artists

* event_id
* artist_id

---

### lotes

* id
* event_id
* name
* price (centavos)
* total
* reserved
* position
* created_at

---

### orders

* id
* event_id
* status (PENDING, PAID, EXPIRED)
* ticket_quantity
* expires_at
* payment_id
* created_at

---

### tickets

* id
* event_id
* order_id
* name
* email
* created_at

---

## 🔗 Relacionamentos

* event → lotes (1:N)
* event → orders (1:N)
* order → tickets (1:N)
* event → tickets (1:N)
* event ↔ artists (N:N)

---

## ⚠️ Regras críticas

* reserved controla concorrência
* tickets só existem se order = PAID
* order expirada deve liberar reserved

# API Endpoints

## Base URL
```
http://localhost:3000
```

---

## Health Check

### GET /health

Returns server and database status.

**Response:**
```json
{
  "status": "healthy",
  "message": "Database connection is healthy",
  "success": true
}
```

---

## Events

### GET /events

Returns list of all events with their lotes.

**Response:**
```json
{
  "events": [
    {
      "id": "uuid",
      "title": "Rock Festival",
      "description": "Best show ever",
      "image_url": "https://...",
      "capacity": 100,
      "created_at": "2025-01-01T00:00:00.000Z",
      "lotes": [
        {
          "id": "uuid",
          "name": "VIP",
          "price": 10000,
          "total": 30,
          "reserved": 10,
          "available": 20
        }
      ]
    }
  ],
  "success": true
}
```

### GET /events/:id

Returns single event details.

**Response:**
```json
{
  "id": "uuid",
  "title": "Rock Festival",
  "description": "Best show ever",
  "image_url": "https://...",
  "capacity": 100,
  "created_at": "2025-01-01T00:00:00.000Z",
  "lotes": [...],
  "success": true
}
```

### POST /events

Creates a new event.

**Request:**
```json
{
  "title": "Rock Festival",
  "description": "Best show ever",
  "image_url": "https://example.com/image.jpg",
  "capacity": 100,
  "artists": ["Band One", "Band Two"],
  "lotes": [
    { "name": "VIP", "price": 10000, "total": 30 },
    { "name": "General", "price": 5000, "total": 70 }
  ]
}
```

**Rules:**
- `artists` must be a non-empty array
- `lotes` must be a non-empty array
- Sum of `lotes[].total` must equal `capacity`

**Response (201):**
```json
{
  "id": "uuid",
  "title": "Rock Festival",
  "success": true
}
```

**Response (400):**
```json
{
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "artists must be a non-empty array"
  },
  "success": false
}
```

---

## Orders

### POST /orders

Creates a new order and generates Pix payment.

**Request:**
```json
{
  "event_id": "uuid",
  "tickets": [
    { "name": "John Doe", "email": "john@example.com" },
    { "name": "Jane Doe", "email": "jane@example.com" }
  ]
}
```

**Rules:**
- `event_id` must exist
- `tickets` must be a non-empty array
- Each ticket needs `name` and `email`
- Must have available spots in lotes

**Response (201):**
```json
{
  "id": "uuid",
  "status": "pending",
  "payment_id": "MOCK-...",
  "expires_at": "2025-01-01T00:10:00.000Z",
  "pix_qr_code": "000201010212...",
  "pix_qr_code_image": "data:image/png;base64,...",
  "success": true
}
```

**Response (404):**
```json
{
  "error": {
    "type": "NOT_FOUND",
    "message": "Event not found"
  },
  "success": false
}
```

**Response (400):**
```json
{
  "error": {
    "type": "BUSINESS_ERROR",
    "message": "No tickets available"
  },
  "success": false
}
```

---

## Webhook

### POST /webhook

Receives payment notifications from Mercado Pago.

**Request:**
```json
{
  "type": "payment",
  "data": {
    "id": "123456789"
  }
}
```

**Behavior:**
- Only processes `type: "payment"`
- Checks payment status via Mercado Pago API
- If approved: updates order to PAID, creates tickets
- Idempotent: returns success if order already PAID

**Response (200):**
```json
{
  "processed": true,
  "orderId": "uuid",
  "message": "Order confirmed",
  "success": true
}
```

---

## Error Responses

All endpoints return errors in the same format:

```json
{
  "error": {
    "type": "VALIDATION_ERROR | NOT_FOUND | BUSINESS_ERROR | INTERNAL_ERROR",
    "message": "Human readable message"
  },
  "success": false
}
```

### Status Codes
- `200` - Success
- `201` - Created
- `400` - Validation/Business error
- `404` - Not found
- `500` - Internal server error
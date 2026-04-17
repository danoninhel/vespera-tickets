export const openapiSchema = {
  openapi: "3.0.0",
  info: {
    title: "Vespera Tickets API",
    description: `
## Overview
API for selling event tickets with Mercado Pago integration.

## Authentication
Currently no authentication required (MVP). Rate limited to 100 requests/minute.

## Payment Flow
1. Create order → Get Pix QR code
2. Customer pays via Pix
3. Mercado Pago sends webhook → Order confirmed
4. Tickets are generated automatically

## Webhook
Configure your Mercado Pago webhook URL to point to: \`/webhook\`
    `,
    version: "1.0.0",
    contact: {
      name: "Vespera Tickets",
    },
  },
  servers: [
    { url: "http://localhost:3000", description: "Local development" },
  ],
  tags: [
    { name: "Health", description: "Server health checks" },
    { name: "Events", description: "Event management" },
    { name: "Orders", description: "Order and payment management" },
    { name: "Tickets", description: "Ticket validation" },
    { name: "Webhook", description: "Mercado Pago notifications" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check server health",
        description: "Returns server and database connection status",
        responses: {
          200: {
            description: "Server is healthy",
            content: {
              "application/json": {
                example: {
                  status: "healthy",
                  message: "Database connection is healthy",
                  success: true,
                },
              },
            },
          },
        },
      },
    },
    "/events": {
      get: {
        tags: ["Events"],
        summary: "List all events",
        description: "Returns list of all active events with their lotes",
        responses: {
          200: {
            description: "List of events",
            content: {
              "application/json": {
                example: {
                  events: [
                    {
                      id: "uuid",
                      title: "Rock Festival",
                      description: "Best show ever",
                      image_url: "https://example.com/image.jpg",
                      capacity: 100,
                      created_at: "2025-01-01T00:00:00.000Z",
                      lotes: [],
                    },
                  ],
                  success: true,
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Events"],
        summary: "Create new event",
        description: "Creates a new event with artists and lotes",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "description", "image_url", "capacity", "artists", "lotes"],
                properties: {
                  title: { type: "string", description: "Event title" },
                  description: { type: "string", description: "Event description" },
                  image_url: { type: "string", format: "uri", description: "Image URL" },
                  capacity: { type: "integer", minimum: 1, description: "Total capacity" },
                  artists: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of artist names",
                  },
                  lotes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        price: { type: "integer" },
                        total: { type: "integer" },
                      },
                    },
                    description: "Ticket lots (sum must equal capacity)",
                  },
                },
              },
              example: {
                title: "Rock Festival",
                description: "Best show ever",
                image_url: "https://example.com/image.jpg",
                capacity: 100,
                artists: ["Band One", "Band Two"],
                lotes: [
                  { name: "VIP", price: 10000, total: 30 },
                  { name: "General", price: 5000, total: 70 },
                ],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Event created",
            content: {
              "application/json": {
                example: {
                  id: "uuid",
                  title: "Rock Festival",
                  success: true,
                },
              },
            },
          },
          400: {
            description: "Validation error",
            content: {
              "application/json": {
                example: {
                  error: { type: "VALIDATION_ERROR", message: "title is required" },
                  success: false,
                },
              },
            },
          },
        },
      },
    },
    "/events/{id}": {
      get: {
        tags: ["Events"],
        summary: "Get event details",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Event UUID",
          },
        ],
        responses: {
          200: {
            description: "Event details",
            content: {
              "application/json": {
                example: {
                  id: "uuid",
                  title: "Rock Festival",
                  description: "Best show ever",
                  image_url: "https://example.com/image.jpg",
                  capacity: 100,
                  created_at: "2025-01-01T00:00:00.000Z",
                  lotes: [
                    {
                      id: "uuid",
                      name: "VIP",
                      price: 10000,
                      total: 30,
                      reserved: 10,
                      available: 20,
                    },
                  ],
                  success: true,
                },
              },
            },
          },
          404: {
            description: "Event not found",
          },
        },
      },
    },
    "/orders": {
      post: {
        tags: ["Orders"],
        summary: "Create new order",
        description: "Creates an order and generates Pix payment QR code",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["event_id", "tickets"],
                properties: {
                  event_id: { type: "string", format: "uuid" },
                  tickets: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        email: { type: "string", format: "email" },
                      },
                    },
                  },
                },
              },
              example: {
                event_id: "uuid",
                tickets: [
                  { name: "John Doe", email: "john@example.com" },
                  { name: "Jane Doe", email: "jane@example.com" },
                ],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Order created with Pix QR",
            content: {
              "application/json": {
                example: {
                  id: "uuid",
                  status: "pending",
                  payment_id: "MOCK-123456",
                  expires_at: "2025-01-01T00:10:00.000Z",
                  pix_qr_code: "000201010212...",
                  pix_qr_code_image: "data:image/png;base64,...",
                  success: true,
                },
              },
            },
          },
          400: {
            description: "No tickets available",
          },
          404: {
            description: "Event not found",
          },
        },
      },
    },
    "/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "Get order status",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Order UUID",
          },
        ],
        responses: {
          200: {
            description: "Order details",
            content: {
              "application/json": {
                example: {
                  id: "uuid",
                  event_id: "uuid",
                  event_title: "Rock Festival",
                  status: "PENDING",
                  ticket_quantity: 2,
                  expires_at: "2025-01-01T00:10:00.000Z",
                  payment_id: "MOCK-123456",
                  created_at: "2025-01-01T00:00:00.000Z",
                  success: true,
                },
              },
            },
          },
          404: {
            description: "Order not found",
          },
        },
      },
    },
    "/orders/{id}/tickets": {
      get: {
        tags: ["Tickets"],
        summary: "List tickets for order",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Order UUID",
          },
        ],
        responses: {
          200: {
            description: "List of tickets",
            content: {
              "application/json": {
                example: {
                  order_id: "uuid",
                  status: "PAID",
                  tickets: [
                    {
                      id: "uuid",
                      name: "John Doe",
                      email: "john@example.com",
                      code: "uuid-v4",
                      checked_in: false,
                    },
                  ],
                  success: true,
                },
              },
            },
          },
        },
      },
    },
    "/tickets/validate": {
      post: {
        tags: ["Tickets"],
        summary: "Validate ticket at entry",
        description: "Validates a ticket code and marks it as checked in",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["code"],
                properties: {
                  code: { type: "string", description: "Ticket UUID code" },
                },
              },
              example: {
                code: "uuid-v4-code-here",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Ticket validated or already used",
            content: {
              "application/json": {
                example: {
                  valid: true,
                  message: "Ticket validated",
                  ticket: {
                    id: "uuid",
                    name: "John Doe",
                    email: "john@example.com",
                    checked_in: true,
                  },
                  success: true,
                },
              },
            },
          },
          404: {
            description: "Ticket not found",
          },
        },
      },
    },
    "/webhook": {
      post: {
        tags: ["Webhook"],
        summary: "Mercado Pago webhook",
        description: "Receives payment notifications from Mercado Pago",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type", "data"],
                properties: {
                  type: { type: "string", enum: ["payment", "charge"] },
                  data: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                    },
                  },
                },
              },
              example: {
                type: "payment",
                data: { id: "123456789" },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Webhook processed",
            content: {
              "application/json": {
                example: {
                  processed: true,
                  orderId: "uuid",
                  message: "Order confirmed",
                  success: true,
                },
              },
            },
          },
        },
      },
    },
    "/expire": {
      post: {
        tags: ["Orders"],
        summary: "Expire pending orders",
        description: "Expires pending orders (called internally by cron)",
        responses: {
          200: {
            description: "Orders expired",
            content: {
              "application/json": {
                example: {
                  expiredOrders: 2,
                  releasedSpots: 5,
                  success: true,
                },
              },
            },
          },
        },
      },
    },
  },
};
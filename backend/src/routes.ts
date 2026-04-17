import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getEvents, getEvent, createEvent } from "./handlers/events";
import { createOrder } from "./handlers/createOrderHandler";
import { getOrder } from "./handlers/getOrder";
import { getOrderTickets, validateTicket } from "./handlers/validateTicket";
import { webhook } from "./handlers/webhook";
import { expireOrders } from "./handlers/expiration";
import { healthCheck } from "./handlers/health";
import { openapiSchema } from "./openapi";

type RouteHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<any>;

function toFastifyHandler(fn: (body: any, params: any, query: any) => Promise<any>): RouteHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await fn(request.body || {}, request.params || {}, request.query || {});
    return reply.code(result.statusCode).send(
      result.error 
        ? { error: result.error, success: false }
        : { ...result.data, success: true }
    );
  };
}

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  server.get("/", async () => ({ 
    name: "Vespera Tickets API", 
    version: "1.0.0",
    docs: "/docs.html",
    spec: "/openapi.json"
  }));

  server.get("/openapi.json", async () => openapiSchema);

  server.get("/docs.html", async (request, reply) => {
    const docsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vespera Tickets API - Swagger</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.0/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.0/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
      });
    };
  </script>
</body>
</html>`;
    return reply.type("text/html").send(docsHtml);
  });

  server.get("/health", toFastifyHandler(healthCheck));

  server.get("/events", toFastifyHandler(getEvents));

  server.get("/events/:id", async (request, reply) => {
    const result = await getEvent(request.params as any);
    return reply.code(result.statusCode).send(
      result.error 
        ? { error: result.error, success: false }
        : { ...result.data, success: true }
    );
  });

  server.post("/events", toFastifyHandler(createEvent));

  server.post("/orders", toFastifyHandler(createOrder));

  server.get("/orders/:id", async (request, reply) => {
    const result = await getOrder(request.params as any);
    return reply.code(result.statusCode).send(
      result.error 
        ? { error: result.error, success: false }
        : { ...result.data, success: true }
    );
  });

  server.get("/orders/:id/tickets", async (request, reply) => {
    const result = await getOrderTickets(request.params as any);
    return reply.code(result.statusCode).send(
      result.error 
        ? { error: result.error, success: false }
        : { ...result.data, success: true }
    );
  });

  server.post("/tickets/validate", toFastifyHandler(validateTicket));

  server.post("/webhook", toFastifyHandler(webhook));

  server.post("/expire", toFastifyHandler(expireOrders));
}
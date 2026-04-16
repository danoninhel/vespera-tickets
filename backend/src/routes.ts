import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getEvents, getEvent, createEvent } from "./handlers/events";
import { createOrder } from "./handlers/createOrderHandler";
import { webhook } from "./handlers/webhook";
import { expireOrders } from "./handlers/expiration";
import { healthCheck } from "./handlers/health";

interface RouteHandler {
  (request: FastifyRequest, reply: FastifyReply): Promise<any>;
}

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

  server.post("/webhook", toFastifyHandler(webhook));

  server.post("/expire", toFastifyHandler(expireOrders));
}
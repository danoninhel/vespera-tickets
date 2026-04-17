import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import { registerRoutes } from "./routes";
import { startCron } from "./cron";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const isProduction = process.env.NODE_ENV === "production";

const server = Fastify({ 
  logger: true,
  trustProxy: true,
});

async function start(): Promise<void> {
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });

  await server.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: () => ({ error: "Too many requests" }),
  });

  await server.register(cors, { origin: true });
  await registerRoutes(server);
  startCron();

  server.setNotFoundHandler(async (request, reply) => {
    return reply.code(404).send({ error: "Not found", path: request.url });
  });

  server.setErrorHandler(async (request, reply, error) => {
    const statusCode = error.statusCode || 500;
    if (isProduction && statusCode >= 500) {
      request.log.error(error);
      return reply.code(statusCode).send({ error: "Internal server error" });
    }
    return reply.code(statusCode).send({ error: error.message });
  });

  try {
    await server.listen({ port: PORT, host: "0.0.0.0" });
    
    console.log("");
    console.log("========================================");
    console.log("  Vespera Tickets Server");
    console.log("========================================");
    console.log(`  URL: http://localhost:${PORT}`);
    console.log("");
    console.log("  Routes:");
    
    const routes = [
      { method: "GET", path: "/health" },
      { method: "GET", path: "/events" },
      { method: "GET", path: "/events/:id" },
      { method: "POST", path: "/events" },
      { method: "POST", path: "/orders" },
      { method: "GET", path: "/orders/:id" },
      { method: "GET", path: "/orders/:id/tickets" },
      { method: "POST", path: "/tickets/validate" },
      { method: "POST", path: "/webhook" },
      { method: "POST", path: "/expire" },
    ];
    
    routes.forEach((route) => {
      console.log(`    ${route.method.padEnd(6)} ${route.path}`);
    });
    
    console.log("");
    console.log("========================================");
    
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
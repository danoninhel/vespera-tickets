import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "./routes";
import { startCron } from "./cron";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = Fastify({ logger: true });

async function start(): Promise<void> {
  await server.register(cors, { origin: true });
  await registerRoutes(server);
  startCron();

  server.setNotFoundHandler(async (request, reply) => {
    return reply.code(404).send({ error: "Not found", path: request.url });
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
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    include: ["src/__tests__/**/*.spec.ts"],
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/vespera",
      DIRECT_URL: "postgresql://postgres:postgres@localhost:5432/vespera",
    },
    alias: {
      "@services": "./src/services",
      "@lib": "./src/lib",
      "@handlers": "./src/handlers",
      "@repositories": "./src/repositories",
      "../lib/prisma": "./src/lib/prisma",
      "../handlers/webhook": "./src/handlers/webhook",
      "../services/createOrder": "./src/services/order/create",
      "../services/createEvent": "./src/services/event/create",
      "../services/events": "./src/services/event/create",
      "../services/expiration": "./src/services/order/expiration",
      "../services/email": "./src/services/email/index.ts",
      "../services/payment": "./src/services/payment/index.ts",
      "../services/tickets": "./src/services/ticket/index.ts",
    },
  },
});
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "../../../src/routes";
import { prismaClient } from "@lib/prisma";

const BASE_URL = `http://localhost:3001`;

describe("API Integration Tests", () => {
  const server = Fastify({ logger: false });
  
  beforeAll(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();

    await server.register(cors, { origin: true });
    await registerRoutes(server);
    await server.listen({ port: 3001, host: "0.0.0.0" });
  });

  afterAll(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();
    await server.close();
  });

  describe("GET /health", () => {
    it("returns healthy status", async () => {
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe("healthy");
      expect(data.success).toBe(true);
    });
  });

  describe("POST /events", () => {
    it("creates event with artists and lotes", async () => {
      const payload = {
        title: "Rock Concert",
        description: "Best show ever",
        image_url: "https://example.com/rock.jpg",
        capacity: 100,
        artists: ["Band One", "Band Two"],
        lotes: [
          { name: "VIP", price: 10000, total: 30 },
          { name: "General", price: 5000, total: 70 },
        ],
      };

      const response = await fetch(`${BASE_URL}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.id).toBeDefined();
      expect(data.title).toBe("Rock Concert");
    });

    it("fails without artists", async () => {
      const payload = {
        title: "Test",
        description: "Test",
        image_url: "https://x.com/x.jpg",
        capacity: 10,
        lotes: [{ name: "L1", price: 1000, total: 10 }],
      };

      const response = await fetch(`${BASE_URL}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
    });

    it("fails when lotes total != capacity", async () => {
      const payload = {
        title: "Test",
        description: "Test",
        image_url: "https://x.com/x.jpg",
        capacity: 100,
        artists: ["Artist"],
        lotes: [{ name: "L1", price: 1000, total: 50 }],
      };

      const response = await fetch(`${BASE_URL}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /events", () => {
    it("returns list of events", async () => {
      const response = await fetch(`${BASE_URL}/events`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.events).toBeDefined();
      expect(Array.isArray(data.events)).toBe(true);
    });
  });

  describe("POST /orders", () => {
    it("creates order with tickets", async () => {
      const eventsResponse = await fetch(`${BASE_URL}/events`);
      const eventsData = await eventsResponse.json();
      const event = eventsData.events[0];

      const payload = {
        event_id: event.id,
        tickets: [
          { name: "John Doe", email: "john@example.com" },
          { name: "Jane Doe", email: "jane@example.com" },
        ],
      };

      const response = await fetch(`${BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.id).toBeDefined();
      expect(data.status).toBe("pending");
      expect(data.payment_id).toBeDefined();
      expect(data.pix_qr_code).toBeDefined();
    });

    it("fails when event not found", async () => {
      const payload = {
        event_id: "00000000-0000-0000-0000-000000000000",
        tickets: [{ name: "Test", email: "test@test.com" }],
      };

      const response = await fetch(`${BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(404);
    });

    it("fails with empty tickets", async () => {
      const eventsResponse = await fetch(`${BASE_URL}/events`);
      const eventsData = await eventsResponse.json();
      const event = eventsData.events[0];

      const payload = {
        event_id: event.id,
        tickets: [],
      };

      const response = await fetch(`${BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /webhook", () => {
    it("processes payment webhook", async () => {
      const eventsResponse = await fetch(`${BASE_URL}/events`);
      const eventsData = await eventsResponse.json();
      const event = eventsData.events[0];

      const orderResponse = await fetch(`${BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          tickets: [{ name: "Buyer", email: "buyer@test.com" }],
        }),
      });
      const order = await orderResponse.json();

      const webhookPayload = {
        type: "payment",
        data: { id: order.payment_id },
      };

      const response = await fetch(`${BASE_URL}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(true);
    });

    it("ignores non-payment webhook", async () => {
      const response = await fetch(`${BASE_URL}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "charge" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(false);
    });
  });

  describe("Error handling", () => {
    it("returns 404 for unknown routes", async () => {
      const response = await fetch(`${BASE_URL}/unknown`);
      expect(response.status).toBe(404);
    });

    it("validates required fields", async () => {
      const response = await fetch(`${BASE_URL}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });
});
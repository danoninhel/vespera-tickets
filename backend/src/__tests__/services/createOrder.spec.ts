import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prismaClient } from "../lib/prisma";
import { createOrder } from "../services/createOrder";

describe("createOrder", () => {
  const EVENT_ID = "11111111-1111-1111-1111-111111111111";
  const LOTE1_ID = "22222222-2222-2222-2222-222222222222";
  const LOTE2_ID = "33333333-3333-3333-3333-333333333333";

  beforeEach(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();

    const ev = await prismaClient.events.create({
      data: { id: EVENT_ID, title: "Test", description: "Test", image_url: "http://x.com", capacity: 70 },
    });

    await prismaClient.lotes.create({
      data: { id: LOTE1_ID, event_id: ev.id, name: "L1", price: 5000, total: 2, position: 1 },
    });
    await prismaClient.lotes.create({
      data: { id: LOTE2_ID, event_id: ev.id, name: "L2", price: 3000, total: 1, position: 2 },
    });
  });

  afterEach(async () => {
    await new Promise((r) => setTimeout(r, 100));
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();
  });

  it("creates order with valid tickets", async () => {
    const result = await createOrder({ eventId: EVENT_ID, tickets: [{ name: "John", email: "j@j.com" }] });
    expect(result.orderId).toBeDefined();
    expect(result.ticketQuantity).toBe(1);
  });

  it("throws NOT_FOUND for missing event", async () => {
    await expect(createOrder({ eventId: "00000000-0000-0000-0000-000000000000", tickets: [{ name: "J", email: "j@j.com" }] }))
      .rejects.toMatchObject({ type: "NOT_FOUND", message: "Event not found" });
  }, 10000);

  it("throws BUSINESS_ERROR when empty tickets", async () => {
    await expect(createOrder({ eventId: EVENT_ID, tickets: [] }))
      .rejects.toMatchObject({ type: "BUSINESS_ERROR", message: "At least one ticket is required" });
  });

  it("throws when all lotes exhausted", async () => {
    await prismaClient.lotes.update({ where: { id: LOTE1_ID }, data: { reserved: 2 } });
    await prismaClient.lotes.update({ where: { id: LOTE2_ID }, data: { reserved: 1 } });
    await expect(createOrder({ eventId: EVENT_ID, tickets: [{ name: "J", email: "j@j.com" }] }))
      .rejects.toMatchObject({ type: "BUSINESS_ERROR", message: "No lote available" });
  });
});
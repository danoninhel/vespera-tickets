import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prismaClient } from "../lib/prisma";
import { createOrder } from "./createOrder";
import { createEventWithLotes } from "./events";
import { expireOrders } from "./expiration";

describe.skip("ticket flow - full", () => {
  let eventId: string;

  beforeEach(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();

    const event = await createEventWithLotes({
      title: "Rock Festival",
      description: "Test",
      image_url: "https://x.com/x.jpg",
      capacity: 10,
      lotes: [
        { name: "Expensive", price: 5000, total: 5 },
        { name: "Cheap", price: 3000, total: 5 },
      ],
    });
    eventId = event.id;
  });

  afterEach(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();
  });

  it("creates event with 2 lotes by price", async () => {
    const lotes = await prismaClient.lotes.findMany({ orderBy: { position: "asc" } });
    expect(lotes).toHaveLength(2);
    expect(lotes[0].price).toBe(5000);
    expect(lotes[1].price).toBe(3000);
  });

  it("sells all tickets, uses expensive first", async () => {
    for (let i = 0; i < 10; i++) {
      await createOrder({
        eventId,
        tickets: [{ name: `P${i}`, email: `p${i}@t.com` }],
      });
    }

    const lotes = await prismaClient.lotes.findMany({ orderBy: { position: "asc" } });
    expect(lotes[0].reserved).toBe(5);
    expect(lotes[1].reserved).toBe(5);
  });

  it("falls to cheap after expensive sold", async () => {
    for (let i = 0; i < 5; i++) {
      await createOrder({ eventId, tickets: [{ name: `P${i}`, email: `p${i}@t.com` }] });
    }
    const lotes = await prismaClient.lotes.findMany({ orderBy: { position: "asc" } });
    expect(lotes[0].reserved).toBe(5);
    expect(lotes[1].reserved).toBe(0);
  });

  it("fails when all sold out", async () => {
    for (let i = 0; i < 10; i++) {
      try { await createOrder({ eventId, tickets: [{ name: `P${i}`, email: `p${i}@t.com` }] }); }
      catch (e) {}
    }
    await expect(
      createOrder({ eventId, tickets: [{ name: "Late", email: "late@t.com" }] })
    ).rejects.toMatchObject({ type: "BUSINESS_ERROR" });
  }, 15000);
});

describe("expiration", () => {
  let eventId: string;

  beforeEach(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();

    const event = await createEventWithLotes({
      title: "Quick",
      description: "Test",
      image_url: "https://x.com/x.jpg",
      capacity: 5,
      lotes: [{ name: "L", price: 5000, total: 5 }],
    });
    eventId = event.id;
  });

  afterEach(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();
  });

  it("expires order and releases spots", async () => {
    const order = await createOrder({ eventId, tickets: [{ name: "B", email: "b@t.com" }] });
    
    await prismaClient.$executeRaw`UPDATE orders SET expires_at = NOW() - '1 min'::interval WHERE id = ${order.orderId}`;
    
    const result = await expireOrders();
    expect(result.expiredOrders).toBe(1);
    expect(result.releasedSpots).toBe(1);

    const o = await prismaClient.orders.findUnique({ where: { id: order.orderId } });
    expect(o?.status).toBe("EXPIRED");
  });

  it("releases spots to be re-bought", async () => {
    const order = await createOrder({ eventId, tickets: [{ name: "B", email: "b@t.com" }] });
    await prismaClient.$executeRaw`UPDATE orders SET expires_at = NOW() - '1 min'::interval WHERE id = ${order.orderId}`;
    await expireOrders();

    await createOrder({ eventId, tickets: [{ name: "B2", email: "b2@t.com" }] });
  });

  it("paid orders do not expire", async () => {
    const order = await createOrder({ eventId, tickets: [{ name: "B", email: "b@t.com" }] });
    await prismaClient.orders.update({ where: { id: order.orderId }, data: { status: "PAID" } });
    await prismaClient.$executeRaw`UPDATE orders SET expires_at = NOW() - '1 min'::interval WHERE id = ${order.orderId}`;
    
    const result = await expireOrders();
    expect(result.expiredOrders).toBe(0);
  });
});
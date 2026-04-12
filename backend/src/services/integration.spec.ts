import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaClient } from "../lib/prisma";
import { createOrder } from "./createOrder";
import { expireOrders } from "./expiration";

describe.skip("complete ticket flow", () => {
  const EVENT_ID = "11111111-1111-1111-1111-111111111111";
  const LOTE_1 = "22222222-2222-2222-2222-222222222222";
  const LOTE_2 = "33333333-3333-3333-3333-333333333333";
  const LOTE_3 = "44444444-4444-4444-4444-444444444444";
  
  beforeEach(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();

    await prismaClient.events.create({
      data: {
        id: EVENT_ID,
        title: "Rock Festival",
        description: "The biggest rock event",
        image_url: "https://example.com/rock.jpg",
        capacity: 100,
      },
    });

    const prices = [5000, 4000, 3000];
    const totals = [20, 30, 50];
    const loteIds = [LOTE_1, LOTE_2, LOTE_3];
    
    for (let i = 0; i < 3; i++) {
      await prismaClient.lotes.create({
        data: {
          id: loteIds[i],
          event_id: EVENT_ID,
          name: `Lote ${i + 1}`,
          price: prices[i],
          total: totals[i],
          position: i + 1,
        },
      });
    }
  });

  afterEach(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();
  });

  it("creates event with 3 lotes of different prices", async () => {
    const lotes = await prismaClient.lotes.findMany({
      orderBy: { position: "asc" },
    });

    expect(lotes).toHaveLength(3);
    expect(lotes[0].price).toBe(5000);
    expect(lotes[1].price).toBe(4000);
    expect(lotes[2].price).toBe(3000);
    expect(lotes[0].total).toBe(20);
    expect(lotes[1].total).toBe(30);
    expect(lotes[2].total).toBe(50);
  });

  it("sells all tickets across multiple lotes", async () => {
    let totalTicketsSold = 0;

    for (let i = 0; i < 100; i++) {
      try {
        const result = await createOrder({
          eventId: EVENT_ID,
          tickets: [{ name: `Person ${i + 1}`, email: `person${i + 1}@test.com` }],
        });
        totalTicketsSold += result.ticketQuantity;
      } catch (e: any) {
        if (e.type === "BUSINESS_ERROR") {
          console.log(`Order ${i} failed:`, e.message);
        }
      }
    }

    expect(totalTicketsSold).toBe(100);

    const allLotes = await prismaClient.lotes.findMany();
    for (const lote of allLotes) {
      expect(lote.reserved).toBe(lote.total);
    }
  });

  it("fails to create order when all tickets sold", async () => {
    for (let i = 0; i < 100; i++) {
      try {
        await createOrder({
          eventId: EVENT_ID,
          tickets: [{ name: `Person ${i + 1}`, email: `person${i + 1}@test.com` }],
        });
      } catch (e) {
        break;
      }
    }

    await expect(
      createOrder({
        eventId: EVENT_ID,
        tickets: [{ name: "Late Buyer", email: "late@test.com" }],
      })
    ).rejects.toMatchObject({
      type: "BUSINESS_ERROR",
      message: "No lote available",
    });
  });

  it("uses lote 2 when lote 1 is sold out", async () => {
    for (let i = 0; i < 20; i++) {
      await createOrder({
        eventId: EVENT_ID,
        tickets: [{ name: `Person ${i + 1}`, email: `p${i + 1}@test.com` }],
      });
    }

    const lote1 = await prismaClient.lotes.findUnique({ where: { id: LOTE_1 } });
    const lote2 = await prismaClient.lotes.findUnique({ where: { id: LOTE_2 } });

    expect(lote1?.reserved).toBe(20);
    expect(lote2?.reserved).toBeGreaterThan(0);
  });

  it("uses cheapest lote after expensive ones sold", async () => {
    for (let i = 0; i < 50; i++) {
      await createOrder({
        eventId: EVENT_ID,
        tickets: [{ name: `Person ${i + 1}`, email: `p${i + 1}@test.com` }],
      });
    }

    const lote1 = await prismaClient.lotes.findUnique({ where: { id: LOTE_1 } });
    const lote3 = await prismaClient.lotes.findUnique({ where: { id: LOTE_3 } });

    expect(lote1?.reserved).toBe(20);
    expect(lote3?.reserved).toBe(30);
  });
});

describe("expiration flow", () => {
  const EVENT_ID = "22222222-2222-2222-2222-222222222222";
  const LOTE_ID = "55555555-5555-5555-5555-555555555555";
  
  beforeEach(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();

    await prismaClient.events.create({
      data: {
        id: EVENT_ID,
        title: "Quick Event",
        description: "Event with short expiration",
        image_url: "https://example.com/quick.jpg",
        capacity: 10,
      },
    });

    await prismaClient.lotes.create({
      data: {
        id: LOTE_ID,
        event_id: EVENT_ID,
        name: "Single Lote",
        price: 5000,
        total: 10,
        position: 1,
      },
    });
  });

  afterEach(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();
  });

  it("order expires and releases spots back", async () => {
    const order = await createOrder({
      eventId: EVENT_ID,
      tickets: [{ name: "Buyer 1", email: "b1@test.com" }],
    });

    const loteBefore = await prismaClient.lotes.findUnique({ where: { id: LOTE_ID } });
    expect(loteBefore?.reserved).toBe(1);

    await prismaClient.$executeRaw`
      UPDATE orders 
      SET expires_at = NOW() - INTERVAL '1 minute'
      WHERE id = ${order.orderId}
    `;

    const result = await expireOrders();
    
    expect(result.expiredOrders).toBe(1);
    expect(result.releasedSpots).toBe(1);

    const expiredOrder = await prismaClient.orders.findUnique({
      where: { id: order.orderId },
    });
    expect(expiredOrder?.status).toBe("EXPIRED");

    const loteAfter = await prismaClient.lotes.findUnique({ where: { id: LOTE_ID } });
    expect(loteAfter?.reserved).toBe(0);
  });

  it("expired order spots can be re-purchased", async () => {
    const order = await createOrder({
      eventId: EVENT_ID,
      tickets: [{ name: "Buyer 1", email: "b1@test.com" }],
    });

    await prismaClient.$executeRaw`
      UPDATE orders 
      SET expires_at = NOW() - INTERVAL '1 minute'
      WHERE id = ${order.orderId}
    `;

    await expireOrders();

    const newOrder = await createOrder({
      eventId: EVENT_ID,
      tickets: [{ name: "New Buyer", email: "new@test.com" }],
    });

    expect(newOrder.orderId).not.toBe(order.orderId);
    expect(newOrder.ticketQuantity).toBe(1);
  });

  it("does not expire paid orders", async () => {
    const order = await createOrder({
      eventId: EVENT_ID,
      tickets: [{ name: "Buyer 1", email: "b1@test.com" }],
    });

    await prismaClient.orders.update({
      where: { id: order.orderId },
      data: { status: "PAID" },
    });

    await prismaClient.$executeRaw`
      UPDATE orders 
      SET expires_at = NOW() - INTERVAL '1 minute'
      WHERE id = ${order.orderId}
    `;

    const result = await expireOrders();
    
    expect(result.expiredOrders).toBe(0);
    expect(result.releasedSpots).toBe(0);

    const paidOrder = await prismaClient.orders.findUnique({
      where: { id: order.orderId },
    });
    expect(paidOrder?.status).toBe("PAID");
  });
});
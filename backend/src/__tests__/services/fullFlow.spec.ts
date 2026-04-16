import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prismaClient } from "@lib/prisma";
import { eventService } from "@services/event/create";
import { orderService } from "@services/order/create";
import { webhook } from "@handlers/webhook";
import { ticketRepository } from "@repositories/ticketRepository";

describe("full ticket flow", () => {
  let eventId: string;
  let orderId: string;
  const EVENT_ID = "11111111-1111-1111-1111-111111111111";
  const LOTE_ID = "22222222-2222-2222-2222-222222222222";

  beforeEach(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();

    const event = await eventService.create({
      title: "Rock Festival",
      description: "Best show ever",
      image_url: "https://x.com/x.jpg",
      capacity: 50,
      artists: ["Band One", "Band Two"],
      lotes: [{ name: "General", price: 5000, total: 50 }],
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

  it("creates order with valid tickets", async () => {
    const result = await orderService.createOrder({
      eventId,
      tickets: [{ name: "John", email: "john@test.com" }],
    });
    
    expect(result.orderId).toBeDefined();
    expect(result.ticketQuantity).toBe(1);
    orderId = result.orderId;
  });

  it("creates order with multiple tickets", async () => {
    const result = await orderService.createOrder({
      eventId,
      tickets: [
        { name: "John", email: "john@test.com" },
        { name: "Jane", email: "jane@test.com" },
      ],
    });
    
    expect(result.orderId).toBeDefined();
    expect(result.ticketQuantity).toBe(2);
  });

  it("fails when event not found", async () => {
    await expect(
      orderService.createOrder({
        eventId: "00000000-0000-0000-0000-000000000000",
        tickets: [{ name: "John", email: "john@test.com" }],
      })
    ).rejects.toMatchObject({ type: "NOT_FOUND", message: "Event not found" });
  });

  it("fails when no available lotes", async () => {
    await prismaClient.lotes.update({
      where: { id: (await prismaClient.lotes.findFirst({ where: { event_id: eventId } }))?.id },
      data: { reserved: 50 },
    });

    await expect(
      orderService.createOrder({
        eventId,
        tickets: [{ name: "John", email: "john@test.com" }],
      })
    ).rejects.toMatchObject({ type: "BUSINESS_ERROR" });
  });
});

describe("webhook payment flow", () => {
  let eventId: string;
  let orderId: string;

  beforeEach(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();

    const event = await eventService.create({
      title: "Test Show",
      description: "Test",
      image_url: "https://x.com/x.jpg",
      capacity: 10,
      artists: ["Artist"],
      lotes: [{ name: "L1", price: 1000, total: 10 }],
    });
    eventId = event.id;

    const orderResult = await orderService.createOrder({
      eventId,
      tickets: [{ name: "Buyer", email: "buyer@test.com" }],
    });
    orderId = orderResult.orderId;
  });

  afterEach(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();
  });

  it("creates tickets on webhook payment", async () => {
    const order = await prismaClient.orders.findUnique({ where: { id: orderId } });
    const paymentId = order?.payment_id;
    
    const result = await webhook({
      type: "payment",
      data: { id: paymentId },
    });

    console.log("Webhook result:", JSON.stringify(result));

    expect(result.statusCode).toBe(200);
    expect(result.data?.processed).toBe(true);

    const updatedOrder = await prismaClient.orders.findUnique({ where: { id: orderId } });
    expect(updatedOrder?.status).toBe("PAID");

    const tickets = await prismaClient.tickets.findMany({ where: { order_id: orderId } });
    expect(tickets).toHaveLength(1);
    expect(tickets[0].code).toBeDefined();
  });

  it("is idempotent - does not create duplicate tickets", async () => {
    const order = await prismaClient.orders.findUnique({ where: { id: orderId } });
    
    await webhook({ type: "payment", data: { id: order?.payment_id } });
    
    const firstTickets = await prismaClient.tickets.findMany({ where: { order_id: orderId } });
    const firstCount = firstTickets.length;
    
    await webhook({ type: "payment", data: { id: order?.payment_id } });

    const tickets = await prismaClient.tickets.findMany({ where: { order_id: orderId } });
    expect(tickets.length).toBe(firstCount);
  });

  it("ignores non-payment webhook", async () => {
    const result = await webhook({ type: "charge", data: { id: "123" } });
    expect(result.data?.processed).toBe(false);
  });

  it("returns error when payment id missing", async () => {
    const result = await webhook({ type: "payment" });
    expect(result.statusCode).toBe(400);
  });
});
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { prismaClient } from "@lib/prisma";
import { eventService } from "@services/event/create";
import { orderService } from "@services/order/create";
import { PaymentGatewayFactory, MockPaymentGateway } from "@services/payment/index";

describe("Payment Service", () => {
  let eventId: string;

  beforeEach(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();

    const event = await eventService.create({
      title: "Test Concert",
      description: "Live show",
      image_url: "https://x.com/x.jpg",
      capacity: 100,
      artists: ["Band"],
      lotes: [{ name: "VIP", price: 10000, total: 50 }, { name: "General", price: 5000, total: 50 }],
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

  describe("MockPaymentGateway", () => {
    it("creates payment and returns pix qr code", async () => {
      const gateway = new MockPaymentGateway();
      
      const result = await gateway.createPayment({
        orderId: "order-123",
        amount: 10000,
        description: "Test payment",
        payerEmail: "test@example.com",
      });

      expect(result.paymentId).toBeDefined();
      expect(result.pixQrCode).toBeDefined();
      expect(result.status).toBe("pending");
      expect(result.expirationDate).toBeInstanceOf(Date);
    });

    it("returns approved status for mock payments", async () => {
      const gateway = new MockPaymentGateway();
      
      const result = await gateway.getPaymentStatus("123456");
      expect(result.status).toBe("approved");
    });

    it("returns pending for unknown payment ids", async () => {
      const gateway = new MockPaymentGateway();
      
      const result = await gateway.getPaymentStatus("unknown");
      expect(result.status).toBe("pending");
    });
  });

  describe("PaymentGatewayFactory", () => {
    it("uses MockPaymentGateway when no token", () => {
      delete process.env.MERCADOPAGO_ACCESS_TOKEN;
      const gateway = PaymentGatewayFactory.create();
      expect(gateway).toBeInstanceOf(MockPaymentGateway);
    });

    it("uses MockPaymentGateway for test tokens", () => {
      process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-12345";
      const gateway = PaymentGatewayFactory.create();
      expect(gateway).toBeInstanceOf(MockPaymentGateway);
    });
  });

  describe("Order with payment", () => {
    it("creates order with payment and returns qr code", async () => {
      const result = await orderService.createOrder({
        eventId,
        tickets: [{ name: "Fan", email: "fan@test.com" }],
      });

      expect(result.orderId).toBeDefined();
      expect(result.paymentId).toBeDefined();
      expect(result.pixQrCode).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it("calculates correct total from lote price", async () => {
      const result = await orderService.createOrder({
        eventId,
        tickets: [
          { name: "Fan 1", email: "f1@test.com" },
          { name: "Fan 2", email: "f2@test.com" },
        ],
      });

      expect(result.ticketQuantity).toBe(2);
    });

    it("fails when no lotes available", async () => {
      await prismaClient.lotes.updateMany({
        where: { event_id: eventId },
        data: { reserved: 100 },
      });

      await expect(
        orderService.createOrder({
          eventId,
          tickets: [{ name: "Late", email: "late@test.com" }],
        })
      ).rejects.toMatchObject({ type: "BUSINESS_ERROR" });
    });
  });
});
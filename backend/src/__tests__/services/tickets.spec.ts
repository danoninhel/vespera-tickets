import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockTicketsCreate, mockTicketsFindFirst, mockTicketsFindMany, mockTicketsUpdate, mockOrdersFindUnique, mockOrdersFindFirst, mockOrdersUpdate, mockTransaction } = vi.hoisted(() => ({
  mockTicketsCreate: vi.fn(),
  mockTicketsFindFirst: vi.fn(),
  mockTicketsFindMany: vi.fn(),
  mockTicketsUpdate: vi.fn(),
  mockOrdersFindUnique: vi.fn(),
  mockOrdersFindFirst: vi.fn(),
  mockOrdersUpdate: vi.fn(),
  mockTransaction: vi.fn((cb: any) => cb({})),
}));

vi.mock("@lib/prisma", () => ({
  prismaClient: {
    $transaction: mockTransaction,
    tickets: {
      create: mockTicketsCreate,
      findFirst: mockTicketsFindFirst,
      findMany: mockTicketsFindMany,
      update: mockTicketsUpdate,
    },
    orders: {
      findUnique: mockOrdersFindUnique,
      findFirst: mockOrdersFindFirst,
      update: mockOrdersUpdate,
    },
  },
}));

import { ticketService } from "@services/ticket/index";

describe.skip("tickets service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ticketService.createTickets", () => {
    it("throws when orderId is empty", async () => {
      await expect(
        ticketService.ticketService.createTickets({ orderId: "", tickets: [{ name: "John", email: "j@j.com" }] })
      ).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        message: "orderId is required",
      });
    });

    it("throws when tickets array is empty", async () => {
      await expect(
        ticketService.ticketService.createTickets({ orderId: "order_123", tickets: [] })
      ).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        message: "tickets must be a non-empty array",
      });
    });

    it("throws when ticket missing name", async () => {
      await expect(
        ticketService.ticketService.createTickets({ orderId: "order_123", tickets: [{ name: "", email: "j@j.com" }] })
      ).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        message: "ticket name is required",
      });
    });

    it("throws when order not found", async () => {
      mockOrdersFindUnique.mockResolvedValue(null);

      await expect(
        ticketService.ticketService.createTickets({ orderId: "invalid", tickets: [{ name: "John", email: "j@j.com" }] })
      ).rejects.toMatchObject({
        type: "NOT_FOUND",
        message: "Order not found",
      });
    });

    it("throws when order not paid", async () => {
      mockOrdersFindUnique.mockResolvedValue({ id: "order_123", status: "PENDING", event_id: "evt_123" });

      await expect(
        ticketService.createTickets({ orderId: "order_123", tickets: [{ name: "John", email: "j@j.com" }] })
      ).rejects.toMatchObject({
        type: "BUSINESS_ERROR",
        message: "Order is not paid",
      });
    });

    it("creates tickets for paid order", async () => {
      mockOrdersFindUnique.mockResolvedValue({ 
        id: "order_123", 
        status: "PAID", 
        event_id: "evt_123" 
      });
      
      const tx = {
        tickets: {
          create: vi.fn().mockResolvedValue({
            id: "ticket_123",
            code: "VPABC1234",
            name: "John",
          }),
        },
      };
      
      mockTransaction.mockImplementation(async (cb) => cb(tx));

      const result = await ticketService.createTickets({
        orderId: "order_123",
        tickets: [{ name: "John", email: "j@j.com" }],
      });

      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0]).toHaveProperty("code");
    });
  });

  describe("ticketService.getTicketsByOrder", () => {
    it("throws when orderId is empty", async () => {
      await expect(ticketService.getTicketsByOrder("")).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        message: "orderId is required",
      });
    });

    it("returns tickets for order", async () => {
      mockTicketsFindMany.mockResolvedValue([
        { id: "t1", code: "VPTEST1", name: "John", email: "j@j.com", checked_in: false },
        { id: "t2", code: "VPTEST2", name: "Jane", email: "jane@j.com", checked_in: false },
      ]);

      const result = await ticketService.getTicketsByOrder("order_123");
      expect(result).toHaveLength(2);
    });

    it("throws when no tickets found", async () => {
      mockTicketsFindMany.mockResolvedValue([]);

      await expect(ticketService.getTicketsByOrder("order_123")).rejects.toMatchObject({
        type: "NOT_FOUND",
        message: "No tickets found for this order",
      });
    });
  });

  describe("ticketService.validateTicket", () => {
    it("throws when code is empty", async () => {
      await expect(ticketService.validateTicket("")).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        message: "Ticket code is required",
      });
    });

    it("throws when ticket not found", async () => {
      mockTicketsFindFirst.mockResolvedValue(null);

      await expect(ticketService.validateTicket("INVALID")).rejects.toMatchObject({
        type: "NOT_FOUND",
        message: "Invalid ticket",
      });
    });

    it("throws when already checked in", async () => {
      mockTicketsFindFirst.mockResolvedValue({
        id: "t1",
        code: "VPTEST",
        checked_in: true,
        event_id: "e1",
        orders: { status: "PAID" },
        events: { title: "Show" },
      });

      await expect(ticketService.validateTicket("VPTEST")).rejects.toMatchObject({
        type: "BUSINESS_ERROR",
        message: "Ticket already used",
      });
    });

    it("returns ticket info", async () => {
      mockTicketsFindFirst.mockResolvedValue({
        id: "t1",
        code: "VPTEST",
        name: "John",
        email: "j@j.com",
        checked_in: false,
        event_id: "e1",
      });

      const result = await ticketService.validateTicket("VPTEST");
      expect(result.ticket.name).toBe("John");
      expect(result.ticket.checked_in).toBe(false);
      expect(result.valid).toBe(true);
    });
  });
});
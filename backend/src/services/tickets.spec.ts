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

vi.mock("../lib/prisma", () => ({
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

import { createTickets, getTicketsByOrder, validateTicket, checkInTicket } from "./tickets";

describe("tickets service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTickets", () => {
    it("throws when orderId is empty", async () => {
      await expect(
        createTickets({ orderId: "", tickets: [{ name: "John", email: "j@j.com" }] })
      ).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        message: "orderId is required",
      });
    });

    it("throws when tickets array is empty", async () => {
      await expect(
        createTickets({ orderId: "order_123", tickets: [] })
      ).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        message: "At least one ticket is required",
      });
    });

    it("throws when ticket missing name", async () => {
      await expect(
        createTickets({ orderId: "order_123", tickets: [{ name: "", email: "j@j.com" }] })
      ).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        message: "Each ticket must have name and email",
      });
    });

    it("throws when order not found", async () => {
      mockOrdersFindUnique.mockResolvedValue(null);

      await expect(
        createTickets({ orderId: "invalid", tickets: [{ name: "John", email: "j@j.com" }] })
      ).rejects.toMatchObject({
        type: "NOT_FOUND",
        message: "Order not found",
      });
    });

    it("throws when order not paid", async () => {
      mockOrdersFindUnique.mockResolvedValue({ id: "order_123", status: "PENDING", event_id: "evt_123" });

      await expect(
        createTickets({ orderId: "order_123", tickets: [{ name: "John", email: "j@j.com" }] })
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

      const result = await createTickets({
        orderId: "order_123",
        tickets: [{ name: "John", email: "j@j.com" }],
      });

      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0]).toHaveProperty("code");
    });
  });

  describe("getTicketsByOrder", () => {
    it("throws when orderId is empty", async () => {
      await expect(getTicketsByOrder("")).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        message: "orderId is required",
      });
    });

    it("returns tickets for order", async () => {
      mockTicketsFindMany.mockResolvedValue([
        { id: "t1", code: "VPTEST1", name: "John", email: "j@j.com", checked_in: false },
        { id: "t2", code: "VPTEST2", name: "Jane", email: "jane@j.com", checked_in: false },
      ]);

      const result = await getTicketsByOrder("order_123");
      expect(result).toHaveLength(2);
    });

    it("throws when no tickets found", async () => {
      mockTicketsFindMany.mockResolvedValue([]);

      await expect(getTicketsByOrder("order_123")).rejects.toMatchObject({
        type: "NOT_FOUND",
        message: "No tickets found for this order",
      });
    });
  });

  describe("validateTicket", () => {
    it("throws when code is empty", async () => {
      await expect(validateTicket("")).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        message: "Ticket code is required",
      });
    });

    it("throws when ticket not found", async () => {
      mockTicketsFindFirst.mockResolvedValue(null);

      await expect(validateTicket("INVALID")).rejects.toMatchObject({
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

      await expect(validateTicket("VPTEST")).rejects.toMatchObject({
        type: "BUSINESS_ERROR",
        message: "Ticket already used",
      });
    });

    it("returns ticket info", async () => {
      mockTicketsFindFirst.mockResolvedValue({
        id: "t1",
        code: "VPTEST",
        name: "John",
        checked_in: false,
        event_id: "e1",
        orders: { status: "PAID" },
        events: { title: "Show" },
      });

      const result = await validateTicket("VPTEST");
      expect(result.name).toBe("John");
      expect(result.checkedIn).toBe(false);
    });
  });

  describe("checkInTicket", () => {
    it("throws when code is empty", async () => {
      await expect(checkInTicket("")).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        message: "Ticket code is required",
      });
    });

    it("throws when ticket not found", async () => {
      mockTicketsFindFirst.mockResolvedValue(null);

      await expect(checkInTicket("INVALID")).rejects.toMatchObject({
        type: "NOT_FOUND",
        message: "Ticket not found",
      });
    });

    it("throws when already checked in", async () => {
      mockTicketsFindFirst.mockResolvedValue({
        id: "t1",
        code: "VPTEST",
        checked_in: true,
      });

      await expect(checkInTicket("VPTEST")).rejects.toMatchObject({
        type: "BUSINESS_ERROR",
        message: "Ticket already checked in",
      });
    });

    it("checks in ticket successfully", async () => {
      mockTicketsFindFirst.mockResolvedValue({
        id: "t1",
        code: "VPTEST",
        checked_in: false,
      });

      mockTicketsUpdate.mockResolvedValue({
        id: "t1",
        code: "VPTEST",
        checked_in: true,
      });

      const result = await checkInTicket("VPTEST");
      expect(result.checked_in).toBe(true);
    });
  });
});
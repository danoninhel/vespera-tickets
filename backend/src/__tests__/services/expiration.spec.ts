import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockOrdersFindUnique, mockOrdersUpdate, mockOrdersFindFirst, mockQueryRaw, mockTransaction } = vi.hoisted(() => ({
  mockOrdersFindUnique: vi.fn(),
  mockOrdersUpdate: vi.fn(),
  mockOrdersFindFirst: vi.fn(),
  mockQueryRaw: vi.fn(),
  mockTransaction: vi.fn((cb: any) => cb({})),
}));

vi.mock("../lib/prisma", () => ({
  prismaClient: {
    $transaction: mockTransaction,
    $queryRaw: mockQueryRaw,
    orders: {
      findUnique: mockOrdersFindUnique,
      findFirst: mockOrdersFindFirst,
      update: mockOrdersUpdate,
    },
  },
}));

import { expireOrders, cancelOrder, getAvailableSpots } from "../services/expiration";

describe("expiration service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("expireOrders", () => {
    it("returns zero when no expired orders", async () => {
      mockQueryRaw.mockResolvedValue([]);

      const result = await expireOrders();
      expect(result.expiredOrders).toBe(0);
      expect(result.releasedSpots).toBe(0);
    });

    it("expires pending orders", async () => {
      mockQueryRaw.mockResolvedValue([
        { id: "order_1", ticket_quantity: 2, event_id: "evt_1" },
        { id: "order_2", ticket_quantity: 3, event_id: "evt_1" },
      ]);

      mockTransaction.mockImplementation(async (cb) => {
        const tx = { 
          orders: { update: vi.fn().mockResolvedValue({}) },
          $queryRaw: vi.fn(),
        };
        await cb(tx);
      });

      const result = await expireOrders();
      expect(result.expiredOrders).toBe(2);
      expect(result.releasedSpots).toBe(5);
    });
  });

  describe("cancelOrder", () => {
    it("throws when orderId is empty", async () => {
      await expect(cancelOrder("")).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        message: "orderId is required",
      });
    });

    it("throws when order not found", async () => {
      mockOrdersFindUnique.mockResolvedValue(null);

      await expect(cancelOrder("invalid")).rejects.toMatchObject({
        type: "NOT_FOUND",
        message: "Order not found",
      });
    });

    it("throws when order not pending", async () => {
      mockOrdersFindUnique.mockResolvedValue({ id: "order_1", status: "PAID", ticket_quantity: 2, event_id: "evt_1" });

      await expect(cancelOrder("order_1")).rejects.toMatchObject({
        type: "BUSINESS_ERROR",
        message: "Only pending orders can be cancelled",
      });
    });

    it("cancels pending order", async () => {
      mockOrdersFindUnique.mockResolvedValue({ id: "order_1", status: "PENDING", ticket_quantity: 2, event_id: "evt_1" });

      mockTransaction.mockImplementation(async (cb) => {
        const tx = { 
          orders: { update: vi.fn().mockResolvedValue({}) },
          $queryRaw: vi.fn(),
        };
        await cb(tx);
      });

      await cancelOrder("order_1");
    });
  });

  describe("getAvailableSpots", () => {
    it("throws when eventId is empty", async () => {
      await expect(getAvailableSpots("")).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        message: "eventId is required",
      });
    });

    it("returns available spots", async () => {
      mockQueryRaw.mockResolvedValue([{ available: 50 }]);

      const result = await getAvailableSpots("evt_1");
      expect(result).toBe(50);
    });

    it("returns zero when no results", async () => {
      mockQueryRaw.mockResolvedValue([]);

      const result = await getAvailableSpots("evt_1");
      expect(result).toBe(0);
    });
  });
});
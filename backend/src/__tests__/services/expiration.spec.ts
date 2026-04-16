import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockOrdersFindUnique, mockOrdersUpdate, mockOrdersFindFirst, mockQueryRaw, mockTransaction } = vi.hoisted(() => ({
  mockOrdersFindUnique: vi.fn(),
  mockOrdersUpdate: vi.fn(),
  mockOrdersFindFirst: vi.fn(),
  mockQueryRaw: vi.fn(),
  mockTransaction: vi.fn((cb: any) => cb({})),
}));

vi.mock("@lib/prisma", () => ({
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

import { expirationService } from "@services/order/expiration";

describe("expiration service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("expireOrders", () => {
    it("returns zero when no expired orders", async () => {
      mockQueryRaw.mockResolvedValue([]);

      const result = await expirationService.expireOrders();
      expect(result.expiredOrders).toBe(0);
      expect(result.releasedSpots).toBe(0);
    });
  });
});
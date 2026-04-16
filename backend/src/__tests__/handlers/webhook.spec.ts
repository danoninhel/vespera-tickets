import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockConfigure, mockPaymentGet } = vi.hoisted(() => ({
  mockConfigure: vi.fn(),
  mockPaymentGet: vi.fn(),
}));

vi.mock("mercadopago", () => ({
  default: {
    configure: mockConfigure,
    payment: {
      get: mockPaymentGet,
    },
  },
}));

vi.mock("@lib/prisma", () => ({
  prismaClient: {
    $queryRaw: vi.fn().mockResolvedValue([]),
    orders: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { webhook } from "@handlers/webhook";

describe.skip("webhook webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCADOPAGO_ACCESS_TOKEN = "test_token";
  });

  it("returns 405 for non-POST", async () => {
    const result = await webhook({ method: "GET" } as any);
    expect(result.statusCode).toBe(405);
  });

  it("ignores non-payment topic", async () => {
    const result = await webhook({
      method: "POST",
      body: JSON.stringify({ topic: "charge" }),
    } as any);
    
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe("Ignored topic");
  });

  it("returns 400 when payment id missing", async () => {
    const result = await webhook({
      method: "POST",
      body: JSON.stringify({ topic: "payment" }),
    } as any);
    
    expect(result.statusCode).toBe(400);
  });

  it("processes approved payment", async () => {
    mockPaymentGet.mockImplementation((_, callback) => {
      callback(null, { status: "approved" });
    });

    const result = await webhook({
      method: "POST",
      body: JSON.stringify({ 
        topic: "payment",
        data: { id: 123456 }
      }),
    } as any);
    
    expect(result.statusCode).toBe(200);
    const parsed = JSON.parse(result.body);
    expect(parsed.received).toBe(true);
  });

  it("handles rejected payment", async () => {
    mockPaymentGet.mockImplementation((_, callback) => {
      callback(null, { status: "rejected" });
    });

    const result = await webhook({
      method: "POST",
      body: JSON.stringify({
        topic: "payment",
        data: { id: 123456 }
      }),
    } as any);
    
    expect(result.statusCode).toBe(200);
  });

  it("handles API error gracefully", async () => {
    mockPaymentGet.mockImplementation((_, callback) => {
      callback({ message: "API error" }, null);
    });

    const result = await webhook({
      method: "POST",
      body: JSON.stringify({
        topic: "payment",
        data: { id: 123456 }
      }),
    } as any);
    
    expect(result.statusCode).toBe(200);
  });

  it("handles invalid JSON body", async () => {
    const result = await webhook({
      method: "POST",
      body: "invalid json",
    } as any);
    
    expect(result.statusCode).toBe(500);
  });
});
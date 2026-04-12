import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { mockConfigure, mockPaymentCreate, mockPaymentGet, mockPaymentSearch } = vi.hoisted(() => ({
  mockConfigure: vi.fn(),
  mockPaymentCreate: vi.fn(),
  mockPaymentGet: vi.fn(),
  mockPaymentSearch: vi.fn(),
}));

vi.mock("mercadopago", () => ({
  default: {
    configure: mockConfigure,
    payment: {
      create: mockPaymentCreate,
      get: mockPaymentGet,
      search: mockPaymentSearch,
    },
  },
}));

import { createPixPayment, getPaymentStatus, getPaymentByExternalReference } from "./payment";

describe("payment service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST_TOKEN_123";
    
    mockConfigure.mockReset();
    mockPaymentCreate.mockReset();
    mockPaymentGet.mockReset();
    mockPaymentSearch.mockReset();
  });

  afterEach(() => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  });

  describe("createPixPayment", () => {
    it("throws CONFIG_ERROR when token not set", async () => {
      delete process.env.MERCADOPAGO_ACCESS_TOKEN;
      
      await expect(
        createPixPayment({
          orderId: "order_123",
          amount: 5000,
          description: "Test",
          payerEmail: "test@test.com",
        })
      ).rejects.toMatchObject({
        type: "CONFIG_ERROR",
        message: "MERCADOPAGO_ACCESS_TOKEN not configured",
      });
    });

    it("throws when orderId is empty", async () => {
      await expect(
        createPixPayment({
          orderId: "",
          amount: 5000,
          description: "Test",
          payerEmail: "test@test.com",
        })
      ).rejects.toMatchObject({
        type: "PAYMENT_ERROR",
        message: "orderId is required",
      });
    });

    it("throws when orderId is only whitespace", async () => {
      await expect(
        createPixPayment({
          orderId: "   ",
          amount: 5000,
          description: "Test",
          payerEmail: "test@test.com",
        })
      ).rejects.toMatchObject({
        type: "PAYMENT_ERROR",
        message: "orderId is required",
      });
    });

    it("throws when amount is zero", async () => {
      await expect(
        createPixPayment({
          orderId: "order_123",
          amount: 0,
          description: "Test",
          payerEmail: "test@test.com",
        })
      ).rejects.toMatchObject({
        type: "PAYMENT_ERROR",
        message: "amount must be positive",
      });
    });

    it("throws when amount is negative", async () => {
      await expect(
        createPixPayment({
          orderId: "order_123",
          amount: -100,
          description: "Test",
          payerEmail: "test@test.com",
        })
      ).rejects.toMatchObject({
        type: "PAYMENT_ERROR",
        message: "amount must be positive",
      });
    });

    it("throws when payerEmail is missing @", async () => {
      await expect(
        createPixPayment({
          orderId: "order_123",
          amount: 5000,
          description: "Test",
          payerEmail: "invalidemail",
        })
      ).rejects.toMatchObject({
        type: "PAYMENT_ERROR",
        message: "payerEmail is required",
      });
    });

    it("throws when payerEmail is empty", async () => {
      await expect(
        createPixPayment({
          orderId: "order_123",
          amount: 5000,
          description: "Test",
          payerEmail: "",
        })
      ).rejects.toMatchObject({
        type: "PAYMENT_ERROR",
        message: "payerEmail is required",
      });
    });

    it("creates payment successfully with pix", async () => {
      const mockResponse = {
        id: 123456789,
        status: "pending",
        external_reference: "order_abc123",
        point_of_interaction: {
          transaction_data: {
            qr_code: "00020101021226850014br.gov.bcb.pix0136a538afd6-768d-41f6-8e66-6ExampleQRCode",
            qr_code_image: "https://mercadopago.com.br/qr/test.png",
          },
        },
        expires_date: "2026-04-12T12:00:00.000-03:00",
      };

      mockPaymentCreate.mockImplementation((_, callback) => {
        callback(null, mockResponse);
      });

      const result = await createPixPayment({
        orderId: "order_abc123",
        amount: 5000,
        description: "2 Ingressos Show",
        payerEmail: "cliente@email.com",
      });

      expect(mockConfigure).toHaveBeenCalledWith({ access_token: "TEST_TOKEN_123" });
      expect(mockPaymentCreate).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: "123456789",
        status: "pending",
        paymentId: "123456789",
        pixQrCode: "00020101021226850014br.gov.bcb.pix0136a538afd6-768d-41f6-8e66-6ExampleQRCode",
        pixQrCodeImage: "https://mercadopago.com.br/qr/test.png",
        externalReference: "order_abc123",
      });
    });

    it("handles API error from Mercado Pago", async () => {
      mockPaymentCreate.mockImplementation((_, callback) => {
        callback({ message: "Invalid access token", status: 401 }, null);
      });

      await expect(
        createPixPayment({
          orderId: "order_123",
          amount: 5000,
          description: "Test",
          payerEmail: "test@test.com",
        })
      ).rejects.toMatchObject({
        type: "PAYMENT_ERROR",
        message: "Invalid access token",
      });
    });

    it("converts amount from cents to reais", async () => {
      let capturedAmount = 0;
      
      mockPaymentCreate.mockImplementation((params, callback) => {
        capturedAmount = params.transaction_amount;
        callback(null, { id: 123, status: "pending" });
      });

      await createPixPayment({
        orderId: "order_123",
        amount: 10000,
        description: "Test",
        payerEmail: "test@test.com",
      });

      expect(capturedAmount).toBe(100);
    });

    it("returns without expiration when not provided", async () => {
      mockPaymentCreate.mockImplementation((_, callback) => {
        callback(null, {
          id: 123,
          status: "pending",
          external_reference: "order_123",
          point_of_interaction: { transaction_data: {} },
        });
      });

      const result = await createPixPayment({
        orderId: "order_123",
        amount: 5000,
        description: "Test",
        payerEmail: "test@test.com",
      });

      expect(result.expirationDate).toBeUndefined();
    });

    it("uses orderId as external_reference", async () => {
      let capturedRef = "";
      
      mockPaymentCreate.mockImplementation((params, callback) => {
        capturedRef = params.external_reference;
        callback(null, { id: 123, status: "pending" });
      });

      await createPixPayment({
        orderId: "my-custom-order-id",
        amount: 5000,
        description: "Test",
        payerEmail: "test@test.com",
      });

      expect(capturedRef).toBe("my-custom-order-id");
    });

    it("sends installments: 1", async () => {
      let capturedInstallments = -1;
      
      mockPaymentCreate.mockImplementation((params, callback) => {
        capturedInstallments = params.installments;
        callback(null, { id: 123, status: "pending" });
      });

      await createPixPayment({
        orderId: "order_123",
        amount: 5000,
        description: "Test",
        payerEmail: "test@test.com",
      });

      expect(capturedInstallments).toBe(1);
    });
  });

  describe("getPaymentStatus", () => {
    it("throws CONFIG_ERROR when token not set", async () => {
      delete process.env.MERCADOPAGO_ACCESS_TOKEN;
      
      await expect(getPaymentStatus("123")).rejects.toMatchObject({
        type: "CONFIG_ERROR",
      });
    });

    it("throws when paymentId is empty", async () => {
      await expect(getPaymentStatus("")).rejects.toMatchObject({
        type: "PAYMENT_ERROR",
        message: "paymentId is required",
      });
    });

    it("returns status successfully", async () => {
      mockPaymentGet.mockImplementation((_, callback) => {
        callback(null, { status: "approved" });
      });

      const status = await getPaymentStatus("123456");
      
      expect(status).toBe("approved");
    });

    it("handles API error", async () => {
      mockPaymentGet.mockImplementation((_, callback) => {
        callback({ message: "Not found", status: 404 }, null);
      });

      await expect(getPaymentStatus("invalid")).rejects.toMatchObject({
        type: "PAYMENT_ERROR",
        message: "Not found",
      });
    });
  });

  describe("getPaymentByExternalReference", () => {
    it("throws when externalRef is empty", async () => {
      await expect(getPaymentByExternalReference("")).rejects.toMatchObject({
        type: "PAYMENT_ERROR",
        message: "externalReference is required",
      });
    });

    it("returns null when no payments found", async () => {
      mockPaymentSearch.mockImplementation((_, callback) => {
        callback(null, { results: [] });
      });

      const result = await getPaymentByExternalReference("order_not_exists");
      
      expect(result).toBeNull();
    });

    it("returns payment when found", async () => {
      mockPaymentSearch.mockImplementation((_, callback) => {
        callback(null, {
          results: [{
            id: 999,
            status: "approved",
            external_reference: "order_found",
            point_of_interaction: {
              transaction_data: { qr_code: "test_qr" }
            }
          }]
        });
      });

      const result = await getPaymentByExternalReference("order_found");
      
      expect(result).toMatchObject({
        id: "999",
        status: "approved",
        externalReference: "order_found",
        pixQrCode: "test_qr",
      });
    });

    it("handles search error", async () => {
      mockPaymentSearch.mockImplementation((_, callback) => {
        callback({ message: "Server error" }, null);
      });

      await expect(getPaymentByExternalReference("order_123")).rejects.toMatchObject({
        type: "PAYMENT_ERROR",
        message: "Server error",
      });
    });

    it("uses correct search parameters", async () => {
      let capturedFilters: any = {};
      
      mockPaymentSearch.mockImplementation((filters, callback) => {
        capturedFilters = filters;
        callback(null, { results: [] });
      });

      await getPaymentByExternalReference("test_order");
      
      expect(capturedFilters).toMatchObject({
        external_reference: "test_order",
      });
    });
  });
});
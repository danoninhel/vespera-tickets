import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

const mockEmailsSend = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockEmailsSend,
    },
  })),
}));

import { sendTicketEmail, buildTicketEmailHtml, buildConfirmationEmailHtml } from "../services/email";

describe("email service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "test_api_key_123";
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  describe("sendTicketEmail", () => {
    it("throws when to email invalid", async () => {
      await expect(
        sendTicketEmail({
          to: "invalid",
          subject: "Test",
          html: "<p>Test</p>",
        })
      ).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        message: "Valid recipient email is required",
      });
    });

    it("throws when subject empty", async () => {
      await expect(
        sendTicketEmail({
          to: "test@test.com",
          subject: "",
          html: "<p>Test</p>",
        })
      ).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        message: "Subject is required",
      });
    });

    it("throws when html empty", async () => {
      await expect(
        sendTicketEmail({
          to: "test@test.com",
          subject: "Test",
          html: "",
        })
      ).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        message: "HTML content is required",
      });
    });
  });

  describe("buildTicketEmailHtml", () => {
    it("generates HTML with ticket codes", () => {
      const html = buildTicketEmailHtml("Rock in Rio", [
        { code: "VP12345678", name: "John" },
        { code: "VP87654321", name: "Jane" },
      ]);

      expect(html).toContain("Rock in Rio");
      expect(html).toContain("VP12345678");
      expect(html).toContain("VP87654321");
      expect(html).toContain("John");
      expect(html).toContain("Jane");
    });

    it("generates HTML for single ticket", () => {
      const html = buildTicketEmailHtml("Show", [{ code: "VPTEST123", name: "John" }]);

      expect(html).toContain("VPTEST123");
      expect(html).toContain("John");
    });
  });

  describe("buildConfirmationEmailHtml", () => {
    it("includes order details", () => {
      const expiresAt = new Date("2026-04-12T18:00:00");
      
      const html = buildConfirmationEmailHtml(
        "Show",
        "order_123",
        5000,
        expiresAt
      );

      expect(html).toContain("order_123");
      expect(html).toContain("R$");
    });

    it("shows expiration warning", () => {
      const expiresAt = new Date("2026-04-12T18:00:00");
      
      const html = buildConfirmationEmailHtml(
        "Show",
        "order_123",
        5000,
        expiresAt
      );

      expect(html).toContain("expira");
    });
  });
});
import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  buildTicketEmailHtml, 
  buildConfirmationEmailHtml, 
  EmailGatewayFactory, 
  ConsoleEmailGateway,
  ResendEmailGateway,
  sendTicketEmail
} from "@services/email/index";

describe("Email Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildTicketEmailHtml", () => {
    it("generates HTML with ticket codes", () => {
      const html = buildTicketEmailHtml("Rock Festival", [
        { code: "TICKET-001", name: "John" },
        { code: "TICKET-002", name: "Jane" },
      ]);

      expect(html).toContain("Rock Festival");
      expect(html).toContain("TICKET-001");
      expect(html).toContain("John");
      expect(html).toContain("Ingresso 1");
      expect(html).toContain("Ingresso 2");
    });

    it("handles empty tickets array", () => {
      const html = buildTicketEmailHtml("Event", []);
      expect(html).toContain("Event");
    });
  });

  describe("buildConfirmationEmailHtml", () => {
    it("generates confirmation HTML with price", () => {
      const expiresAt = new Date("2025-12-31");
      const html = buildConfirmationEmailHtml("order-123", 10000, expiresAt);

      expect(html).toContain("order-123");
      expect(html).toContain("R$ 100.00");
    });
  });

  describe("ConsoleEmailGateway", () => {
    it("logs email and returns id", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const gateway = new ConsoleEmailGateway();

      const result = await gateway.sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test</p>",
      });

      expect(result.id).toContain("console-");
      expect(consoleSpy).toHaveBeenCalledWith("=== EMAIL (Debug) ===");
      expect(consoleSpy).toHaveBeenCalledWith("To:", "test@example.com");
      expect(consoleSpy).toHaveBeenCalledWith("Subject:", "Test Subject");
    });
  });

  describe("EmailGatewayFactory", () => {
    it("uses ConsoleEmailGateway when no API key", () => {
      delete process.env.RESEND_API_KEY;
      const gateway = EmailGatewayFactory.create();
      expect(gateway).toBeInstanceOf(ConsoleEmailGateway);
    });

    it("uses ConsoleEmailGateway for test/fake keys", () => {
      process.env.RESEND_API_KEY = "re_xxxxx";
      const gateway = EmailGatewayFactory.create();
      expect(gateway).toBeInstanceOf(ConsoleEmailGateway);
    });
  });

  describe("sendTicketEmail", () => {
    it("sends email via console gateway", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      
      const result = await sendTicketEmail({
        to: "buyer@example.com",
        subject: "Your Tickets",
        html: "<p>Here are your tickets</p>",
      });

      expect(result.id).toContain("console-");
      expect(consoleSpy).toHaveBeenCalledWith("To:", "buyer@example.com");
    });
  });
});
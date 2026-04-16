import { Resend } from "resend";

export interface EmailResult {
  id: string;
}

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface EmailGateway {
  sendEmail(input: EmailInput): Promise<EmailResult>;
}

export function buildTicketEmailHtml(eventName: string, tickets: { code: string; name: string }[]): string {
  const ticketsHtml = tickets.map((t, i) => `
    <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0;">
      <strong>Ingresso ${i + 1}</strong><br>
      Nome: ${t.name}<br>
      Código: ${t.code}
    </div>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h1 style="color: #4F46E5;">${eventName}</h1>
      <h3>Seus Ingressos:</h3>
      ${ticketsHtml}
    </div>
  `;
}

export function buildConfirmationEmailHtml(orderId: string, total: number, expiresAt: Date): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h1 style="color: #4F46E5;">Compra #${orderId}</h1>
      <p>Total: R$ ${(total / 100).toFixed(2)}</p>
      <p>Expira em: ${expiresAt.toLocaleString('pt-BR')}</p>
    </div>
  `;
}

export async function sendTicketEmail(input: { to: string; subject: string; html: string }): Promise<EmailResult> {
  const gateway = EmailGatewayFactory.create();
  return gateway.sendEmail(input);
}

export class ResendEmailGateway implements EmailGateway {
  private resend: Resend;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.resend = new Resend(apiKey);
    this.fromEmail = fromEmail;
  }

  async sendEmail(input: EmailInput): Promise<EmailResult> {
    const result = await this.resend.emails.send({
      from: `Vespera Ingressos <${this.fromEmail}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return { id: result.data?.id || "unknown" };
  }
}

export class ConsoleEmailGateway implements EmailGateway {
  async sendEmail(input: EmailInput): Promise<EmailResult> {
    console.log("=== EMAIL (Debug) ===");
    console.log("To:", input.to);
    console.log("Subject:", input.subject);
    console.log("====================");
    return { id: "console-" + Date.now() };
  }
}

export class EmailGatewayFactory {
  static create(): EmailGateway {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    
    if (!apiKey || apiKey.startsWith("re_xxxxx")) {
      return new ConsoleEmailGateway();
    }
    
    return new ResendEmailGateway(apiKey, fromEmail);
  }
}
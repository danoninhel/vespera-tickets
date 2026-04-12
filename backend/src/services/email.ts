import { Resend } from "resend";
import { prismaClient } from "../lib/prisma";

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export type EmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type EmailResult = {
  id: string;
};

function getResendClient() {
  if (!resend) {
    throw {
      type: "CONFIG_ERROR",
      message: "RESEND_API_KEY not configured",
    };
  }
  return resend;
}

export async function sendTicketEmail(input: EmailInput): Promise<EmailResult> {
  if (!input.to || !input.to.includes("@")) {
    throw {
      type: "VALIDATION_ERROR",
      message: "Valid recipient email is required",
    };
  }

  if (!input.subject || input.subject.trim() === "") {
    throw {
      type: "VALIDATION_ERROR",
      message: "Subject is required",
    };
  }

  if (!input.html || input.html.trim() === "") {
    throw {
      type: "VALIDATION_ERROR",
      message: "HTML content is required",
    };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@vespera.com";
  const fromName = process.env.RESEND_FROM_NAME || "Vespera Ingressos";

  const client = getResendClient();

  const { data, error } = await client.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  if (error) {
    throw {
      type: "EMAIL_ERROR",
      message: error.message,
    };
  }

  return { id: data?.id || "" };
}

export function buildTicketEmailHtml(
  eventTitle: string,
  tickets: { code: string; name: string }[]
) {
  const ticketList = tickets
    .map(
      (t) => `
      <div style="background: #f5f5f5; padding: 16px; margin: 12px 0; border-radius: 8px; text-align: center;">
        <h3 style="margin: 0 0 8px; color: #333;">${t.name}</h3>
        <p style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #2563eb;">
          ${t.code}
        </p>
      </div>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafafa;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px;">
        <h1 style="margin: 0 0 24px; font-size: 24px; text-align: center; color: #111;">
          🎫 ${eventTitle}
        </h1>
        
        <p style="color: #666; margin: 0 0 24px;">
          Seus ingressos estão confirmados! Apresente o código abaixo na entrada do evento.
        </p>

        ${ticketList}

        <p style="color: #999; font-size: 14px; margin: 24px 0 0; text-align: center;">
          Não compartilhe este email.<br>
          Caso tenha dúvidas, entre em contato conosco.
        </p>
      </div>
    </body>
    </html>
  `;
}

export function buildConfirmationEmailHtml(
  eventTitle: string,
  orderId: string,
  amount: number,
  expiresAt: Date
) {
  const expirationTime = expiresAt.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  
  const expirationDate = expiresAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  const amountFormatted = (amount / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafafa;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px;">
        <h1 style="margin: 0 0 24px; font-size: 24px; text-align: center; color: #111;">
          ⏳ Pedido em Andamento
        </h1>
        
        <p style="color: #666; margin: 0 0 16px;">
          Seu pedido #${orderId} para <strong>${eventTitle}</strong> foi criado com sucesso!
        </p>

        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #666;">
            Valor total: <strong style="color: #111;">${amountFormatted}</strong>
          </p>
        </div>

        <p style="color: #d97706; font-weight: 500; margin: 24px 0;">
          ⚠️Atenção: O pedido expira em <strong>${expirationDate} às ${expirationTime}</strong>
        </p>

        <p style="color: #999; font-size: 14px; margin: 24px 0 0;">
          Complete o pagamento via Pix para garantir seus ingressos.
        </p>
      </div>
    </body>
    </html>
  `;
}

export async function sendOrderConfirmationEmail(orderId: string) {
  const order = await prismaClient.orders.findUnique({
    where: { id: orderId },
    include: {
      events: true,
      tickets: true,
    },
  });

  if (!order) {
    throw {
      type: "NOT_FOUND",
      message: "Order not found",
    };
  }

  const ticketsWithCode = order.tickets.map((t) => ({
    code: t.code,
    name: t.name,
  }));

  const html = buildTicketEmailHtml(order.events.title, ticketsWithCode);

  await sendTicketEmail({
    to: order.tickets[0]?.email || "",
    subject: `🎫 Confirmado: ${order.events.title}`,
    html,
  });
}
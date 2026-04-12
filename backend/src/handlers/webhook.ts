import { prismaClient } from "../lib/prisma";
import { getPaymentStatus } from "../services/payment";
import { createTickets } from "../services/tickets";

type WebhookRequest = {
  headers: Record<string, string>;
  body: string;
};

type WebhookResponse = {
  statusCode: number;
  body: string;
};

export default async function handler(req: any): Promise<WebhookResponse> {
  if (req.method !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: { type: "METHOD_NOT_ALLOWED", message: "Only POST" } }),
    };
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const topic = body.data?.object || body.topic || body.type;

    if (topic !== "payment") {
      return { statusCode: 200, body: JSON.stringify({ message: "Ignored topic" }) };
    }

    const paymentId = body.data?.id?.toString();
    if (!paymentId) {
      return { statusCode: 400, body: JSON.stringify({ error: { type: "VALIDATION_ERROR", message: "payment id required" } }) };
    }

    console.log("Processing webhook for payment:", paymentId);

    const [order] = await prismaClient.$queryRaw<{ id: string; ticket_quantity: number; status: string }[]>`
      SELECT id, ticket_quantity, status 
      FROM orders 
      WHERE status = 'PENDING' 
      AND expires_at > NOW()
      LIMIT 1
    `;

    if (!order) {
      console.log("No pending order found");
      return {
        statusCode: 200,
        body: JSON.stringify({ received: true, orderUpdated: false }),
      };
    }

    const status = await getPaymentStatus(paymentId);

    if (status === "approved" || status === "accredited") {
      await prismaClient.orders.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });

      console.log("Order paid:", order.id);

      const [ticketQuantities] = await prismaClient.$queryRaw<{ quantity: number }[]>`
        SELECT COUNT(*) as quantity FROM tickets WHERE order_id = ${order.id}
      `;

      const neededTickets = order.ticket_quantity - (ticketQuantities?.quantity || 0);

      if (neededTickets > 0) {
        await createTicketsBatch(order.id, neededTickets);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          received: true,
          paymentId,
          orderId: order.id,
          ticketsCreated: true,
        }),
      };
    }

    if (status === "rejected" || status === "cancelled" || status === "refunded") {
      await prismaClient.orders.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });

      await prismaClient.$queryRaw`
        UPDATE lotes SET reserved = reserved - ${order.ticket_quantity}
        WHERE event_id = (SELECT event_id FROM orders WHERE id = ${order.id})
      `;

      console.log("Order cancelled:", order.id);

      return {
        statusCode: 200,
        body: JSON.stringify({
          received: true,
          paymentId,
          orderId: order.id,
          orderUpdated: true,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, paymentId }),
    };

  } catch (error: any) {
    console.error("webhook_error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { type: "INTERNAL_ERROR", message: error.message } }),
    };
  }
}

async function createTicketsBatch(orderId: string, count: number) {
  const tickets = [];
  for (let i = 0; i < count; i++) {
    tickets.push({
      orderId,
      name: `Attendee ${i + 1}`,
      email: "customer@example.com",
    });
  }

  await createTickets({
    orderId,
    tickets,
  });
}
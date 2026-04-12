import { prismaClient } from "../lib/prisma";
import { getPaymentStatus } from "../services/payment";

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
    const topic = body.topic || body.type;

    if (topic !== "payment") {
      return { statusCode: 200, body: JSON.stringify({ message: "Ignored topic" }) };
    }

    const paymentId = body.data?.id?.toString();
    if (!paymentId) {
      return { statusCode: 400, body: JSON.stringify({ error: { type: "VALIDATION_ERROR", message: "payment id required" } }) };
    }

    console.log("Processing webhook for payment:", paymentId);

    const orders = await prismaClient.$queryRaw<{ id: string; status: string }[]>`
      SELECT id, status FROM orders WHERE id IN (
        SELECT id FROM orders 
        WHERE status = 'PENDING' 
        AND expires_at > NOW()
      )
    `;

    let updatedOrder = false;

    for (const order of orders) {
      try {
        const status = await getPaymentStatus(paymentId);

        if (status === "approved" || status === "accredited") {
          await prismaClient.orders.update({
            where: { id: order.id },
            data: { status: "PAID" },
          });

          console.log("Order paid:", order.id);
          updatedOrder = true;
          break;
        }

        if (status === "rejected" || status === "cancelled" || status === "refunded") {
          await prismaClient.orders.update({
            where: { id: order.id },
            data: { status: "CANCELLED" },
          });

          console.log("Order cancelled:", order.id);
          updatedOrder = true;
          break;
        }
      } catch (e) {
        console.error("Error checking payment status:", e);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        received: true,
        paymentId,
        orderUpdated: updatedOrder 
      }),
    };

  } catch (error: any) {
    console.error("webhook_error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { type: "INTERNAL_ERROR", message: error.message } }),
    };
  }
}
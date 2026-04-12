import { createOrder } from "../services/createOrder";
import { createPixPayment } from "../services/payment";

type CreateOrderRequest = {
  event_id: string;
  tickets: {
    name: string;
    email: string;
  }[];
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: {
        type: "METHOD_NOT_ALLOWED",
        message: "Only POST is allowed",
      },
    });
  }

  try {
    const body: CreateOrderRequest = req.body;

    if (!body?.event_id) {
      return res.status(400).json({
        error: {
          type: "VALIDATION_ERROR",
          message: "event_id is required",
        },
      });
    }

    if (!Array.isArray(body.tickets) || body.tickets.length === 0) {
      return res.status(400).json({
        error: {
          type: "VALIDATION_ERROR",
          message: "tickets must be a non-empty array",
        },
      });
    }

    for (const ticket of body.tickets) {
      if (!ticket.name || !ticket.email) {
        return res.status(400).json({
          error: {
            type: "VALIDATION_ERROR",
            message: "Each ticket must have name and email",
          },
        });
      }
    }

    const orderResult = await createOrder({
      eventId: body.event_id,
      tickets: body.tickets,
    });

    const totalAmount = body.tickets.length * 5000;

    try {
      const payment = await createPixPayment({
        orderId: orderResult.orderId,
        amount: totalAmount,
        description: `Ingresso Vespera - ${body.tickets.length} pedido(s)`,
        payerEmail: body.tickets[0].email,
      });

      return res.status(201).json({
        orderId: orderResult.orderId,
        expiresAt: orderResult.expiresAt,
        ticketQuantity: orderResult.ticketQuantity,
        payment: {
          id: payment.paymentId,
          qrCode: payment.pixQrCode,
          qrCodeImage: payment.pixQrCodeImage,
          expiresAt: payment.expirationDate,
        },
      });
    } catch (paymentError: any) {
      console.error("payment_error", paymentError);
      return res.status(201).json({
        orderId: orderResult.orderId,
        expiresAt: orderResult.expiresAt,
        ticketQuantity: orderResult.ticketQuantity,
        payment: null,
        paymentError: paymentError.message,
      });
    }

  } catch (error: any) {
    console.error("order_handler_error", error);

    if (error.type === "BUSINESS_ERROR") {
      return res.status(409).json({
        error: {
          type: error.type,
          message: error.message,
        },
      });
    }

    if (error.type === "NOT_FOUND") {
      return res.status(404).json({
        error: {
          type: error.type,
          message: error.message,
        },
      });
    }

    if (error.type === "CONFIG_ERROR") {
      return res.status(503).json({
        error: {
          type: error.type,
          message: error.message,
        },
      });
    }

    return res.status(500).json({
      error: {
        type: "INTERNAL_ERROR",
        message: "Unexpected error",
      },
    });

  }
}
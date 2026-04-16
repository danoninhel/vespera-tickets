import { ApiHandlerResult } from "../types/api";
import { PaymentGatewayFactory } from "../services/payment";
import { orderRepository } from "../repositories/orderRepository";
import { eventRepository } from "../repositories/eventRepository";
import { ticketRepository } from "../repositories/ticketRepository";

interface WebhookInput {
  type?: string;
  topic?: string;
  data?: {
    id: string | number;
  };
}

export async function webhook(input: WebhookInput): Promise<ApiHandlerResult> {
  try {
    const topic = input.topic || input.type;
    
    if (topic !== "payment") {
      return { statusCode: 200, data: { processed: false, message: topic ? "Ignored topic" : "Not a payment webhook" } };
    }

    const paymentId = input.data?.id;
    if (!paymentId) {
      return { statusCode: 400, error: { type: "VALIDATION_ERROR", message: "payment id required" } };
    }

    const paymentGateway = PaymentGatewayFactory.create();
    const paymentStatus = await paymentGateway.getPaymentStatus(String(paymentId));

    if (paymentStatus.status !== "approved" && paymentStatus.status !== "accepted") {
      return { statusCode: 200, data: { processed: false, message: "Payment not approved" } };
    }

    const order = await orderRepository.findByPaymentId(String(paymentId));
    
    if (!order) {
      return { statusCode: 404, error: { type: "NOT_FOUND", message: "Order not found for payment" } };
    }

    if (order.status === "PAID") {
      return { statusCode: 200, data: { processed: true, orderId: order.id, message: "Already processed" } };
    }

    const event = await eventRepository.findById(order.event_id);
    if (!event) {
      return { statusCode: 404, error: { type: "NOT_FOUND", message: "Event not found" } };
    }

    await orderRepository.updateStatus(order.id, "PAID");

    const tickets = await ticketRepository.findByOrderId(order.id);
    if (tickets.length === 0) {
      const ticketInputs: { name: string; email: string }[] = [];
      for (let i = 0; i < order.ticket_quantity; i++) {
        ticketInputs.push({ name: `Attendee ${i + 1}`, email: "attendee@example.com" });
      }
      await ticketRepository.createForOrder(order.id, order.event_id, ticketInputs);
    }

    return { 
      statusCode: 200, 
      data: { 
        processed: true, 
        orderId: order.id,
        message: "Order confirmed",
        received: true,
      },
    };

  } catch (error: any) {
    console.error("Webhook error:", error);
    return { statusCode: 500, error: { type: "INTERNAL_ERROR", message: error.message } };
  }
}
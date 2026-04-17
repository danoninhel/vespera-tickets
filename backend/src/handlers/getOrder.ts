import { orderRepository } from "../repositories/orderRepository";
import { ApiHandlerResult } from "../types/api";

export async function getOrder(input: { id: string }): Promise<ApiHandlerResult> {
  try {
    if (!input.id) {
      return { statusCode: 400, error: { type: "VALIDATION_ERROR", message: "order id is required" } };
    }

    const order = await orderRepository.findWithDetails(input.id);
    if (!order) {
      return { statusCode: 404, error: { type: "NOT_FOUND", message: "Order not found" } };
    }

    return {
      statusCode: 200,
      data: {
        id: order.id,
        event_id: order.event_id,
        event_title: order.event_title,
        status: order.status,
        ticket_quantity: order.ticket_quantity,
        expires_at: order.expires_at,
        payment_id: order.payment_id,
        created_at: order.created_at,
      },
    };
  } catch (error: any) {
    return { statusCode: 500, error: { type: "INTERNAL_ERROR", message: error.message } };
  }
}
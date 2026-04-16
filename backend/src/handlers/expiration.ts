import { ApiHandlerResult } from "../types/api";
import { orderRepository } from "../repositories/orderRepository";
import { eventRepository } from "../repositories/eventRepository";

export async function expireOrders(): Promise<ApiHandlerResult> {
  try {
    const expiredOrders = await orderRepository.findExpiredPending();
    let releasedSpots = 0;

    for (const order of expiredOrders) {
      const lotes = await eventRepository.findLotesByEventId(order.event_id);
      
      for (const lote of lotes) {
        if (lote.reserved >= order.ticket_quantity) {
          await eventRepository.releaseTickets(lote.id, order.ticket_quantity);
          releasedSpots += order.ticket_quantity;
          break;
        }
      }

      await orderRepository.updateStatus(order.id, "EXPIRED");
    }

    return {
      statusCode: 200,
      data: {
        expiredOrders: expiredOrders.length,
        releasedSpots,
      },
    };
  } catch (error: any) {
    console.error("Expiration error:", error);
    return { statusCode: 500, error: { type: "INTERNAL_ERROR", message: error.message } };
  }
}
import { orderRepository } from "../../repositories/orderRepository";
import { eventRepository } from "../../repositories/eventRepository";

export class ExpirationService {
  async expireOrders(): Promise<{ expiredOrders: number; releasedSpots: number }> {
    const expiredOrders = await orderRepository.findExpiredPending();
    let releasedSpots = 0;

    for (const order of expiredOrders) {
      // Get the lote that was reserved
      const lotes = await eventRepository.findLotesByEventId(order.event_id);
      
      // Release the spots (decrement reserved)
      for (const lote of lotes) {
        if (lote.reserved >= order.ticket_quantity) {
          await eventRepository.releaseTickets(lote.id, order.ticket_quantity);
          releasedSpots += order.ticket_quantity;
          break;
        }
      }

      // Update order status
      await orderRepository.updateStatus(order.id, "EXPIRED");
    }

    return { expiredOrders: expiredOrders.length, releasedSpots };
  }
}

export const expirationService = new ExpirationService();
export default expirationService;
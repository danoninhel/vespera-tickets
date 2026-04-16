import cron from "node-cron";
import { eventRepository } from "./repositories";
import { orderRepository } from "./repositories";

async function runExpiration(): Promise<void> {
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

  console.log("[CRON] Expired:", expiredOrders.length, "orders, released:", releasedSpots, "spots");
}

export function startCron(): void {
  cron.schedule("*/10 * * * *", async () => {
    console.log("[CRON] Running expiration...");
    try {
      await runExpiration();
    } catch (error) {
      console.error("[CRON] Error:", error);
    }
  });
  
  console.log("[CRON] Scheduled: expireOrders every 10 minutes");
}
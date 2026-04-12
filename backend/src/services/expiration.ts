import { prismaClient } from "../lib/prisma";

export type ExpireResult = {
  expiredOrders: number;
  releasedSpots: number;
};

export async function expireOrders(): Promise<ExpireResult> {
  const expiredOrders = await prismaClient.$queryRaw<{ id: string; ticket_quantity: number; event_id: string }[]>`
    SELECT id, ticket_quantity, event_id 
    FROM orders 
    WHERE status = 'PENDING' 
    AND expires_at < NOW()
  `;

  if (expiredOrders.length === 0) {
    return { expiredOrders: 0, releasedSpots: 0 };
  }

  let releasedSpots = 0;

  await prismaClient.$transaction(async (tx) => {
    for (const order of expiredOrders) {
      await tx.orders.update({
        where: { id: order.id },
        data: { status: "EXPIRED" },
      });

      await tx.$queryRaw`
        UPDATE lotes 
        SET reserved = reserved - ${order.ticket_quantity}
        WHERE event_id = ${order.event_id}::uuid
        AND reserved >= ${order.ticket_quantity}
      `;

      releasedSpots += order.ticket_quantity;
    }
  });

  console.log(`Expired ${expiredOrders.length} orders, released ${releasedSpots} spots`);

  return { expiredOrders: expiredOrders.length, releasedSpots };
}

export async function cancelOrder(orderId: string) {
  if (!orderId) {
    throw {
      type: "VALIDATION_ERROR",
      message: "orderId is required",
    };
  }

  const order = await prismaClient.orders.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw {
      type: "NOT_FOUND",
      message: "Order not found",
    };
  }

  if (order.status !== "PENDING") {
    throw {
      type: "BUSINESS_ERROR",
      message: "Only pending orders can be cancelled",
    };
  }

  return await prismaClient.$transaction(async (tx) => {
    await tx.orders.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });

    await tx.$queryRaw`
      UPDATE lotes 
      SET reserved = reserved - ${order.ticket_quantity}
      WHERE event_id = ${order.event_id}::uuid
    `;

    return { success: true };
  });
}

export async function getAvailableSpots(eventId: string) {
  if (!eventId) {
    throw {
      type: "VALIDATION_ERROR",
      message: "eventId is required",
    };
  }

  const [result] = await prismaClient.$queryRaw<{ available: number }[]>`
    SELECT COALESCE(SUM(total - reserved), 0) as available
    FROM lotes
    WHERE event_id = ${eventId}::uuid
  `;

  return result?.available || 0;
}
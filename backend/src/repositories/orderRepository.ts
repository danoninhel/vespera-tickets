import { prismaClient } from "../lib/prisma";

export interface OrderEntity {
  id: string;
  event_id: string;
  status: string;
  ticket_quantity: number;
  expires_at: Date;
  payment_id: string | null;
  created_at: Date | null;
}

export class OrderRepository {
  async create(data: {
    eventId: string;
    ticketQuantity: number;
    expiresAt: Date;
  }): Promise<OrderEntity> {
    return await prismaClient.orders.create({
      data: {
        event_id: data.eventId,
        ticket_quantity: data.ticketQuantity,
        expires_at: data.expiresAt,
        status: "PENDING",
      },
    });
  }

  async findById(id: string): Promise<OrderEntity | null> {
    return await prismaClient.orders.findUnique({
      where: { id },
    });
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await prismaClient.orders.update({
      where: { id },
      data: { status },
    });
  }

  async setPaymentId(orderId: string, paymentId: string): Promise<void> {
    await prismaClient.orders.update({
      where: { id: orderId },
      data: { payment_id: paymentId },
    });
  }

  async findExpiredPending(): Promise<OrderEntity[]> {
    const now = new Date();
    return await prismaClient.orders.findMany({
      where: {
        status: "PENDING",
        expires_at: { lt: now },
      },
    });
  }

  async findByEventId(eventId: string): Promise<OrderEntity[]> {
    return await prismaClient.orders.findMany({
      where: { event_id: eventId },
    });
  }

  async findByPaymentId(paymentId: string): Promise<OrderEntity | null> {
    return await prismaClient.orders.findFirst({
      where: { payment_id: paymentId },
    });
  }
}

export const orderRepository = new OrderRepository();
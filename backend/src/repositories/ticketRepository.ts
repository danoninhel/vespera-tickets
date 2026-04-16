import { prismaClient } from "../lib/prisma";
import { randomUUID } from "crypto";

export interface TicketEntity {
  id: string;
  order_id: string;
  event_id: string;
  name: string;
  email: string;
  code: string;
  checked_in: boolean;
  created_at: Date | null;
}

export class TicketRepository {
  async createForOrder(orderId: string, eventId: string, tickets: { name: string; email: string }[]): Promise<TicketEntity[]> {
    const created: TicketEntity[] = [];
    
    for (const ticket of tickets) {
      const code = randomUUID();
      const createdTicket = await prismaClient.tickets.create({
        data: {
          order_id: orderId,
          event_id: eventId,
          name: ticket.name,
          email: ticket.email,
          code,
          checked_in: false,
        },
      });
      created.push(createdTicket);
    }
    
    return created;
  }

  async findByOrderId(orderId: string): Promise<TicketEntity[]> {
    return await prismaClient.tickets.findMany({
      where: { order_id: orderId },
    });
  }

  async findByCode(code: string): Promise<TicketEntity | null> {
    return await prismaClient.tickets.findFirst({
      where: { code },
    });
  }

  async findByEventId(eventId: string): Promise<TicketEntity[]> {
    return await prismaClient.tickets.findMany({
      where: { event_id: eventId },
    });
  }
}

export const ticketRepository = new TicketRepository();
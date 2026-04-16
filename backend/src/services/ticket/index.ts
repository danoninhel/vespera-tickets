import { ticketRepository } from "../../repositories/ticketRepository";
import { orderRepository } from "../../repositories/orderRepository";

export interface CreateTicketsInput {
  orderId: string;
  tickets: {
    name: string;
    email: string;
  }[];
}

export interface TicketServiceResult {
  tickets: {
    id: string;
    code: string;
    name: string;
    email: string;
  }[];
}

export class TicketService {
  async createTickets(input: CreateTicketsInput): Promise<TicketServiceResult> {
    const { orderId, tickets } = input;

    if (!orderId?.trim()) {
      throw { type: "VALIDATION_ERROR", message: "orderId is required" };
    }

    if (!tickets || tickets.length === 0) {
      throw { type: "VALIDATION_ERROR", message: "tickets must be a non-empty array" };
    }

    for (const ticket of tickets) {
      if (!ticket.name?.trim()) {
        throw { type: "VALIDATION_ERROR", message: "ticket name is required" };
      }
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw { type: "NOT_FOUND", message: "Order not found" };
    }

    if (order.status !== "PAID") {
      throw { type: "BUSINESS_ERROR", message: "Order must be paid to create tickets" };
    }

    const createdTickets = await ticketRepository.createForOrder(orderId, order.event_id, tickets);

    return {
      tickets: createdTickets.map(t => ({
        id: t.id,
        code: t.code,
        name: t.name,
        email: t.email,
      })),
    };
  }

  async getTicketsByOrder(orderId: string): Promise<{ tickets: any[] }> {
    if (!orderId?.trim()) {
      throw { type: "VALIDATION_ERROR", message: "orderId is required" };
    }

    const tickets = await ticketRepository.findByOrderId(orderId);

    if (tickets.length === 0) {
      throw { type: "NOT_FOUND", message: "No tickets found for this order" };
    }

    return { tickets };
  }

  async validateTicket(code: string): Promise<{ ticket: any; valid: boolean }> {
    if (!code?.trim()) {
      throw { type: "VALIDATION_ERROR", message: "code is required" };
    }

    const ticket = await ticketRepository.findByCode(code);

    if (!ticket) {
      throw { type: "NOT_FOUND", message: "Ticket not found" };
    }

    return {
      ticket: {
        id: ticket.id,
        code: ticket.code,
        name: ticket.name,
        email: ticket.email,
        checked_in: ticket.checked_in,
      },
      valid: true,
    };
  }
}

export const ticketService = new TicketService();
export default ticketService;
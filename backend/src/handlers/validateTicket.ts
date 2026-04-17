import { ticketRepository } from "../repositories/ticketRepository";
import { orderRepository } from "../repositories/orderRepository";
import { ApiHandlerResult } from "../types/api";

export async function getOrderTickets(input: { order_id: string }): Promise<ApiHandlerResult> {
  try {
    if (!input.order_id) {
      return { statusCode: 400, error: { type: "VALIDATION_ERROR", message: "order_id is required" } };
    }

    const order = await orderRepository.findById(input.order_id);
    if (!order) {
      return { statusCode: 404, error: { type: "NOT_FOUND", message: "Order not found" } };
    }

    const tickets = await ticketRepository.findByOrderId(input.order_id);

    return {
      statusCode: 200,
      data: {
        order_id: order.id,
        status: order.status,
        tickets: tickets.map((t) => ({
          id: t.id,
          name: t.name,
          email: t.email,
          code: t.code,
          checked_in: t.checked_in,
        })),
      },
    };
  } catch (error: any) {
    return { statusCode: 500, error: { type: "INTERNAL_ERROR", message: error.message } };
  }
}

export async function validateTicket(input: { code: string }): Promise<ApiHandlerResult> {
  try {
    if (!input.code) {
      return { statusCode: 400, error: { type: "VALIDATION_ERROR", message: "code is required" } };
    }

    const ticket = await ticketRepository.findByCode(input.code);
    if (!ticket) {
      return { statusCode: 404, error: { type: "NOT_FOUND", message: "Ticket not found" } };
    }

    if (ticket.checked_in) {
      return {
        statusCode: 200,
        data: {
          valid: false,
          message: "Ticket already used",
          ticket: {
            id: ticket.id,
            name: ticket.name,
            email: ticket.email,
            checked_in: ticket.checked_in,
          },
        },
      };
    }

    const updated = await ticketRepository.markAsCheckedIn(input.code);
    
    return {
      statusCode: 200,
      data: {
        valid: true,
        message: "Ticket validated",
        ticket: {
          id: updated?.id,
          name: updated?.name,
          email: updated?.email,
          checked_in: updated?.checked_in,
        },
      },
    };
  } catch (error: any) {
    return { statusCode: 500, error: { type: "INTERNAL_ERROR", message: error.message } };
  }
}
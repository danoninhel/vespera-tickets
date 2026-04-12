import { prismaClient } from "../lib/prisma";

export type CreateTicketsInput = {
  orderId: string;
  tickets: {
    name: string;
    email: string;
  }[];
};

export type TicketResult = {
  tickets: {
    id: string;
    code: string;
    name: string;
  }[];
};

function generateTicketCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "VP";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createTickets(input: CreateTicketsInput): Promise<TicketResult> {
  const { orderId, tickets } = input;

  if (!orderId || orderId.trim() === "") {
    throw {
      type: "VALIDATION_ERROR",
      message: "orderId is required",
    };
  }

  if (!tickets || tickets.length === 0) {
    throw {
      type: "VALIDATION_ERROR",
      message: "At least one ticket is required",
    };
  }

  for (const ticket of tickets) {
    if (!ticket.name || !ticket.email) {
      throw {
        type: "VALIDATION_ERROR",
        message: "Each ticket must have name and email",
      };
    }
  }

  const existingOrder = await prismaClient.orders.findUnique({
    where: { id: orderId },
    include: { events: true },
  });

  if (!existingOrder) {
    throw {
      type: "NOT_FOUND",
      message: "Order not found",
    };
  }

  if (existingOrder.status !== "PAID") {
    throw {
      type: "BUSINESS_ERROR",
      message: "Order is not paid",
    };
  }

  return await prismaClient.$transaction(async (tx) => {
    const createdTickets = [];

    for (const ticket of tickets) {
      const code = generateTicketCode();

      const created = await tx.tickets.create({
        data: {
          order_id: orderId,
          name: ticket.name,
          email: ticket.email,
          code,
          event_id: existingOrder.event_id,
        },
      });

      createdTickets.push({
        id: created.id,
        code: created.code,
        name: created.name,
      });
    }

    return { tickets: createdTickets };
  });
}

export async function getTicketsByOrder(orderId: string) {
  if (!orderId) {
    throw {
      type: "VALIDATION_ERROR",
      message: "orderId is required",
    };
  }

  const tickets = await prismaClient.tickets.findMany({
    where: { order_id: orderId },
    select: {
      id: true,
      code: true,
      name: true,
      email: true,
      checked_in: true,
    },
  });

  if (tickets.length === 0) {
    throw {
      type: "NOT_FOUND",
      message: "No tickets found for this order",
    };
  }

  return tickets;
}

export async function validateTicket(code: string) {
  if (!code || code.trim() === "") {
    throw {
      type: "VALIDATION_ERROR",
      message: "Ticket code is required",
    };
  }

  const ticket = await prismaClient.tickets.findFirst({
    where: { code: code.trim().toUpperCase() },
    include: {
      orders: {
        select: { status: true },
      },
      events: {
        select: { title: true, id: true },
      },
    },
  });

  if (!ticket) {
    throw {
      type: "NOT_FOUND",
      message: "Invalid ticket",
    };
  }

  if (ticket.checked_in) {
    throw {
      type: "BUSINESS_ERROR",
      message: "Ticket already used",
    };
  }

  return {
    id: ticket.id,
    code: ticket.code,
    name: ticket.name,
    eventId: ticket.event_id,
    eventTitle: ticket.events.title,
    checkedIn: ticket.checked_in,
  };
}

export async function checkInTicket(code: string) {
  if (!code || code.trim() === "") {
    throw {
      type: "VALIDATION_ERROR",
      message: "Ticket code is required",
    };
  }

  const ticket = await prismaClient.tickets.findFirst({
    where: { code: code.trim().toUpperCase() },
  });

  if (!ticket) {
    throw {
      type: "NOT_FOUND",
      message: "Ticket not found",
    };
  }

  if (ticket.checked_in) {
    throw {
      type: "BUSINESS_ERROR",
      message: "Ticket already checked in",
    };
  }

  return await prismaClient.tickets.update({
    where: { id: ticket.id },
    data: { checked_in: true },
  });
}
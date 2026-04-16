import { eventRepository } from "../../repositories/eventRepository";
import { orderRepository } from "../../repositories/orderRepository";
import { PaymentGatewayFactory } from "../payment";
import { EmailGatewayFactory } from "../email";
import { buildOrderConfirmationHtml } from "../../templates/orderEmail";

export interface ServiceOrderResult {
  orderId: string;
  expiresAt: Date;
  ticketQuantity: number;
  paymentId: string;
  pixQrCode?: string;
  pixQrCodeImage?: string;
}

export interface CreateOrderInput {
  eventId: string;
  tickets: {
    name: string;
    email: string;
  }[];
}

export class OrderService {
  async createOrder(input: CreateOrderInput): Promise<ServiceOrderResult> {
    const { eventId, tickets } = input;
    const ticketQuantity = tickets.length;

    if (ticketQuantity === 0) {
      throw { type: "BUSINESS_ERROR", message: "At least one ticket is required" };
    }

    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw { type: "NOT_FOUND", message: "Event not found" };
    }

    const lote = await eventRepository.findAvailableLote(eventId, ticketQuantity);
    if (!lote) {
      throw { type: "BUSINESS_ERROR", message: "No tickets available" };
    }

    const updateCount = await eventRepository.reserveTickets(lote.id, ticketQuantity);
    if (updateCount === 0) {
      throw { type: "BUSINESS_ERROR", message: "Lote esgotado" };
    }

    const pricePerTicket = lote.price;
    const totalAmount = ticketQuantity * pricePerTicket;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const order = await orderRepository.create({
      eventId,
      ticketQuantity,
      expiresAt,
    });

    const paymentGateway = PaymentGatewayFactory.create();
    const paymentResult = await paymentGateway.createPayment({
      orderId: order.id,
      amount: totalAmount,
      description: `Compra de ${ticketQuantity} ingresso(s)`,
      payerEmail: tickets[0].email,
    });

    if (paymentResult.paymentId) {
      await orderRepository.setPaymentId(order.id, paymentResult.paymentId);
    }

    const emailHtml = buildOrderConfirmationHtml({
      orderId: order.id,
      tickets,
      totalAmount,
      expiresAt,
      pixQrCode: paymentResult.pixQrCode,
    });

    const emailGateway = EmailGatewayFactory.create();
    try {
      await emailGateway.sendEmail({
        to: tickets[0].email,
        subject: `Compra #${order.id} - Vespera Ingressos`,
        html: emailHtml,
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    return {
      orderId: order.id,
      expiresAt: paymentResult.expirationDate || expiresAt,
      ticketQuantity,
      paymentId: paymentResult.paymentId,
      pixQrCode: paymentResult.pixQrCode,
      pixQrCodeImage: paymentResult.pixQrCodeImage,
    };
  }

  async getOrderStatus(orderId: string): Promise<{ status: string } | null> {
    const order = await orderRepository.findById(orderId);
    if (!order) return null;
    return { status: order.status };
  }

  async markAsPaid(orderId: string, paymentId: string): Promise<void> {
    await orderRepository.setPaymentId(orderId, paymentId);
    await orderRepository.updateStatus(orderId, "PAID");
  }

  async expireOrders(): Promise<{ expiredOrders: number; releasedSpots: number }> {
    const expiredOrders = await orderRepository.findExpiredPending();
    let releasedSpots = 0;

    for (const order of expiredOrders) {
      await orderRepository.updateStatus(order.id, "EXPIRED");
      releasedSpots += order.ticket_quantity;
    }

    return { expiredOrders: expiredOrders.length, releasedSpots };
  }
}

export const orderService = new OrderService();
export default orderService;
import { ApiHandlerResult } from "../types/api";
import { createOrderValidator } from "../validators/createOrder";
import { orderService } from "../services/order/create";
import { eventRepository } from "../repositories/eventRepository";

interface TicketInput {
  name: string;
  email: string;
}

interface CreateOrderBody {
  event_id: string;
  tickets: TicketInput[];
}

export async function createOrder(body: CreateOrderBody): Promise<ApiHandlerResult> {
  try {
    const validation = createOrderValidator.validate(body);
    if (!validation.valid) {
      return { statusCode: 400, error: { type: "VALIDATION_ERROR", message: validation.errors.join(", ") } };
    }

    const { event_id, tickets } = validation.data!;
    
    const event = await eventRepository.findById(event_id);
    if (!event) {
      return { statusCode: 404, error: { type: "NOT_FOUND", message: "Event not found" } };
    }

    const lote = await eventRepository.findAvailableLote(event_id, tickets.length);
    if (!lote) {
      return { statusCode: 400, error: { type: "BUSINESS_ERROR", message: "No tickets available" } };
    }

    const result = await orderService.createOrder({
      eventId: event_id,
      tickets,
    });

    return {
      statusCode: 201,
      data: {
        id: result.orderId,
        status: "pending",
        payment_id: result.paymentId,
        expires_at: result.expiresAt,
        pix_qr_code: result.pixQrCode,
        pix_qr_code_image: result.pixQrCodeImage,
      },
    };

  } catch (error: any) {
    console.error("Error creating order:", error);
    const statusCode = error?.type === "NOT_FOUND" ? 404 : 500;
    return { statusCode, error: { type: error?.type || "INTERNAL_ERROR", message: error?.message || "Failed to create order" } };
  }
}
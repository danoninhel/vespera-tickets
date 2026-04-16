import { ApiHandlerResult } from "../types/api";
import { eventService } from "../services/event/create";
import { eventListService } from "../services/event/list";
import { createEventValidator } from "../validators/createEvent";

interface EventParams {
  id?: string;
}

interface EventBody {
  title?: string;
  description?: string;
  image_url?: string;
  capacity?: number;
  metadata?: Record<string, unknown>;
  artists?: string[];
}

export async function getEvents(): Promise<ApiHandlerResult> {
  try {
    const events = await eventListService.findAll();
    
    const response = events.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      image_url: e.image_url,
      capacity: e.capacity,
      created_at: e.created_at?.toISOString(),
      lotes: e.lotes.map((l: any) => ({
        id: l.id,
        name: l.name,
        price: l.price,
        total: l.total,
        reserved: l.reserved,
        available: l.total - l.reserved,
      })),
    }));

    return { statusCode: 200, data: { events: response } };
  } catch (error: any) {
    return { statusCode: 500, error: { type: "INTERNAL_ERROR", message: error.message } };
  }
}

export async function getEvent(params: EventParams): Promise<ApiHandlerResult> {
  try {
    const eventId = params.id;
    
    if (!eventId) {
      return { statusCode: 400, error: { type: "VALIDATION_ERROR", message: "event_id is required" } };
    }
    
    const event = await eventListService.findById(eventId);
    
    if (!event) {
      return { statusCode: 404, error: { type: "NOT_FOUND", message: "Event not found" } };
    }

    return {
      statusCode: 200,
      data: {
        id: event.id,
        title: event.title,
        description: event.description,
        image_url: event.image_url,
        capacity: event.capacity,
        created_at: event.created_at?.toISOString(),
        lotes: event.lotes.map((l: any) => ({
          id: l.id,
          name: l.name,
          price: l.price,
          total: l.total,
          reserved: l.reserved,
          available: l.total - l.reserved,
        })),
      },
    };
  } catch (error: any) {
    return { statusCode: 500, error: { type: "INTERNAL_ERROR", message: error.message } };
  }
}

export async function createEvent(body: EventBody): Promise<ApiHandlerResult> {
  try {
    const validation = createEventValidator.validate(body);
    if (!validation.valid) {
      return { statusCode: 400, error: { type: "VALIDATION_ERROR", message: validation.errors.join(", ") } };
    }

    const event = await eventService.create(validation.data!);

    return { statusCode: 201, data: { id: event.id, title: event.title } };
  } catch (error: any) {
    const statusCode = error.type === "VALIDATION_ERROR" ? 400 : 500;
    return { statusCode, error: { type: error.type || "INTERNAL_ERROR", message: error.message } };
  }
}
import { prismaClient } from "../../lib/prisma";

interface EventWithLotes {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  capacity: number;
  created_at: Date | null;
  lotes: any[];
}

class EventListService {
  async findById(id: string): Promise<EventWithLotes | null> {
    return await prismaClient.events.findUnique({
      where: { id },
      include: {
        lotes: { orderBy: { position: "asc" } },
        event_artists: { include: { artists: true } },
      },
    });
  }

  async findAll(): Promise<EventWithLotes[]> {
    return await prismaClient.events.findMany({
      orderBy: { created_at: "desc" },
      include: {
        lotes: { orderBy: { position: "asc" } },
      },
    });
  }

  async findLotesByEventId(eventId: string): Promise<any[]> {
    return await prismaClient.lotes.findMany({
      where: { event_id: eventId },
      orderBy: { position: "asc" },
    });
  }
}

export const eventListService = new EventListService();
export default eventListService;
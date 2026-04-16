import { eventRepository, EventEntity } from "../../repositories/eventRepository";

interface CreateEventInput {
  title: string;
  description: string;
  image_url: string;
  capacity: number;
  artists?: string[];
  lotes?: {
    name: string;
    price: number;
    total: number;
  }[];
}

export interface EventWithLotes extends EventEntity {
  lotes: any[];
}

class EventService {
  async create(input: CreateEventInput): Promise<EventWithLotes> {
    const { title, description, image_url, capacity, artists, lotes } = input;
    
    if (!title?.trim()) {
      throw { type: "VALIDATION_ERROR", message: "title is required" };
    }
    if (!description?.trim()) {
      throw { type: "VALIDATION_ERROR", message: "description is required" };
    }
    if (!image_url?.trim()) {
      throw { type: "VALIDATION_ERROR", message: "image_url is required" };
    }
    if (!capacity || capacity <= 0) {
      throw { type: "VALIDATION_ERROR", message: "capacity must be positive" };
    }
    if (!artists || !Array.isArray(artists) || artists.length === 0) {
      throw { type: "VALIDATION_ERROR", message: "artists must be a non-empty array" };
    }
    if (!lotes || !Array.isArray(lotes) || lotes.length === 0) {
      throw { type: "VALIDATION_ERROR", message: "lotes must be a non-empty array" };
    }

    const totalLoteSpots = lotes.reduce((sum, l) => sum + l.total, 0);
    if (totalLoteSpots !== capacity) {
      throw { type: "VALIDATION_ERROR", message: `lotes total (${totalLoteSpots}) must equal event capacity (${capacity})` };
    }

    const event = await eventRepository.create({
      title,
      description,
      image_url,
      capacity,
    });

    for (const artistName of artists) {
      const artist = await eventRepository.findOrCreateArtist(artistName);
      await eventRepository.linkArtistToEvent(event.id, artist.id);
    }

    for (let i = 0; i < lotes.length; i++) {
      await eventRepository.addLote(event.id, {
        name: lotes[i].name,
        price: lotes[i].price,
        total: lotes[i].total,
        position: i + 1,
      });
    }

    const createdLotes = await eventRepository.findLotesByEventId(event.id);
    return { ...event, lotes: createdLotes };
  }

  async findById(id: string): Promise<EventWithLotes | null> {
    const event = await eventRepository.findById(id);
    if (!event) return null;
    
    const lotes = await eventRepository.findLotesByEventId(id);
    return { ...event, lotes };
  }

  async findAll(): Promise<EventWithLotes[]> {
    const events = await eventRepository.findAll();
    return events.map(e => ({ ...e, lotes: [] }));
  }
}

export const eventService = new EventService();
export default eventService;
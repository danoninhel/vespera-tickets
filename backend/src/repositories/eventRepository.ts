import { prismaClient } from "../lib/prisma";

interface LoteEntity {
  id: string;
  event_id: string;
  name: string;
  price: number;
  total: number;
  reserved: number;
  position: number;
}

export interface EventEntity {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  capacity: number;
  created_at: Date | null;
}

export class EventRepository {
  async findById(id: string): Promise<EventEntity | null> {
    return await prismaClient.events.findUnique({
      where: { id },
    });
  }

  async findAll(): Promise<EventEntity[]> {
    return await prismaClient.events.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async create(data: {
    title: string;
    description: string;
    image_url: string;
    capacity: number;
  }): Promise<EventEntity> {
    return await prismaClient.events.create({
      data,
    });
  }

  async findLotesByEventId(eventId: string): Promise<LoteEntity[]> {
    return await prismaClient.lotes.findMany({
      where: { event_id: eventId },
      orderBy: { position: 'asc' },
    });
  }

  async findAvailableLote(eventId: string, quantity: number): Promise<LoteEntity | null> {
    const result = await prismaClient.$queryRaw<LoteEntity[]>`
      SELECT * FROM lotes
      WHERE event_id = ${eventId}::uuid
        AND (total - reserved) >= ${quantity}
      ORDER BY position ASC
      LIMIT 1
    `;
    return result[0] || null;
  }

  async reserveTickets(loteId: string, quantity: number): Promise<number> {
    const result = await prismaClient.$executeRaw`
      UPDATE lotes 
      SET reserved = reserved + ${quantity}
      WHERE id = ${loteId}::uuid 
        AND (total - reserved) >= ${quantity}
    `;
    return result;
  }

  async addLote(eventId: string, data: {
    name: string;
    price: number;
    total: number;
    position: number;
  }): Promise<void> {
    await prismaClient.lotes.create({
      data: {
        event_id: eventId,
        name: data.name,
        price: data.price,
        total: data.total,
        position: data.position,
      },
    });
  }

  async releaseTickets(loteId: string, quantity: number): Promise<number> {
    const result = await prismaClient.$executeRaw`
      UPDATE lotes 
      SET reserved = reserved - ${quantity}
      WHERE id = ${loteId}::uuid 
        AND reserved >= ${quantity}
    `;
    return result;
  }

  async findOrCreateArtist(name: string): Promise<{ id: string }> {
    let artist = await prismaClient.artists.findFirst({ where: { name } });
    if (!artist) {
      artist = await prismaClient.artists.create({ data: { name } });
    }
    return { id: artist.id };
  }

  async linkArtistToEvent(eventId: string, artistId: string): Promise<void> {
    await prismaClient.event_artists.create({
      data: { event_id: eventId, artist_id: artistId },
    });
  }
}

export const eventRepository = new EventRepository();
import { prismaClient } from "../lib/prisma";

export type CreateLoteInput = {
  name: string;
  price: number;
  total: number;
};

export type CreateEventWithLotesInput = {
  title: string;
  description: string;
  image_url: string;
  capacity: number;
  artists?: string[];
  lotes: CreateLoteInput[];
};

async function findOrCreateArtist(tx: any, name: string) {
  const existing = await tx.artists.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (existing) return existing;

  try {
    return await tx.artists.create({ data: { name } });
  } catch {
    const recovered = await tx.artists.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (!recovered) throw new Error(`Failed to create artist: ${name}`);
    return recovered;
  }
}

export async function createEventWithLotes(input: CreateEventWithLotesInput) {
  const { title, description, image_url, capacity, artists = [], lotes } = input;

  if (!title?.trim()) throw new Error("title is required");
  if (!description?.trim()) throw new Error("description is required");
  if (!image_url?.trim()) throw new Error("image_url is required");
  if (!capacity || capacity <= 0) throw new Error("capacity is required");
  if (!lotes?.length) throw new Error("lotes is required");

  for (const lote of lotes) {
    if (!lote.name?.trim()) throw new Error("lote name is required");
    if (lote.price <= 0) throw new Error("lote price must be positive");
    if (lote.total <= 0) throw new Error("lote total must be positive");
  }

  const totalLoteCapacity = lotes.reduce((sum, l) => sum + l.total, 0);
  if (totalLoteCapacity !== capacity) {
    throw new Error(`Total lote capacity (${totalLoteCapacity}) must match event capacity (${capacity})`);
  }

  return await prismaClient.$transaction(async (tx) => {
    const event = await tx.events.create({
      data: { title, description, image_url, capacity },
    });

    if (artists.length > 0) {
      const artistRecords = await Promise.all(
        artists.map((name) => findOrCreateArtist(tx, name))
      );

      await tx.event_artists.createMany({
        data: artistRecords.map((artist) => ({
          event_id: event.id,
          artist_id: artist.id,
        })),
      });
    }

    const sortedLotes = [...lotes].sort((a, b) => {
      if (a.price !== b.price) return b.price - a.price;
      return 0;
    });

    for (let i = 0; i < sortedLotes.length; i++) {
      await tx.lotes.create({
        data: {
          event_id: event.id,
          name: sortedLotes[i].name,
          price: sortedLotes[i].price,
          total: sortedLotes[i].total,
          position: i + 1,
          reserved: 0,
        },
      });
    }

    return event;
  });
}

export async function getEventById(eventId: string) {
  return prismaClient.events.findUnique({
    where: { id: eventId },
    include: {
      lotes: { orderBy: { position: "asc" } },
      event_artists: { include: { artists: true } },
    },
  });
}

export async function getOrderById(orderId: string) {
  return prismaClient.orders.findUnique({
    where: { id: orderId },
  });
}

export async function getLoteById(loteId: string) {
  return prismaClient.lotes.findUnique({
    where: { id: loteId },
  });
}

export async function getAllLotes(eventId: string) {
  return prismaClient.lotes.findMany({
    where: { event_id: eventId },
    orderBy: { position: "asc" },
  });
}
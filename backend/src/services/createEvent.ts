import { prismaClient } from "../lib/prisma";
import { PrismaTransaction } from "../types";

type CreateEventInput = {
  title: string;
  description: string;
  image_url: string;
  capacity: number;
  metadata?: Record<string, unknown>;
  artists: string[];
};

function validateInput(input: CreateEventInput): void {
  if (!input.title || !input.title.trim()) {
    throw new Error("title is required");
  }
  if (!input.description || !input.description.trim()) {
    throw new Error("description is required");
  }
  if (!input.image_url || !input.image_url.trim()) {
    throw new Error("image_url is required");
  }
  if (!input.capacity || input.capacity <= 0) {
    throw new Error("capacity is required");
  }
  if (!input.artists || !Array.isArray(input.artists) || input.artists.length === 0) {
    throw new Error("artists must be a non-empty array");
  }
}

export async function createEvent(input: CreateEventInput) {
  validateInput(input);

  const { title, description, image_url, capacity, metadata, artists } = input;

  return await prismaClient.$transaction(async (tx) => {
    const event = await tx.events.create({
      data: {
        title,
        description,
        image_url,
        capacity,
        metadata,
      },
    });

    const artistRecords = await findOrCreateArtists(tx, artists);

    await tx.event_artists.createMany({
      data: artistRecords.map((artist) => ({
        event_id: event.id,
        artist_id: artist.id,
      })),
      skipDuplicates: true,
    });

    return event;
  });
}

async function findOrCreateArtists(
  tx: PrismaTransaction,
  artistNames: string[]
): Promise<{ id: string; name: string }[]> {
  const uniqueNames = [...new Set(artistNames.map((n) => n.trim()))];
  const artistRecords: { id: string; name: string }[] = [];

  for (const name of uniqueNames) {
    const artist = await findOrCreateArtist(tx, name);
    artistRecords.push(artist);
  }

  return artistRecords;
}

async function findOrCreateArtist(
  tx: PrismaTransaction,
  name: string
): Promise<{ id: string; name: string }> {
  const existing = await tx.artists.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (existing) {
    return existing;
  }

  try {
    return await tx.artists.create({ data: { name } });
  } catch {
    const recovered = await tx.artists.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (!recovered) {
      throw new Error(`Failed to resolve artist: ${name}`);
    }

    return recovered;
  }
}
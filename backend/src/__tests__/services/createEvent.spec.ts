import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prismaClient } from "../lib/prisma";
import { createEvent } from "../services/createEvent";

describe("createEvent", () => {
  beforeEach(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();
  });

  afterEach(async () => {
    await prismaClient.tickets.deleteMany();
    await prismaClient.orders.deleteMany();
    await prismaClient.event_artists.deleteMany();
    await prismaClient.lotes.deleteMany();
    await prismaClient.events.deleteMany();
    await prismaClient.artists.deleteMany();
  });

  it("creates event with new artists", async () => {
    const event = await createEvent({
      title: "Test Event",
      description: "A test event",
      image_url: "https://example.com/image.jpg",
      capacity: 70,
      metadata: { genre: "rock" },
      artists: ["Metallica", "Slayer"],
    });

    expect(event).toBeDefined();
    expect(event.id).toBeDefined();
    expect(event.title).toBe("Test Event");

    const artists = await prismaClient.artists.findMany();
    expect(artists).toHaveLength(2);
  });

  it("throws when title is missing", async () => {
    await expect(
      createEvent({
        title: "",
        description: "Description",
        image_url: "https://example.com/image.jpg",
        capacity: 70,
        artists: ["Artist"],
      } as any)
    ).rejects.toThrow("title is required");
  });

  it("throws when artists array is empty", async () => {
    await expect(
      createEvent({
        title: "Event",
        description: "Description",
        image_url: "https://example.com/image.jpg",
        capacity: 70,
        artists: [],
      })
    ).rejects.toThrow("artists must be a non-empty array");
  });
});
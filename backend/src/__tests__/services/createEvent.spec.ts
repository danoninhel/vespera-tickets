import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prismaClient } from "@lib/prisma";
import { eventService } from "@services/event/create";

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

  it("creates event with artists and lotes", async () => {
    const event = await eventService.create({
      title: "Test Event",
      description: "A test event",
      image_url: "https://example.com/image.jpg",
      capacity: 70,
      metadata: { genre: "rock" },
      artists: ["Metallica", "Slayer"],
      lotes: [
        { name: "Early Bird", price: 5000, total: 30 },
        { name: "Regular", price: 7000, total: 40 },
      ],
    });

    expect(event).toBeDefined();
    expect(event.id).toBeDefined();
    expect(event.title).toBe("Test Event");
    expect(event.lotes).toHaveLength(2);
    expect(event.lotes[0].total + event.lotes[1].total).toBe(70);

    const artists = await prismaClient.artists.findMany();
    expect(artists).toHaveLength(2);
  });

  it("throws when title is missing", async () => {
    await expect(
      eventService.create({
        title: "",
        description: "Description",
        image_url: "https://example.com/image.jpg",
        capacity: 70,
        artists: ["Artist"],
        lotes: [{ name: "L1", price: 5000, total: 70 }],
      } as any)
    ).rejects.toThrow("title is required");
  });

  it("throws when artists array is empty", async () => {
    await expect(
      eventService.create({
        title: "Event",
        description: "Description",
        image_url: "https://example.com/image.jpg",
        capacity: 70,
        artists: [],
        lotes: [{ name: "L1", price: 5000, total: 70 }],
      })
    ).rejects.toThrow("artists must be a non-empty array");
  });

  it("throws when lotes array is empty", async () => {
    await expect(
      eventService.create({
        title: "Event",
        description: "Description",
        image_url: "https://example.com/image.jpg",
        capacity: 70,
        artists: ["Artist"],
        lotes: [],
      })
    ).rejects.toThrow("lotes must be a non-empty array");
  });

  it("throws when lotes total != capacity", async () => {
    await expect(
      eventService.create({
        title: "Event",
        description: "Description",
        image_url: "https://example.com/image.jpg",
        capacity: 70,
        artists: ["Artist"],
        lotes: [{ name: "L1", price: 5000, total: 50 }],
      })
    ).rejects.toThrow("lotes total (50) must equal event capacity (70)");
  });

  it("throws when no lotes provided", async () => {
    await expect(
      eventService.create({
        title: "Event",
        description: "Description",
        image_url: "https://example.com/image.jpg",
        capacity: 70,
        artists: ["Artist"],
      } as any)
    ).rejects.toThrow("lotes must be a non-empty array");
  });
});
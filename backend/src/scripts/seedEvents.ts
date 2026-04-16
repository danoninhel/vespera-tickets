import { prismaClient } from "../lib/prisma";

async function main() {
  console.log("Creating test events...");

  const event1 = await prismaClient.events.create({
    data: {
      title: "Indie Night Vol.3",
      description: "Uma noite indie com três bandas incredibleáveis. Prepare-se para uma experiência musical única com muito rock alternativo, shoegaze e indie rock.",
      image_url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
      capacity: 70,
    },
  });

  await prismaClient.lotes.createMany({
    data: [
      { event_id: event1.id, name: "Primeiro Lote", price: 8000, total: 30, reserved: 25, position: 1 },
      { event_id: event1.id, name: "Segundo Lote", price: 10000, total: 25, reserved: 10, position: 2 },
      { event_id: event1.id, name: "Terceiro Lote", price: 12000, total: 15, reserved: 0, position: 3 },
    ],
  });

  const artists1 = ["The Velvet Echoes", "Neon Dreams", "Midnight Whispers"];
  for (const name of artists1) {
    let artist = await prismaClient.artists.findFirst({ where: { name } });
    if (!artist) artist = await prismaClient.artists.create({ data: { name } });
    await prismaClient.event_artists.create({ data: { event_id: event1.id, artist_id: artist.id } });
  }

  const event2 = await prismaClient.events.create({
    data: {
      title: "Shoegaze Festival",
      description: "O melhor do shoegaze nacional em uma noite única. Trilha sonora perfeita para quem ama guitars densos e vocais etéreos.",
      image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80",
      capacity: 50,
    },
  });

  await prismaClient.lotes.createMany({
    data: [
      { event_id: event2.id, name: "Lote Único", price: 9000, total: 50, reserved: 0, position: 1 },
    ],
  });

  const artists2 = ["Dream Walls", "Velvet Haze", "Echoes of June"];
  for (const name of artists2) {
    let artist = await prismaClient.artists.findFirst({ where: { name } });
    if (!artist) artist = await prismaClient.artists.create({ data: { name } });
    await prismaClient.event_artists.create({ data: { event_id: event2.id, artist_id: artist.id } });
  }

  const event3 = await prismaClient.events.create({
    data: {
      title: "Rock Alternativo Night",
      description: "Uma noite dedicado ao rock alternativo. Bands que mixing influências clássicas com sounds modernos.",
      image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
      capacity: 100,
    },
  });

  await prismaClient.lotes.createMany({
    data: [
      { event_id: event3.id, name: "Early Bird", price: 6000, total: 40, reserved: 40, position: 1 },
      { event_id: event3.id, name: "Lote Regular", price: 8000, total: 60, reserved: 30, position: 2 },
    ],
  });

  const artists3 = ["The Underground", "Broken Radio", "City Lights"];
  for (const name of artists3) {
    let artist = await prismaClient.artists.findFirst({ where: { name } });
    if (!artist) artist = await prismaClient.artists.create({ data: { name } });
    await prismaClient.event_artists.create({ data: { event_id: event3.id, artist_id: artist.id } });
  }

  const event4 = await prismaClient.events.create({
    data: {
      title: "Post-Rock Experience",
      description: "Uma experiência imersiva de post-rock. Bandas que levam você a uma jornada através de sonscapes épicos.",
      image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
      capacity: 40,
    },
  });

  await prismaClient.lotes.createMany({
    data: [
      { event_id: event4.id, name: "Lote Único", price: 11000, total: 40, reserved: 5, position: 1 },
    ],
  });

  const artists4 = ["Northern Star", "Silent Ocean", "Mountain Echo"];
  for (const name of artists4) {
    let artist = await prismaClient.artists.findFirst({ where: { name } });
    if (!artist) artist = await prismaClient.artists.create({ data: { name } });
    await prismaClient.event_artists.create({ data: { event_id: event4.id, artist_id: artist.id } });
  }

  console.log("Created 4 events with lots!");
  console.log("Event IDs:", event1.id, event2.id, event3.id, event4.id);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prismaClient.$disconnect());
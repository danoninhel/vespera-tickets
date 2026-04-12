import { prismaClient } from "../lib/prisma";
import { createEventWithLotes, addLotesToEvent, getEventById, getAllEvents } from "../services/events";

type CreateEventRequest = {
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
};

export const getEvents = async () => {
  try {
    const events = await getAllEvents();
    
    return {
      statusCode: 200,
      body: JSON.stringify(events.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        image_url: e.image_url,
        capacity: e.capacity,
        created_at: e.created_at?.toISOString(),
        artists: e.event_artists.map(a => a.artists.name),
        lotes: e.lotes.map(l => ({
          id: l.id,
          name: l.name,
          price: l.price,
          total: l.total,
          reserved: l.reserved,
          available: l.total - l.reserved,
        })),
      }))),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao buscar eventos", details: error.message }),
    };
  }
};

export const getEvent = async (eventId: string) => {
  try {
    const event = await getEventById(eventId);
    
    if (!event) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Evento não encontrado" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: event.id,
        title: event.title,
        description: event.description,
        image_url: event.image_url,
        capacity: event.capacity,
        created_at: event.created_at?.toISOString(),
        artists: event.event_artists.map(a => a.artists.name),
        lotes: event.lotes.map(l => ({
          id: l.id,
          name: l.name,
          price: l.price,
          total: l.total,
          reserved: l.reserved,
          available: l.total - l.reserved,
        })),
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao buscar evento", details: error.message }),
    };
  }
};

export const createEvent = async (req: any) => {
  try {
    const body: CreateEventRequest = req.body;

    if (!body?.title) {
      return { statusCode: 400, body: JSON.stringify({ error: "title é obrigatório" }) };
    }
    if (!body?.description) {
      return { statusCode: 400, body: JSON.stringify({ error: "description é obrigatório" }) };
    }
    if (!body?.image_url) {
      return { statusCode: 400, body: JSON.stringify({ error: "image_url é obrigatório" }) };
    }
    if (!body?.capacity || body.capacity <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "capacity deve ser maior que 0" }) };
    }

    const hasLotes = body.lotes && body.lotes.length > 0;

    let event;
    
    if (hasLotes) {
      event = await createEventWithLotes({
        title: body.title,
        description: body.description,
        image_url: body.image_url,
        capacity: body.capacity,
        artists: body.artists || [],
        lotes: body.lotes!,
      });
    } else {
      event = await prismaClient.events.create({
        data: {
          title: body.title,
          description: body.description,
          image_url: body.image_url,
          capacity: body.capacity,
        },
      });

      if (body.artists?.length) {
        for (const artistName of body.artists) {
          let artist = await prismaClient.artists.findFirst({
            where: { name: { equals: artistName, mode: "insensitive" } },
          });
          
          if (!artist) {
            artist = await prismaClient.artists.create({ data: { name: artistName } });
          }

          await prismaClient.event_artists.create({
            data: { event_id: event.id, artist_id: artist.id },
          });
        }
      }
    }

    return {
      statusCode: 201,
      body: JSON.stringify({ id: event.id, title: event.title }),
    };

  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao criar evento", details: error.message }),
    };
  }
};

export const addLotes = async (eventId: string, req: any) => {
  try {
    const body = req.body;

    if (!body?.lotes || !Array.isArray(body.lotes) || body.lotes.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "lotes é obrigatório" }) };
    }

    for (const lote of body.lotes) {
      if (!lote.name) {
        return { statusCode: 400, body: JSON.stringify({ error: "lote name é obrigatório" }) };
      }
      if (!lote.price || lote.price <= 0) {
        return { statusCode: 400, body: JSON.stringify({ error: "lote price deve ser maior que 0" }) };
      }
      if (!lote.total || lote.total <= 0) {
        return { statusCode: 400, body: JSON.stringify({ error: "lote total deve ser maior que 0" }) };
      }
    }

    const event = await addLotesToEvent(eventId, body.lotes);

    if (!event) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Event not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ id: event.id, title: event.title, lotes: event.lotes }),
    };

  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao adicionar lotes", details: error.message }),
    };
  }
};
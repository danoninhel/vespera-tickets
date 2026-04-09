import { prismaClient } from '../lib/prisma';
import { Event, ApiResponse, ErrorResponse } from '../types/index';

export const getEvents = async (
  event: unknown = {}
): Promise<ApiResponse<Event[] | ErrorResponse>> => {
  try {

    const events = await prismaClient.events.findMany();
    const result = {
      rows: events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        image_url: e.image_url,
        capacity: e.capacity,
        metadata: e.metadata,
        created_at: e.created_at?.toISOString(),
      })),
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.rows ?? []),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Erro ao buscar eventos', details: error.message }),
    };
  }
};
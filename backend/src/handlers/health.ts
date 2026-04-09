import { prismaClient } from '../lib/prisma';
import { ApiResponse, ErrorResponse } from '../types/index';

export const healthCheck = async (
  event: unknown = {}
): Promise<
  ApiResponse<
    | { status: 'healthy'; message: string }
    | ErrorResponse
  >
> => {
  try {
    await prismaClient.$queryRaw`SELECT 1`;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'healthy',
        message: 'Database connection is healthy',
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Database health check failed',
        details: error.message,
      }),
    };
  }
};

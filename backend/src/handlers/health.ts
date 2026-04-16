import { prismaClient } from '../lib/prisma';
import { ApiHandlerResult } from '../types/api';

export const healthCheck = async (): Promise<ApiHandlerResult<{ status: string; message: string }>> => {
  try {
    await prismaClient.$queryRaw`SELECT 1`;
    return {
      statusCode: 200,
      data: {
        status: 'healthy',
        message: 'Database connection is healthy',
      },
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      error: {
        type: 'DATABASE_ERROR',
        message: error.message,
      },
    };
  }
};
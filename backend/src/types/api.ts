export interface ApiResponse<T = any> {
  statusCode: number;
  body: string;
}

export type ApiHandlerResult<T = any> = {
  data?: T;
  error?: { type: string; message: string };
  statusCode: number;
};

export type ErrorResponse = {
  error: {
    type: string;
    message: string;
  };
};

export type SuccessResponse<T> = T & {
  success: boolean;
};

export function successResponse<T>(data: T, statusCode = 200): ApiResponse<T> {
  return {
    statusCode,
    body: JSON.stringify({ ...data, success: true }),
  };
}

export function errorResponse(type: string, message: string, statusCode = 500): ApiResponse {
  return {
    statusCode,
    body: JSON.stringify({ error: { type, message }, success: false }),
  };
}

export function parseBody<T = any>(body: any): T {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as T;
    } catch {
      return {} as T;
    }
  }
  return body as T;
}

export type FastifyHandler = (body: any, params: any, query: any) => Promise<ApiHandlerResult>;

export function createHandler(fn: FastifyHandler) {
  return async (request: any, _reply: any) => {
    const result = await fn(request.body || {}, request.params || {}, request.query || {});
    return result;
  };
}
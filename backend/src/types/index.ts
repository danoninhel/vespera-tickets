export type ApiResponse<T> = {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
};

export interface Event {
  id: string; // uuid
  title: string;
  description: string;
  image_url: string;
  capacity: number;
  metadata: Record<string, unknown>;
  created_at: string; // ISO date
}

export interface ErrorResponse {
  error: string;
  details?: string;
}
export type ApiResponse<T> = {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
};

export interface ErrorResponse {
  error: string;
  details?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  image_url: string;
  capacity: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface EventWithLotes extends Event {
  lotes: Lote[];
  artists: Artist[];
}

export interface Lote {
  id: string;
  name: string;
  price: number;
  total: number;
  reserved: number;
  position: number;
}

export interface Artist {
  id: string;
  name: string;
}

export interface CreateEventInput {
  title: string;
  description: string;
  image_url: string;
  capacity: number;
  metadata?: Record<string, unknown>;
  artists?: string[];
}

export interface CreateLoteInput {
  name: string;
  price: number;
  total: number;
}

export interface CreateOrderInput {
  eventId: string;
  tickets: {
    name: string;
    email: string;
  }[];
}

export interface TicketInput {
  name: string;
  email: string;
}

export interface OrderResult {
  orderId: string;
  expiresAt: Date;
  ticketQuantity: number;
  pixQrCode: string;
  pixCopyPaste: string;
}

export interface PaymentResult {
  id: string;
  point_of_interaction: {
    address: {
      url: string;
    };
  };
}
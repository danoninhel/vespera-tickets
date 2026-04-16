const API_BASE = 'http://localhost:3000';

export interface Event {
  id: string;
  title: string;
  description: string;
  image_url: string;
  capacity: number;
  created_at: string;
  lotes: Lot[];
  artists?: string[];
}

export interface Lot {
  id: string;
  name: string;
  price: number;
  total: number;
  reserved: number;
  available: number;
}

export interface OrderRequest {
  event_id: string;
  tickets: { name: string; email: string }[];
}

export interface OrderResponse {
  id: string;
  status: string;
  payment_id?: string;
  pix_qr_code?: string;
  pix_qr_code_image?: string;
  expires_at?: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }
  return data;
}

export async function getEvents(): Promise<Event[]> {
  const res = await fetch(`${API_BASE}/events`);
  const data = await handleResponse<{ events: Event[] }>(res);
  return data.events;
}

export async function getEvent(id: string): Promise<Event> {
  const res = await fetch(`${API_BASE}/events/${id}`);
  return handleResponse<Event>(res);
}

export async function createOrder(data: OrderRequest): Promise<OrderResponse> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<OrderResponse>(res);
}
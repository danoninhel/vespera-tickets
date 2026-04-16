export interface Event {
  id: string;
  title: string;
  description: string;
  image: string;
  capacity: number;
  artists: string[];
  date: string;
  time: string;
  location: {
    venue: string;
    address: string;
    city: string;
  };
  metadata: Record<string, unknown>;
  lots: Lot[];
}

export interface Lot {
  id: string;
  name: string;
  price: number;
  totalQuantity: number;
  reservedQuantity: number;
  position: number;
}

export const mockEvent: Event = {
  id: 'evt-001',
  title: 'Indie Night Vol.3',
  description: 'Uma noite indie com três bandas incredibleáveis. Prepare-se para uma experiência musical única com muito rock alternativo, shoegaze e indie rock.',
  image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
  capacity: 70,
  artists: ['The Velvet Echoes', 'Neon Dreams', 'Midnight Whispers'],
  date: '2026-05-15',
  time: '20:00',
  location: {
    venue: 'Casa Indie',
    address: 'Rua das Flores, 123',
    city: 'São Paulo, SP'
  },
  metadata: {},
  lots: [
    {
      id: 'lot-001',
      name: 'Primeiro Lote',
      price: 80,
      totalQuantity: 30,
      reservedQuantity: 25,
      position: 1
    },
    {
      id: 'lot-002',
      name: 'Segundo Lote',
      price: 100,
      totalQuantity: 25,
      reservedQuantity: 10,
      position: 2
    },
    {
      id: 'lot-003',
      name: 'Terceiro Lote',
      price: 120,
      totalQuantity: 15,
      reservedQuantity: 0,
      position: 3
    }
  ]
};
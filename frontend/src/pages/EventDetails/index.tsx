import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/Button';
import { getEvent, type Event, type Lot } from '../../lib/api';

function formatPrice(price: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price / 100);
}

function getAvailableLots(lots: Lot[]) {
  return lots.filter(lot => lot.available > 0);
}

export function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!id) {
      setError('ID do evento não encontrado');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    getEvent(id)
      .then(data => {
        console.log('Event loaded:', data);
        setEvent(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading event:', err);
        setError(err.message || 'Erro ao carregar evento');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Carregando evento...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-error mb-4">{error || 'Evento não encontrado'}</p>
          <Button onClick={() => navigate('/')}>Voltar</Button>
        </div>
      </div>
    );
  }

  const availableLots = getAvailableLots(event.lotes);
  const currentLot = selectedLot || (availableLots.length > 0 ? availableLots[0] : null);
  const availableTickets = currentLot?.available || 0;

  if (availableLots.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </header>
        <main className="px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-text-primary mb-4">{event.title}</h1>
            <p className="text-text-secondary">Ingressos esgotados</p>
            <Button onClick={() => navigate('/')} className="mt-4">Voltar</Button>
          </div>
        </main>
      </div>
    );
  }
  
  const handleBuy = () => {
    if (!currentLot || !id) return;
    navigate('/checkout', { 
      state: { 
        eventId: id,
        event: {
          id: event.id,
          title: event.title,
          description: event.description || '',
          image_url: event.image_url || '',
          capacity: event.capacity,
          artists: event.artists,
          lotes: event.lotes,
        },
        lot: currentLot,
        quantity 
      } 
    });
  };
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-base font-medium">Voltar</span>
        </button>
      </header>
      
      <main className="px-4 pb-32">
        <div className="relative aspect-[4/3] -mx-4 mb-6">
          <img 
            src={event.image_url} 
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        
        <div className="space-y-6">
          <div>
            <h1 className="text-[32px] leading-[1.25] font-bold text-text-primary mb-3">
              {event.title}
            </h1>
            <div className="flex flex-wrap gap-2 mb-4">
              {event.artists?.map((artist, i) => (
                <span 
                  key={i}
                  className="px-3 py-1 text-sm bg-primary-light/20 text-primary rounded-full"
                >
                  {artist}
                </span>
              ))}
            </div>
          </div>
          
          <div className="py-4 border-y border-border">
            <p className="text-text-secondary leading-relaxed">
              {event.description}
            </p>
          </div>
          
          {availableLots.length > 1 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Selecione o lote</h2>
              {availableLots.map((lotItem) => {
                const isSelected = currentLot?.id === lotItem.id;
                return (
                  <button
                    key={lotItem.id}
                    onClick={() => setSelectedLot(lotItem)}
                    className={isSelected 
                      ? "w-full text-left p-4 rounded-lg border border-primary bg-primary/5 transition-all"
                      : "w-full text-left p-4 rounded-lg border border-border hover:border-primary/50 transition-all"
                    }
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{lotItem.name}</span>
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(lotItem.price)}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">
                      {lotItem.available} disponíveis
                    </p>
                  </button>
                );
              })}
            </div>
          )}
          
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Quantidade</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 flex items-center justify-center border border-border rounded-lg hover:border-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(availableTickets, quantity + 1))}
                disabled={quantity >= availableTickets}
                className="w-12 h-12 flex items-center justify-center border border-border rounded-lg hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-text-secondary">
              Máximo {availableTickets} por pedido
            </p>
          </div>
          
          <div className="text-sm text-text-secondary">
            {event.capacity} vagas no total
          </div>
        </div>
      </main>
      
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-base text-text-secondary">Total</p>
            <p className="text-3xl font-bold text-primary">
              {currentLot ? formatPrice(currentLot.price * quantity) : 'Indisponível'}
            </p>
          </div>
          <Button 
            onClick={handleBuy} 
            size="lg"
            disabled={!currentLot || availableTickets === 0}
          >
            Comprar {quantity} {quantity === 1 ? 'ingresso' : 'ingressos'}
          </Button>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvents, type Event } from '../../lib/api';

function formatPrice(price: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price / 100);
}

export function HomePage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEvents()
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Carregando eventos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-error mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="text-primary underline">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border px-4 py-6">
        <h1 className="text-3xl font-bold text-text-primary">Vespera Tickets</h1>
        <p className="text-text-secondary mt-1">Encontre os melhores eventos indie</p>
      </header>
      
      <main className="px-4 py-6">
        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary">Nenhum evento disponível</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const availableLots = event.lotes.filter(l => l.available > 0);
              const cheapestPrice = availableLots.length > 0 
                ? Math.min(...availableLots.map(l => l.price))
                : null;
              
              return (
                <button
                  key={event.id}
                  onClick={() => navigate(`/event/${event.id}`)}
                  className="w-full text-left bg-white border border-border rounded-xl overflow-hidden hover:border-primary transition-colors"
                >
                  <div className="aspect-video">
                    <img 
                      src={event.image_url} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <h2 className="text-xl font-semibold text-text-primary">
                      {event.title}
                    </h2>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {event.artists?.slice(0, 3).map((artist, i) => (
                        <span 
                          key={i}
                          className="px-3 py-1 text-sm bg-primary-light/20 text-primary rounded-full"
                        >
                          {artist}
                        </span>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-text-secondary">
                        {event.capacity} vagas
                      </span>
                      {cheapestPrice && (
                        <span className="text-lg font-bold text-primary">
                          A partir de {formatPrice(cheapestPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
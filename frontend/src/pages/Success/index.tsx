import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';

interface LocationState {
  event: {
    id: string;
    title: string;
    description: string;
    image_url: string;
    capacity: number;
    artists: string[];
    lotes: { id: string; name: string; price: number }[];
  };
  lot: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
  attendees: { name: string; email: string }[];
  orderId: string;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price / 100);
}

export function SuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  
  if (!state) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-text-secondary mb-4">Compra não encontrada</p>
          <Button onClick={() => navigate('/')}>Voltar aos eventos</Button>
        </div>
      </div>
    );
  }
  
  const { event, lot, quantity, attendees, orderId } = state;
  const total = lot.price * quantity;
  
  return (
    <div className="min-h-screen bg-background">
      <main className="px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-success/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Pagamento confirmado!</h1>
          <p className="text-text-secondary">Seu ingresso foi confirmado com sucesso</p>
        </div>
        
        <div className="bg-white border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4 pb-4 border-b border-border mb-4">
            <img 
              src={event.image_url} 
              alt={event.title}
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{event.title}</h2>
              <p className="text-sm text-text-secondary">{event.artists?.slice(0, 2).join(', ')}</p>
            </div>
          </div>
          
          <div className="text-center py-6 bg-background-secondary rounded-lg mb-4">
            <p className="text-sm text-text-secondary mb-2">QR Code do seu ingresso</p>
            <div className="inline-block bg-white p-4 rounded-lg border border-border">
              <div 
                className="w-40 h-40 bg-contain bg-center bg-no-repeat" 
                style={{ backgroundImage: `url('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${orderId}')` }} 
              />
            </div>
            <p className="text-xs text-text-secondary mt-2">Apresente na entrada do evento</p>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-medium text-text-primary">Ingressos ({quantity})</h3>
            {attendees.map((attendee, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-text-primary">{attendee.name}</p>
                  <p className="text-sm text-text-secondary">{attendee.email}</p>
                </div>
                <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">Confirmado</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white border border-border rounded-xl p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-text-secondary">Pedido</span>
            <span className="font-medium">{orderId}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-text-secondary">Lote</span>
            <span className="font-medium">{lot.name}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-text-secondary">Quantidade</span>
            <span className="font-medium">{quantity}x</span>
          </div>
          <div className="flex justify-between pt-3 border-t border-border">
            <span className="font-semibold">Total pago</span>
            <span className="font-bold text-primary">{formatPrice(total)}</span>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Baixar ingresso
          </Button>
          <Button variant="ghost" fullWidth>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Compartilhar
          </Button>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-text-secondary">
            Enviamos os detalhes para o seu email
          </p>
        </div>
      </main>
    </div>
  );
}
import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { createOrder } from '../../lib/api';

interface LocationState {
  eventId: string;
  event: {
    id: string;
    title: string;
    description: string;
    image_url: string;
    capacity: number;
    artists: string[];
    lotes: { id: string; name: string; price: number; available: number }[];
  };
  lot: {
    id: string;
    name: string;
    price: number;
    available: number;
  };
  quantity: number;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price / 100);
}

interface Attendee {
  name: string;
  email: string;
}

export function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>(
    Array(state?.quantity || 1).fill(null).map(() => ({ name: '', email: '' }))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  if (!state) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-text-secondary mb-4">Nenhum evento selecionado</p>
          <Button onClick={() => navigate('/')}>Voltar aos eventos</Button>
        </div>
      </div>
    );
  }
  
  const { event, lot, quantity } = state;
  const total = lot.price * quantity;
  
  const validateAttendees = () => {
    const newErrors: Record<string, string> = {};
    attendees.forEach((attendee, i) => {
      if (!attendee.name.trim()) {
        newErrors[`name-${i}`] = 'Nome obrigatório';
      }
      if (!attendee.email.trim()) {
        newErrors[`email-${i}`] = 'Email obrigatório';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email)) {
        newErrors[`email-${i}`] = 'Email inválido';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleNext = async () => {
    if (step === 1) {
      if (validateAttendees()) {
        setStep(2);
      }
    } else {
      setSubmitError(null);
      setIsSubmitting(true);
      
      try {
        const orderData = {
          event_id: state.eventId,
          lot_id: lot.id,
          tickets: attendees,
        };
        
        await createOrder(orderData);
        
        setStep(3);
        setTimeout(() => {
          navigate('/success', { 
            state: { 
              event, 
              lot, 
              quantity, 
              attendees,
              orderId: 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase()
            } 
          });
        }, 2000);
      } catch (err: any) {
        setSubmitError(err.message);
        setIsSubmitting(false);
      }
    }
  };
  
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate(-1);
    }
  };
  
  const updateAttendee = (index: number, field: keyof Attendee, value: string) => {
    const newAttendees = [...attendees];
    newAttendees[index] = { ...newAttendees[index], [field]: value };
    setAttendees(newAttendees);
    if (errors[`${field}-${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`${field}-${index}`];
      setErrors(newErrors);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-base font-medium">Voltar</span>
        </button>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div 
              key={s}
              className={`w-3 h-3 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>
      </header>
      
      <main className="px-4 py-6">
        <div className="flex items-center gap-4 mb-8 p-4 bg-white border border-border rounded-lg">
          <img 
            src={event.image_url} 
            alt={event.title}
            className="w-16 h-16 object-cover rounded-lg"
          />
          <div className="flex-1">
            <h2 className="font-semibold text-text-primary">{event.title}</h2>
            <p className="text-sm text-text-secondary">
              {event.artists?.slice(0, 2).join(', ')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-text-secondary">{quantity}x</p>
            <p className="font-bold text-primary">{formatPrice(lot.price)}</p>
          </div>
        </div>
        
        {step === 1 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold">Dados dos participantes</h1>
            <p className="text-sm text-text-secondary">
              Preencha os dados de cada ingresso
            </p>
            
            {attendees.map((attendee, i) => (
              <div key={i} className="p-4 bg-white border border-border rounded-lg">
                <h3 className="font-medium mb-4">Ingresso #{i + 1}</h3>
                <div className="space-y-4">
                  <Input
                    label="Nome completo"
                    value={attendee.name}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateAttendee(i, 'name', e.target.value)}
                    error={errors[`name-${i}`]}
                    fullWidth
                    placeholder="Seu nome"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={attendee.email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateAttendee(i, 'email', e.target.value)}
                    error={errors[`email-${i}`]}
                    fullWidth
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {step === 2 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold">Resumo do pedido</h1>
            
            <div className="bg-white border border-border rounded-lg p-4 space-y-4">
              <div className="flex justify-between">
                <span className="text-text-secondary">{lot.name}</span>
                <span>{formatPrice(lot.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Quantidade</span>
                <span>x{quantity}</span>
              </div>
              <div className="border-t border-border pt-4 flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>
            
            {submitError && (
              <div className="bg-error/10 border border-error/20 rounded-lg p-4 text-error">
                {submitError}
              </div>
            )}
            
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-primary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-primary">Pagamento via Pix</p>
                  <p className="text-sm text-text-secondary mt-1">
                    O QR Code será gerado após a confirmação. Você terá 30 minutos para realizar o pagamento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {step === 3 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Processando pagamento...</h2>
            <p className="text-text-secondary">Aguarde enquanto confirmamos seu pagamento</p>
          </div>
        )}
      </main>
      
      {step < 3 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4">
            <Button 
              onClick={handleNext} 
              fullWidth 
              size="lg"
              disabled={isSubmitting}
            >
              {step === 1 ? 'Continuar' : isSubmitting ? 'Processando...' : `Pagar ${formatPrice(total)}`}
            </Button>
        </div>
      )}
    </div>
  );
}
export interface OrderEmailData {
  orderId: string;
  tickets: {
    name: string;
    email: string;
  }[];
  totalAmount: number;
  expiresAt: Date;
  pixQrCode?: string;
}

export function buildOrderConfirmationHtml(data: OrderEmailData): string {
  const { orderId, tickets, totalAmount, expiresAt, pixQrCode } = data;
  
  const ticketsHtml = tickets.map((t, i) => `
    <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0;">
      <strong>Ingresso ${i + 1}</strong><br>
      Nome: ${t.name}<br>
      Código: ${orderId}
    </div>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h1 style="color: #4F46E5;">Compra de Ingressos - Vespera</h1>
      <p>Olá! Sua compra foi realizada com sucesso.</p>
      <p><strong>Pedido:</strong> ${orderId}</p>
      <p><strong>Total:</strong> R$ ${(totalAmount / 100).toFixed(2)}</p>
      <p><strong>Expira em:</strong> ${expiresAt.toLocaleString('pt-BR')}</p>
      <h3>Seus Ingressos:</h3>
      ${ticketsHtml}
      ${pixQrCode ? `
        <div style="margin-top: 20px; padding: 15px; background: #f5f5f5;">
          <h4>Pagamento via PIX</h4>
          <code style="background: #fff; padding: 10px; display: block; word-break: break-all;">
            ${pixQrCode}
          </code>
        </div>
      ` : ''}
    </div>
  `;
}
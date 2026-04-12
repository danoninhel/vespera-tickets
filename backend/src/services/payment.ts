import mercadopago from "mercadopago";

export type CreatePaymentInput = {
  orderId: string;
  amount: number;
  description: string;
  payerEmail: string;
};

export type PaymentResult = {
  id: string;
  status: string;
  pixQrCode?: string;
  pixQrCodeImage?: string;
  expirationDate?: Date;
  paymentId: string;
  externalReference: string;
};

function configureMp(): void {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw {
      type: "CONFIG_ERROR",
      message: "MERCADOPAGO_ACCESS_TOKEN not configured",
    };
  }

  mercadopago.configure({
    access_token: accessToken,
  });
}

export async function createPixPayment(input: CreatePaymentInput): Promise<PaymentResult> {
  if (!input.orderId || input.orderId.trim() === "") {
    throw {
      type: "PAYMENT_ERROR",
      message: "orderId is required",
    };
  }

  if (!input.amount || input.amount <= 0) {
    throw {
      type: "PAYMENT_ERROR",
      message: "amount must be positive",
    };
  }

  if (!input.payerEmail || !input.payerEmail.includes("@")) {
    throw {
      type: "PAYMENT_ERROR",
      message: "payerEmail is required",
    };
  }

  configureMp();

  const paymentData = {
    transaction_amount: input.amount / 100,
    payment_method_id: "pix",
    description: input.description,
    payer: {
      email: input.payerEmail,
    },
    external_reference: input.orderId,
    installments: 1,
  };

  return new Promise((resolve, reject) => {
    const mp = mercadopago as any;
    mp.payment.create(paymentData, (err: any, result: any) => {
      if (err) {
        reject({
          type: "PAYMENT_ERROR",
          message: err.message || "Payment failed",
        });
        return;
      }

      const payment = result;
      const pixData = (payment as any).point_of_interaction?.transaction_data || {};

      resolve({
        id: String(payment.id),
        status: payment.status,
        pixQrCode: pixData.qr_code,
        pixQrCodeImage: pixData.qr_code_image,
        expirationDate: payment.expires_date ? new Date(payment.expires_date) : undefined,
        paymentId: String(payment.id),
        externalReference: payment.external_reference,
      });
    });
  });
}

export async function getPaymentStatus(paymentId: string): Promise<string> {
  if (!paymentId) {
    throw {
      type: "PAYMENT_ERROR",
      message: "paymentId is required",
    };
  }

  configureMp();

  return new Promise((resolve, reject) => {
    const mp = mercadopago as any;
    const id = typeof paymentId === "string" ? parseInt(paymentId, 10) : paymentId;
    
    mp.payment.get(id, (err: any, result: any) => {
      if (err) {
        reject({
          type: "PAYMENT_ERROR",
          message: err.message || "Failed to get payment",
        });
        return;
      }

      resolve(result.status);
    });
  });
}

export async function getPaymentByExternalReference(externalRef: string): Promise<PaymentResult | null> {
  if (!externalRef) {
    throw {
      type: "PAYMENT_ERROR",
      message: "externalReference is required",
    };
  }

  configureMp();

  const filters = {
    external_reference: externalRef,
    status: "pending,approved,processing",
  };

  return new Promise((resolve, reject) => {
    const mp = mercadopago as any;
    mp.payment.search(filters, (err: any, result: any) => {
      if (err) {
        reject({
          type: "PAYMENT_ERROR",
          message: err.message || "Failed to search payment",
        });
        return;
      }

      const payments = result?.results || [];
      if (payments.length === 0) {
        resolve(null);
        return;
      }

      const payment = payments[0];
      const pixData = (payment as any).point_of_interaction?.transaction_data || {};

      resolve({
        id: String(payment.id),
        status: payment.status,
        pixQrCode: pixData.qr_code,
        pixQrCodeImage: pixData.qr_code_image,
        expirationDate: payment.expires_date ? new Date(payment.expires_date) : undefined,
        paymentId: String(payment.id),
        externalReference: payment.external_reference,
      });
    });
  });
}
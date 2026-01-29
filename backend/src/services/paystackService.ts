import axios from 'axios';
import crypto from 'crypto';

interface VerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    gateway_response: string;
    paid_at: string;
    channel: string;
    currency: string;
    metadata?: any;
  };
}

interface InitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export const paystackService = {
  getPublicKey() {
    return process.env.PAYSTACK_PUBLIC_KEY || '';
  },

  generateReference(prefix: string = 'TXN') {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  },

  async initializeTransaction(data: {
    email: string;
    amount: number;
    currency: string;
    reference: string;
    callbackUrl: string;
    metadata?: any;
  }): Promise<InitializeResponse> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error('PAYSTACK_SECRET_KEY is not defined');

    const response = await axios.post<InitializeResponse>(
      'https://api.paystack.co/transaction/initialize',
      {
        email: data.email,
        amount: data.amount,
        currency: data.currency,
        reference: data.reference,
        callback_url: data.callbackUrl,
        metadata: data.metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  async verifyTransaction(reference: string): Promise<VerifyResponse | null> {
    try {
      const secretKey = process.env.PAYSTACK_SECRET_KEY;

      if (!secretKey) {
        console.error('PAYSTACK_SECRET_KEY is not defined');
        throw new Error('Server configuration error');
      }

      const response = await axios.get<VerifyResponse>(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Paystack verification error:', error);
      return null;
    }
  },

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return false;

    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(payload)
      .digest('hex');
    return hash === signature;
  },

  async getBanks(country: string = 'kenya') {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error('PAYSTACK_SECRET_KEY is not defined');

    const response = await axios.get(
      `https://api.paystack.co/bank?country=${country}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );
    return response.data.data;
  }
};

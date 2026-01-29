/**
 * IntaSend Payment Service
 * Handles payment collection, verification, and payouts via IntaSend API
 * Documentation: https://developers.intasend.com/docs
 */

import axios, { AxiosInstance } from 'axios';

// Types for IntaSend API responses
interface IntaSendCheckoutResponse {
  id: string;
  url: string;
  signature: string;
}

interface IntaSendInvoice {
  invoice_id: string;
  state: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED' | 'CANCELLED';
  provider: string;
  charges: string;
  net_amount: string;
  currency: string;
  value: string;
  account: string;
  api_ref: string;
  mpesa_reference?: string;
  failed_reason?: string;
  created_at: string;
  updated_at: string;
}

interface IntaSendPaymentStatus {
  invoice: IntaSendInvoice;
  meta?: {
    customer?: {
      id: string;
      phone_number: string;
      email: string;
      first_name: string;
      last_name: string;
    };
  };
}

interface IntaSendPayoutTransaction {
  name: string;
  account: string;
  amount: number | string;
  narrative: string;
}

interface IntaSendPayoutResponse {
  tracking_id: string;
  status: string;
  transactions: Array<{
    status: string;
    request_reference_id: string;
    name: string;
    account: string;
    amount: string;
    narrative: string;
  }>;
}

interface IntaSendWebhookPayload {
  invoice_id: string;
  state: string;
  api_ref: string;
  value: string;
  currency: string;
  account: string;
  provider: string;
  charges: string;
  net_amount: string;
  failed_reason?: string;
  mpesa_reference?: string;
  challenge?: string;
}

export class IntaSendService {
  private apiClient: AxiosInstance;
  private publishableKey: string;
  private secretKey: string;
  private isTest: boolean;
  private baseUrl: string;
  private walletId: string;

  constructor() {
    this.publishableKey = process.env.INTASEND_PUBLISHABLE_KEY || '';
    this.secretKey = process.env.INTASEND_SECRET_KEY || '';
    this.isTest = process.env.INTASEND_TEST_MODE === 'true';
    this.walletId = process.env.INTASEND_WALLET_ID || '';
    this.baseUrl = this.isTest 
      ? 'https://sandbox.intasend.com/api/v1'
      : 'https://payment.intasend.com/api/v1';

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.secretKey}`,
      },
    });

    // Log configuration status
    if (!this.secretKey) {
      console.warn('⚠️ IntaSend Secret Key not configured');
    }
    if (!this.publishableKey) {
      console.warn('⚠️ IntaSend Publishable Key not configured');
    }
  }

  /**
   * Get publishable key for frontend use
   */
  getPublishableKey(): string {
    return this.publishableKey;
  }

  /**
   * Create a checkout/payment invoice
   * Returns a URL for hosted checkout page
   */
  async createCheckout(params: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    amount: number;
    currency?: string;
    apiRef: string;
    redirectUrl: string;
    webhookUrl?: string;
  }): Promise<IntaSendCheckoutResponse> {
    try {
      const response = await this.apiClient.post('/checkout/', {
        public_key: this.publishableKey,
        first_name: params.firstName,
        last_name: params.lastName,
        email: params.email,
        phone_number: params.phone || '',
        host: params.webhookUrl || process.env.FRONTEND_URL,
        amount: params.amount,
        currency: params.currency || 'KES',
        api_ref: params.apiRef,
        redirect_url: params.redirectUrl,
      });

      console.log('✅ IntaSend checkout created:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ IntaSend checkout error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to create checkout');
      }
      throw error;
    }
  }

  /**
   * Create a payment collection request (STK Push for M-Pesa)
   * This triggers an M-Pesa prompt on the user's phone
   */
  async createMpesaStkPush(params: {
    phoneNumber: string;
    email: string;
    amount: number;
    apiRef: string;
    narrative?: string;
  }): Promise<{ invoice: IntaSendInvoice; checkout_id: string }> {
    try {
      // Format phone number (ensure it starts with country code)
      const formattedPhone = this.formatPhoneNumber(params.phoneNumber);

      const response = await this.apiClient.post('/payment/mpesa-stk-push/', {
        amount: params.amount,
        phone_number: formattedPhone,
        email: params.email,
        api_ref: params.apiRef,
        narrative: params.narrative || 'Payment',
      });

      console.log('✅ IntaSend STK Push initiated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ IntaSend STK Push error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to initiate M-Pesa payment');
      }
      throw error;
    }
  }

  /**
   * Check payment status by invoice ID
   */
  async getPaymentStatus(invoiceId: string): Promise<IntaSendPaymentStatus> {
    try {
      const response = await this.apiClient.get(`/payment/status/?invoice_id=${invoiceId}`);
      return response.data;
    } catch (error) {
      console.error('❌ IntaSend status check error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to check payment status');
      }
      throw error;
    }
  }

  /**
   * Check payment status by API reference
   */
  async getPaymentStatusByRef(apiRef: string): Promise<IntaSendPaymentStatus> {
    try {
      const response = await this.apiClient.get(`/payment/status/?api_ref=${apiRef}`);
      return response.data;
    } catch (error) {
      console.error('❌ IntaSend status check error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to check payment status');
      }
      throw error;
    }
  }

  /**
   * Create M-Pesa payout (B2C - send money to phone number)
   * Used for seller withdrawals
   */
  async createMpesaPayout(params: {
    phoneNumber: string;
    name: string;
    amount: number;
    narrative: string;
  }): Promise<IntaSendPayoutResponse> {
    try {
      const formattedPhone = this.formatPhoneNumber(params.phoneNumber);

      const transactions: IntaSendPayoutTransaction[] = [{
        name: params.name,
        account: formattedPhone,
        amount: params.amount,
        narrative: params.narrative,
      }];

      // Create payout request
      const response = await this.apiClient.post('/send-money/mpesa/', {
        currency: 'KES',
        wallet_id: this.walletId,
        transactions,
      });

      console.log('✅ IntaSend payout created:', response.data.tracking_id);
      return response.data;
    } catch (error) {
      console.error('❌ IntaSend payout error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to create payout');
      }
      throw error;
    }
  }

  /**
   * Approve a payout request
   * Call this after createMpesaPayout if auto-approval is needed
   */
  async approvePayout(trackingId: string): Promise<IntaSendPayoutResponse> {
    try {
      const response = await this.apiClient.post('/send-money/approve/', {
        tracking_id: trackingId,
      });

      console.log('✅ IntaSend payout approved:', trackingId);
      return response.data;
    } catch (error) {
      console.error('❌ IntaSend payout approval error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to approve payout');
      }
      throw error;
    }
  }

  /**
   * Create bank transfer payout
   */
  async createBankPayout(params: {
    bankCode: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    narrative: string;
  }): Promise<IntaSendPayoutResponse> {
    try {
      const transactions = [{
        name: params.accountName,
        account: params.accountNumber,
        bank_code: params.bankCode,
        amount: params.amount,
        narrative: params.narrative,
      }];

      const response = await this.apiClient.post('/send-money/bank/', {
        currency: 'KES',
        wallet_id: this.walletId,
        transactions,
      });

      console.log('✅ IntaSend bank payout created:', response.data.tracking_id);
      return response.data;
    } catch (error) {
      console.error('❌ IntaSend bank payout error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to create bank payout');
      }
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(): Promise<{ available: number; currency: string }> {
    try {
      const response = await this.apiClient.get(`/wallets/${this.walletId}/`);
      return {
        available: parseFloat(response.data.available_balance || '0'),
        currency: response.data.currency || 'KES',
      };
    } catch (error) {
      console.error('❌ IntaSend wallet balance error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to get wallet balance');
      }
      throw error;
    }
  }

  /**
   * Verify webhook signature (if IntaSend provides challenge verification)
   */
  verifyWebhookChallenge(payload: IntaSendWebhookPayload, expectedChallenge?: string): boolean {
    // IntaSend uses a challenge field for webhook verification
    // The challenge should match what you configured in your IntaSend dashboard
    if (expectedChallenge && payload.challenge) {
      return payload.challenge === expectedChallenge;
    }
    // If no challenge is set, accept the webhook (ensure your endpoint is secured)
    return true;
  }

  /**
   * Parse webhook payload and determine payment status
   */
  parseWebhookPayload(payload: IntaSendWebhookPayload): {
    isComplete: boolean;
    isFailed: boolean;
    invoiceId: string;
    apiRef: string;
    amount: number;
    mpesaReference?: string;
    failedReason?: string;
  } {
    return {
      isComplete: payload.state === 'COMPLETE',
      isFailed: payload.state === 'FAILED',
      invoiceId: payload.invoice_id,
      apiRef: payload.api_ref,
      amount: parseFloat(payload.value),
      mpesaReference: payload.mpesa_reference,
      failedReason: payload.failed_reason,
    };
  }

  /**
   * Format phone number to international format (254...)
   */
  private formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    
    // Remove + if present
    formatted = formatted.replace(/^\+/, '');
    
    // Convert 07... to 2547...
    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.slice(1);
    }
    
    // If it doesn't start with 254, assume Kenyan and add prefix
    if (!formatted.startsWith('254')) {
      formatted = '254' + formatted;
    }
    
    return formatted;
  }
}

// Export singleton instance
export const intasendService = new IntaSendService();

// Export types for use in other files
export type {
  IntaSendCheckoutResponse,
  IntaSendInvoice,
  IntaSendPaymentStatus,
  IntaSendPayoutResponse,
  IntaSendWebhookPayload,
};

/**
 * M-Pesa Daraja API Service
 * Handles STK Push, B2C, C2B, and transaction verification
 */

interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface B2CResponse {
  ConversationID: string;
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

export class MpesaService {
  private consumerKey: string;
  private consumerSecret: string;
  private businessShortCode: string;
  private passkey: string;
  private callbackUrl: string;
  private baseUrl = 'https://sandbox.safaricom.co.ke'; // Use production URL in production

  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || '';
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
    this.businessShortCode = process.env.MPESA_SHORT_CODE || '';
    this.passkey = process.env.MPESA_PASSKEY || '';
    this.callbackUrl = process.env.MPESA_CALLBACK_URL || 'https://yourapp.com/api/v1/payments/mpesa-callback';
  }

  /**
   * Get OAuth token from Safaricom
   */
  private async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      const response = await fetch(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      const data = await response.json() as { access_token: string };
      return data.access_token;
    } catch (error) {
      console.error('❌ Failed to get M-Pesa access token:', error);
      throw new Error('Failed to authenticate with M-Pesa');
    }
  }

  /**
   * Generate timestamp in format YYYYMMDDHHmmss
   */
  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  }

  /**
   * Generate password for STK Push
   */
  private generatePassword(): string {
    const timestamp = this.getTimestamp();
    const data = this.businessShortCode + this.passkey + timestamp;
    return Buffer.from(data).toString('base64');
  }

  /**
   * Initiate STK Push - Lipa Na M-Pesa Online
   * Pops up PIN prompt on buyer's phone
   */
  async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    transactionId: string,
    buyerName: string
  ): Promise<STKPushResponse> {
    try {
      const token = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword();

      // Format phone number (remove + if present, ensure it starts with 254)
      const formattedPhone = phoneNumber.replace(/^\+/, '').replace(/^0/, '254');

      const response = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          BusinessShortCode: this.businessShortCode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.ceil(amount),
          PartyA: formattedPhone,
          PartyB: this.businessShortCode,
          PhoneNumber: formattedPhone,
          CallBackURL: this.callbackUrl,
          AccountReference: transactionId,
          TransactionDesc: `Payment for ${buyerName}`,
        }),
      });

      const data = await response.json() as STKPushResponse;

      if (data.ResponseCode === '0') {
        console.log('✅ STK Push initiated:', data.CheckoutRequestID);
        return data;
      } else {
        console.error('❌ STK Push failed:', data.ResponseDescription);
        throw new Error(data.ResponseDescription);
      }
    } catch (error) {
      console.error('❌ STK Push error:', error);
      throw error;
    }
  }

  /**
   * B2C - Release funds to Seller's M-Pesa
   * Called when buyer confirms delivery
   */
  async releaseSellerFunds(
    sellerPhone: string,
    amount: number,
    transactionId: string
  ): Promise<B2CResponse> {
    try {
      const token = await this.getAccessToken();

      // Format phone number
      const formattedPhone = sellerPhone.replace(/^\+/, '').replace(/^0/, '254');

      const response = await fetch(`${this.baseUrl}/mpesa/b2c/v1/paymentrequest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          InitiatorName: 'swiftline',
          SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
          CommandID: 'BusinessPayment',
          Amount: Math.ceil(amount),
          PartyA: this.businessShortCode,
          PartyB: formattedPhone,
          Remarks: `Payment for transaction ${transactionId}`,
          QueueTimeOutURL: this.callbackUrl,
          ResultURL: this.callbackUrl,
          Occassion: `TXN-${transactionId}`,
        }),
      });

      const data = await response.json() as B2CResponse;

      if (data.ResponseCode === '0') {
        console.log('✅ B2C payout initiated:', data.ConversationID);
        return data;
      } else {
        console.error('❌ B2C payout failed:', data.ResponseDescription);
        throw new Error(data.ResponseDescription);
      }
    } catch (error) {
      console.error('❌ B2C error:', error);
      throw error;
    }
  }

  /**
   * Query transaction status
   */
  async queryTransactionStatus(checkoutRequestID: string): Promise<{ status: string; message: string }> {
    try {
      const token = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.generatePassword();

      const response = await fetch(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          BusinessShortCode: this.businessShortCode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestID,
        }),
      });

      const data = await response.json() as { ResponseCode: string; ResponseDescription: string };

      return {
        status: data.ResponseCode === '0' ? 'success' : 'pending',
        message: data.ResponseDescription,
      };
    } catch (error) {
      console.error('❌ Transaction query error:', error);
      throw error;
    }
  }
}

export const mpesaService = new MpesaService();

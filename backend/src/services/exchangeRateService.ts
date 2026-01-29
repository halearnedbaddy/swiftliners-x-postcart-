import { prisma } from '../config/database';
import axios from 'axios';

class ExchangeRateService {
  private apiKey = process.env.EXCHANGE_RATE_API_KEY;
  private baseUrl = 'https://openexchangerates.org/api';

  /**
   * Fetch latest rates from external API and update database
   */
  async updateRates() {
    if (!this.apiKey) {
      console.warn('⚠️ EXCHANGE_RATE_API_KEY not configured. Skipping rate update.');
      return;
    }

    try {
      console.log('🔄 Fetching latest exchange rates...');
      const response = await axios.get(`${this.baseUrl}/latest.json?app_id=${this.apiKey}&base=USD`);
      const { rates } = response.data;

      // Update database using a transaction
      await prisma.$transaction(
        Object.entries(rates).map(([currency, rate]) =>
          prisma.exchangeRate.upsert({
            where: {
              fromCurrency_toCurrency: {
                fromCurrency: 'USD',
                toCurrency: currency,
              },
            },
            update: {
              rate: rate as number,
              updatedAt: new Date(),
            },
            create: {
              fromCurrency: 'USD',
              toCurrency: currency,
              rate: rate as number,
              source: 'openexchangerates.org',
            },
          })
        )
      );

      console.log('✅ Exchange rates updated successfully');
    } catch (error) {
      console.error('❌ Failed to update exchange rates:', error);
    }
  }

  /**
   * Get exchange rate between two currencies
   */
  async getRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) return 1.0;

    // If base is not USD, calculate cross rate
    if (fromCurrency !== 'USD') {
      const fromUSD = await this.getRate('USD', fromCurrency);
      const toUSD = await this.getRate('USD', toCurrency);
      return toUSD / fromUSD;
    }

    // Get from database
    const rateRecord = await prisma.exchangeRate.findUnique({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency: 'USD',
          toCurrency: toCurrency,
        },
      },
    });

    if (!rateRecord) {
      // Fallback for common currencies if DB is empty
      const fallbacks: Record<string, number> = {
        'KES': 129.50,
        'UGX': 3750.00,
        'TZS': 2450.00,
        'RWF': 1250.00,
        'NGN': 1450.00,
        'ZAR': 18.50,
        'GBP': 0.79,
        'EUR': 0.92,
      };

      if (fallbacks[toCurrency]) {
        console.warn(`⚠️ Using fallback rate for ${toCurrency}`);
        return fallbacks[toCurrency];
      }

      throw new Error(`Exchange rate not available for ${fromCurrency}/${toCurrency}`);
    }

    // Check if rate is stale (> 24 hours)
    const age = Date.now() - new Date(rateRecord.updatedAt).getTime();
    if (age > 24 * 60 * 60 * 1000) {
      console.warn(`⚠️ Exchange rate for ${toCurrency} is stale. Triggering update...`);
      this.updateRates(); // Async update
    }

    return Number(rateRecord.rate);
  }

  /**
   * Convert amount from one currency to another
   */
  async convert(amount: number, fromCurrency: string, toCurrency: string) {
    const rate = await this.getRate(fromCurrency, toCurrency);
    const convertedAmount = amount * rate;

    return {
      original: {
        amount,
        currency: fromCurrency,
      },
      converted: {
        amount: Math.round(convertedAmount * 100) / 100,
        currency: toCurrency,
      },
      rate,
      timestamp: new Date(),
    };
  }
}

export const exchangeRateService = new ExchangeRateService();

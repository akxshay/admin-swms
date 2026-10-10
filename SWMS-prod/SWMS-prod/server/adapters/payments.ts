import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

export interface CreateOrderResult {
  orderId: string;
  amountMinor: number;
  currency: string;
  keyId: string;
  provider: 'RAZORPAY' | 'FAKE';
}

export interface PaymentAdapter {
  createOrder(amountMinor: number, receiptId: string): Promise<CreateOrderResult>;
  verifySignature(orderId: string, paymentId: string, signature: string): boolean;
}

export class FakePaymentAdapter implements PaymentAdapter {
  async createOrder(amountMinor: number, receiptId: string): Promise<CreateOrderResult> {
    const orderId = `order_fake_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      orderId,
      amountMinor,
      currency: 'INR',
      keyId: 'rzp_test_fake_dev',
      provider: 'FAKE',
    };
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    // In fake mode, any non-empty signature or simulated signature is accepted
    return Boolean(orderId && paymentId && signature);
  }
}

export class RazorpayAdapter implements PaymentAdapter {
  private keyId: string;
  private keySecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  }

  async createOrder(amountMinor: number, receiptId: string): Promise<CreateOrderResult> {
    if (!this.keyId || !this.keySecret) {
      console.warn('⚠️ RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing. Falling back to FakePaymentAdapter.');
      return new FakePaymentAdapter().createOrder(amountMinor, receiptId);
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          amount: amountMinor,
          currency: 'INR',
          receipt: receiptId.slice(0, 40),
          notes: { service: 'SWMS Doorstep Waste Pickup' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Razorpay API responded with ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as any;
      return {
        orderId: data.id,
        amountMinor: data.amount,
        currency: data.currency,
        keyId: this.keyId,
        provider: 'RAZORPAY',
      };
    } catch (err) {
      console.error('Error creating Razorpay order:', err);
      // Fallback gracefully so checkout does not brick
      return new FakePaymentAdapter().createOrder(amountMinor, receiptId);
    }
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!this.keySecret) {
      return Boolean(orderId && paymentId && signature);
    }
    try {
      const generated = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      return generated === signature;
    } catch (err) {
      console.error('Error checking HMAC signature:', err);
      return false;
    }
  }
}

const isRazorpayConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export const paymentAdapter: PaymentAdapter = isRazorpayConfigured
  ? new RazorpayAdapter()
  : new FakePaymentAdapter();

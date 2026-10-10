import dotenv from 'dotenv';
dotenv.config();

export interface SmsAdapter {
  sendOtp(phone: string, otp: string): Promise<{ success: boolean; demoCode?: string }>;
}

export class ConsoleSmsAdapter implements SmsAdapter {
  async sendOtp(phone: string, otp: string): Promise<{ success: boolean; demoCode?: string }> {
    console.log(`\n======================================================`);
    console.log(`📲 [SMS GATEWAY (DEV/CONSOLE)] To: ${phone} | OTP: [${otp}]`);
    console.log(`   Valid for 5 minutes. DO NOT SHARE THIS WITH ANYONE.`);
    console.log(`======================================================\n`);
    return { success: true, demoCode: otp };
  }
}

export class Msg91SmsAdapter implements SmsAdapter {
  private authKey: string;

  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY || '';
  }

  async sendOtp(phone: string, otp: string): Promise<{ success: boolean; demoCode?: string }> {
    if (!this.authKey) {
      console.warn('⚠️ MSG91_AUTH_KEY missing, falling back to Console SMS');
      return new ConsoleSmsAdapter().sendOtp(phone, otp);
    }

    try {
      // MSG91 OTP endpoint
      const cleanPhone = phone.replace('+', '');
      const response = await fetch(`https://control.msg91.com/api/v5/otp?template_id=default&mobile=${cleanPhone}&authkey=${this.authKey}&otp=${otp}`, {
        method: 'POST',
      });
      const data = await response.json();
      return { success: (data as any).type === 'success' };
    } catch (err) {
      console.error('Failed to send SMS via MSG91:', err);
      return { success: false };
    }
  }
}

const provider = (process.env.SMS_PROVIDER || 'console').toLowerCase();
export const smsAdapter: SmsAdapter =
  provider === 'msg91' && process.env.MSG91_AUTH_KEY ? new Msg91SmsAdapter() : new ConsoleSmsAdapter();

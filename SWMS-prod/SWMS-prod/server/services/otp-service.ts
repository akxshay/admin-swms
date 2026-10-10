import crypto from 'crypto';
import { db, dbManager } from '../db';
import { smsAdapter } from '../adapters/sms';
import { OtpRecord } from '../types';

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export async function requestPhoneOtp(phone: string): Promise<{
  success: boolean;
  message: string;
  resendCooldownSeconds: number;
  demoCode?: string;
}> {
  // Normalize Indian phone number
  let cleanPhone = phone.trim().replace(/\s+/g, '');
  if (!cleanPhone.startsWith('+91')) {
    cleanPhone = `+91${cleanPhone.replace(/^0+/, '')}`;
  }

  const now = new Date();
  let existing = db.otpRecords.find((r) => r.phone === cleanPhone);

  // Check cooldown
  if (existing && new Date(existing.resendCooldownUntil) > now) {
    const remaining = Math.ceil((new Date(existing.resendCooldownUntil).getTime() - now.getTime()) / 1000);
    return {
      success: false,
      message: `Please wait ${remaining}s before requesting a new OTP.`,
      resendCooldownSeconds: remaining,
      demoCode: existing.demoCode,
    };
  }

  // Generate 4-digit OTP (e.g. in dev or if phone is demo, use 1234 or random)
  const isDev = process.env.NODE_ENV !== 'production';
  const otp = isDev && cleanPhone.endsWith('9876543210') ? '1234' : Math.floor(1000 + Math.random() * 9000).toString();

  const codeHash = hashOtp(otp);
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 min
  const resendCooldownUntil = new Date(now.getTime() + 30 * 1000).toISOString(); // 30 sec

  const record: OtpRecord = {
    phone: cleanPhone,
    codeHash,
    demoCode: isDev ? otp : undefined,
    expiresAt,
    attempts: 0,
    resendCooldownUntil,
  };

  if (existing) {
    Object.assign(existing, record);
  } else {
    db.otpRecords.push(record);
  }
  dbManager.persist();

  // Send via SMS Adapter
  const smsResult = await smsAdapter.sendOtp(cleanPhone, otp);

  return {
    success: true,
    message: `Verification OTP sent to ${cleanPhone}`,
    resendCooldownSeconds: 30,
    demoCode: smsResult.demoCode || (isDev ? otp : undefined),
  };
}

export function verifyPhoneOtp(phone: string, inputCode: string): {
  success: boolean;
  message: string;
  userId?: string;
} {
  let cleanPhone = phone.trim().replace(/\s+/g, '');
  if (!cleanPhone.startsWith('+91')) {
    cleanPhone = `+91${cleanPhone.replace(/^0+/, '')}`;
  }

  const record = db.otpRecords.find((r) => r.phone === cleanPhone);
  if (!record) {
    return { success: false, message: 'No active OTP found. Please request a new code.' };
  }

  const now = new Date();
  if (new Date(record.expiresAt) < now) {
    return { success: false, message: 'OTP has expired. Please request a new code.' };
  }

  if (record.attempts >= 5) {
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }

  const inputHash = hashOtp(inputCode.trim());
  if (record.codeHash !== inputHash) {
    record.attempts += 1;
    dbManager.persist();
    return { success: false, message: `Invalid code. ${5 - record.attempts} attempts remaining.` };
  }

  // Clear OTP record
  const idx = db.otpRecords.indexOf(record);
  if (idx > -1) {
    db.otpRecords.splice(idx, 1);
  }

  // Find or create User
  let user = db.users.find((u) => u.phone === cleanPhone);
  if (!user) {
    const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    user = {
      id: newUserId,
      phone: cleanPhone,
      role: 'CUSTOMER',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    db.users.push(user);

    // Create empty profile
    db.customerProfiles.push({
      id: `prof_${Date.now()}`,
      userId: newUserId,
      name: null,
      email: null,
      avatarColor: '#3E8E41',
      propertyCategory: 'Apartment',
      reminderPreference: 'NONE',
      onboardingCompletedAt: null,
    });
  }

  dbManager.persist();
  return { success: true, message: 'Phone verified successfully.', userId: user.id };
}

export function createDoorstepOtp(pickupId: string): { rawCode: string; expiresAt: string } {
  const rawCode = Math.floor(1000 + Math.random() * 9000).toString();
  const codeHash = hashOtp(rawCode);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins

  let existing = db.doorstepOtps.find((o) => o.pickupId === pickupId);
  if (existing) {
    existing.codeHash = codeHash;
    existing.rawCodeForDev = rawCode;
    existing.expiresAt = expiresAt;
    existing.attempts = 0;
  } else {
    db.doorstepOtps.push({
      id: `otp_ds_${Date.now()}`,
      pickupId,
      codeHash,
      rawCodeForDev: rawCode,
      expiresAt,
      attempts: 0,
      createdAt: new Date().toISOString(),
    });
  }
  dbManager.persist();
  return { rawCode, expiresAt };
}

export function verifyDoorstepOtp(pickupId: string, inputCode: string): { success: boolean; message: string } {
  const record = db.doorstepOtps.find((o) => o.pickupId === pickupId);
  if (!record) {
    return { success: false, message: 'No doorstep PIN assigned to this pickup.' };
  }

  if (new Date(record.expiresAt) < new Date()) {
    return { success: false, message: 'Doorstep PIN expired.' };
  }

  if (record.attempts >= 5) {
    return { success: false, message: 'Maximum attempts exceeded on doorstep PIN.' };
  }

  const inputHash = hashOtp(inputCode.trim());
  if (record.codeHash !== inputHash) {
    record.attempts += 1;
    dbManager.persist();
    return { success: false, message: 'Incorrect doorstep PIN.' };
  }

  db.doorstepOtps = db.doorstepOtps.filter((otp) => otp.pickupId !== pickupId);
  dbManager.persist();
  return { success: true, message: 'Doorstep PIN successfully verified.' };
}

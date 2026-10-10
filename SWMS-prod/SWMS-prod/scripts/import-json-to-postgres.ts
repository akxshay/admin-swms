import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { persistRelationalState } from '../server/postgres-persistence';
import type { DatabaseSchema } from '../server/db';

dotenv.config();

const input = path.resolve(process.env.SWMS_DB_FILE || path.join(process.cwd(), 'data', 'db.json'));
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. data/db.json was not modified.');
}

const raw = fs.readFileSync(input, 'utf8');
const data = JSON.parse(raw) as Record<string, unknown>;
for (const key of [
  'users', 'customerProfiles', 'addresses', 'wasteTypes', 'pricingRules',
  'pickups', 'collectors', 'doorstepOtps', 'payments', 'rewardLedgers',
  'rewardRedemptions', 'achievements', 'customerAchievements', 'exchangeHubs',
  'exchangeListings', 'notifications', 'complaints', 'otpRecords',
]) {
  if (!Array.isArray(data[key])) {
    data[key] = [];
  }
}

const prisma = new PrismaClient();
try {
  // A single upsert makes reruns idempotent and keeps every source ID and
  // timestamp byte-for-byte in the compatibility state.
  await persistRelationalState(prisma, data as unknown as DatabaseSchema);
  console.log(`Imported ${input} into PostgreSQL without modifying the source file.`);
} finally {
  await prisma.$disconnect();
}

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { hydrateFromPostgres, persistRelationalState } from './postgres-persistence';
import {
  User,
  CustomerProfile,
  Address,
  WasteType,
  PricingRule,
  Pickup,
  Collector,
  DoorstepOtp,
  Payment,
  RewardLedger,
  RewardCatalogItem,
  RewardRedemption,
  Achievement,
  CustomerAchievement,
  ExchangeHub,
  ExchangeListing,
  Notification,
  Complaint,
  OtpRecord,
} from './types';
import {
  INITIAL_WASTE_TYPES,
  INITIAL_PRICING_RULES,
  INITIAL_COLLECTORS,
  INITIAL_ACHIEVEMENTS,
  INITIAL_EXCHANGE_HUBS,
  INITIAL_EXCHANGE_LISTINGS,
  createDefaultUser,
} from './seed-data';
import { REWARD_CATALOG } from './reward-catalog';

export interface DatabaseSchema {
  users: User[];
  customerProfiles: CustomerProfile[];
  addresses: Address[];
  wasteTypes: WasteType[];
  pricingRules: PricingRule[];
  pickups: Pickup[];
  collectors: Collector[];
  doorstepOtps: DoorstepOtp[];
  payments: Payment[];
  rewardLedgers: RewardLedger[];
  rewardCatalogItems: RewardCatalogItem[];
  rewardRedemptions: RewardRedemption[];
  achievements: Achievement[];
  customerAchievements: CustomerAchievement[];
  exchangeHubs: ExchangeHub[];
  exchangeListings: ExchangeListing[];
  notifications: Notification[];
  complaints: Complaint[];
  otpRecords: OtpRecord[];
}

const DB_FILE = path.resolve(
  process.env.SWMS_DB_FILE || path.join(process.cwd(), 'data', process.env.NODE_ENV === 'test' ? 'db.test.json' : 'db.json')
);
const DB_DIR = path.dirname(DB_FILE);
const prisma = process.env.DATABASE_URL ? new PrismaClient() : null;

function initializeFreshData(): DatabaseSchema {
  const defaultUserData = createDefaultUser();
  const defaultAdminUser: User = {
    id: 'usr_admin_default',
    phone: 'admin',
    role: 'ADMIN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Create an initial doorstep OTP for active pickup
  const activePickup = defaultUserData.pickups.find((p) => p.status === 'EN_ROUTE');
  const doorstepOtps: DoorstepOtp[] = [];
  if (activePickup) {
    doorstepOtps.push({
      id: 'otp_doorstep_demo',
      pickupId: activePickup.id,
      codeHash: '81dc9bdb52d04dc20036dbd8313ed055', // hash for 1234
      rawCodeForDev: '4821', // easily visible doorstep pin for test
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      attempts: 0,
      createdAt: new Date().toISOString(),
    });
  }

  return {
    users: [defaultUserData.user, defaultAdminUser],
    customerProfiles: [defaultUserData.profile],
    addresses: defaultUserData.addresses,
    wasteTypes: INITIAL_WASTE_TYPES,
    pricingRules: INITIAL_PRICING_RULES,
    pickups: defaultUserData.pickups,
    collectors: INITIAL_COLLECTORS,
    doorstepOtps,
    payments: [
      {
        id: 'pmt_comp_1',
        pickupId: 'pk_completed_1',
        userId: defaultUserData.user.id,
        amountMinor: 5500,
        currency: 'INR',
        status: 'SUCCESS',
        provider: 'RAZORPAY',
        providerOrderId: 'order_demo_1001',
        providerPaymentId: 'pay_demo_success_891',
        signature: 'sig_verified_demo_hmac',
        createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      },
    ],
    rewardLedgers: defaultUserData.ledger,
    rewardCatalogItems: [...REWARD_CATALOG],
    rewardRedemptions: [],
    achievements: INITIAL_ACHIEVEMENTS,
    customerAchievements: defaultUserData.achievements,
    exchangeHubs: INITIAL_EXCHANGE_HUBS,
    exchangeListings: INITIAL_EXCHANGE_LISTINGS,
    notifications: defaultUserData.notifications,
    complaints: defaultUserData.complaints,
    otpRecords: [],
  };
}

class DatabaseManager {
  private inMemory: DatabaseSchema;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(initial: DatabaseSchema) {
    this.inMemory = initial;
  }

  public static async create(): Promise<DatabaseManager> {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (prisma) {
      const relational = await hydrateFromPostgres(prisma);
      if (relational.users.length || relational.pickups.length || relational.addresses.length) {
        return new DatabaseManager(relational);
      }
      // First PostgreSQL start is intentionally seeded from the existing
      // JSON file when present, so a deployment never loses user data.
      const legacy = await prisma.databaseState.findUnique({ where: { id: 1 } });
      const initial = legacy ? normalizeState(legacy.data) : readJsonOrSeed();
      const manager = new DatabaseManager(initial);
      await manager.persistAsync();
      return manager;
    }

    return new DatabaseManager(readJsonOrSeed());
  }

  private static unused(): void {
    // Kept out of the constructor so startup can await PostgreSQL safely.
  }
  public get data(): DatabaseSchema {
    return this.inMemory;
  }

  public persist(): void {
    if (prisma) {
      this.writeQueue = this.writeQueue.catch(() => {}).then(() => persistRelationalState(prisma, this.inMemory));
      return;
    }
    const tempPath = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(this.inMemory, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_FILE);
  }

  public async persistAsync(): Promise<void> {
    if (prisma) {
      this.writeQueue = this.writeQueue.catch(() => {}).then(() => persistRelationalState(prisma, this.inMemory));
      await this.writeQueue;
    } else {
      this.persist();
    }
  }

  public resetToSeed(): void {
    const fresh = initializeFreshData();
    Object.keys(this.inMemory).forEach((key) => delete (this.inMemory as unknown as Record<string, unknown>)[key]);
    Object.assign(this.inMemory, fresh);
    this.persist();
  }
}

function readJsonOrSeed(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const fresh = initializeFreshData();
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(fresh, null, 2), 'utf-8');
    return fresh;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    parsed.rewardRedemptions ??= [];
    parsed.otpRecords ??= [];
    return normalizeState(parsed);
  } catch (err) {
    const backupPath = `${DB_FILE}.corrupt-${Date.now()}`;
    fs.copyFileSync(DB_FILE, backupPath);
    throw new Error(`Database file is corrupted. Backup saved to ${backupPath}.`);
  }
}

function normalizeState(value: unknown): DatabaseSchema {
  const state = value as Partial<DatabaseSchema>;
  const rawUsers = state.users ?? [];
  const users = [...rawUsers];
  if (!users.some((u) => u.role === 'ADMIN')) {
    users.push({
      id: 'usr_admin_default',
      phone: 'admin',
      role: 'ADMIN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return {
    users,
    customerProfiles: state.customerProfiles ?? [],
    addresses: state.addresses ?? [],
    wasteTypes: state.wasteTypes ?? [],
    pricingRules: state.pricingRules ?? [],
    pickups: state.pickups ?? [],
    collectors: state.collectors ?? [],
    doorstepOtps: state.doorstepOtps ?? [],
    payments: state.payments ?? [],
    rewardLedgers: state.rewardLedgers ?? [],
    // Seed from hardcoded catalog if not yet persisted (first boot)
    rewardCatalogItems: state.rewardCatalogItems?.length ? state.rewardCatalogItems : [...REWARD_CATALOG],
    rewardRedemptions: state.rewardRedemptions ?? [],
    achievements: state.achievements ?? [],
    customerAchievements: state.customerAchievements ?? [],
    exchangeHubs: state.exchangeHubs ?? [],
    exchangeListings: state.exchangeListings ?? [],
    notifications: state.notifications ?? [],
    complaints: state.complaints ?? [],
    otpRecords: state.otpRecords ?? [],
  };
}

export const dbManager = await DatabaseManager.create();
export const db = dbManager.data;

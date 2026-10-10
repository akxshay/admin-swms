export type Role = 'CUSTOMER' | 'COLLECTOR' | 'ADMIN';
export type BagSize = 'SMALL' | 'MEDIUM' | 'LARGE';
export type PickupStatus =
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'COLLECTING'
  | 'COLLECTED'
  | 'VERIFIED'
  | 'COMPLETED'
  | 'MISSED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type ListingStatus = 'ACTIVE' | 'RESERVED' | 'SOLD' | 'CANCELLED';
export type ComplaintStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
export type ReminderPreference = 'MORNING_8' | 'EVENING_20' | 'NONE';

export interface User {
  id: string;
  phone: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  avatarColor: string;
  avatarUrl?: string;
  propertyCategory: string; // "Apartment", "Individual House", "Villa", "Gated Community", "Commercial"
  reminderPreference: ReminderPreference;
  onboardingCompletedAt: string | null;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  line1: string;
  formatted: string;
  landmark?: string;
  instructions?: string;
  lat: number;
  lng: number;
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface WasteType {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  co2Factor: number; // kg CO2 saved per kg of recyclable
  sortOrder: number;
  active: boolean;
}

export interface PricingRule {
  id: string;
  wasteTypeId: string;
  bagSize: BagSize;
  priceMinor: number; // in paise
  currency: string;
  active: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface PickupItem {
  id: string;
  pickupId: string;
  wasteTypeId: string;
  bagSize: BagSize;
  numberOfBags: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

export interface PickupStatusHistory {
  id: string;
  pickupId: string;
  status: PickupStatus;
  notes?: string;
  createdAt: string;
}

export interface Pickup {
  id: string;
  customerId: string;
  collectorId?: string | null;
  status: PickupStatus;
  scheduledDate: string;
  scheduledSlot: string; // e.g. "08:00 - 10:00"
  totalAmountMinor: number;
  paymentStatus: PaymentStatus;
  paymentMode: 'PAY_NOW' | 'PAY_LATER';
  pricingSnapshot: {
    totalMinor: number;
    items: Array<{
      wasteTypeId: string;
      wasteTypeName: string;
      bagSize: BagSize;
      numberOfBags: number;
      unitPriceMinor: number;
      lineTotalMinor: number;
    }>;
  };
  addressId: string;
  addressSnapshot: {
    label: string;
    line1: string;
    formatted: string;
    landmark?: string;
    instructions?: string;
    lat: number;
    lng: number;
  };
  notes?: string;
  items: PickupItem[];
  history: PickupStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface Collector {
  id: string;
  name: string;
  phone: string;
  photoUrl: string;
  vehicleType: string;
  vehicleNumber: string;
  rating: number;
  isOnline: boolean;
  currentLat: number;
  currentLng: number;
  lastLocationAt: string;
}

export interface DoorstepOtp {
  id: string;
  pickupId: string;
  codeHash: string;
  rawCodeForDev?: string;
  expiresAt: string;
  attempts: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  pickupId: string;
  userId: string;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  provider: 'RAZORPAY' | 'FAKE';
  providerOrderId?: string;
  providerPaymentId?: string;
  signature?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RewardLedger {
  id: string;
  userId: string;
  points: number;
  type: string; // ONBOARDING_BONUS, PICKUP_COMPLETED, STREAK_BONUS, ACHIEVEMENT_UNLOCK, REDEMPTION
  description: string;
  createdAt: string;
}

export interface RewardCatalogItem {
  id: string;
  title: string;
  description: string;
  points: number;
  icon: string;
  partner: string;
  active: boolean;
}

export interface RewardRedemption {
  id: string;
  userId: string;
  rewardId: string;
  voucherCode: string;
  points: number;
  createdAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  targetValue: number;
  metric: 'KG_RECYCLED' | 'PICKUP_COUNT' | 'STREAK_DAYS' | 'CO2_SAVED';
  bonusPoints: number;
  active: boolean;
}

export interface CustomerAchievement {
  id: string;
  userId: string;
  achievementId: string;
  progress: number;
  unlockedAt: string | null;
  createdAt: string;
}

export interface ExchangeHub {
  id: string;
  name: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  contact: string;
  timing: string;
  active: boolean;
}

export interface ExchangeListing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatarColor: string;
  title: string;
  description: string;
  material: string;
  quantityKg: number;
  priceMinor: number;
  imageUrl?: string;
  status: ListingStatus;
  lat: number;
  lng: number;
  city: string;
  distanceKm?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'PICKUP' | 'PAYMENT' | 'REWARD' | 'EXCHANGE' | 'COMPLAINT' | 'SYSTEM';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  customerId: string;
  pickupId?: string;
  category: string;
  description: string;
  status: ComplaintStatus;
  resolution?: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OtpRecord {
  phone: string;
  codeHash: string;
  demoCode?: string;
  expiresAt: string;
  attempts: number;
  resendCooldownUntil: string;
  lockedUntil?: string;
}

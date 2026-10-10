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
  role: 'CUSTOMER' | 'COLLECTOR' | 'ADMIN';
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
  propertyCategory: string;
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
}

export interface WasteType {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  co2Factor: number;
  sortOrder: number;
  active: boolean;
  pricing: {
    SMALL: number;
    MEDIUM: number;
    LARGE: number;
  };
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
  scheduledSlot: string;
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

export interface RewardLedger {
  id: string;
  userId: string;
  points: number;
  type: string;
  description: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  targetValue: number;
  metric: string;
  bonusPoints: number;
  active: boolean;
  progress: number;
  unlockedAt: string | null;
  isUnlocked: boolean;
}

export interface EcoStats {
  totalPoints: number;
  totalKgRecycled: number;
  totalCo2SavedKg: number;
  completedPickupsCount: number;
  streakDays: number;
  tier: 'Eco Starter' | 'Eco Warrior' | 'Eco Champion';
  nextTierPoints: number;
  progressToNextTier: number;
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
  distanceKm?: number;
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

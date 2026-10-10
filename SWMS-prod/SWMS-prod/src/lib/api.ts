import {
  User,
  CustomerProfile,
  Address,
  WasteType,
  Pickup,
  EcoStats,
  RewardLedger,
  Achievement,
  ExchangeListing,
  ExchangeHub,
  Notification,
  Complaint,
} from './types';

const USER_STORAGE_KEY = 'swms_user_id';

export function getActiveUserId(): string {
  if (typeof window === 'undefined') return 'usr_demo_customer';
  return localStorage.getItem(USER_STORAGE_KEY) || 'usr_demo_customer';
}

export function setActiveUserId(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_STORAGE_KEY, id);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('x-user-id', getActiveUserId());

  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || errorBody.message || 'Request failed');
  }

  return res.json();
}

export const api = {
  // Auth
  requestOtp: (phone: string) => request<{ success: boolean; message: string; resendCooldownSeconds: number; demoCode?: string }>('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  }),

  verifyOtp: (phone: string, code: string) => request<{
    success: boolean;
    userId: string;
    user: User;
    profile: CustomerProfile;
    needsOnboarding: boolean;
  }>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  }),

  getSession: () => request<{
    user: User;
    profile: CustomerProfile;
    defaultAddress?: Address;
    needsOnboarding: boolean;
  }>('/auth/session'),

  submitOnboarding: (data: {
    name: string;
    email?: string;
    avatarColor: string;
    propertyCategory: string;
    reminderPreference: string;
    address?: {
      label: string;
      line1: string;
      formatted: string;
      landmark?: string;
      instructions?: string;
      lat: number;
      lng: number;
    };
  }) => request<{ success: boolean; profile: CustomerProfile; bonusAwarded: boolean }>('/customer/onboarding', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Profile & Addresses
  getProfile: () => request<{ user: User; profile: CustomerProfile; stats: EcoStats }>('/customer/profile'),

  updateProfile: (data: Partial<CustomerProfile>) => request<{ success: boolean; profile: CustomerProfile }>('/customer/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  getAddresses: () => request<Address[]>('/customer/addresses'),

  createAddress: (data: Partial<Address>) => request<Address>('/customer/addresses', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  deleteAddress: (id: string) => request<{ success: boolean }>(`/customer/addresses/${id}`, {
    method: 'DELETE',
  }),

  // Waste Types & Pricing
  getWasteTypes: () => request<WasteType[]>('/waste-types'),

  getPricingQuote: (items: Array<{ wasteTypeId: string; bagSize: string; numberOfBags: number }>) => request<{
    totalMinor: number;
    totalEstimatedKg: number;
    totalEstimatedCo2Kg: number;
    items: any[];
  }>('/pricing/quote', {
    method: 'POST',
    body: JSON.stringify({ items }),
  }),

  // Pickups
  getPickups: (tab?: 'upcoming' | 'active' | 'history') => request<Pickup[]>(`/pickups${tab ? `?tab=${tab}` : ''}`),

  getPickupDetails: (id: string) => request<{
    pickup: Pickup;
    collector?: any;
    doorstepOtp?: { rawCode: string; expiresAt: string } | null;
  }>(`/pickups/${id}`),

  createPickup: (data: {
    addressId?: string;
    customAddress?: {
      label?: string;
      line1: string;
      formatted: string;
      landmark?: string;
      instructions?: string;
      lat: number;
      lng: number;
    };
    scheduledDate: string;
    scheduledSlot: string;
    paymentMode?: 'PAY_NOW' | 'PAY_LATER';
    notes?: string;
    items: Array<{ wasteTypeId: string; bagSize: string; numberOfBags: number }>;
  }) => request<Pickup>('/pickups', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  cancelPickup: (id: string, reason?: string) => request<Pickup>(`/pickups/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),

  getTrackingInfo: (id: string) => request<{
    pickup: Pickup;
    collector: any;
    currentLocation: { lat: number; lng: number; distanceKm: number; etaMinutes: number; lastUpdated: string };
    doorstepOtp?: { rawCode: string; expiresAt: string } | null;
  }>(`/pickups/${id}/tracking`),

  simulateCollector: (pickupId: string) => request<{ success: boolean; message: string }>('/collector/simulate', {
    method: 'POST',
    body: JSON.stringify({ pickupId }),
  }),

  markCollectorArrived: (pickupId: string) => request<{
    success: boolean;
    pickup: Pickup;
    doorstepOtp: { rawCode: string; expiresAt: string } | null;
  }>('/collector/arrived', {
    method: 'POST',
    body: JSON.stringify({ pickupId }),
  }),

  verifyDoorstepOtp: (pickupId: string, code: string) => request<{ success: boolean; pickup: Pickup }>('/collector/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ pickupId, code }),
  }),

  // Payments
  createPaymentOrder: (pickupId: string) => request<{
    orderId: string;
    amountMinor: number;
    currency: string;
    keyId: string;
    provider: 'RAZORPAY' | 'FAKE';
  }>('/payments/create-order', {
    method: 'POST',
    body: JSON.stringify({ pickupId }),
  }),

  verifyPayment: (data: { orderId: string; paymentId: string; signature: string; pickupId: string }) => request<{
    success: boolean;
    paymentStatus: string;
  }>('/payments/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getPaymentHistory: () => request<any[]>('/payments/history'),

  // Rewards & Leaderboard
  getRewards: () => request<{
    stats: EcoStats;
    ledger: RewardLedger[];
    achievements: Achievement[];
  }>('/rewards'),

  getRewardCatalog: () => request<Array<{
    id: string;
    title: string;
    desc?: string;
    description: string;
    points: number;
    icon: string;
    partner: string;
    active: boolean;
  }>>('/rewards/catalog'),

  redeemReward: (rewardId: string) => request<{
    redemption: { voucherCode: string; points: number; createdAt: string; rewardId: string };
    balance: number;
    reward: { id: string; title: string; description: string; points: number; icon: string; partner: string };
  }>('/rewards/redeem', {
    method: 'POST',
    body: JSON.stringify({ rewardId }),
  }),

  getLeaderboard: () => request<{
    topThree: any[];
    list: any[];
    currentUserRank?: any;
  }>('/leaderboard'),

  // Exchange
  getExchangeListings: (params?: { material?: string; query?: string; lat?: number; lng?: number }) => {
    const sp = new URLSearchParams();
    if (params?.material) sp.set('material', params.material);
    if (params?.query) sp.set('query', params.query);
    if (params?.lat) sp.set('lat', params.lat.toString());
    if (params?.lng) sp.set('lng', params.lng.toString());
    return request<ExchangeListing[]>(`/exchange/listings?${sp.toString()}`);
  },

  createExchangeListing: (data: any) => request<ExchangeListing>('/exchange/listings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateListingStatus: (id: string, status: string) => request<ExchangeListing>(`/exchange/listings/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),

  getExchangeHubs: (lat?: number, lng?: number) => {
    const sp = new URLSearchParams();
    if (lat) sp.set('lat', lat.toString());
    if (lng) sp.set('lng', lng.toString());
    return request<ExchangeHub[]>(`/exchange/hubs?${sp.toString()}`);
  },

  // Notifications
  getNotifications: () => request<{ notifications: Notification[]; unreadCount: number }>('/notifications'),

  markNotificationRead: (id: string) => request<{ success: boolean }>(`/notifications/${id}/read`, {
    method: 'POST',
  }),

  markAllNotificationsRead: () => request<{ success: boolean }>('/notifications/read-all', {
    method: 'POST',
  }),

  // Complaints
  getComplaints: () => request<Complaint[]>('/complaints'),

  createComplaint: (data: { category: string; description: string; pickupId?: string; attachments?: string[] }) => request<Complaint>('/complaints', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  advanceComplaintStatus: (complaintId: string, status: string, resolution?: string) => request<Complaint>('/dev/advance-complaint', {
    method: 'POST',
    body: JSON.stringify({ complaintId, status, resolution }),
  }),

  // Dev tools
  resetSeedData: () => request<{ success: boolean; message: string }>('/dev/reset-seed', {
    method: 'POST',
  }),

  reverseGeocode: (lat: number, lng: number) => request<{ formattedAddress: string; city: string; landmark?: string }>('/dev/reverse-geocode', {
    method: 'POST',
    body: JSON.stringify({ lat, lng }),
  }),

  searchAddresses: (query: string) => request<{
    results: Array<{
      placeId: string | number;
      name: string;
      formatted: string;
      lat: number;
      lng: number;
    }>;
  }>(`/geocode/search?q=${encodeURIComponent(query)}`),
};

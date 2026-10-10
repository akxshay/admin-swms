import {
  WasteType,
  PricingRule,
  Collector,
  Achievement,
  ExchangeHub,
  ExchangeListing,
  User,
  CustomerProfile,
  Address,
  Pickup,
  RewardLedger,
  CustomerAchievement,
  Notification,
  Complaint
} from './types';

export const INITIAL_WASTE_TYPES: WasteType[] = [
  {
    id: 'wt_organic',
    name: 'Organic & Compostable',
    slug: 'organic',
    description: 'Fruit peels, vegetable waste, dry leaves, coffee grounds, garden clippings.',
    imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80',
    co2Factor: 0.8,
    sortOrder: 1,
    active: true,
  },
  {
    id: 'wt_plastic',
    name: 'Plastics & Containers',
    slug: 'plastic',
    description: 'PET bottles, milk pouches, shampoo bottles, hard plastic buckets, tubs, bubble wraps.',
    imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80',
    co2Factor: 1.6,
    sortOrder: 2,
    active: true,
  },
  {
    id: 'wt_paper',
    name: 'Paper & Cardboard',
    slug: 'paper',
    description: 'Old newspapers, cartons, magazines, office shredding, books, packaging boxes.',
    imageUrl: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=600&auto=format&fit=crop&q=80',
    co2Factor: 1.1,
    sortOrder: 3,
    active: true,
  },
  {
    id: 'wt_ewaste',
    name: 'E-Waste & Electronics',
    slug: 'ewaste',
    description: 'Broken smartphones, motherboards, chargers, cables, remotes, alkaline batteries.',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80',
    co2Factor: 3.2,
    sortOrder: 4,
    active: true,
  },
  {
    id: 'wt_metal',
    name: 'Scrap Metal & Cans',
    slug: 'metal',
    description: 'Beverage aluminium cans, iron utensils, brass fittings, tin covers, copper wire.',
    imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80',
    co2Factor: 4.5,
    sortOrder: 5,
    active: true,
  },
  {
    id: 'wt_glass',
    name: 'Glass Bottles & Jars',
    slug: 'glass',
    description: 'Intact glass beverage bottles, pickle jars, sauce bottles, perfume vials.',
    imageUrl: 'https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?w=600&auto=format&fit=crop&q=80',
    co2Factor: 0.9,
    sortOrder: 6,
    active: true,
  },
];

export const INITIAL_PRICING_RULES: PricingRule[] = [
  // Organic: S = ₹10 (1000 paise), M = ₹20, L = ₹35
  { id: 'pr_org_s', wasteTypeId: 'wt_organic', bagSize: 'SMALL', priceMinor: 1000, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },
  { id: 'pr_org_m', wasteTypeId: 'wt_organic', bagSize: 'MEDIUM', priceMinor: 2000, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },
  { id: 'pr_org_l', wasteTypeId: 'wt_organic', bagSize: 'LARGE', priceMinor: 3500, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },

  // Plastic: S = ₹15, M = ₹30, L = ₹55
  { id: 'pr_pla_s', wasteTypeId: 'wt_plastic', bagSize: 'SMALL', priceMinor: 1500, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },
  { id: 'pr_pla_m', wasteTypeId: 'wt_plastic', bagSize: 'MEDIUM', priceMinor: 3000, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },
  { id: 'pr_pla_l', wasteTypeId: 'wt_plastic', bagSize: 'LARGE', priceMinor: 5500, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },

  // Paper: S = ₹12, M = ₹25, L = ₹45
  { id: 'pr_pap_s', wasteTypeId: 'wt_paper', bagSize: 'SMALL', priceMinor: 1200, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },
  { id: 'pr_pap_m', wasteTypeId: 'wt_paper', bagSize: 'MEDIUM', priceMinor: 2500, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },
  { id: 'pr_pap_l', wasteTypeId: 'wt_paper', bagSize: 'LARGE', priceMinor: 4500, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },

  // E-Waste: S = ₹30, M = ₹60, L = ₹110
  { id: 'pr_ewa_s', wasteTypeId: 'wt_ewaste', bagSize: 'SMALL', priceMinor: 3000, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },
  { id: 'pr_ewa_m', wasteTypeId: 'wt_ewaste', bagSize: 'MEDIUM', priceMinor: 6000, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },
  { id: 'pr_ewa_l', wasteTypeId: 'wt_ewaste', bagSize: 'LARGE', priceMinor: 11000, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },

  // Metal: S = ₹25, M = ₹50, L = ₹90
  { id: 'pr_met_s', wasteTypeId: 'wt_metal', bagSize: 'SMALL', priceMinor: 2500, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },
  { id: 'pr_met_m', wasteTypeId: 'wt_metal', bagSize: 'MEDIUM', priceMinor: 5000, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },
  { id: 'pr_met_l', wasteTypeId: 'wt_metal', bagSize: 'LARGE', priceMinor: 9000, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },

  // Glass: S = ₹15, M = ₹30, L = ₹50
  { id: 'pr_gla_s', wasteTypeId: 'wt_glass', bagSize: 'SMALL', priceMinor: 1500, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },
  { id: 'pr_gla_m', wasteTypeId: 'wt_glass', bagSize: 'MEDIUM', priceMinor: 3000, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },
  { id: 'pr_gla_l', wasteTypeId: 'wt_glass', bagSize: 'LARGE', priceMinor: 5000, currency: 'INR', active: true, effectiveFrom: '2025-01-01' },
];

export const INITIAL_COLLECTORS: Collector[] = [
  {
    id: 'col_rajesh',
    name: 'Rajesh Shetty',
    phone: '+919845012345',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    vehicleType: 'Electric Auto (E-Rickshaw)',
    vehicleNumber: 'KA-19-EA-4102',
    rating: 4.9,
    isOnline: true,
    currentLat: 12.8715,
    currentLng: 74.8465,
    lastLocationAt: new Date().toISOString(),
  },
  {
    id: 'col_farhan',
    name: 'Mohammed Farhan',
    phone: '+919845098765',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    vehicleType: 'Tata Ace Zip EV',
    vehicleNumber: 'KA-19-EV-8832',
    rating: 4.8,
    isOnline: true,
    currentLat: 12.8950,
    currentLng: 74.8510,
    lastLocationAt: new Date().toISOString(),
  },
  {
    id: 'col_ganesh',
    name: 'Ganesh Poojary',
    phone: '+919845055443',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    vehicleType: 'Mahindra Zor Grand Cargo',
    vehicleNumber: 'KA-20-EV-1920',
    rating: 5.0,
    isOnline: true,
    currentLat: 12.8620,
    currentLng: 74.8620,
    lastLocationAt: new Date().toISOString(),
  },
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach_first_pickup',
    name: 'First Green Step',
    description: 'Complete your first doorstep recyclable pickup',
    icon: '🌱',
    targetValue: 1,
    metric: 'PICKUP_COUNT',
    bonusPoints: 50,
    active: true,
  },
  {
    id: 'ach_10kg',
    name: '10 KG Recycled Club',
    description: 'Recycle at least 10 kg of household waste diverted from landfills',
    icon: '⚖️',
    targetValue: 10,
    metric: 'KG_RECYCLED',
    bonusPoints: 100,
    active: true,
  },
  {
    id: 'ach_streak7',
    name: '7-Day Eco Champion',
    description: 'Maintain a 7-day recycling streak or consecutive scheduled pickups',
    icon: '🔥',
    targetValue: 7,
    metric: 'STREAK_DAYS',
    bonusPoints: 200,
    active: true,
  },
  {
    id: 'ach_co2_hero',
    name: 'Carbon Shield Hero',
    description: 'Save 25 kg of carbon dioxide equivalent through circular recycling',
    icon: '🛡️',
    targetValue: 25,
    metric: 'CO2_SAVED',
    bonusPoints: 250,
    active: true,
  },
  {
    id: 'ach_5pickups',
    name: 'Neighborhood Star',
    description: 'Complete 5 verified doorstep pickups with zero cancellations',
    icon: '⭐',
    targetValue: 5,
    metric: 'PICKUP_COUNT',
    bonusPoints: 150,
    active: true,
  },
];

export const INITIAL_EXCHANGE_HUBS: ExchangeHub[] = [
  {
    id: 'hub_kadri',
    name: 'Kadri Circular Economy Hub',
    description: 'Community recycling drop-off, battery reclamation depot & compost exchange.',
    address: 'Near Kadri Park Road, Kadri Hills, Mangaluru, Karnataka 575002',
    lat: 12.8835,
    lng: 74.8562,
    contact: '+91 824 222 4110',
    timing: 'Mon - Sat: 8:00 AM - 6:00 PM',
    active: true,
  },
  {
    id: 'hub_bejai',
    name: 'Bejai Resource Recovery Center',
    description: 'Dry waste aggregation center, bulk plastic bale unit & paper drop.',
    address: 'Main Road, Opp. KSRTC Bus Stand, Bejai, Mangaluru, Karnataka 575004',
    lat: 12.8890,
    lng: 74.8470,
    contact: '+91 824 221 8934',
    timing: 'Everyday: 7:30 AM - 7:00 PM',
    active: true,
  },
  {
    id: 'hub_kankanady',
    name: 'Kankanady Material Bank',
    description: 'Certified scrap metals, e-waste dismantling facility & upcycling center.',
    address: 'Kankanady Bypass Road, Mangaluru, Karnataka 575002',
    lat: 12.8680,
    lng: 74.8590,
    contact: '+91 824 243 7761',
    timing: 'Mon - Sat: 8:30 AM - 5:30 PM',
    active: true,
  },
  {
    id: 'hub_surathkal',
    name: 'Surathkal Green Exchange Depot',
    description: 'Coastal eco depot for clean plastics, glass bottles and cardboard boxes.',
    address: 'Near NITK Beach Road, Surathkal, Mangaluru, Karnataka 575014',
    lat: 13.0112,
    lng: 74.7925,
    contact: '+91 824 247 4000',
    timing: 'Tue - Sun: 9:00 AM - 6:00 PM',
    active: true,
  },
];

export const INITIAL_EXCHANGE_LISTINGS: ExchangeListing[] = [
  {
    id: 'ex_1',
    sellerId: 'user_priya',
    sellerName: 'Priya Hegde',
    sellerAvatarColor: '#8BC83F',
    title: 'Clean Cardboard Moving Boxes (Heavy Duty)',
    description: 'Bundle of 18 double-walled corrugated shipping and moving boxes, folded flat and clean. Perfect for re-use or packaging.',
    material: 'Paper & Cardboard',
    quantityKg: 22.5,
    priceMinor: 25000, // ₹250
    imageUrl: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=600&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    lat: 12.8750,
    lng: 74.8480,
    city: 'Mangaluru',
    distanceKm: 1.2,
    createdAt: '2026-10-06T10:30:00Z',
    updatedAt: '2026-10-06T10:30:00Z',
  },
  {
    id: 'ex_2',
    sellerId: 'user_vikram',
    sellerName: 'Vikram Kamath',
    sellerAvatarColor: '#3E8E41',
    title: 'Crushed HDPE Milk & Detergent Jugs (Baled)',
    description: 'Approx 35 kg of washed, food-grade HDPE white and natural plastic flakes and crushed bottles ready for pelletizing.',
    material: 'Plastics',
    quantityKg: 35.0,
    priceMinor: 52500, // ₹525
    imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    lat: 12.8820,
    lng: 74.8540,
    city: 'Mangaluru',
    distanceKm: 2.1,
    createdAt: '2026-10-05T14:15:00Z',
    updatedAt: '2026-10-05T14:15:00Z',
  },
  {
    id: 'ex_3',
    sellerId: 'user_suresh',
    sellerName: 'Suresh Rao',
    sellerAvatarColor: '#F5C518',
    title: 'Industrial Aluminum Scrap Offcuts & Clean Wire',
    description: 'High purity 6063 aluminium extrusion cut pieces and stripped electrical grade copper wires. 15 kg total.',
    material: 'Scrap Metal',
    quantityKg: 15.0,
    priceMinor: 180000, // ₹1,800
    imageUrl: 'https://images.unsplash.com/photo-1533073526757-2c8ca1df9f8c?w=600&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    lat: 12.8690,
    lng: 74.8610,
    city: 'Mangaluru',
    distanceKm: 2.8,
    createdAt: '2026-10-04T09:00:00Z',
    updatedAt: '2026-10-04T09:00:00Z',
  },
  {
    id: 'ex_4',
    sellerId: 'user_anita',
    sellerName: 'Anita D’Souza',
    sellerAvatarColor: '#3B82F6',
    title: 'Beer & Wine Amber Glass Bottles (Clean & Crated)',
    description: '80 empty amber glass bottles in original plastic crates. Unbroken, sanitized, ideal for micro-bottlers or glass artists.',
    material: 'Glass Bottles',
    quantityKg: 28.0,
    priceMinor: 16000, // ₹160
    imageUrl: 'https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?w=600&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    lat: 12.8895,
    lng: 74.8450,
    city: 'Mangaluru',
    distanceKm: 3.4,
    createdAt: '2026-10-03T16:45:00Z',
    updatedAt: '2026-10-03T16:45:00Z',
  },
  {
    id: 'ex_5',
    sellerId: 'user_kiran',
    sellerName: 'Kiran Nayak',
    sellerAvatarColor: '#8B5CF6',
    title: 'Desktop PC Towers, SMPS Power Units & Cables',
    description: '3 decommissioned office PC towers (no hard drives for data security), 4 SMPS units, 25 meters of assorted VGA/power cables.',
    material: 'E-Waste',
    quantityKg: 18.0,
    priceMinor: 95000, // ₹950
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    lat: 12.8940,
    lng: 74.8520,
    city: 'Mangaluru',
    distanceKm: 4.1,
    createdAt: '2026-10-02T11:20:00Z',
    updatedAt: '2026-10-02T11:20:00Z',
  },
];

export const LEADERBOARD_USERS = [
  { id: 'lb_1', name: 'Dr. Radhika Pai', avatarColor: '#3E8E41', points: 1420, kgRecycled: 184, rank: 1, tier: 'Eco Champion' },
  { id: 'lb_2', name: 'Karthik Shenoy', avatarColor: '#8BC83F', points: 1180, kgRecycled: 148, rank: 2, tier: 'Eco Champion' },
  { id: 'lb_3', name: 'Meera Fernandes', avatarColor: '#F5C518', points: 960, kgRecycled: 115, rank: 3, tier: 'Eco Champion' },
  { id: 'lb_4', name: 'Arun Alva', avatarColor: '#3B82F6', points: 740, kgRecycled: 89, rank: 4, tier: 'Eco Warrior' },
  { id: 'lb_5', name: 'Deepa Bhat', avatarColor: '#EC4899', points: 580, kgRecycled: 72, rank: 5, tier: 'Eco Warrior' },
  { id: 'lb_6', name: 'Sachin Salian', avatarColor: '#10B981', points: 410, kgRecycled: 51, rank: 6, tier: 'Eco Warrior' },
  { id: 'lb_7', name: 'Rohan Pinto', avatarColor: '#6366F1', points: 320, kgRecycled: 38, rank: 7, tier: 'Eco Warrior' },
];

export function createDefaultUser(): {
  user: User;
  profile: CustomerProfile;
  addresses: Address[];
  pickups: Pickup[];
  ledger: RewardLedger[];
  achievements: CustomerAchievement[];
  notifications: Notification[];
  complaints: Complaint[];
} {
  const userId = 'usr_demo_customer';
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 3600 * 1000);

  const user: User = {
    id: userId,
    phone: '+919876543210',
    role: 'CUSTOMER',
    createdAt: fiveDaysAgo.toISOString(),
    updatedAt: now.toISOString(),
  };

  const profile: CustomerProfile = {
    id: 'prof_demo',
    userId,
    name: 'Akshay Kumar',
    email: 'akshay.swms@gmail.com',
    avatarColor: '#3E8E41',
    avatarUrl: '',
    propertyCategory: 'Individual House',
    reminderPreference: 'MORNING_8',
    onboardingCompletedAt: fiveDaysAgo.toISOString(),
  };

  const addresses: Address[] = [
    {
      id: 'addr_home',
      userId,
      label: 'Home',
      line1: 'Flat 402, Green Valley Apartments',
      formatted: 'Kadri Hills, Near Kadri Park, Mangaluru, Karnataka 575002',
      landmark: 'Opposite Government Nursery',
      instructions: 'Please buzz 402 on the intercom or call phone.',
      lat: 12.8732,
      lng: 74.8474,
      isDefault: true,
      isDeleted: false,
      createdAt: fiveDaysAgo.toISOString(),
    },
    {
      id: 'addr_office',
      userId,
      label: 'Workspace',
      line1: 'Suit 3B, Tech Park Campus',
      formatted: 'Kottara Chowki, Mangaluru, Karnataka 575006',
      landmark: 'Next to IOCL Petrol Pump',
      instructions: 'Leave at security gate receipt counter.',
      lat: 12.8980,
      lng: 74.8420,
      isDefault: false,
      isDeleted: false,
      createdAt: fiveDaysAgo.toISOString(),
    },
  ];

  // Past completed pickup
  const pickup1: Pickup = {
    id: 'pk_completed_1',
    customerId: userId,
    collectorId: 'col_rajesh',
    status: 'COMPLETED',
    scheduledDate: yesterday.toISOString().split('T')[0],
    scheduledSlot: '10:00 - 12:00',
    totalAmountMinor: 5500, // ₹55.00
    paymentStatus: 'SUCCESS',
    paymentMode: 'PAY_LATER',
    pricingSnapshot: {
      totalMinor: 5500,
      items: [
        {
          wasteTypeId: 'wt_plastic',
          wasteTypeName: 'Plastics & Containers',
          bagSize: 'MEDIUM',
          numberOfBags: 1,
          unitPriceMinor: 3000,
          lineTotalMinor: 3000,
        },
        {
          wasteTypeId: 'wt_paper',
          wasteTypeName: 'Paper & Cardboard',
          bagSize: 'MEDIUM',
          numberOfBags: 1,
          unitPriceMinor: 2500,
          lineTotalMinor: 2500,
        },
      ],
    },
    addressId: 'addr_home',
    addressSnapshot: {
      label: 'Home',
      line1: 'Flat 402, Green Valley Apartments',
      formatted: 'Kadri Hills, Near Kadri Park, Mangaluru, Karnataka 575002',
      lat: 12.8732,
      lng: 74.8474,
    },
    items: [
      {
        id: 'pki_1',
        pickupId: 'pk_completed_1',
        wasteTypeId: 'wt_plastic',
        bagSize: 'MEDIUM',
        numberOfBags: 1,
        unitPriceMinor: 3000,
        lineTotalMinor: 3000,
      },
      {
        id: 'pki_2',
        pickupId: 'pk_completed_1',
        wasteTypeId: 'wt_paper',
        bagSize: 'MEDIUM',
        numberOfBags: 1,
        unitPriceMinor: 2500,
        lineTotalMinor: 2500,
      },
    ],
    history: [
      { id: 'h1', pickupId: 'pk_completed_1', status: 'REQUESTED', notes: 'Scheduled by customer', createdAt: yesterday.toISOString() },
      { id: 'h2', pickupId: 'pk_completed_1', status: 'ASSIGNED', notes: 'Assigned to Rajesh Shetty', createdAt: yesterday.toISOString() },
      { id: 'h3', pickupId: 'pk_completed_1', status: 'ACCEPTED', notes: 'Collector confirmed slot', createdAt: yesterday.toISOString() },
      { id: 'h4', pickupId: 'pk_completed_1', status: 'EN_ROUTE', notes: 'Collector on the way', createdAt: yesterday.toISOString() },
      { id: 'h5', pickupId: 'pk_completed_1', status: 'ARRIVED', notes: 'Collector reached location', createdAt: yesterday.toISOString() },
      { id: 'h6', pickupId: 'pk_completed_1', status: 'COLLECTED', notes: 'Waste inspected and weighed', createdAt: yesterday.toISOString() },
      { id: 'h7', pickupId: 'pk_completed_1', status: 'VERIFIED', notes: 'Doorstep PIN verified', createdAt: yesterday.toISOString() },
      { id: 'h8', pickupId: 'pk_completed_1', status: 'COMPLETED', notes: 'Pickup closed. 42 Eco Points credited.', createdAt: yesterday.toISOString() },
    ],
    createdAt: yesterday.toISOString(),
    updatedAt: yesterday.toISOString(),
  };

  // Active upcoming pickup for today
  const pickup2: Pickup = {
    id: 'pk_active_current',
    customerId: userId,
    collectorId: 'col_rajesh',
    status: 'EN_ROUTE',
    scheduledDate: now.toISOString().split('T')[0],
    scheduledSlot: '14:00 - 16:00',
    totalAmountMinor: 6500, // ₹65.00
    paymentStatus: 'PENDING',
    paymentMode: 'PAY_LATER',
    pricingSnapshot: {
      totalMinor: 6500,
      items: [
        {
          wasteTypeId: 'wt_ewaste',
          wasteTypeName: 'E-Waste & Electronics',
          bagSize: 'SMALL',
          numberOfBags: 1,
          unitPriceMinor: 3000,
          lineTotalMinor: 3000,
        },
        {
          wasteTypeId: 'wt_organic',
          wasteTypeName: 'Organic & Compostable',
          bagSize: 'LARGE',
          numberOfBags: 1,
          unitPriceMinor: 3500,
          lineTotalMinor: 3500,
        },
      ],
    },
    addressId: 'addr_home',
    addressSnapshot: {
      label: 'Home',
      line1: 'Flat 402, Green Valley Apartments',
      formatted: 'Kadri Hills, Near Kadri Park, Mangaluru, Karnataka 575002',
      lat: 12.8732,
      lng: 74.8474,
    },
    items: [
      {
        id: 'pki_3',
        pickupId: 'pk_active_current',
        wasteTypeId: 'wt_ewaste',
        bagSize: 'SMALL',
        numberOfBags: 1,
        unitPriceMinor: 3000,
        lineTotalMinor: 3000,
      },
      {
        id: 'pki_4',
        pickupId: 'pk_active_current',
        wasteTypeId: 'wt_organic',
        bagSize: 'LARGE',
        numberOfBags: 1,
        unitPriceMinor: 3500,
        lineTotalMinor: 3500,
      },
    ],
    history: [
      { id: 'h21', pickupId: 'pk_active_current', status: 'REQUESTED', notes: 'Scheduled via web app', createdAt: now.toISOString() },
      { id: 'h22', pickupId: 'pk_active_current', status: 'ASSIGNED', notes: 'Assigned to Rajesh Shetty', createdAt: now.toISOString() },
      { id: 'h23', pickupId: 'pk_active_current', status: 'ACCEPTED', notes: 'Collector accepted pickup', createdAt: now.toISOString() },
      { id: 'h24', pickupId: 'pk_active_current', status: 'EN_ROUTE', notes: 'Collector is en route (approx 12 mins)', createdAt: now.toISOString() },
    ],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const ledger: RewardLedger[] = [
    {
      id: 'rw_welcome',
      userId,
      points: 50,
      type: 'ONBOARDING_BONUS',
      description: 'Welcome Bonus: Swachh Bharat Citizen Onboarding',
      createdAt: fiveDaysAgo.toISOString(),
    },
    {
      id: 'rw_p1',
      userId,
      points: 42,
      type: 'PICKUP_COMPLETED',
      description: 'Completed Pickup #pk_completed_1 (Plastic & Paper)',
      createdAt: yesterday.toISOString(),
    },
    {
      id: 'rw_ach',
      userId,
      points: 50,
      type: 'ACHIEVEMENT_UNLOCK',
      description: 'Achievement Unlocked: First Green Step',
      createdAt: yesterday.toISOString(),
    },
  ];

  const achievements: CustomerAchievement[] = [
    {
      id: 'ca_1',
      userId,
      achievementId: 'ach_first_pickup',
      progress: 1,
      unlockedAt: yesterday.toISOString(),
      createdAt: fiveDaysAgo.toISOString(),
    },
    {
      id: 'ca_2',
      userId,
      achievementId: 'ach_10kg',
      progress: 8,
      unlockedAt: null,
      createdAt: fiveDaysAgo.toISOString(),
    },
    {
      id: 'ca_3',
      userId,
      achievementId: 'ach_streak7',
      progress: 3,
      unlockedAt: null,
      createdAt: fiveDaysAgo.toISOString(),
    },
    {
      id: 'ca_4',
      userId,
      achievementId: 'ach_co2_hero',
      progress: 14,
      unlockedAt: null,
      createdAt: fiveDaysAgo.toISOString(),
    },
    {
      id: 'ca_5',
      userId,
      achievementId: 'ach_5pickups',
      progress: 1,
      unlockedAt: null,
      createdAt: fiveDaysAgo.toISOString(),
    },
  ];

  const notifications: Notification[] = [
    {
      id: 'notif_1',
      userId,
      title: 'Collector En Route! 🚚',
      body: 'Rajesh Shetty is on the way to your doorstep. Estimated arrival in 12 mins.',
      type: 'PICKUP',
      read: false,
      link: '/customer/pickups/pk_active_current/tracking',
      createdAt: now.toISOString(),
    },
    {
      id: 'notif_2',
      userId,
      title: 'Pickup Completed 🎉',
      body: 'Your recyclable waste was verified. 42 Eco Points added to your wallet!',
      type: 'REWARD',
      read: true,
      link: '/customer/rewards',
      createdAt: yesterday.toISOString(),
    },
    {
      id: 'notif_3',
      userId,
      title: 'Welcome to SWMS Portal! 🌱',
      body: 'Your 50 Eco Points joining bonus is ready. Start your first doorstep pickup!',
      type: 'SYSTEM',
      read: true,
      link: '/customer/pickups/new',
      createdAt: fiveDaysAgo.toISOString(),
    },
  ];

  const complaints: Complaint[] = [
    {
      id: 'cmp_1',
      customerId: userId,
      pickupId: 'pk_completed_1',
      category: 'Waste Collection Issue',
      description: 'Collector arrived on time and was very polite. Inquired if glass bottles could be bundled with paper in future pickups.',
      status: 'RESOLVED',
      resolution: 'Yes! You can bundle any segregated dry waste by selecting both categories in the pickup wizard.',
      attachments: [],
      createdAt: yesterday.toISOString(),
      updatedAt: yesterday.toISOString(),
    },
  ];

  return {
    user,
    profile,
    addresses,
    pickups: [pickup2, pickup1],
    ledger,
    achievements,
    notifications,
    complaints,
  };
}

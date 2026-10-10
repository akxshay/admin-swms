import type { RewardCatalogItem } from './types';

export const REWARD_CATALOG: RewardCatalogItem[] = [
  { id: 'rew_elec', title: '₹50 Electricity Bill Discount', description: 'Instant discount code valid on Mescom electricity utility bill payments.', points: 200, icon: '⚡', partner: 'Mescom Mangaluru', active: true },
  { id: 'rew_compost', title: 'Free Organic Compost (5 kg)', description: 'Pure enriched vermicompost bag delivered on your next doorstep pickup.', points: 150, icon: '🌱', partner: 'Kadri Eco Hub', active: true },
  { id: 'rew_sapling', title: 'Adopt a Native Tree Sapling', description: 'Adopt a certified fruit or shade tree sapling planted in Mangaluru green belt.', points: 100, icon: '🌳', partner: 'Swayam NGO', active: true },
  { id: 'rew_bag', title: 'SWMS Cotton Recycled Tote Bag', description: 'Durable, 100% recycled cotton tote bag with Swachh Bharat emblem.', points: 75, icon: '🛍️', partner: 'SWMS Clean City', active: true },
];

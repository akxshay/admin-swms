import { db, dbManager } from '../db';
import { ExchangeListing, ExchangeHub, ListingStatus } from '../types';
import { mapsAdapter } from '../adapters/maps';
import { storageAdapter } from '../adapters/storage';

export interface CreateListingInput {
  sellerId: string;
  title: string;
  description: string;
  material: string;
  quantityKg: number;
  priceMinor: number;
  imageDataUri?: string;
  lat?: number;
  lng?: number;
}

export async function createExchangeListing(input: CreateListingInput): Promise<ExchangeListing> {
  const user = db.users.find((u) => u.id === input.sellerId);
  const profile = db.customerProfiles.find((p) => p.userId === input.sellerId);
  if (!user) throw new Error('Seller not found');

  let imageUrl: string | undefined = undefined;
  if (input.imageDataUri) {
    imageUrl = await storageAdapter.uploadImage(input.imageDataUri, 'exchange');
  }

  const defaultLat = 12.8732;
  const defaultLng = 74.8474;

  const listing: ExchangeListing = {
    id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sellerId: input.sellerId,
    sellerName: profile?.name || 'Citizen Recycler',
    sellerAvatarColor: profile?.avatarColor || '#3E8E41',
    title: input.title,
    description: input.description,
    material: input.material,
    quantityKg: input.quantityKg,
    priceMinor: input.priceMinor,
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    lat: input.lat || defaultLat,
    lng: input.lng || defaultLng,
    city: 'Mangaluru',
    distanceKm: 0.8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.exchangeListings.unshift(listing);
  dbManager.persist();
  return listing;
}

export function getExchangeListings(filters?: {
  material?: string;
  query?: string;
  userLat?: number;
  userLng?: number;
  sellerId?: string;
}): ExchangeListing[] {
  let list = db.exchangeListings.filter((l) => l.status === 'ACTIVE' || (filters?.sellerId && l.sellerId === filters.sellerId));

  if (filters?.material && filters.material !== 'ALL') {
    list = list.filter((l) => l.material.toLowerCase().includes(filters.material!.toLowerCase()));
  }

  if (filters?.query) {
    const q = filters.query.toLowerCase();
    list = list.filter((l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q));
  }

  if (filters?.userLat && filters?.userLng) {
    list = list.map((l) => ({
      ...l,
      distanceKm: mapsAdapter.calculateDistanceKm(filters.userLat!, filters.userLng!, l.lat, l.lng),
    }));
  }

  return list;
}

export function updateListingStatus(listingId: string, sellerId: string, status: ListingStatus): ExchangeListing {
  const listing = db.exchangeListings.find((l) => l.id === listingId);
  if (!listing) throw new Error('Listing not found');
  if (listing.sellerId !== sellerId) throw new Error('Not authorized to edit this listing');

  listing.status = status;
  listing.updatedAt = new Date().toISOString();
  dbManager.persist();
  return listing;
}

export function getNearbyHubs(userLat: number = 12.8732, userLng: number = 74.8474): Array<ExchangeHub & { distanceKm: number }> {
  return db.exchangeHubs.map((hub) => ({
    ...hub,
    distanceKm: mapsAdapter.calculateDistanceKm(userLat, userLng, hub.lat, hub.lng),
  })).sort((a, b) => a.distanceKm - b.distanceKm);
}

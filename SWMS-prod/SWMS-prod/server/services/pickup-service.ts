import { db, dbManager } from '../db';
import { Pickup, PickupStatus, BagSize, PickupItem, PickupStatusHistory, Address } from '../types';
import { calculatePricingQuote } from './pricing-service';
import { createDoorstepOtp } from './otp-service';
import { realtimeBus } from '../realtime';
import { processCompletedPickupRewards } from './rewards-service';

export const ALLOWED_TRANSITIONS: Record<PickupStatus, PickupStatus[]> = {
  REQUESTED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['ACCEPTED', 'REQUESTED', 'CANCELLED'],
  ACCEPTED: ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE: ['ARRIVED'],
  ARRIVED: ['COLLECTING', 'VERIFIED'],
  COLLECTING: ['COLLECTED', 'VERIFIED'],
  COLLECTED: ['VERIFIED'],
  VERIFIED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  MISSED: [],
};

export interface CreatePickupInput {
  customerId: string;
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
  scheduledDate: string; // YYYY-MM-DD
  scheduledSlot: string; // "08:00 - 10:00"
  paymentMode?: 'PAY_NOW' | 'PAY_LATER';
  notes?: string;
  items: Array<{
    wasteTypeId: string;
    bagSize: BagSize;
    numberOfBags: number;
  }>;
}

export function createPickup(input: CreatePickupInput): Pickup {
  const customer = db.users.find((u) => u.id === input.customerId);
  if (!customer) {
    throw new Error('Customer user not found.');
  }

  let address: Address | undefined = input.addressId
    ? db.addresses.find((a) => a.id === input.addressId && a.userId === input.customerId && !a.isDeleted)
    : undefined;

  if (!address && input.customAddress) {
    const newAddr: Address = {
      id: `addr_${Date.now()}`,
      userId: input.customerId,
      label: input.customAddress.label || 'Current GPS Location',
      line1: input.customAddress.line1,
      formatted: input.customAddress.formatted,
      landmark: input.customAddress.landmark,
      instructions: input.customAddress.instructions,
      lat: input.customAddress.lat,
      lng: input.customAddress.lng,
      isDefault: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };
    db.addresses.push(newAddr);
    dbManager.persist();
    address = newAddr;
  }

  if (!address) {
    throw new Error('Valid delivery address not found.');
  }

  // 1. Calculate price securely on server (ignoring any client sent prices)
  const quote = calculatePricingQuote(input.items);
  if (quote.items.length === 0) {
    throw new Error('Please select at least one waste category and bag quantity.');
  }

  const pickupId = `pk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // 2. Select eligible online collector (closest to address)
  const onlineCollectors = db.collectors.filter((c) => c.isOnline);
  const assignedCollector = onlineCollectors[0] || db.collectors[0];

  const items: PickupItem[] = quote.items.map((item, idx) => ({
    id: `pki_${Date.now()}_${idx}`,
    pickupId,
    wasteTypeId: item.wasteTypeId,
    bagSize: item.bagSize,
    numberOfBags: item.numberOfBags,
    unitPriceMinor: item.unitPriceMinor,
    lineTotalMinor: item.lineTotalMinor,
  }));

  const history: PickupStatusHistory[] = [
    {
      id: `h_${Date.now()}_1`,
      pickupId,
      status: 'REQUESTED',
      notes: 'Doorstep pickup requested by customer.',
      createdAt: now,
    },
  ];

  if (assignedCollector) {
    history.push({
      id: `h_${Date.now()}_2`,
      pickupId,
      status: 'ASSIGNED',
      notes: `Assigned to ${assignedCollector.name} (${assignedCollector.vehicleType})`,
      createdAt: now,
    });
    history.push({
      id: `h_${Date.now()}_3`,
      pickupId,
      status: 'ACCEPTED',
      notes: `Collector confirmed slot for ${input.scheduledDate} ${input.scheduledSlot}`,
      createdAt: now,
    });
  }

  const pickup: Pickup = {
    id: pickupId,
    customerId: input.customerId,
    collectorId: assignedCollector ? assignedCollector.id : null,
    status: assignedCollector ? 'ACCEPTED' : 'REQUESTED',
    scheduledDate: input.scheduledDate,
    scheduledSlot: input.scheduledSlot,
    totalAmountMinor: quote.totalMinor,
    paymentStatus: 'PENDING',
    paymentMode: input.paymentMode || 'PAY_LATER',
    pricingSnapshot: {
      totalMinor: quote.totalMinor,
      items: quote.items.map((i) => ({
        wasteTypeId: i.wasteTypeId,
        wasteTypeName: i.wasteTypeName,
        bagSize: i.bagSize,
        numberOfBags: i.numberOfBags,
        unitPriceMinor: i.unitPriceMinor,
        lineTotalMinor: i.lineTotalMinor,
      })),
    },
    addressId: address.id,
    addressSnapshot: {
      label: address.label,
      line1: address.line1,
      formatted: address.formatted,
      landmark: address.landmark,
      instructions: address.instructions,
      lat: address.lat,
      lng: address.lng,
    },
    notes: input.notes,
    items,
    history,
    createdAt: now,
    updatedAt: now,
  };

  db.pickups.unshift(pickup);
  dbManager.persist();

  // Create notification
  const notif = {
    id: `notif_${Date.now()}`,
    userId: input.customerId,
    title: 'Pickup Scheduled Successfully! 🗓️',
    body: `Your pickup is scheduled for ${input.scheduledDate} (${input.scheduledSlot}). Total: ₹${(
      quote.totalMinor / 100
    ).toFixed(2)}`,
    type: 'PICKUP' as const,
    read: false,
    link: `/customer/pickups/${pickup.id}`,
    createdAt: now,
  };
  db.notifications.unshift(notif);
  dbManager.persist();

  realtimeBus.emitToUser(input.customerId, 'notification', notif);
  realtimeBus.emitToUser(input.customerId, 'pickup_created', pickup);

  return pickup;
}

export function advancePickupStatus(
  pickupId: string,
  newStatus: PickupStatus,
  notes?: string,
  callerRole: 'CUSTOMER' | 'COLLECTOR' | 'ADMIN' = 'ADMIN',
  callerUserId?: string
): Pickup {
  const pickup = db.pickups.find((p) => p.id === pickupId);
  if (!pickup) {
    throw new Error('Pickup not found');
  }

  // Authorization checks:
  if (callerRole === 'CUSTOMER') {
    if (callerUserId && pickup.customerId !== callerUserId) {
      throw new Error('Access denied: cannot modify another customer pickup.');
    }
    // Customers can only cancel, and only when REQUESTED, ASSIGNED, or ACCEPTED
    if (newStatus !== 'CANCELLED') {
      throw new Error('Customers cannot manually alter pickup progress statuses.');
    }
    if (!['REQUESTED', 'ASSIGNED', 'ACCEPTED'].includes(pickup.status)) {
      throw new Error(`Cannot cancel pickup once collector is ${pickup.status}.`);
    }
  }

  // State Machine transition check:
  const allowedNext = ALLOWED_TRANSITIONS[pickup.status];
  if (!allowedNext.includes(newStatus)) {
    throw new Error(`Illegal status transition from ${pickup.status} to ${newStatus}.`);
  }

  const now = new Date().toISOString();
  pickup.status = newStatus;
  pickup.updatedAt = now;

  pickup.history.push({
    id: `h_${Date.now()}`,
    pickupId,
    status: newStatus,
    notes: notes || `Status changed to ${newStatus}`,
    createdAt: now,
  });

  // When ARRIVED, automatically generate the doorstep OTP if not already generated
  if (newStatus === 'ARRIVED') {
    const otp = createDoorstepOtp(pickupId);
    pickup.history.push({
      id: `h_otp_${Date.now()}`,
      pickupId,
      status: 'ARRIVED',
      notes: `Doorstep verification PIN generated.`,
      createdAt: now,
    });
    // Send realtime alert with PIN
    realtimeBus.emitToUser(pickup.customerId, 'doorstep_pin_generated', {
      pickupId,
      pin: otp.rawCode,
    });
    realtimeBus.emitToUser(pickup.customerId, 'notification', {
      id: `notif_pin_${Date.now()}`,
      userId: pickup.customerId,
      title: 'Collector Arrived! 📍',
      body: `Your collector is at the door. Share verification PIN [${otp.rawCode}] after weighing.`,
      type: 'PICKUP',
      read: false,
      link: `/customer/pickups/${pickup.id}/tracking`,
      createdAt: now,
    });
  }

  // When COMPLETED, award eco points and update stats
  if (newStatus === 'COMPLETED') {
    processCompletedPickupRewards(pickup);
  }

  dbManager.persist();

  // Emit status change event to real-time bus
  realtimeBus.emitToUser(pickup.customerId, 'pickup_status_changed', {
    pickupId,
    status: newStatus,
    notes,
  });

  return pickup;
}

export function getCustomerPickups(
  customerId: string,
  tab?: 'upcoming' | 'active' | 'history'
): Pickup[] {
  const all = db.pickups.filter((p) => p.customerId === customerId);

  if (tab === 'upcoming') {
    return all.filter((p) => ['REQUESTED', 'ASSIGNED', 'ACCEPTED'].includes(p.status));
  }
  if (tab === 'active') {
    return all.filter((p) => ['EN_ROUTE', 'ARRIVED', 'COLLECTING', 'COLLECTED', 'VERIFIED'].includes(p.status));
  }
  if (tab === 'history') {
    return all.filter((p) => ['COMPLETED', 'CANCELLED', 'MISSED'].includes(p.status));
  }
  return all;
}

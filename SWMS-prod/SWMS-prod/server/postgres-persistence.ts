import type { PrismaClient } from '@prisma/client';
import type { DatabaseSchema } from './db';
// REWARD_CATALOG kept as a seed fallback only — runtime truth is db.rewardCatalogItems
import { REWARD_CATALOG } from './reward-catalog';

const date = (value: string | Date) => value instanceof Date ? value : new Date(value);
const iso = (value: Date) => value.toISOString();

export async function hydrateFromPostgres(prisma: PrismaClient): Promise<DatabaseSchema> {
  const rows = await Promise.all([
    prisma.user.findMany(), prisma.customerProfile.findMany(), prisma.address.findMany(),
    prisma.wasteType.findMany(), prisma.pricingRule.findMany(), prisma.pickup.findMany(),
    prisma.pickupItem.findMany(), prisma.pickupStatusHistory.findMany(), prisma.collector.findMany(),
    prisma.doorstepOtp.findMany(), prisma.payment.findMany(), prisma.rewardLedger.findMany(),
    prisma.rewardCatalogItem.findMany(),
    prisma.rewardRedemption.findMany(), prisma.achievement.findMany(), prisma.customerAchievement.findMany(),
    prisma.exchangeHub.findMany(), prisma.exchangeListing.findMany(), prisma.notification.findMany(),
    prisma.complaint.findMany({ include: { attachments: true } }), prisma.otpRecord.findMany(),
  ]);
  const [users, profiles, addresses, wasteTypes, pricingRules, pickups, items, histories, collectors,
    doorstepOtps, payments, ledgers, catalogItems, redemptions, achievements, customerAchievements, hubs, listings,
    notifications, complaints, otpRecords] = rows;
  return {
    users: users.map((x) => ({ ...x, createdAt: iso(x.createdAt), updatedAt: iso(x.updatedAt) })),
    customerProfiles: profiles.map((x) => ({ ...x, avatarColor: x.avatarColor ?? '', propertyCategory: x.propertyCategory ?? '', reminderPreference: x.reminderPreference as any, onboardingCompletedAt: x.onboardingCompletedAt ? iso(x.onboardingCompletedAt) : null })),
    addresses: addresses.map((x) => ({ ...x, createdAt: iso(x.createdAt), updatedAt: iso(x.updatedAt ?? x.createdAt) })),
    wasteTypes: wasteTypes.map((x) => ({ ...x, description: x.description ?? '', imageUrl: x.imageUrl ?? '' })),
    pricingRules: pricingRules.map((x) => ({ ...x, effectiveFrom: iso(x.effectiveFrom), effectiveTo: x.effectiveTo ? iso(x.effectiveTo) : null })),
    pickups: pickups.map((x) => ({ ...x, scheduledDate: iso(x.scheduledDate), createdAt: iso(x.createdAt), updatedAt: iso(x.updatedAt), paymentMode: x.paymentMode as any, pricingSnapshot: x.pricingSnapshot as any, addressSnapshot: x.addressSnapshot as any, items: items.filter((i) => i.pickupId === x.id).map((i) => ({ ...i, bagSize: i.bagSize as any })), history: histories.filter((h) => h.pickupId === x.id).map((h) => ({ ...h, status: h.status as any, createdAt: iso(h.createdAt) })) })),
    collectors: collectors.map((x) => ({ ...x, photoUrl: x.photoUrl ?? '', lastLocationAt: iso(x.lastLocationAt) })),
    doorstepOtps: doorstepOtps.map((x) => ({ ...x, expiresAt: iso(x.expiresAt), createdAt: iso(x.createdAt) })),
    payments: payments.map((x) => ({ ...x, provider: x.provider as any, createdAt: iso(x.createdAt), updatedAt: iso(x.updatedAt) })),
    rewardLedgers: ledgers.map((x) => ({ ...x, createdAt: iso(x.createdAt) })),
    // Runtime truth is Postgres rows; fallback to seed array only on first boot
    rewardCatalogItems: catalogItems.length > 0 ? catalogItems.map((x) => ({ ...x })) : [...REWARD_CATALOG],
    rewardRedemptions: redemptions.map((x) => ({ ...x, createdAt: iso(x.createdAt) })),
    achievements: achievements.map((x) => ({ ...x, metric: x.metric as any })),
    customerAchievements: customerAchievements.map((x) => ({ ...x, unlockedAt: x.unlockedAt ? iso(x.unlockedAt) : null, createdAt: iso(x.createdAt) })),
    exchangeHubs: hubs, exchangeListings: listings.map((x) => ({ ...x, sellerName: x.sellerName, sellerAvatarColor: x.sellerAvatarColor, distanceKm: x.distanceKm ?? undefined, createdAt: iso(x.createdAt), updatedAt: iso(x.updatedAt) })),
    notifications: notifications.map((x) => ({ ...x, type: x.type as any, createdAt: iso(x.createdAt) })),
    complaints: complaints.map((x) => ({ ...x, attachments: x.attachments.map((a) => a.url), createdAt: iso(x.createdAt), updatedAt: iso(x.updatedAt) })),
    otpRecords: otpRecords.map((x) => ({ ...x, expiresAt: iso(x.expiresAt), resendCooldownUntil: iso(x.resendCooldownUntil), lockedUntil: x.lockedUntil ? iso(x.lockedUntil) : undefined })),
  } as DatabaseSchema;
}

export async function persistRelationalState(prisma: PrismaClient, data: DatabaseSchema): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const t = tx as any;
    const users = [...data.users];
    const userIds = new Set(users.map((user) => user.id));
    for (const listing of data.exchangeListings) {
      if (!userIds.has(listing.sellerId)) {
        users.push({
          id: listing.sellerId,
          phone: `imported-${listing.sellerId}`,
          role: 'CUSTOMER',
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
        });
        userIds.add(listing.sellerId);
      }
    }
    await t.complaintAttachment.deleteMany(); await t.notification.deleteMany(); await t.complaint.deleteMany();
    await t.exchangeListing.deleteMany(); await t.customerAchievement.deleteMany(); await t.rewardRedemption.deleteMany();
    await t.rewardCatalogItem.deleteMany();
    await t.rewardLedger.deleteMany(); await t.payment.deleteMany(); await t.doorstepOtp.deleteMany();
    await t.pickupStatusHistory.deleteMany(); await t.pickupItem.deleteMany(); await t.pickup.deleteMany();
    await t.pricingRule.deleteMany(); await t.wasteType.deleteMany(); await t.address.deleteMany();
    await t.customerProfile.deleteMany(); await t.otpRecord.deleteMany(); await t.collector.deleteMany();
    await t.exchangeHub.deleteMany(); await t.achievement.deleteMany(); await t.user.deleteMany();
    await t.user.createMany({ data: users.map((x) => ({ id: x.id, phone: x.phone, role: x.role, createdAt: date(x.createdAt), updatedAt: date(x.updatedAt) })) });
    await t.customerProfile.createMany({ data: data.customerProfiles.map((x) => ({ ...x, onboardingCompletedAt: x.onboardingCompletedAt ? date(x.onboardingCompletedAt) : null })) });
    await t.address.createMany({ data: data.addresses.map((x) => ({ ...x, createdAt: date(x.createdAt), updatedAt: date(x.updatedAt ?? x.createdAt) })) });
    await t.wasteType.createMany({ data: data.wasteTypes });
    await t.pricingRule.createMany({ data: data.pricingRules.map((x) => ({ ...x, effectiveFrom: date(x.effectiveFrom), effectiveTo: x.effectiveTo ? date(x.effectiveTo) : null })) });
    await t.collector.createMany({ data: data.collectors.map((x) => ({ ...x, lastLocationAt: date(x.lastLocationAt) })) });
    await t.achievement.createMany({ data: data.achievements });
    await t.exchangeHub.createMany({ data: data.exchangeHubs });
    await t.pickup.createMany({ data: data.pickups.map((x) => ({ id: x.id, customerId: x.customerId, collectorId: x.collectorId ?? null, status: x.status, scheduledDate: date(x.scheduledDate), scheduledSlot: x.scheduledSlot, totalAmountMinor: x.totalAmountMinor, paymentStatus: x.paymentStatus, paymentMode: x.paymentMode, pricingSnapshot: x.pricingSnapshot, addressId: x.addressId, addressSnapshot: x.addressSnapshot, notes: x.notes ?? null, createdAt: date(x.createdAt), updatedAt: date(x.updatedAt) })) });
    await t.pickupItem.createMany({ data: data.pickups.flatMap((p) => p.items).map((x) => ({ id: x.id, pickupId: x.pickupId, wasteTypeId: x.wasteTypeId, bagSize: x.bagSize, numberOfBags: x.numberOfBags, unitPriceMinor: x.unitPriceMinor, lineTotalMinor: x.lineTotalMinor })) });
    await t.pickupStatusHistory.createMany({ data: data.pickups.flatMap((p) => p.history).map((x) => ({ id: x.id, pickupId: x.pickupId, status: x.status, notes: x.notes ?? null, createdAt: date(x.createdAt) })) });
    await t.doorstepOtp.createMany({ data: data.doorstepOtps.map((x) => ({ id: x.id, pickupId: x.pickupId, codeHash: x.codeHash, rawCodeForDev: x.rawCodeForDev ?? null, expiresAt: date(x.expiresAt), attempts: x.attempts, createdAt: date(x.createdAt) })) });
    await t.payment.createMany({ data: data.payments.map((x) => ({ id: x.id, pickupId: x.pickupId, userId: x.userId, amountMinor: x.amountMinor, currency: x.currency, status: x.status, provider: x.provider, providerOrderId: x.providerOrderId ?? null, providerPaymentId: x.providerPaymentId ?? null, signature: x.signature ?? null, createdAt: date(x.createdAt), updatedAt: date(x.updatedAt) })) });
    await t.rewardLedger.createMany({ data: data.rewardLedgers.map((x) => ({ id: x.id, userId: x.userId, points: x.points, type: x.type, description: x.description, createdAt: date(x.createdAt) })) });
    // Persist admin-managed catalog (db.rewardCatalogItems is the runtime truth)
    const catalog = new Map(data.rewardCatalogItems.map((x) => [x.id, x]));
    for (const redemption of data.rewardRedemptions) {
      if (!catalog.has(redemption.rewardId)) {
        catalog.set(redemption.rewardId, { id: redemption.rewardId, title: redemption.rewardId, description: 'Imported reward', points: redemption.points, icon: '🎁', partner: 'SWMS', active: false });
      }
    }
    await t.rewardCatalogItem.createMany({ data: [...catalog.values()].map((x) => ({ id: x.id, title: x.title, description: x.description, points: x.points, icon: x.icon, partner: x.partner, active: x.active })) });
    await t.rewardRedemption.createMany({ data: data.rewardRedemptions.map((x) => ({ id: x.id, userId: x.userId, rewardId: x.rewardId, voucherCode: x.voucherCode, points: x.points, createdAt: date(x.createdAt) })) });
    await t.customerAchievement.createMany({ data: data.customerAchievements.map((x) => ({ ...x, unlockedAt: x.unlockedAt ? date(x.unlockedAt) : null, createdAt: date(x.createdAt) })) });
    await t.exchangeListing.createMany({ data: data.exchangeListings.map((x) => ({ id: x.id, sellerId: x.sellerId, sellerName: x.sellerName, sellerAvatarColor: x.sellerAvatarColor, title: x.title, description: x.description, material: x.material, quantityKg: x.quantityKg, priceMinor: x.priceMinor, imageUrl: x.imageUrl ?? null, status: x.status, lat: x.lat, lng: x.lng, city: x.city, distanceKm: x.distanceKm ?? null, createdAt: date(x.createdAt), updatedAt: date(x.updatedAt) })) });
    await t.notification.createMany({ data: data.notifications.map((x) => ({ id: x.id, userId: x.userId, title: x.title, body: x.body, type: x.type, read: x.read, link: x.link ?? null, createdAt: date(x.createdAt) })) });
    await t.complaint.createMany({ data: data.complaints.map((x) => ({ id: x.id, customerId: x.customerId, pickupId: x.pickupId ?? null, category: x.category, description: x.description, status: x.status, resolution: x.resolution ?? null, createdAt: date(x.createdAt), updatedAt: date(x.updatedAt) })) });
    for (const c of data.complaints) if (c.attachments.length) await t.complaintAttachment.createMany({ data: c.attachments.map((url) => ({ complaintId: c.id, url })) });
    await t.otpRecord.createMany({ data: data.otpRecords.map((x) => ({ ...x, expiresAt: date(x.expiresAt), resendCooldownUntil: date(x.resendCooldownUntil), lockedUntil: x.lockedUntil ? date(x.lockedUntil) : null })) });
  });
}

import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { db, dbManager } from './db';
import { requestPhoneOtp, verifyPhoneOtp, verifyDoorstepOtp } from './services/otp-service';
import { calculatePricingQuote } from './services/pricing-service';
import { createPickup, advancePickupStatus, getCustomerPickups } from './services/pickup-service';
import { simulateCollectorDrive } from './services/assignment-service';
import { getUserEcoStats, getLeaderboard, grantPoints, evaluateAchievements, REWARD_CATALOG, redeemReward } from './services/rewards-service';
import { createExchangeListing, getExchangeListings, updateListingStatus, getNearbyHubs } from './services/exchange-service';
import { createComplaint, advanceComplaintStatus } from './services/complaints-service';
import { paymentAdapter } from './adapters/payments';
import { mapsAdapter } from './adapters/maps';
import { realtimeBus } from './realtime';

export const apiRouter = express.Router();

// Helper to get authenticated user ID from header or default demo user
function getAuthUserId(req: Request): string {
  const headerId = req.headers['x-user-id'] as string;
  if (headerId && db.users.some((u) => u.id === headerId)) {
    return headerId;
  }
  return 'usr_demo_customer';
}

// ==========================================
// AUTH & ONBOARDING
// ==========================================

apiRouter.post('/auth/otp/request', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const result = await requestPhoneOtp(phone);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/otp/verify', (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'Phone and code are required' });

    const result = verifyPhoneOtp(phone, code);
    if (!result.success) {
      return res.status(400).json(result);
    }

    const user = db.users.find((u) => u.id === result.userId);
    const profile = db.customerProfiles.find((p) => p.userId === result.userId);

    return res.json({
      success: true,
      userId: user?.id,
      user,
      profile,
      needsOnboarding: !profile?.onboardingCompletedAt,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/auth/session', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const user = db.users.find((u) => u.id === userId);
  const profile = db.customerProfiles.find((p) => p.userId === userId);
  const defaultAddress = db.addresses.find((a) => a.userId === userId && a.isDefault && !a.isDeleted);

  return res.json({
    user,
    profile,
    defaultAddress,
    needsOnboarding: !profile?.onboardingCompletedAt,
  });
});

apiRouter.post('/customer/onboarding', (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    const { name, email, avatarColor, propertyCategory, reminderPreference, address } = req.body;

    let profile = db.customerProfiles.find((p) => p.userId === userId);
    if (!profile) {
      profile = {
        id: `prof_${Date.now()}`,
        userId,
        name: name || 'Citizen Recycler',
        email: email || null,
        avatarColor: avatarColor || '#3E8E41',
        propertyCategory: propertyCategory || 'Apartment',
        reminderPreference: reminderPreference || 'NONE',
        onboardingCompletedAt: null,
      };
      db.customerProfiles.push(profile);
    } else {
      profile.name = name || profile.name || 'Citizen Recycler';
      profile.email = email || profile.email;
      profile.avatarColor = avatarColor || profile.avatarColor;
      profile.propertyCategory = propertyCategory || profile.propertyCategory;
      profile.reminderPreference = reminderPreference || profile.reminderPreference;
    }

    // Create primary address if provided
    if (address && address.formatted) {
      const newAddr = {
        id: `addr_${Date.now()}`,
        userId,
        label: address.label || 'Home',
        line1: address.line1 || 'Main Gate',
        formatted: address.formatted,
        landmark: address.landmark,
        instructions: address.instructions,
        lat: address.lat || 12.8732,
        lng: address.lng || 74.8474,
        isDefault: true,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      };
      // remove isDefault from other addresses
      db.addresses.filter((a) => a.userId === userId).forEach((a) => (a.isDefault = false));
      db.addresses.push(newAddr);
    }

    const wasAlreadyCompleted = Boolean(profile.onboardingCompletedAt);
    profile.onboardingCompletedAt = new Date().toISOString();
    dbManager.persist();

    // Grant +50 Eco Points welcome bonus ONLY once
    if (!wasAlreadyCompleted) {
      grantPoints(userId, 50, 'ONBOARDING_BONUS', 'Welcome Bonus: Swachh Bharat Citizen Onboarding');
      evaluateAchievements(userId);
    }

    return res.json({
      success: true,
      profile,
      bonusAwarded: !wasAlreadyCompleted,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PROFILE & ADDRESSES
// ==========================================

apiRouter.get('/customer/profile', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const user = db.users.find((u) => u.id === userId);
  const profile = db.customerProfiles.find((p) => p.userId === userId);
  const stats = getUserEcoStats(userId);
  return res.json({ user, profile, stats });
});

apiRouter.put('/customer/profile', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const profile = db.customerProfiles.find((p) => p.userId === userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const { name, email, avatarColor, propertyCategory, reminderPreference } = req.body;
  if (name !== undefined) profile.name = name;
  if (email !== undefined) profile.email = email;
  if (avatarColor !== undefined) profile.avatarColor = avatarColor;
  if (propertyCategory !== undefined) profile.propertyCategory = propertyCategory;
  if (reminderPreference !== undefined) profile.reminderPreference = reminderPreference;

  dbManager.persist();
  return res.json({ success: true, profile });
});

apiRouter.get('/customer/addresses', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const addresses = db.addresses.filter((a) => a.userId === userId && !a.isDeleted);
  return res.json(addresses);
});

apiRouter.post('/customer/addresses', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const { label, line1, formatted, landmark, instructions, lat, lng, isDefault } = req.body;

  if (isDefault) {
    db.addresses.filter((a) => a.userId === userId).forEach((a) => (a.isDefault = false));
  }

  const newAddr = {
    id: `addr_${Date.now()}`,
    userId,
    label: label || 'Home',
    line1: line1 || '',
    formatted: formatted || 'Mangaluru',
    landmark,
    instructions,
    lat: lat || 12.8732,
    lng: lng || 74.8474,
    isDefault: Boolean(isDefault || db.addresses.filter((a) => a.userId === userId && !a.isDeleted).length === 0),
    isDeleted: false,
    createdAt: new Date().toISOString(),
  };

  db.addresses.push(newAddr);
  dbManager.persist();
  return res.json(newAddr);
});

apiRouter.delete('/customer/addresses/:id', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const addr = db.addresses.find((a) => a.id === req.params.id && a.userId === userId);
  if (!addr) return res.status(404).json({ error: 'Address not found' });

  addr.isDeleted = true;
  dbManager.persist();
  return res.json({ success: true });
});

// ==========================================
// WASTE TYPES & PRICING
// ==========================================

apiRouter.get('/waste-types', (req: Request, res: Response) => {
  const activeTypes = db.wasteTypes
    .filter((wt) => wt.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Attach active pricing rules for S/M/L to each type
  const enriched = activeTypes.map((wt) => {
    const rules = db.pricingRules.filter((pr) => pr.wasteTypeId === wt.id && pr.active);
    return {
      ...wt,
      pricing: {
        SMALL: rules.find((r) => r.bagSize === 'SMALL')?.priceMinor || 1000,
        MEDIUM: rules.find((r) => r.bagSize === 'MEDIUM')?.priceMinor || 2000,
        LARGE: rules.find((r) => r.bagSize === 'LARGE')?.priceMinor || 3500,
      },
    };
  });

  return res.json(enriched);
});

apiRouter.post('/pricing/quote', (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    const quote = calculatePricingQuote(items);
    return res.json(quote);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// PICKUPS
// ==========================================

apiRouter.get('/pickups', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const tab = req.query.tab as 'upcoming' | 'active' | 'history' | undefined;
  const pickups = getCustomerPickups(userId, tab);
  return res.json(pickups);
});

apiRouter.get('/pickups/:id', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const pickup = db.pickups.find((p) => p.id === req.params.id && p.customerId === userId);
  if (!pickup) return res.status(404).json({ error: 'Pickup not found' });

  const collector = db.collectors.find((c) => c.id === pickup.collectorId);
  const doorstepOtp = db.doorstepOtps.find((o) => o.pickupId === pickup.id);

  return res.json({
    pickup,
    collector,
    doorstepOtp: doorstepOtp ? { rawCode: doorstepOtp.rawCodeForDev, expiresAt: doorstepOtp.expiresAt } : null,
  });
});

apiRouter.post('/pickups', (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    const { addressId, customAddress, scheduledDate, scheduledSlot, paymentMode, notes, items } = req.body;

    const pickup = createPickup({
      customerId: userId,
      addressId,
      customAddress,
      scheduledDate,
      scheduledSlot,
      paymentMode,
      notes,
      items,
    });

    return res.status(201).json(pickup);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/pickups/:id/cancel', (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    const { reason } = req.body;
    const updated = advancePickupStatus(req.params.id, 'CANCELLED', reason || 'Cancelled by customer', 'CUSTOMER', userId);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// LIVE TRACKING & SIMULATOR
// ==========================================

apiRouter.get('/pickups/:id/tracking', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const pickup = db.pickups.find((p) => p.id === req.params.id && p.customerId === userId);
  if (!pickup) return res.status(404).json({ error: 'Pickup not found' });

  const collector = db.collectors.find((c) => c.id === pickup.collectorId) || db.collectors[0];
  const doorstepOtp = db.doorstepOtps.find((o) => o.pickupId === pickup.id);

  const distanceKm = mapsAdapter.calculateDistanceKm(
    collector.currentLat,
    collector.currentLng,
    pickup.addressSnapshot.lat,
    pickup.addressSnapshot.lng
  );
  const etaMinutes = Math.max(1, Math.round(distanceKm * 4));

  return res.json({
    pickup,
    collector,
    currentLocation: {
      lat: collector.currentLat,
      lng: collector.currentLng,
      distanceKm,
      etaMinutes,
      lastUpdated: collector.lastLocationAt,
    },
    doorstepOtp: doorstepOtp ? { rawCode: doorstepOtp.rawCodeForDev, expiresAt: doorstepOtp.expiresAt } : null,
  });
});

apiRouter.post('/collector/simulate', async (req: Request, res: Response) => {
  const { pickupId } = req.body;
  if (!pickupId) return res.status(400).json({ error: 'pickupId is required' });

  const result = await simulateCollectorDrive(pickupId);
  return res.json(result);
});

apiRouter.post('/collector/arrived', (req: Request, res: Response) => {
  try {
    const { pickupId } = req.body;
    if (!pickupId) return res.status(400).json({ error: 'pickupId is required' });

    const pickup = db.pickups.find((p) => p.id === pickupId);
    if (!pickup) return res.status(404).json({ error: 'Pickup not found.' });

    if (pickup.status === 'ACCEPTED') {
      advancePickupStatus(pickupId, 'EN_ROUTE', 'Collector started the doorstep simulation.', 'COLLECTOR');
    }
    if (pickup.status === 'EN_ROUTE') {
      advancePickupStatus(pickupId, 'ARRIVED', 'Collector arrived at customer doorstep.', 'COLLECTOR');
    }

    const updated = db.pickups.find((p) => p.id === pickupId);
    const otp = db.doorstepOtps.find((o) => o.pickupId === pickupId);
    return res.json({
      success: true,
      pickup: updated,
      doorstepOtp: otp ? { rawCode: otp.rawCodeForDev, expiresAt: otp.expiresAt } : null,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Could not mark collector as arrived.' });
  }
});

apiRouter.post('/collector/verify-otp', (req: Request, res: Response) => {
  try {
    const { pickupId, code } = req.body;
    if (!pickupId || !code) {
      return res.status(400).json({ error: 'Pickup ID and 4-digit PIN are required.' });
    }

    const pickup = db.pickups.find((p) => p.id === pickupId);
    if (!pickup) {
      return res.status(404).json({ error: 'Pickup not found.' });
    }

    // Only allow doorstep PIN verification when collector is at door or collecting
    if (!['ARRIVED', 'COLLECTING', 'COLLECTED'].includes(pickup.status)) {
      return res.status(400).json({
        error: `Cannot verify PIN while pickup is in "${pickup.status}" state. The collector must arrive at your doorstep first.`
      });
    }

    const verify = verifyDoorstepOtp(pickupId, code);
    if (!verify.success) {
      return res.status(400).json({ error: verify.message, message: verify.message });
    }

    // Advance legally through state machine to VERIFIED, then COMPLETED
    if (pickup.status === 'ARRIVED') {
      advancePickupStatus(pickupId, 'COLLECTING', 'Collector weighing recyclables at doorstep.', 'COLLECTOR');
    }
    if (pickup.status === 'COLLECTING') {
      advancePickupStatus(pickupId, 'COLLECTED', 'Recyclables weighed and loaded.', 'COLLECTOR');
    }
    advancePickupStatus(pickupId, 'VERIFIED', 'Doorstep PIN successfully confirmed by collector.', 'COLLECTOR');
    const completed = advancePickupStatus(pickupId, 'COMPLETED', 'Doorstep waste collection completed.', 'COLLECTOR');

    // Emit realtime status changed event
    realtimeBus.emitToUser(pickup.customerId, 'pickup_status_changed', {
      pickupId,
      status: 'COMPLETED',
      notes: 'Waste collection completed. Eco points credited!',
    });

    return res.json({ success: true, pickup: completed });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Verification failed' });
  }
});

apiRouter.get('/geocode/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  if (!query || query.trim().length < 2) {
    return res.json({ results: [] });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Mangaluru')}&limit=5&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SWMS-SmartWastePortal/1.0 (India Citizen Recycler)' },
    });
    if (response.ok) {
      const data = (await response.json()) as any[];
      const results = data.map((item) => ({
        placeId: item.place_id,
        name: item.name || item.display_name.split(',')[0],
        formatted: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
      return res.json({ results });
    }
  } catch (err) {
    // fallback
  }

  return res.json({ results: [] });
});

// ==========================================
// PAYMENTS
// ==========================================

apiRouter.post('/payments/create-order', async (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    const { pickupId } = req.body;
    const pickup = db.pickups.find((p) => p.id === pickupId && p.customerId === userId);
    if (!pickup) return res.status(404).json({ error: 'Pickup not found' });

    if (pickup.paymentStatus === 'SUCCESS') {
      return res.status(400).json({ error: 'Pickup is already paid.' });
    }

    const orderResult = await paymentAdapter.createOrder(pickup.totalAmountMinor, pickupId);

    // Record payment
    const payment = {
      id: `pmt_${Date.now()}`,
      pickupId: pickup.id,
      userId,
      amountMinor: pickup.totalAmountMinor,
      currency: 'INR',
      status: 'PENDING' as const,
      provider: orderResult.provider,
      providerOrderId: orderResult.orderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.payments.unshift(payment);
    dbManager.persist();

    return res.json(orderResult);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/payments/verify', (req: Request, res: Response) => {
  const { orderId, paymentId, signature, pickupId } = req.body;
  const isValid = paymentAdapter.verifySignature(orderId, paymentId, signature);

  if (!isValid) {
    const existing = db.payments.find((p) => p.providerOrderId === orderId);
    if (existing) {
      existing.status = 'FAILED';
      dbManager.persist();
    }
    return res.status(400).json({ success: false, error: 'Invalid payment signature.' });
  }

  // Mark payment SUCCESS
  const payment = db.payments.find((p) => p.providerOrderId === orderId);
  if (payment) {
    payment.status = 'SUCCESS';
    payment.providerPaymentId = paymentId;
    payment.signature = signature;
    payment.updatedAt = new Date().toISOString();
  }

  // Update pickup paymentStatus
  const pickup = db.pickups.find((p) => p.id === pickupId || p.id === payment?.pickupId);
  if (pickup) {
    pickup.paymentStatus = 'SUCCESS';
    pickup.updatedAt = new Date().toISOString();

    // Create notification
    const notif = {
      id: `notif_${Date.now()}`,
      userId: pickup.customerId,
      title: 'Payment Confirmed! 💳',
      body: `Payment of ₹${(pickup.totalAmountMinor / 100).toFixed(2)} received successfully.`,
      type: 'PAYMENT' as const,
      read: false,
      link: `/customer/pickups/${pickup.id}`,
      createdAt: new Date().toISOString(),
    };
    db.notifications.unshift(notif);
    realtimeBus.emitToUser(pickup.customerId, 'notification', notif);
  }

  dbManager.persist();
  return res.json({ success: true, paymentStatus: 'SUCCESS' });
});

apiRouter.post('/webhooks/razorpay', (req: Request, res: Response) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || '';
  const razorpaySignature = req.headers['x-razorpay-signature'] as string;

  if (webhookSecret && razorpaySignature) {
    const rawBody = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      console.warn('⚠️ Razorpay webhook signature verification failed.');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
  }

  const event = req.body?.event;
  const payload = req.body?.payload;

  console.log(`🔔 Received Razorpay webhook event: ${event}`);

  if (event === 'order.paid' || event === 'payment.captured') {
    const paymentEntity = payload?.payment?.entity;
    const orderId = paymentEntity?.order_id || payload?.order?.entity?.id;
    const paymentId = paymentEntity?.id;

    if (orderId) {
      const payment = db.payments.find((p) => p.providerOrderId === orderId);
      if (payment) {
        payment.status = 'SUCCESS';
        payment.providerPaymentId = paymentId || payment.providerPaymentId;
        payment.updatedAt = new Date().toISOString();

        const pickup = db.pickups.find((p) => p.id === payment.pickupId);
        if (pickup) {
          pickup.paymentStatus = 'SUCCESS';
          pickup.updatedAt = new Date().toISOString();

          // Push real-time event to user's client stream
          const notif = {
            id: `notif_${Date.now()}`,
            userId: pickup.customerId,
            title: 'Payment Confirmed! 💳',
            body: `Your payment of ₹${(pickup.totalAmountMinor / 100).toFixed(2)} was verified via Razorpay.`,
            type: 'PAYMENT' as const,
            read: false,
            link: `/customer/pickups/${pickup.id}`,
            createdAt: new Date().toISOString(),
          };
          db.notifications.unshift(notif);
          realtimeBus.emitToUser(pickup.customerId, 'notification', notif);
          realtimeBus.emitToUser(pickup.customerId, 'payment_confirmed', {
            pickupId: pickup.id,
            orderId,
            paymentId,
          });
        }
        dbManager.persist();
      }
    }
  }

  return res.json({ status: 'ok' });
});

apiRouter.get('/payments/history', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const payments = db.payments.filter((p) => p.userId === userId);
  return res.json(payments);
});

// ==========================================
// REWARDS & LEADERBOARD
// ==========================================

apiRouter.get('/rewards', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const stats = getUserEcoStats(userId);
  const ledger = db.rewardLedgers.filter((l) => l.userId === userId).slice(0, 30);
  const customerAchievements = db.customerAchievements.filter((ca) => ca.userId === userId);

  const enrichedAchievements = db.achievements.map((ach) => {
    const progressRecord = customerAchievements.find((ca) => ca.achievementId === ach.id);
    return {
      ...ach,
      progress: progressRecord ? progressRecord.progress : 0,
      unlockedAt: progressRecord?.unlockedAt || null,
      isUnlocked: Boolean(progressRecord?.unlockedAt),
    };
  });

  apiRouter.get('/rewards/catalog', (_req: Request, res: Response) => {
    return res.json(REWARD_CATALOG().filter((reward) => reward.active));
  });

  apiRouter.post('/rewards/redeem', (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const result = redeemReward(userId, req.body.rewardId);
      return res.status(201).json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  return res.json({
    stats,
    ledger,
    achievements: enrichedAchievements,
  });
});

apiRouter.get('/leaderboard', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const leaderboard = getLeaderboard(userId);
  return res.json(leaderboard);
});

// ==========================================
// ECO EXCHANGE
// ==========================================

apiRouter.get('/exchange/listings', (req: Request, res: Response) => {
  const material = req.query.material as string | undefined;
  const query = req.query.query as string | undefined;
  const userLat = req.query.lat ? parseFloat(req.query.lat as string) : 12.8732;
  const userLng = req.query.lng ? parseFloat(req.query.lng as string) : 74.8474;

  const listings = getExchangeListings({ material, query, userLat, userLng });
  return res.json(listings);
});

apiRouter.post('/exchange/listings', async (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    const { title, description, material, quantityKg, priceMinor, imageDataUri, lat, lng } = req.body;

    const listing = await createExchangeListing({
      sellerId: userId,
      title,
      description,
      material,
      quantityKg: parseFloat(quantityKg),
      priceMinor: parseInt(priceMinor, 10),
      imageDataUri,
      lat,
      lng,
    });

    return res.status(201).json(listing);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/exchange/listings/:id/status', (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    const { status } = req.body;
    const updated = updateListingStatus(req.params.id, userId, status);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/exchange/hubs', (req: Request, res: Response) => {
  const userLat = req.query.lat ? parseFloat(req.query.lat as string) : 12.8732;
  const userLng = req.query.lng ? parseFloat(req.query.lng as string) : 74.8474;
  const hubs = getNearbyHubs(userLat, userLng);
  return res.json(hubs);
});

// ==========================================
// NOTIFICATIONS & SSE STREAM
// ==========================================

apiRouter.get('/notifications', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const notifications = db.notifications.filter((n) => n.userId === userId);
  const unreadCount = notifications.filter((n) => !n.read).length;
  return res.json({ notifications, unreadCount });
});

apiRouter.post('/notifications/:id/read', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const notif = db.notifications.find((n) => n.id === req.params.id && n.userId === userId);
  if (notif) {
    notif.read = true;
    dbManager.persist();
  }
  return res.json({ success: true });
});

apiRouter.post('/notifications/read-all', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  db.notifications.filter((n) => n.userId === userId).forEach((n) => (n.read = true));
  dbManager.persist();
  return res.json({ success: true });
});

apiRouter.get('/notifications/stream', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const unregister = realtimeBus.registerClient(userId, res);

  req.on('close', () => {
    unregister();
  });
});

// ==========================================
// COMPLAINTS
// ==========================================

apiRouter.get('/complaints', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const complaints = db.complaints.filter((c) => c.customerId === userId);
  return res.json(complaints);
});

apiRouter.post('/complaints', (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    const { category, description, pickupId, attachments } = req.body;

    const complaint = createComplaint({
      customerId: userId,
      category,
      description,
      pickupId,
      attachments,
    });
    return res.status(201).json(complaint);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// DEV UTILITIES (non-production only)
// ==========================================

apiRouter.use('/dev', (req: Request, res: Response, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

apiRouter.post('/dev/reset-seed', (req: Request, res: Response) => {
  dbManager.resetToSeed();
  return res.json({ success: true, message: 'Database reset to initial seed data.' });
});

apiRouter.post('/dev/advance-complaint', (req: Request, res: Response) => {
  const { complaintId, status, resolution } = req.body;
  const updated = advanceComplaintStatus(complaintId, status, resolution);
  return res.json(updated);
});

apiRouter.post('/dev/reverse-geocode', async (req: Request, res: Response) => {
  const { lat, lng } = req.body;
  const result = await mapsAdapter.reverseGeocode(parseFloat(lat), parseFloat(lng));
  return res.json(result);
});

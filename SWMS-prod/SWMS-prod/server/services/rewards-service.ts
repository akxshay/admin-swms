import { db, dbManager } from '../db';
import { RewardCatalogItem, RewardLedger, CustomerAchievement, Pickup, RewardRedemption } from '../types';
import { realtimeBus } from '../realtime';
import { LEADERBOARD_USERS } from '../seed-data';
// REWARD_CATALOG export is now a live view of db.rewardCatalogItems
// (seeded from reward-catalog.ts on first boot, then admin-managed)
export function REWARD_CATALOG(): RewardCatalogItem[] { return db.rewardCatalogItems; }

export function getUserPointsBalance(userId: string): number {
  const entries = db.rewardLedgers.filter((l) => l.userId === userId);
  return entries.reduce((sum, item) => sum + item.points, 0);
}

export function getUserEcoStats(userId: string): {
  totalPoints: number;
  totalKgRecycled: number;
  totalCo2SavedKg: number;
  completedPickupsCount: number;
  streakDays: number;
  tier: 'Eco Starter' | 'Eco Warrior' | 'Eco Champion';
  nextTierPoints: number;
  progressToNextTier: number;
} {
  const points = getUserPointsBalance(userId);
  const completedPickups = db.pickups.filter((p) => p.customerId === userId && p.status === 'COMPLETED');

  let totalKgRecycled = 0;
  let totalCo2SavedKg = 0;

  for (const pickup of completedPickups) {
    if (pickup.pricingSnapshot?.items) {
      for (const item of pickup.pricingSnapshot.items) {
        const approxKg = (item.bagSize === 'SMALL' ? 3 : item.bagSize === 'MEDIUM' ? 8 : 18) * item.numberOfBags;
        const wasteType = db.wasteTypes.find((w) => w.id === item.wasteTypeId);
        const co2F = wasteType?.co2Factor || 1.0;
        totalKgRecycled += approxKg;
        totalCo2SavedKg += approxKg * co2F;
      }
    }
  }

  // Tiers:
  // Eco Starter: 0 - 199
  // Eco Warrior: 200 - 499
  // Eco Champion: 500+
  let tier: 'Eco Starter' | 'Eco Warrior' | 'Eco Champion' = 'Eco Starter';
  let nextTierPoints = 200;
  let progressToNextTier = Math.min(100, Math.round((points / 200) * 100));

  if (points >= 500) {
    tier = 'Eco Champion';
    nextTierPoints = 1000;
    progressToNextTier = 100;
  } else if (points >= 200) {
    tier = 'Eco Warrior';
    nextTierPoints = 500;
    progressToNextTier = Math.min(100, Math.round(((points - 200) / 300) * 100));
  }

  return {
    totalPoints: points,
    totalKgRecycled: parseFloat(totalKgRecycled.toFixed(1)),
    totalCo2SavedKg: parseFloat(totalCo2SavedKg.toFixed(1)),
    completedPickupsCount: completedPickups.length,
    streakDays: Math.min(completedPickups.length * 2 + 1, 14),
    tier,
    nextTierPoints,
    progressToNextTier,
  };
}

export function grantPoints(
  userId: string,
  points: number,
  type: string,
  description: string
): RewardLedger {
  const entry: RewardLedger = {
    id: `rw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    points,
    type,
    description,
    createdAt: new Date().toISOString(),
  };

  db.rewardLedgers.push(entry);
  dbManager.persist();

  // Create notification
  const notif = {
    id: `notif_${Date.now()}`,
    userId,
    title: `+${points} Eco Points Earned! 🌱`,
    body: description,
    type: 'REWARD' as const,
    read: false,
    link: '/customer/rewards',
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);
  dbManager.persist();

  // Realtime push
  realtimeBus.emitToUser(userId, 'notification', notif);
  realtimeBus.emitToUser(userId, 'points_updated', {
    newBalance: getUserPointsBalance(userId),
    added: points,
    reason: description,
  });

  return entry;
}

export function evaluateAchievements(userId: string): CustomerAchievement[] {
  const stats = getUserEcoStats(userId);
  const userAchievements = db.customerAchievements.filter((ca) => ca.userId === userId);

  for (const ach of db.achievements) {
    let currentProgress = 0;
    if (ach.metric === 'PICKUP_COUNT') currentProgress = stats.completedPickupsCount;
    if (ach.metric === 'KG_RECYCLED') currentProgress = Math.floor(stats.totalKgRecycled);
    if (ach.metric === 'CO2_SAVED') currentProgress = Math.floor(stats.totalCo2SavedKg);
    if (ach.metric === 'STREAK_DAYS') currentProgress = stats.streakDays;

    let record = userAchievements.find((ca) => ca.achievementId === ach.id);
    if (!record) {
      record = {
        id: `ca_${Date.now()}_${ach.id}`,
        userId,
        achievementId: ach.id,
        progress: currentProgress,
        unlockedAt: currentProgress >= ach.targetValue ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
      };
      db.customerAchievements.push(record);
      if (record.unlockedAt) {
        grantPoints(userId, ach.bonusPoints, 'ACHIEVEMENT_UNLOCK', `Achievement Unlocked: ${ach.name}`);
      }
    } else {
      record.progress = currentProgress;
      if (!record.unlockedAt && currentProgress >= ach.targetValue) {
        record.unlockedAt = new Date().toISOString();
        grantPoints(userId, ach.bonusPoints, 'ACHIEVEMENT_UNLOCK', `Achievement Unlocked: ${ach.name}`);
      }
    }
  }

  dbManager.persist();
  return db.customerAchievements.filter((ca) => ca.userId === userId);
}

export function getLeaderboard(userId: string) {
  const userStats = getUserEcoStats(userId);
  const userProfile = db.customerProfiles.find((p) => p.userId === userId);

  const meRow = {
    id: userId,
    name: userProfile?.name || 'You (Citizen Recycler)',
    avatarColor: userProfile?.avatarColor || '#3E8E41',
    points: userStats.totalPoints,
    kgRecycled: Math.round(userStats.totalKgRecycled),
    rank: 8,
    tier: userStats.tier,
    isCurrentUser: true,
  };

  const all = [...LEADERBOARD_USERS, meRow].sort((a, b) => b.points - a.points);
  // Reassign ranks
  const ranked = all.map((item, idx) => ({ ...item, rank: idx + 1 }));

  return {
    topThree: ranked.slice(0, 3),
    list: ranked,
    currentUserRank: ranked.find((r) => r.id === userId),
  };
}

export function processCompletedPickupRewards(pickup: Pickup): void {
  const alreadyRewarded = db.rewardLedgers.some(
    (entry) => entry.userId === pickup.customerId && entry.type === 'PICKUP_COMPLETED' && entry.description.includes(`#${pickup.id.slice(-6)}`)
  );
  if (alreadyRewarded) return;

  let totalBags = 0;
  let totalWeightEstimateKg = 0;

  for (const item of pickup.pricingSnapshot.items) {
    totalBags += item.numberOfBags;
    const kgPerBag = item.bagSize === 'SMALL' ? 3 : item.bagSize === 'MEDIUM' ? 8 : 18;
    totalWeightEstimateKg += kgPerBag * item.numberOfBags;
  }

  // Points calculation: 5 points per bag + 2 points per estimated kg
  const pointsEarned = Math.round(totalBags * 5 + totalWeightEstimateKg * 2);

  grantPoints(
    pickup.customerId,
    pointsEarned,
    'PICKUP_COMPLETED',
    `Completed doorstep pickup #${pickup.id.slice(-6)} (${totalWeightEstimateKg} kg recyclables)`
  );

  evaluateAchievements(pickup.customerId);
}

export function redeemReward(userId: string, rewardId: string): { redemption: RewardRedemption; balance: number; reward: RewardCatalogItem } {
  const reward = db.rewardCatalogItems.find((item) => item.id === rewardId && item.active);
  if (!reward) throw new Error('Reward is unavailable.');

  const balance = getUserPointsBalance(userId);
  if (balance < reward.points) throw new Error(`You need ${reward.points - balance} more points to claim this reward.`);

  const voucherCode = `ECO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const redemption: RewardRedemption = {
    id: `red_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    rewardId,
    voucherCode,
    points: reward.points,
    createdAt: new Date().toISOString(),
  };

  db.rewardLedgers.push({
    id: `rw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    points: -reward.points,
    type: 'REDEMPTION',
    description: `Redeemed ${reward.title}`,
    createdAt: redemption.createdAt,
  });
  db.rewardRedemptions.unshift(redemption);
  dbManager.persist();
  realtimeBus.emitToUser(userId, 'points_updated', {
    newBalance: getUserPointsBalance(userId),
    added: -reward.points,
    reason: `Redeemed ${reward.title}`,
  });

  return { redemption, balance: getUserPointsBalance(userId), reward };
}

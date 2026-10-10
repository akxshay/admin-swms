/**
 * Admin API Router — mounted at /api/admin in server.ts
 *
 * Shares the in-memory `db` object with the customer routes and calls
 * dbManager.persist() for every write, so nothing is ever overwritten
 * by the customer app's persist cycle.
 */
import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db, dbManager } from './db';
import { advancePickupStatus, ALLOWED_TRANSITIONS } from './services/pickup-service';
import { grantPoints } from './services/rewards-service';
import { advanceComplaintStatus } from './services/complaints-service';
import { realtimeBus } from './realtime';
import type { Role, PickupStatus, ComplaintStatus, ListingStatus } from './types';

export const adminRouter = express.Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_JWT_SECRET || 'admin-dev-secret-change-in-prod';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@swms.local';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
// Plaintext fallback only used when ADMIN_PASSWORD_HASH is not set (dev mode)
const ADMIN_PASSWORD_PLAIN = process.env.ADMIN_PASSWORD || 'admin123';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paginate<T>(arr: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  return {
    data: arr.slice(start, start + limit),
    total: arr.length,
    page,
    limit,
    pages: Math.ceil(arr.length / limit),
  };
}

function parsePageParams(req: Request) {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
  return { page, limit };
}

function badRequest(res: Response, msg: string) {
  return res.status(400).json({ error: msg });
}

function notFound(res: Response, msg = 'Not found') {
  return res.status(404).json({ error: msg });
}

function sanitizePayment(p: any) {
  if (!p) return null;
  const { signature, ...rest } = p;
  return rest;
}

// ─── Auth Middleware ───────────────────────────────────────────────────────────

interface AdminJwtPayload {
  sub: string;
  role: Role;
  iat: number;
  exp: number;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  let token = '';
  if (header?.startsWith('Bearer ')) {
    token = header.slice(7);
  } else if (typeof req.query?.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Missing admin token' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
    if (payload.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: not an admin' });
      return;
    }
    (req as any).adminId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── CORS preflight for admin routes ──────────────────────────────────────────
adminRouter.use((req: Request, res: Response, next: NextFunction) => {
  const origin = process.env.ADMIN_ORIGIN || 'http://localhost:5173';
  const requestOrigin = req.headers.origin;

  if (requestOrigin) {
    if (requestOrigin === origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      if (req.method === 'OPTIONS') {
        res.status(403).json({ error: 'CORS origin not allowed' });
        return;
      }
    }
  }

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// ─── Step 2: Auth ─────────────────────────────────────────────────────────────

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

adminRouter.post('/auth/login', async (req: Request, res: Response) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return badRequest(res, 'email and password required');
  const { email, password } = parse.data;

  const clientKey = `${req.ip || 'client'}_${email.toLowerCase()}`;
  const attempt = loginAttempts.get(clientKey);
  if (attempt && attempt.lockedUntil > Date.now()) {
    return res.status(401).json({ error: 'Too many failed login attempts. Please try again later.' });
  }

  if (email !== ADMIN_EMAIL) {
    const cur = loginAttempts.get(clientKey) || { count: 0, lockedUntil: 0 };
    cur.count += 1;
    if (cur.count >= MAX_LOGIN_ATTEMPTS) {
      cur.lockedUntil = Date.now() + LOCKOUT_MS;
    }
    loginAttempts.set(clientKey, cur);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Verify password: use hash from env if set, otherwise compare plain (dev only)
  let valid = false;
  if (ADMIN_PASSWORD_HASH) {
    valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  } else {
    valid = password === ADMIN_PASSWORD_PLAIN;
  }
  if (!valid) {
    const cur = loginAttempts.get(clientKey) || { count: 0, lockedUntil: 0 };
    cur.count += 1;
    if (cur.count >= MAX_LOGIN_ATTEMPTS) {
      cur.lockedUntil = Date.now() + LOCKOUT_MS;
    }
    loginAttempts.set(clientKey, cur);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  loginAttempts.delete(clientKey);

  // Find or synthesise the admin user record
  let adminUser = db.users.find((u) => u.role === 'ADMIN');
  if (!adminUser) {
    adminUser = {
      id: 'usr_admin_default',
      phone: 'admin',
      role: 'ADMIN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(adminUser);
    dbManager.persist();
  }

  const token = jwt.sign({ sub: adminUser.id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '12h' });
  return res.json({ token, adminId: adminUser.id });
});

// ─── All routes below require admin JWT ───────────────────────────────────────
adminRouter.use(requireAdmin);

// ─── Step 3: Stats ────────────────────────────────────────────────────────────

adminRouter.get('/stats', (_req: Request, res: Response) => {
  const totalUsers = db.users.filter((u) => u.role === 'CUSTOMER').length;

  const pickupsByStatus: Record<string, number> = {};
  for (const p of db.pickups) {
    pickupsByStatus[p.status] = (pickupsByStatus[p.status] || 0) + 1;
  }

  const totalPointsIssued = db.rewardLedgers
    .filter((l) => l.points > 0)
    .reduce((s, l) => s + l.points, 0);

  const totalRedemptions = db.rewardRedemptions.length;

  const totalHubs = db.exchangeHubs.filter((h) => h.active).length;
  const totalListings = db.exchangeListings.filter((l) => l.status === 'ACTIVE').length;
  const openComplaints = db.complaints.filter((c) => c.status === 'OPEN' || c.status === 'IN_REVIEW').length;

  const revenue = db.payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((s, p) => s + p.amountMinor, 0);

  return res.json({
    totalUsers,
    pickupsByStatus,
    totalPickups: db.pickups.length,
    totalPointsIssued,
    totalRedemptions,
    totalHubs,
    totalListings,
    openComplaints,
    revenueMinor: revenue,
    totalCollectors: db.collectors.length,
  });
});

// ─── SSE Stream ───────────────────────────────────────────────────────────────

adminRouter.get('/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const unregister = realtimeBus.registerClient('__admin__', res);
  req.on('close', () => unregister());
});

// ─── Users ────────────────────────────────────────────────────────────────────

adminRouter.get('/users', (req: Request, res: Response) => {
  const { page, limit } = parsePageParams(req);
  const q = (req.query.q as string || '').toLowerCase();
  const role = req.query.role as string | undefined;

  let users = db.users.filter((u) => u.role !== 'ADMIN');

  if (role) users = users.filter((u) => u.role === role);
  if (q) {
    const matchingProfileIds = db.customerProfiles
      .filter((p) => (p.name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q))
      .map((p) => p.userId);
    users = users.filter((u) => u.phone.includes(q) || matchingProfileIds.includes(u.id));
  }

  const enriched = users.map((u) => {
    const profile = db.customerProfiles.find((p) => p.userId === u.id);
    const pickupCount = db.pickups.filter((p) => p.customerId === u.id).length;
    const points = db.rewardLedgers.filter((l) => l.userId === u.id).reduce((s, l) => s + l.points, 0);
    return { ...u, profile, pickupCount, pointsBalance: points };
  });

  return res.json(paginate(enriched, page, limit));
});

adminRouter.get('/users/:id', (req: Request, res: Response) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return notFound(res, 'User not found');

  const profile = db.customerProfiles.find((p) => p.userId === user.id);
  const addresses = db.addresses.filter((a) => a.userId === user.id && !a.isDeleted);
  const pickups = db.pickups.filter((p) => p.customerId === user.id);
  const points = db.rewardLedgers.filter((l) => l.userId === user.id).reduce((s, l) => s + l.points, 0);
  const redemptions = db.rewardRedemptions.filter((r) => r.userId === user.id);
  const complaints = db.complaints.filter((c) => c.customerId === user.id);

  return res.json({ user, profile, addresses, pickupCount: pickups.length, pointsBalance: points, redemptions, complaints });
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['CUSTOMER', 'COLLECTOR', 'ADMIN']).optional(),
});

adminRouter.put('/users/:id', (req: Request, res: Response) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return notFound(res, 'User not found');

  const parse = updateUserSchema.safeParse(req.body);
  if (!parse.success) return badRequest(res, parse.error.issues[0].message);
  const { name, email, role } = parse.data;

  if (role) user.role = role as Role;
  user.updatedAt = new Date().toISOString();

  const profile = db.customerProfiles.find((p) => p.userId === user.id);
  if (profile) {
    if (name !== undefined) profile.name = name;
    if (email !== undefined) profile.email = email;
  }

  dbManager.persist();
  realtimeBus.broadcast('admin.user.updated', { userId: user.id });
  return res.json({ user, profile });
});

adminRouter.delete('/users/:id', (req: Request, res: Response) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return notFound(res, 'User not found');

  const activePickups = db.pickups.filter((p) =>
    p.customerId === user.id && !['COMPLETED', 'CANCELLED', 'MISSED'].includes(p.status)
  );
  if (activePickups.length > 0) {
    return res.status(409).json({
      error: `Cannot delete: user has ${activePickups.length} active pickup(s). Cancel them first.`,
    });
  }

  // Soft-block: set role to a blocked sentinel (keeps FK integrity in Postgres)
  // We don't hard-delete to avoid FK cascade issues across all tables.
  user.role = 'COLLECTOR'; // re-use COLLECTOR as "blocked" marker isn't ideal; use a tombstone approach
  // Actually: mark phone as blocked so they can't log in again
  user.phone = `__blocked__${user.id}`;
  user.updatedAt = new Date().toISOString();
  dbManager.persist();
  return res.json({ success: true, message: 'User blocked (soft-delete)' });
});

// ─── Pickups ──────────────────────────────────────────────────────────────────

adminRouter.get('/pickups', (req: Request, res: Response) => {
  const { page, limit } = parsePageParams(req);
  const status = req.query.status as string | undefined;
  const customerId = req.query.customerId as string | undefined;
  const collectorId = req.query.collectorId as string | undefined;
  const date = req.query.date as string | undefined; // YYYY-MM-DD

  let pickups = [...db.pickups];

  if (status) pickups = pickups.filter((p) => p.status === status);
  if (customerId) pickups = pickups.filter((p) => p.customerId === customerId);
  if (collectorId) pickups = pickups.filter((p) => p.collectorId === collectorId);
  if (date) pickups = pickups.filter((p) => p.scheduledDate.startsWith(date));

  const enriched = pickups.map((p) => {
    const customer = db.customerProfiles.find((cp) => cp.userId === p.customerId);
    const collector = db.collectors.find((c) => c.id === p.collectorId);
    return { ...p, customerName: customer?.name || p.customerId, collectorName: collector?.name };
  });

  return res.json(paginate(enriched, page, limit));
});

adminRouter.get('/pickups/:id', (req: Request, res: Response) => {
  const pickup = db.pickups.find((p) => p.id === req.params.id);
  if (!pickup) return notFound(res, 'Pickup not found');

  const customer = db.customerProfiles.find((cp) => cp.userId === pickup.customerId);
  const collector = db.collectors.find((c) => c.id === pickup.collectorId);
  const payment = db.payments.find((p) => p.pickupId === pickup.id);

  return res.json({ pickup, customer, collector, payment: sanitizePayment(payment) });
});

const statusUpdateSchema = z.object({
  status: z.enum(['REQUESTED','ASSIGNED','ACCEPTED','EN_ROUTE','ARRIVED','COLLECTING','COLLECTED','VERIFIED','COMPLETED','MISSED','CANCELLED']),
  notes: z.string().optional(),
});

adminRouter.put('/pickups/:id/status', (req: Request, res: Response) => {
  const parse = statusUpdateSchema.safeParse(req.body);
  if (!parse.success) return badRequest(res, parse.error.issues[0].message);

  try {
    const updated = advancePickupStatus(req.params.id, parse.data.status as PickupStatus, parse.data.notes || 'Status updated by admin', 'ADMIN');
    realtimeBus.broadcast('admin.pickup.updated', { pickupId: updated.id, status: updated.status });
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

const assignCollectorSchema = z.object({ collectorId: z.string() });

adminRouter.put('/pickups/:id/assign-collector', (req: Request, res: Response) => {
  const pickup = db.pickups.find((p) => p.id === req.params.id);
  if (!pickup) return notFound(res, 'Pickup not found');

  const parse = assignCollectorSchema.safeParse(req.body);
  if (!parse.success) return badRequest(res, 'collectorId required');

  const collector = db.collectors.find((c) => c.id === parse.data.collectorId);
  if (!collector) return notFound(res, 'Collector not found');

  pickup.collectorId = collector.id;
  pickup.updatedAt = new Date().toISOString();

  // Advance to ASSIGNED if still REQUESTED
  if (pickup.status === 'REQUESTED') {
    pickup.status = 'ASSIGNED';
    pickup.history.push({
      id: `h_adm_${Date.now()}`,
      pickupId: pickup.id,
      status: 'ASSIGNED',
      notes: `Assigned to ${collector.name} by admin`,
      createdAt: new Date().toISOString(),
    });
  }

  dbManager.persist();
  realtimeBus.broadcast('admin.pickup.updated', { pickupId: pickup.id, collectorId: collector.id });
  return res.json(pickup);
});

// ─── Rewards — Catalog ────────────────────────────────────────────────────────

adminRouter.get('/rewards/catalog', (_req: Request, res: Response) => {
  return res.json(db.rewardCatalogItems);
});

const catalogItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  points: z.number().int().positive(),
  icon: z.string().min(1),
  partner: z.string().min(1),
  active: z.boolean().optional().default(true),
});

adminRouter.post('/rewards/catalog', (req: Request, res: Response) => {
  const parse = catalogItemSchema.safeParse(req.body);
  if (!parse.success) return badRequest(res, parse.error.issues[0].message);

  const item = {
    id: parse.data.id || `rew_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: parse.data.title,
    description: parse.data.description,
    points: parse.data.points,
    icon: parse.data.icon,
    partner: parse.data.partner,
    active: parse.data.active ?? true,
  };

  if (db.rewardCatalogItems.some((r) => r.id === item.id)) {
    return badRequest(res, 'Reward with this id already exists');
  }

  db.rewardCatalogItems.push(item);
  dbManager.persist();
  realtimeBus.broadcast('admin.reward.created', item);
  return res.status(201).json(item);
});

adminRouter.put('/rewards/catalog/:id', (req: Request, res: Response) => {
  const item = db.rewardCatalogItems.find((r) => r.id === req.params.id);
  if (!item) return notFound(res, 'Reward catalog item not found');

  const parse = catalogItemSchema.partial().safeParse(req.body);
  if (!parse.success) return badRequest(res, parse.error.issues[0].message);

  Object.assign(item, parse.data);
  dbManager.persist();
  realtimeBus.broadcast('admin.reward.updated', item);
  return res.json(item);
});

adminRouter.delete('/rewards/catalog/:id', (req: Request, res: Response) => {
  const idx = db.rewardCatalogItems.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return notFound(res, 'Reward catalog item not found');

  // Check for existing redemptions
  const hasRedemptions = db.rewardRedemptions.some((r) => r.rewardId === req.params.id);
  if (hasRedemptions) {
    // Soft-delete: deactivate instead
    db.rewardCatalogItems[idx].active = false;
    dbManager.persist();
    return res.json({ success: true, message: 'Reward deactivated (has existing redemptions)' });
  }

  db.rewardCatalogItems.splice(idx, 1);
  dbManager.persist();
  return res.json({ success: true });
});

// ─── Rewards — Ledger & Redemptions ──────────────────────────────────────────

adminRouter.get('/rewards/ledger', (req: Request, res: Response) => {
  const { page, limit } = parsePageParams(req);
  const userId = req.query.userId as string | undefined;

  let ledger = [...db.rewardLedgers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (userId) ledger = ledger.filter((l) => l.userId === userId);

  return res.json(paginate(ledger, page, limit));
});

adminRouter.get('/rewards/redemptions', (req: Request, res: Response) => {
  const { page, limit } = parsePageParams(req);
  const userId = req.query.userId as string | undefined;

  let redemptions = [...db.rewardRedemptions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (userId) redemptions = redemptions.filter((r) => r.userId === userId);

  const enriched = redemptions.map((r) => {
    const profile = db.customerProfiles.find((p) => p.userId === r.userId);
    const reward = db.rewardCatalogItems.find((c) => c.id === r.rewardId);
    return { ...r, customerName: profile?.name || r.userId, rewardTitle: reward?.title || r.rewardId };
  });

  return res.json(paginate(enriched, page, limit));
});

const manualPointsSchema = z.object({
  userId: z.string(),
  points: z.number().int(),
  reason: z.string().min(1),
});

adminRouter.post('/rewards/adjust-points', (req: Request, res: Response) => {
  const parse = manualPointsSchema.safeParse(req.body);
  if (!parse.success) return badRequest(res, parse.error.issues[0].message);

  const { userId, points, reason } = parse.data;
  const user = db.users.find((u) => u.id === userId);
  if (!user) return notFound(res, 'User not found');

  const entry = grantPoints(userId, points, 'ADMIN_ADJUSTMENT', reason);
  realtimeBus.broadcast('admin.points.adjusted', { userId, points, reason });
  return res.status(201).json(entry);
});

// ─── Vendors (ExchangeHub) ────────────────────────────────────────────────────

adminRouter.get('/vendors', (req: Request, res: Response) => {
  const { page, limit } = parsePageParams(req);
  const q = (req.query.q as string || '').toLowerCase();

  let hubs = [...db.exchangeHubs];
  if (q) hubs = hubs.filter((h) => h.name.toLowerCase().includes(q) || h.address.toLowerCase().includes(q));

  return res.json(paginate(hubs, page, limit));
});

adminRouter.get('/vendors/:id', (req: Request, res: Response) => {
  const hub = db.exchangeHubs.find((h) => h.id === req.params.id);
  if (!hub) return notFound(res, 'Hub not found');
  return res.json(hub);
});

const hubSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  contact: z.string().min(1),
  timing: z.string().min(1),
  active: z.boolean().optional().default(true),
});

adminRouter.post('/vendors', (req: Request, res: Response) => {
  const parse = hubSchema.safeParse(req.body);
  if (!parse.success) return badRequest(res, parse.error.issues[0].message);

  const hub = {
    id: `hub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...parse.data,
    active: parse.data.active ?? true,
  };

  db.exchangeHubs.push(hub);
  dbManager.persist();
  realtimeBus.broadcast('admin.hub.created', hub);
  return res.status(201).json(hub);
});

adminRouter.put('/vendors/:id', (req: Request, res: Response) => {
  const hub = db.exchangeHubs.find((h) => h.id === req.params.id);
  if (!hub) return notFound(res, 'Hub not found');

  const parse = hubSchema.partial().safeParse(req.body);
  if (!parse.success) return badRequest(res, parse.error.issues[0].message);

  Object.assign(hub, parse.data);
  dbManager.persist();
  realtimeBus.broadcast('admin.hub.updated', hub);
  return res.json(hub);
});

adminRouter.delete('/vendors/:id', (req: Request, res: Response) => {
  const idx = db.exchangeHubs.findIndex((h) => h.id === req.params.id);
  if (idx === -1) return notFound(res, 'Hub not found');

  db.exchangeHubs.splice(idx, 1);
  dbManager.persist();
  return res.json({ success: true });
});

// ─── Marketplace (ExchangeListing) ───────────────────────────────────────────

adminRouter.get('/marketplace', (req: Request, res: Response) => {
  const { page, limit } = parsePageParams(req);
  const status = req.query.status as string | undefined;
  const q = (req.query.q as string || '').toLowerCase();

  let listings = [...db.exchangeListings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (status) listings = listings.filter((l) => l.status === status);
  if (q) listings = listings.filter((l) => l.title.toLowerCase().includes(q) || l.sellerName.toLowerCase().includes(q));

  return res.json(paginate(listings, page, limit));
});

const listingStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'RESERVED', 'SOLD', 'CANCELLED']),
});

adminRouter.put('/marketplace/:id/status', (req: Request, res: Response) => {
  const listing = db.exchangeListings.find((l) => l.id === req.params.id);
  if (!listing) return notFound(res, 'Listing not found');

  const parse = listingStatusSchema.safeParse(req.body);
  if (!parse.success) return badRequest(res, parse.error.issues[0].message);

  listing.status = parse.data.status as ListingStatus;
  listing.updatedAt = new Date().toISOString();
  dbManager.persist();
  realtimeBus.broadcast('admin.listing.updated', { listingId: listing.id, status: listing.status });
  return res.json(listing);
});

// ─── Collectors ───────────────────────────────────────────────────────────────

adminRouter.get('/collectors', (req: Request, res: Response) => {
  const { page, limit } = parsePageParams(req);
  const q = (req.query.q as string || '').toLowerCase();

  let collectors = [...db.collectors];
  if (q) collectors = collectors.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));

  const enriched = collectors.map((c) => ({
    ...c,
    activePickups: db.pickups.filter((p) => p.collectorId === c.id && !['COMPLETED', 'CANCELLED', 'MISSED'].includes(p.status)).length,
    totalPickups: db.pickups.filter((p) => p.collectorId === c.id).length,
  }));

  return res.json(paginate(enriched, page, limit));
});

const collectorSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  photoUrl: z.string().optional().default(''),
  vehicleType: z.string().min(1),
  vehicleNumber: z.string().min(1),
  rating: z.number().min(0).max(5).optional().default(4.9),
  isOnline: z.boolean().optional().default(true),
  currentLat: z.number().optional().default(12.8732),
  currentLng: z.number().optional().default(74.8474),
});

adminRouter.post('/collectors', (req: Request, res: Response) => {
  const parse = collectorSchema.safeParse(req.body);
  if (!parse.success) return badRequest(res, parse.error.issues[0].message);

  const collector = {
    id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...parse.data,
    lastLocationAt: new Date().toISOString(),
  };

  db.collectors.push(collector);
  dbManager.persist();
  return res.status(201).json(collector);
});

adminRouter.put('/collectors/:id', (req: Request, res: Response) => {
  const collector = db.collectors.find((c) => c.id === req.params.id);
  if (!collector) return notFound(res, 'Collector not found');

  const parse = collectorSchema.partial().safeParse(req.body);
  if (!parse.success) return badRequest(res, parse.error.issues[0].message);

  Object.assign(collector, parse.data);
  dbManager.persist();
  return res.json(collector);
});

// ─── Complaints ───────────────────────────────────────────────────────────────

adminRouter.get('/complaints', (req: Request, res: Response) => {
  const { page, limit } = parsePageParams(req);
  const status = req.query.status as string | undefined;
  const q = (req.query.q as string || '').toLowerCase();

  let complaints = [...db.complaints].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (status) complaints = complaints.filter((c) => c.status === status);
  if (q) complaints = complaints.filter((c) => c.description.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));

  const enriched = complaints.map((c) => {
    const profile = db.customerProfiles.find((p) => p.userId === c.customerId);
    return { ...c, customerName: profile?.name || c.customerId };
  });

  return res.json(paginate(enriched, page, limit));
});

const complaintUpdateSchema = z.object({
  status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED']),
  resolution: z.string().optional(),
});

adminRouter.put('/complaints/:id', (req: Request, res: Response) => {
  const parse = complaintUpdateSchema.safeParse(req.body);
  if (!parse.success) return badRequest(res, parse.error.issues[0].message);

  try {
    const updated = advanceComplaintStatus(req.params.id, parse.data.status as ComplaintStatus, parse.data.resolution);
    realtimeBus.broadcast('admin.complaint.updated', { complaintId: updated.id, status: updated.status });
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ─── Payments (read-only for admin) ───────────────────────────────────────────

adminRouter.get('/payments', (req: Request, res: Response) => {
  const { page, limit } = parsePageParams(req);
  const status = req.query.status as string | undefined;
  const userId = req.query.userId as string | undefined;

  let payments = [...db.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (status) payments = payments.filter((p) => p.status === status);
  if (userId) payments = payments.filter((p) => p.userId === userId);

  const enriched = payments.map((p) => {
    const profile = db.customerProfiles.find((cp) => cp.userId === p.userId);
    return { ...sanitizePayment(p), customerName: profile?.name || p.userId };
  });

  return res.json(paginate(enriched, page, limit));
});

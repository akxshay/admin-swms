import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../server';
import { db, dbManager } from '../../server/db';
import { hydrateFromPostgres, persistRelationalState } from '../../server/postgres-persistence';
import jwt from 'jsonwebtoken';

const TEST_DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/swms_test?schema=public';
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-dev-secret-change-in-prod';

describe('GROUP 1: Data Integrity & Sync', () => {
  let app: any;
  let prisma: PrismaClient;
  let adminToken: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
    app = createApp();
    adminToken = jwt.sign({ sub: 'usr_admin_default', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    dbManager.resetToSeed();
    await dbManager.persistAsync();
  });

  // D1. Admin edits a record, then customer app saves something -> admin edit must still be there
  it('D1: Admin edits a record, then customer app saves something -> admin edit persists', async () => {
    const customer = db.users.find((u) => u.role === 'CUSTOMER')!;
    expect(customer).toBeDefined();

    // 1. Admin edits user profile name
    const adminRes = await request(app)
      .put(`/api/admin/users/${customer.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Admin Edited Name' });

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.profile.name).toBe('Admin Edited Name');

    // 2. Customer app creates an address
    const custRes = await request(app)
      .post('/api/customer/addresses')
      .set('x-user-id', customer.id)
      .send({
        label: 'New Beach House',
        line1: 'Panambur Beach Road',
        formatted: 'Mangaluru, Karnataka',
        lat: 12.95,
        lng: 74.80,
      });

    expect(custRes.status).toBe(200);

    // 3. Verify admin edit was NOT wiped or reverted
    const checkUser = db.customerProfiles.find((p) => p.userId === customer.id);
    expect(checkUser?.name).toBe('Admin Edited Name');

    // 4. Verify customer address also exists
    const hasNewAddr = db.addresses.some((a) => a.label === 'New Beach House' && a.userId === customer.id);
    expect(hasNewAddr).toBe(true);
  });

  // D2. Customer creates a record, then admin edits a different record -> both exist
  it('D2: Customer creates a record, then admin edits a different record -> both exist', async () => {
    const customer = db.users.find((u) => u.role === 'CUSTOMER')!;

    // 1. Customer schedules a pickup
    const custRes = await request(app)
      .post('/api/pickups')
      .set('x-user-id', customer.id)
      .send({
        addressId: 'addr_home',
        scheduledDate: '2026-10-15',
        scheduledSlot: '10:00 - 12:00',
        paymentMode: 'PAY_LATER',
        items: [
          { wasteTypeId: 'wt_plastic', bagSize: 'MEDIUM', numberOfBags: 2 },
        ],
      });

    expect(custRes.status).toBe(201);
    const createdPickupId = custRes.body.id;

    // 2. Admin creates a new reward catalog item
    const adminRes = await request(app)
      .post('/api/admin/rewards/catalog')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        id: 'rew_special_eco_bottle',
        title: 'Insulated Eco Bottle',
        description: 'Stainless steel 750ml reusable flask',
        points: 400,
        icon: '🍶',
        partner: 'EcoGear',
        active: true,
      });

    expect(adminRes.status).toBe(201);

    // 3. Both changes exist in state
    expect(db.pickups.some((p) => p.id === createdPickupId)).toBe(true);
    expect(db.rewardCatalogItems.some((r) => r.id === 'rew_special_eco_bottle')).toBe(true);
  });

  // D3. Restart the server after admin and customer writes -> all data persists in Postgres
  it('D3: Restart simulation preserves all data verified directly with Postgres SELECT count(*)', async () => {
    const customer = db.users.find((u) => u.role === 'CUSTOMER')!;

    // Admin edits user
    await request(app)
      .put(`/api/admin/users/${customer.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Persisted User Name' });

    // Customer creates complaint
    await request(app)
      .post('/api/complaints')
      .set('x-user-id', customer.id)
      .send({
        category: 'App Feedback',
        description: 'Great app, seamless experience!',
      });

    // Admin adds a hub
    await request(app)
      .post('/api/admin/vendors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Persisted Hub Central',
        description: 'Drop off recyclables here',
        address: 'MG Road, Mangaluru',
        lat: 12.87,
        lng: 74.84,
        contact: '+919999988888',
        timing: '09:00 - 18:00',
      });

    // Ensure database write queue completes
    await dbManager.persistAsync();

    // Verify row counts directly from Postgres
    const [userCount, hubCount, complaintCount] = await Promise.all([
      prisma.user.count(),
      prisma.exchangeHub.count(),
      prisma.complaint.count(),
    ]);

    expect(userCount).toBeGreaterThanOrEqual(db.users.length);
    expect(hubCount).toBe(db.exchangeHubs.length);
    expect(complaintCount).toBe(db.complaints.length);

    // Simulate server reboot by hydrating directly from Postgres into a fresh object
    const hydrated = await hydrateFromPostgres(prisma);
    const hydratedProfile = hydrated.customerProfiles.find((p) => p.userId === customer.id);
    expect(hydratedProfile?.name).toBe('Persisted User Name');

    const hydratedHub = hydrated.exchangeHubs.find((h) => h.name === 'Persisted Hub Central');
    expect(hydratedHub).toBeDefined();

    const hydratedComplaint = hydrated.complaints.find((c) => c.description === 'Great app, seamless experience!');
    expect(hydratedComplaint).toBeDefined();
  });

  // D4. Fresh database, first boot -> reward catalog seeded with 4 items, admin user exists, no duplicates on second boot
  it('D4: Fresh database first boot seeds 4 items & admin user, no duplicates on second boot', async () => {
    // Clear test Postgres database completely using persistRelationalState
    await persistRelationalState(prisma, {
      users: [],
      customerProfiles: [],
      addresses: [],
      wasteTypes: [],
      pricingRules: [],
      pickups: [],
      collectors: [],
      doorstepOtps: [],
      payments: [],
      rewardLedgers: [],
      rewardCatalogItems: [],
      rewardRedemptions: [],
      achievements: [],
      customerAchievements: [],
      exchangeHubs: [],
      exchangeListings: [],
      notifications: [],
      complaints: [],
      otpRecords: [],
    });

    // First boot: reset and persist to Postgres
    dbManager.resetToSeed();
    await dbManager.persistAsync();

    // Verify initial seed: 4 catalog items and 1 admin user
    const catalogCountFirst = await prisma.rewardCatalogItem.count();
    const adminCountFirst = await prisma.user.count({ where: { role: 'ADMIN' } });
    expect(catalogCountFirst).toBe(4);
    expect(adminCountFirst).toBe(1);

    // Second boot: hydrate from Postgres as server boot would do
    const secondBootData = await hydrateFromPostgres(prisma);
    const adminUsersSecond = secondBootData.users.filter((u) => u.role === 'ADMIN');
    expect(adminUsersSecond.length).toBe(1);
    expect(secondBootData.rewardCatalogItems.length).toBe(4);

    // Persist again from the second boot state and verify no duplicates created in Postgres
    await dbManager.persistAsync();
    const catalogCountSecond = await prisma.rewardCatalogItem.count();
    const adminCountSecond = await prisma.user.count({ where: { role: 'ADMIN' } });
    expect(catalogCountSecond).toBe(4);
    expect(adminCountSecond).toBe(1);
  });

  // D5. Concurrent writes (admin status change + customer pickup booking at same time) -> no lost writes, no 500s
  it('D5: Concurrent writes (admin status update + customer pickup creation) succeed without 500s or lost writes', async () => {
    const customer = db.users.find((u) => u.role === 'CUSTOMER')!;
    const activePickup = db.pickups.find((p) => p.status === 'EN_ROUTE')!;
    expect(activePickup).toBeDefined();

    const [adminRes, custRes] = await Promise.all([
      request(app)
        .put(`/api/admin/pickups/${activePickup.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ARRIVED', notes: 'Collector arrived on site' }),
      request(app)
        .post('/api/pickups')
        .set('x-user-id', customer.id)
        .send({
          addressId: 'addr_home',
          scheduledDate: '2026-10-20',
          scheduledSlot: '14:00 - 16:00',
          paymentMode: 'PAY_LATER',
          items: [
            { wasteTypeId: 'wt_organic', bagSize: 'SMALL', numberOfBags: 1 },
          ],
        }),
    ]);

    expect(adminRes.status).toBe(200);
    expect(custRes.status).toBe(201);

    // Wait for writeQueue to settle
    await dbManager.persistAsync();

    // Verify both writes exist in database
    const pgPickup1 = await prisma.pickup.findUnique({ where: { id: activePickup.id } });
    expect(pgPickup1?.status).toBe('ARRIVED');

    const newPickupId = custRes.body.id;
    const pgPickup2 = await prisma.pickup.findUnique({ where: { id: newPickupId } });
    expect(pgPickup2).toBeDefined();
    expect(pgPickup2?.customerId).toBe(customer.id);
  });

  // D6. Row counts before and after each admin action -> only intended rows changed
  it('D6: Row counts before and after each admin action -> only intended rows changed', async () => {
    await dbManager.persistAsync();

    const initialCatalogCount = await prisma.rewardCatalogItem.count();
    const initialUserCount = await prisma.user.count();
    const initialHubCount = await prisma.exchangeHub.count();

    // Admin creates a reward
    const res = await request(app)
      .post('/api/admin/rewards/catalog')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        id: 'rew_counted_item',
        title: 'Canvas Tote Bag',
        description: 'Eco friendly cotton bag',
        points: 150,
        icon: '🛍️',
        partner: 'GreenShop',
        active: true,
      });

    expect(res.status).toBe(201);
    await dbManager.persistAsync();

    const afterCatalogCount = await prisma.rewardCatalogItem.count();
    const afterUserCount = await prisma.user.count();
    const afterHubCount = await prisma.exchangeHub.count();

    expect(afterCatalogCount).toBe(initialCatalogCount + 1);
    expect(afterUserCount).toBe(initialUserCount);
    expect(afterHubCount).toBe(initialHubCount);
  });
});

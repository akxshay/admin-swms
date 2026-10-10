import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server';
import { db, dbManager } from '../../server/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-dev-secret-change-in-prod';

describe('GROUP 2: Auth and Security', () => {
  let app: any;
  let validAdminToken: string;
  let customerToken: string;

  beforeAll(() => {
    app = createApp();
    validAdminToken = jwt.sign({ sub: 'usr_admin_default', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
    customerToken = jwt.sign({ sub: 'usr_demo_customer', role: 'CUSTOMER' }, JWT_SECRET, { expiresIn: '1h' });
  });

  beforeEach(() => {
    dbManager.resetToSeed();
  });

  // S1. Any /api/admin/* route with no token -> 401
  it('S1: Any /api/admin/* route without token returns 401', async () => {
    const endpoints = [
      { method: 'get', url: '/api/admin/users' },
      { method: 'get', url: '/api/admin/pickups' },
      { method: 'get', url: '/api/admin/stats' },
      { method: 'get', url: '/api/admin/rewards/catalog' },
      { method: 'get', url: '/api/admin/vendors' },
      { method: 'get', url: '/api/admin/marketplace' },
      { method: 'get', url: '/api/admin/collectors' },
      { method: 'get', url: '/api/admin/complaints' },
      { method: 'get', url: '/api/admin/payments' },
      { method: 'post', url: '/api/admin/rewards/catalog' },
    ];

    for (const ep of endpoints) {
      const res = await (request(app) as any)[ep.method](ep.url);
      expect(res.status, `Expected 401 for ${ep.method.toUpperCase()} ${ep.url}`).toBe(401);
      expect(res.body.error).toBeDefined();
    }
  });

  // Also confirm the SSE stream endpoint requires auth
  it('S1b: SSE stream endpoint /api/admin/stream requires auth', async () => {
    const resNoAuth = await request(app).get('/api/admin/stream');
    expect(resNoAuth.status).toBe(401);

    const resValidAuth = await request(app)
      .get(`/api/admin/stream?token=${validAdminToken}`)
      .timeout({ deadline: 500, response: 200 })
      .catch((err) => err.response);

    // If connected or headers flushed, status is 200 with text/event-stream
    if (resValidAuth) {
      expect([200, undefined]).toContain(resValidAuth.status);
    }
  });

  // S2. Customer token or role CUSTOMER -> 403
  it('S2: Customer token with role CUSTOMER returns 403 on admin routes', async () => {
    const endpoints = [
      '/api/admin/users',
      '/api/admin/pickups',
      '/api/admin/stats',
      '/api/admin/vendors',
      '/api/admin/complaints',
    ];

    for (const url of endpoints) {
      const res = await request(app)
        .get(url)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status, `Expected 403 for GET ${url} with customer token`).toBe(403);
      expect(res.body.error).toMatch(/forbidden|not an admin/i);
    }
  });

  // S3. Expired, tampered or wrong-secret token -> 401
  it('S3: Expired, tampered, or wrong-secret token returns 401', async () => {
    // 1. Expired token
    const expiredToken = jwt.sign(
      { sub: 'usr_admin_default', role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '-10s' }
    );
    const expRes = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(expRes.status).toBe(401);

    // 2. Tampered token
    const tamperedToken = validAdminToken.slice(0, -6) + 'abcdef';
    const tampRes = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${tamperedToken}`);
    expect(tampRes.status).toBe(401);

    // 3. Wrong secret token
    const wrongSecretToken = jwt.sign(
      { sub: 'usr_admin_default', role: 'ADMIN' },
      'completely-different-wrong-secret',
      { expiresIn: '1h' }
    );
    const wrongRes = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${wrongSecretToken}`);
    expect(wrongRes.status).toBe(401);
  });

  // S4. Wrong password and repeated attempts -> 401 with a generic message; add rate limiting or lockout
  it('S4: Wrong password returns 401 with generic message, and repeated attempts trigger lockout', async () => {
    const testEmail = `admin_test_lockout_${Date.now()}@swms.local`;

    // 1. Single wrong password attempt
    const res1 = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: testEmail, password: 'wrongpassword' });

    expect(res1.status).toBe(401);
    expect(res1.body.error).toBe('Invalid credentials');

    // 2. Send 5 failed attempts in succession to hit rate limiting threshold
    for (let i = 0; i < 4; i++) {
      await request(app)
        .post('/api/admin/auth/login')
        .send({ email: testEmail, password: 'wrongpassword' });
    }

    // 3. The next attempt should be locked out
    const lockoutRes = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: testEmail, password: 'wrongpassword' });

    expect(lockoutRes.status).toBe(401);
    expect(lockoutRes.body.error).toMatch(/too many failed login attempts/i);
  });

  // S5. SQL/script injection strings in search, filter and body fields -> no error leak, no data exposure
  it('S5: SQL and script injection strings do not crash, leak errors, or expose unauthorized data', async () => {
    const injectionStrings = [
      "' OR '1'='1",
      "' OR 1=1 --",
      "<script>alert(1)</script>",
      "'; DROP TABLE users; --",
      "../../etc/passwd",
      "{{ 7 * 7 }}",
    ];

    for (const payload of injectionStrings) {
      // Test search query param
      const searchRes = await request(app)
        .get(`/api/admin/users?q=${encodeURIComponent(payload)}`)
        .set('Authorization', `Bearer ${validAdminToken}`);
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data).toBeDefined();

      // Test filter param
      const filterRes = await request(app)
        .get(`/api/admin/pickups?status=${encodeURIComponent(payload)}`)
        .set('Authorization', `Bearer ${validAdminToken}`);
      expect(filterRes.status).toBe(200);
      expect(filterRes.body.data).toEqual([]);

      // Test body payload
      const bodyRes = await request(app)
        .put('/api/admin/users/usr_demo_customer')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send({ name: payload });
      expect([200, 400]).toContain(bodyRes.status);
      expect(bodyRes.status).not.toBe(500);
    }
  });

  // S6. Response bodies must never contain OTP codes, codeHash, rawCodeForDev, password hashes or payment signatures
  it('S6: Response bodies never contain codeHash, rawCodeForDev, password hashes or payment signatures', async () => {
    // 1. Pickup details
    const pickupRes = await request(app)
      .get('/api/admin/pickups/pk_completed_1')
      .set('Authorization', `Bearer ${validAdminToken}`);

    expect(pickupRes.status).toBe(200);
    const bodyStr1 = JSON.stringify(pickupRes.body);
    expect(bodyStr1).not.toContain('codeHash');
    expect(bodyStr1).not.toContain('rawCodeForDev');
    expect(bodyStr1).not.toContain('sig_verified_demo_hmac');
    expect(pickupRes.body.payment?.signature).toBeUndefined();

    // 2. Payments list
    const paymentsRes = await request(app)
      .get('/api/admin/payments')
      .set('Authorization', `Bearer ${validAdminToken}`);

    expect(paymentsRes.status).toBe(200);
    for (const p of paymentsRes.body.data) {
      expect(p.signature).toBeUndefined();
    }
    const bodyStr2 = JSON.stringify(paymentsRes.body);
    expect(bodyStr2).not.toContain('sig_verified');

    // 3. User details
    const userRes = await request(app)
      .get('/api/admin/users/usr_demo_customer')
      .set('Authorization', `Bearer ${validAdminToken}`);
    expect(userRes.status).toBe(200);
    const bodyStr3 = JSON.stringify(userRes.body);
    expect(bodyStr3).not.toContain('passwordHash');
    expect(bodyStr3).not.toContain('codeHash');
  });

  // S7. With NODE_ENV=production, /api/dev/* returns 404
  it('S7: /api/dev/* endpoints are blocked and return 404 in production', async () => {
    // In production environment (or when dev routes are unmounted), /api/dev/* routes must 404
    const originalEnv = process.env.NODE_ENV;
    try {
      // Re-create app under NODE_ENV=production
      process.env.NODE_ENV = 'production';
      const prodApp = createApp();

      const resReset = await request(prodApp).post('/api/dev/reset-seed');
      expect(resReset.status).toBe(404);

      const resAdvance = await request(prodApp).post('/api/dev/advance-complaint');
      expect(resAdvance.status).toBe(404);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  // S8. CORS from an unlisted origin is blocked; the admin origin works
  it('S8: CORS from unlisted origin is blocked and admin origin works', async () => {
    // 1. Admin origin works
    const adminOriginRes = await request(app)
      .options('/api/admin/users')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(adminOriginRes.status).toBe(204);
    expect(adminOriginRes.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    // 2. Unlisted origin is blocked
    const unlistedRes = await request(app)
      .options('/api/admin/users')
      .set('Origin', 'http://malicious-attacker.com')
      .set('Access-Control-Request-Method', 'GET');

    expect(unlistedRes.status).toBe(403);
    expect(unlistedRes.headers['access-control-allow-origin']).toBeUndefined();
  });

  // S9. A customer can only see their own data through customer endpoints
  it('S9: A customer can only see their own data through customer endpoints', async () => {
    // Ensure two customer users exist in state
    const customer1 = db.users.find((u) => u.id === 'usr_demo_customer')!;
    let customer2 = db.users.find((u) => u.id === 'usr_customer_2');
    if (!customer2) {
      customer2 = {
        id: 'usr_customer_2',
        phone: '+919999900000',
        role: 'CUSTOMER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.users.push(customer2);
    }

    // Customer 1's pickup
    const cust1Pickup = db.pickups.find((p) => p.customerId === customer1.id);
    expect(cust1Pickup).toBeDefined();

    // Customer 2 tries to fetch Customer 1's pickup
    const forbiddenRes = await request(app)
      .get(`/api/pickups/${cust1Pickup!.id}`)
      .set('x-user-id', customer2.id);

    // Endpoint must return 404 to avoid leaking existence of other customer's pickup
    expect(forbiddenRes.status).toBe(404);

    // Customer 2 fetches /api/pickups -> should NOT contain customer 1's pickups
    const listRes = await request(app)
      .get('/api/pickups')
      .set('x-user-id', customer2.id);

    expect(listRes.status).toBe(200);
    const returnedPickups = listRes.body;
    expect(returnedPickups.some((p: any) => p.customerId === customer1.id)).toBe(false);
  });
});

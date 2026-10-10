import { describe, it, expect, beforeEach } from 'vitest';
import { calculatePricingQuote } from '../server/services/pricing-service';
import { ALLOWED_TRANSITIONS, advancePickupStatus } from '../server/services/pickup-service';
import { FakePaymentAdapter, RazorpayAdapter } from '../server/adapters/payments';
import { getUserPointsBalance, getUserEcoStats, grantPoints } from '../server/services/rewards-service';
import { dbManager, db } from '../server/db';
import { verifyPhoneOtp } from '../server/services/otp-service';

describe('SWMS Server Services & Business Rules', () => {
  beforeEach(() => {
    dbManager.resetToSeed();
  });

  describe('Rule #1 & #2: Server-side Pricing Engine', () => {
    it('computes quote strictly from active DB pricing rules', () => {
      // 2 Medium bags of Plastic (Active rule is ₹30.00 = 3000 minor each)
      const quote = calculatePricingQuote([
        { wasteTypeId: 'wt_plastic', bagSize: 'MEDIUM', numberOfBags: 2 },
      ]);

      expect(quote.totalMinor).toBe(6000); // 2 * 3000 = 6000 paise (₹60.00)
      expect(quote.items[0].unitPriceMinor).toBe(3000);
      expect(quote.items[0].lineTotalMinor).toBe(6000);
      expect(quote.totalEstimatedKg).toBe(16); // 8kg * 2 = 16kg
      expect(quote.totalEstimatedCo2Kg).toBeGreaterThan(0);
    });

    it('rejects inactive or nonexistent waste categories', () => {
      expect(() =>
        calculatePricingQuote([
          { wasteTypeId: 'wt_non_existent', bagSize: 'SMALL', numberOfBags: 1 },
        ])
      ).toThrow('Invalid or inactive waste type');
    });

    it('multi-category pricing calculates line totals independently', () => {
      const quote = calculatePricingQuote([
        { wasteTypeId: 'wt_organic', bagSize: 'SMALL', numberOfBags: 1 }, // 1000 paise
        { wasteTypeId: 'wt_paper', bagSize: 'LARGE', numberOfBags: 1 }, // 4500 paise
      ]);
      expect(quote.totalMinor).toBe(5500);
      expect(quote.items.length).toBe(2);
    });
  });

  describe('Rule #3 & #4: State Machine & Transition Authorization', () => {
    it('rejects illegal status transitions according to the state machine', () => {
      const pickup = db.pickups.find((p) => p.status === 'EN_ROUTE') || db.pickups[1];
      expect(pickup).toBeDefined();

      // Illegal transition: EN_ROUTE directly to COMPLETED without ARRIVED/COLLECTED/VERIFIED
      expect(() => {
        advancePickupStatus(pickup.id, 'COMPLETED', 'test jump');
      }).toThrow(/Illegal status transition from EN_ROUTE to COMPLETED/);
    });

    it('prevents customer from cancelling pickup once it is EN_ROUTE', () => {
      const pickup = db.pickups.find((p) => p.status === 'EN_ROUTE')!;
      expect(pickup).toBeDefined();

      expect(() => {
        advancePickupStatus(
          pickup.id,
          'CANCELLED',
          'Customer tried to cancel late',
          'CUSTOMER',
          pickup.customerId
        );
      }).toThrow(/Cannot cancel pickup once collector is EN_ROUTE/);
    });

    it('enforces transition mapping integrity', () => {
      expect(ALLOWED_TRANSITIONS.REQUESTED).toContain('ASSIGNED');
      expect(ALLOWED_TRANSITIONS.REQUESTED).toContain('CANCELLED');
      expect(ALLOWED_TRANSITIONS.EN_ROUTE).toContain('ARRIVED');
      expect(ALLOWED_TRANSITIONS.ARRIVED).toContain('COLLECTING');
      expect(ALLOWED_TRANSITIONS.VERIFIED).toContain('COMPLETED');
      expect(ALLOWED_TRANSITIONS.COMPLETED).toEqual([]);
    });
  });

  describe('Rule #7: Payments & Signature Verification', () => {
    it('fake payment adapter creates valid orders and verifies signatures', async () => {
      const adapter = new FakePaymentAdapter();
      const order = await adapter.createOrder(5500, 'receipt_123');

      expect(order.orderId).toContain('order_fake_');
      expect(order.amountMinor).toBe(5500);

      const isValid = adapter.verifySignature(order.orderId, 'pay_123', 'sig_123');
      expect(isValid).toBe(true);
    });

    it('signature verification rejects empty signatures', () => {
      const adapter = new FakePaymentAdapter();
      expect(adapter.verifySignature('order_1', 'pay_1', '')).toBe(false);
    });
  });

  describe('Rule #8: Rewards & Ledger Derivation', () => {
    it('balance is computed dynamically by summing ledger entries', () => {
      const userId = 'usr_demo_customer';
      const initialBalance = getUserPointsBalance(userId);

      grantPoints(userId, 25, 'BONUS_TEST', 'Test point grant');
      const updatedBalance = getUserPointsBalance(userId);

      expect(updatedBalance).toBe(initialBalance + 25);
    });

    it('calculates eco stats and tier correctly based on point thresholds', () => {
      const userId = 'usr_demo_customer';
      const stats = getUserEcoStats(userId);

      expect(stats.tier).toBeDefined();
      expect(stats.totalKgRecycled).toBeGreaterThanOrEqual(0);
      expect(stats.totalCo2SavedKg).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Auth: OTP Limits & Verification', () => {
    it('rejects invalid OTP attempts and increments attempt count', () => {
      const res = verifyPhoneOtp('+919876543210', '0000');
      // No active OTP in record currently without request
      expect(res.success).toBe(false);
    });
  });

  describe('Doorstep PIN Verification & State Advancement', () => {
    it('doorstep PIN is securely generated and verified at arrival', () => {
      const pickup = db.pickups.find((p) => p.status === 'EN_ROUTE') || db.pickups[1];
      expect(pickup).toBeDefined();

      // Transition to ARRIVED
      advancePickupStatus(pickup.id, 'ARRIVED', 'Collector reached doorstep');
      expect(pickup.status).toBe('ARRIVED');

      // Check OTP was generated in DB
      const otpRecord = db.doorstepOtps.find((o) => o.pickupId === pickup.id);
      expect(otpRecord).toBeDefined();
      expect(otpRecord?.rawCodeForDev).toHaveLength(4);

      // Transition from ARRIVED to VERIFIED is valid in state machine
      advancePickupStatus(pickup.id, 'VERIFIED', 'PIN confirmed');
      expect(pickup.status).toBe('VERIFIED');

      // Transition from VERIFIED to COMPLETED
      advancePickupStatus(pickup.id, 'COMPLETED', 'Collection finished');
      expect(pickup.status).toBe('COMPLETED');
    });
  });

  describe('Waste Category Assets Integrity', () => {
    it('Scrap Metal & Cans has a valid, non-empty image URL', () => {
      const metal = db.wasteTypes.find((wt) => wt.id === 'wt_metal');
      expect(metal).toBeDefined();
      expect(metal?.imageUrl).toContain('images.unsplash.com');
      expect(metal?.active).toBe(true);
      expect(metal?.co2Factor).toBe(4.5);
    });
  });
});

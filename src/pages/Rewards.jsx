import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, RefreshCw, Gift, Award, Calendar } from 'lucide-react';
import { adminApi } from '../lib/api';

export default function Rewards() {
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRedemptions = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getRewardsRedemptions();
      setRedemptions(res.data || []);
    } catch (err) {
      console.error('Error fetching redemptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedemptions();
    const interval = setInterval(fetchRedemptions, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Reward Redemptions & Vouchers</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Eco Points claims, partner voucher codes, and customer redemptions ledger</p>
        </div>
        <button
          onClick={fetchRedemptions}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
            background: '#FFFFFF', border: '1px solid #D1D5DB', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: 12 }}>
              <th style={{ padding: '12px 18px' }}>Redemption ID</th>
              <th style={{ padding: '12px 18px' }}>User</th>
              <th style={{ padding: '12px 18px' }}>Reward</th>
              <th style={{ padding: '12px 18px' }}>Voucher Code</th>
              <th style={{ padding: '12px 18px' }}>Points Cost</th>
              <th style={{ padding: '12px 18px' }}>Claimed At</th>
            </tr>
          </thead>
          <tbody>
            {loading && redemptions.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading redemptions...</td></tr>
            ) : redemptions.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>No redemptions claimed yet.</td></tr>
            ) : (
              redemptions.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 600, fontFamily: 'monospace' }}>{r.id}</td>
                  <td style={{ padding: '14px 18px' }}>{r.customerName}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 600 }}>{r.rewardTitle}</td>
                  <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: '#4338CA' }}>{r.voucherCode}</td>
                  <td style={{ padding: '14px 18px', color: '#16A34A', fontWeight: 700 }}>{r.points} pts</td>
                  <td style={{ padding: '14px 18px', color: '#6B7280' }}>{r.createdAt}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

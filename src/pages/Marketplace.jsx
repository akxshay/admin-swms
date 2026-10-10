import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, RefreshCw, Tag, User } from 'lucide-react';
import { adminApi } from '../lib/api';

export default function Marketplace() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getMarketplace();
      setListings(res.data || []);
    } catch (err) {
      console.error('Error fetching marketplace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
    const interval = setInterval(fetchListings, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Recyclable Marketplace</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Customer scrap, bulk recyclable lots, and peer-to-peer exchange listings</p>
        </div>
        <button
          onClick={fetchListings}
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
              <th style={{ padding: '12px 18px' }}>Title</th>
              <th style={{ padding: '12px 18px' }}>Seller</th>
              <th style={{ padding: '12px 18px' }}>Material</th>
              <th style={{ padding: '12px 18px' }}>Quantity</th>
              <th style={{ padding: '12px 18px' }}>Price</th>
              <th style={{ padding: '12px 18px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && listings.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading marketplace listings...</td></tr>
            ) : listings.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>No marketplace listings found.</td></tr>
            ) : (
              listings.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 600 }}>{l.title}</td>
                  <td style={{ padding: '14px 18px' }}>{l.sellerName}</td>
                  <td style={{ padding: '14px 18px' }}>{l.material}</td>
                  <td style={{ padding: '14px 18px' }}>{l.quantityKg} kg</td>
                  <td style={{ padding: '14px 18px', fontWeight: 600 }}>₹{((l.priceMinor || 0) / 100).toFixed(0)}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: l.status === 'ACTIVE' ? '#DCFCE7' : '#F3F4F6', color: l.status === 'ACTIVE' ? '#15803D' : '#6B7280' }}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

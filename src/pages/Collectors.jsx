import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, RefreshCw, Phone, Truck, Star, MapPin } from 'lucide-react';
import { adminApi } from '../lib/api';

export default function Collectors() {
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCollectors = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCollectors();
      setCollectors(res.data || []);
    } catch (err) {
      console.error('Error fetching collectors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectors();
    const interval = setInterval(fetchCollectors, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Waste Collectors & Drivers</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Field staff, vehicle registrations, ratings, and current active assignments</p>
        </div>
        <button
          onClick={fetchCollectors}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
            background: '#FFFFFF', border: '1px solid #D1D5DB', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {loading && collectors.length === 0 ? (
          <div style={{ padding: 40, color: '#9CA3AF' }}>Loading waste collectors...</div>
        ) : (
          collectors.map((c) => (
            <div
              key={c.id}
              style={{
                background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20,
                display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{c.name}</h3>
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.isOnline ? '#15803D' : '#9CA3AF', background: c.isOnline ? '#DCFCE7' : '#F3F4F6', padding: '2px 8px', borderRadius: 9999, display: 'inline-block', marginTop: 4 }}>
                    {c.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FEF3C7', color: '#B45309', padding: '4px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                  <Star size={13} fill="#B45309" /> {c.rating}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#4B5563', borderTop: '1px solid #F3F4F6', paddingTop: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={14} color="#9CA3AF" /> {c.phone}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Truck size={14} color="#9CA3AF" /> {c.vehicleType} • {c.vehicleNumber}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} color="#9CA3AF" /> Active Pickups: {c.activePickups ?? 0} (Total: {c.totalPickups ?? 0})
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, RefreshCw, MapPin, Phone, Clock } from 'lucide-react';
import { adminApi } from '../lib/api';

export default function Vendors() {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHubs = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getVendors();
      setHubs(res.data || []);
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHubs();
    const interval = setInterval(fetchHubs, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Eco Exchange Hubs & Vendors</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Approved partner hubs for physical waste drop-off and material recycling</p>
        </div>
        <button
          onClick={fetchHubs}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
            background: '#FFFFFF', border: '1px solid #D1D5DB', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {loading && hubs.length === 0 ? (
          <div style={{ padding: 40, color: '#9CA3AF' }}>Loading exchange hubs...</div>
        ) : (
          hubs.map((hub) => (
            <div
              key={hub.id}
              style={{
                background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20,
                display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{hub.name}</h3>
                  <span style={{ fontSize: 11, fontWeight: 700, color: hub.active ? '#15803D' : '#9CA3AF', background: hub.active ? '#DCFCE7' : '#F3F4F6', padding: '2px 8px', borderRadius: 9999, display: 'inline-block', marginTop: 4 }}>
                    {hub.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Store size={18} color="#16A34A" />
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{hub.description}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#4B5563', borderTop: '1px solid #F3F4F6', paddingTop: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} color="#9CA3AF" /> {hub.address}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={14} color="#9CA3AF" /> {hub.contact}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} color="#9CA3AF" /> {hub.timing}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

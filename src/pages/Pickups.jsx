import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Search, Filter, RefreshCw, Calendar, MapPin, User } from 'lucide-react';
import { adminApi } from '../lib/api';

export default function Pickups() {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPickups = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const res = await adminApi.getPickups(params);
      setPickups(res.data || []);
      setTotalPages(res.pages || 1);
    } catch (err) {
      console.error('Error fetching pickups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPickups();
    const interval = setInterval(fetchPickups, 10000);
    return () => clearInterval(interval);
  }, [page, statusFilter]);

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    let bg = '#F3F4F6', color = '#374151';
    if (s === 'COMPLETED') { bg = '#DCFCE7'; color = '#15803D'; }
    else if (s === 'EN_ROUTE' || s === 'COLLECTING') { bg = '#DBEAFE'; color = '#1D4ED8'; }
    else if (s === 'ASSIGNED' || s === 'REQUESTED') { bg = '#FEF3C7'; color = '#B45309'; }
    else if (s === 'CANCELLED' || s === 'MISSED') { bg = '#FEE2E2'; color = '#B91C1C'; }

    return (
      <span style={{ padding: '4px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: bg, color }}>
        {status}
      </span>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Pickup Requests</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Manage customer doorstep pickups, statuses and assignments</p>
        </div>
        <button
          onClick={fetchPickups}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
            background: '#FFFFFF', border: '1px solid #D1D5DB', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#FFFFFF', padding: '14px 18px', borderRadius: 12, border: '1px solid #E5E7EB' }}>
        <Filter size={16} color="#6B7280" />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, outline: 'none' }}
        >
          <option value="">All Statuses</option>
          <option value="REQUESTED">REQUESTED</option>
          <option value="ASSIGNED">ASSIGNED</option>
          <option value="EN_ROUTE">EN_ROUTE</option>
          <option value="COLLECTING">COLLECTING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: 12 }}>
              <th style={{ padding: '12px 18px' }}>Pickup ID</th>
              <th style={{ padding: '12px 18px' }}>Customer</th>
              <th style={{ padding: '12px 18px' }}>Collector</th>
              <th style={{ padding: '12px 18px' }}>Scheduled Date</th>
              <th style={{ padding: '12px 18px' }}>Amount</th>
              <th style={{ padding: '12px 18px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && pickups.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading pickups...</td></tr>
            ) : pickups.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>No pickups found matching criteria.</td></tr>
            ) : (
              pickups.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 600, fontFamily: 'monospace' }}>{p.id}</td>
                  <td style={{ padding: '14px 18px' }}>{p.customerName || p.customerId}</td>
                  <td style={{ padding: '14px 18px', color: p.collectorName ? '#111827' : '#9CA3AF' }}>{p.collectorName || 'Unassigned'}</td>
                  <td style={{ padding: '14px 18px', color: '#6B7280' }}>{p.scheduledDate} ({p.scheduledSlot})</td>
                  <td style={{ padding: '14px 18px', fontWeight: 600 }}>₹{((p.totalAmountMinor || 0) / 100).toFixed(2)}</td>
                  <td style={{ padding: '14px 18px' }}>{getStatusBadge(p.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

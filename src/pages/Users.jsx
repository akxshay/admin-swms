import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users as UsersIcon, Search, RefreshCw, Award, MapPin } from 'lucide-react';
import { adminApi } from '../lib/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({ page, limit: 15, q: search });
      setUsers(res.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 10000);
    return () => clearInterval(interval);
  }, [page, search]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Registered Users</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Customer accounts, activity, reward points, and profile information</p>
        </div>
        <button
          onClick={fetchUsers}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
            background: '#FFFFFF', border: '1px solid #D1D5DB', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#FFFFFF', padding: '14px 18px', borderRadius: 12, border: '1px solid #E5E7EB' }}>
        <Search size={16} color="#6B7280" />
        <input
          type="text"
          placeholder="Search users by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13 }}
        />
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: 12 }}>
              <th style={{ padding: '12px 18px' }}>Name</th>
              <th style={{ padding: '12px 18px' }}>Phone</th>
              <th style={{ padding: '12px 18px' }}>Email</th>
              <th style={{ padding: '12px 18px' }}>Pickups</th>
              <th style={{ padding: '12px 18px' }}>Eco Points</th>
              <th style={{ padding: '12px 18px' }}>Role</th>
            </tr>
          </thead>
          <tbody>
            {loading && users.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>No users found.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 600 }}>{u.profile?.name || 'Customer'}</td>
                  <td style={{ padding: '14px 18px', color: '#4B5563', fontFamily: 'monospace' }}>{u.phone}</td>
                  <td style={{ padding: '14px 18px', color: '#6B7280' }}>{u.profile?.email || '—'}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 600 }}>{u.pickupCount ?? 0}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#16A34A', fontWeight: 700 }}>
                      <Award size={14} /> {u.pointsBalance ?? 0}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: '#E0E7FF', color: '#4338CA' }}>
                      {u.role}
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

import { motion } from 'framer-motion';
import { livePickups } from '../../data/mockData';

const STATUS = {
  completed:    { label: 'Completed',   bg: '#F0FDF4', color: '#15803D', dot: '#22C55E' },
  'in-progress':{ label: 'In Progress', bg: '#EFF6FF', color: '#1D4ED8', dot: '#3B82F6' },
  pending:      { label: 'Pending',     bg: '#FFFBEB', color: '#92400E', dot: '#F59E0B' },
  missed:       { label: 'Missed',      bg: '#FEF2F2', color: '#991B1B', dot: '#EF4444' },
};

const WASTE_DOT = {
  Plastic: '#22C55E', Paper: '#86EFAC', Organic: '#4ADE80',
  Glass: '#60A5FA', Metal: '#F59E0B', 'E-Waste': '#EF4444',
};

const th = {
  textAlign: 'left', paddingBottom: 10, paddingRight: 20,
  fontSize: 11, fontWeight: 600, color: '#9CA3AF',
  letterSpacing: '0.04em', textTransform: 'uppercase',
  whiteSpace: 'nowrap', borderBottom: '1px solid #F3F4F6',
};

export default function LivePickupActivity({ pickups: liveDataPickups }) {
  const displayPickups = liveDataPickups && liveDataPickups.length > 0
    ? liveDataPickups.map((p) => {
        const statusKey = (p.status || '').toLowerCase().replace(/_/g, '-');
        const wasteName = p.items?.[0]?.wasteTypeName || (p.items?.[0]?.wasteTypeId ? 'Recyclable' : 'Mixed Waste');
        return {
          id: p.id,
          user: p.customerName || p.customerId,
          collector: p.collectorName || 'Unassigned',
          wasteType: wasteName,
          status: ['completed', 'cancelled', 'en-route', 'requested', 'assigned'].includes(statusKey) ? statusKey : 'pending',
          statusRaw: p.status,
          area: p.addressSnapshot?.label || p.addressSnapshot?.formatted?.split(',')?.[0] || 'Mangaluru',
          eta: p.scheduledSlot || 'Scheduled',
        };
      })
    : livePickups;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28, duration: 0.45 }}
      style={{
        background: '#fff', border: '1px solid #E5E7EB',
        borderRadius: 16, padding: '20px 22px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 8, background: '#F0FDF4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
              Live Pickup Activity
            </h2>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '2px 9px', borderRadius: 100,
              background: '#F0FDF4', border: '1px solid #BBF7D0',
              fontSize: 10, fontWeight: 700, color: '#15803D',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: '#22C55E',
                animation: 'pulse-dot 2s ease-in-out infinite',
              }} />
              Live
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Today's active and recent pickups</p>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 12, fontWeight: 600, color: '#16A34A',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}>
          View All →
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Pickup ID', 'User', 'Collector', 'Waste Type', 'Status', 'Area', 'ETA'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayPickups.map((p, i) => {
              const st = STATUS[p.status] || STATUS.pending;
              return (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.28 + i * 0.04 }}
                  style={{
                    borderBottom: i < displayPickups.length - 1 ? '1px solid #F9FAFB' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '13px 20px 13px 0', fontWeight: 700, color: '#111827', fontFamily: 'monospace', fontSize: 12 }}>
                    {p.id}
                  </td>
                  <td style={{ padding: '13px 20px 13px 0', color: '#374151', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {p.user}
                  </td>
                  <td style={{ padding: '13px 20px 13px 0', color: p.collector === 'Unassigned' ? '#9CA3AF' : '#374151', fontSize: 13, fontStyle: p.collector === 'Unassigned' ? 'italic' : 'normal', whiteSpace: 'nowrap' }}>
                    {p.collector}
                  </td>
                  <td style={{ padding: '13px 20px 13px 0' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: WASTE_DOT[p.wasteType] || '#9CA3AF', flexShrink: 0 }} />
                      <span style={{ color: '#374151', fontSize: 13 }}>{p.wasteType}</span>
                    </span>
                  </td>
                  <td style={{ padding: '13px 20px 13px 0' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 100,
                      background: st.bg, color: st.color,
                      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                      {st.label}
                    </span>
                  </td>
                  <td style={{ padding: '13px 20px 13px 0', color: '#6B7280', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {p.area}
                  </td>
                  <td style={{ padding: '13px 0 13px 0', color: p.status === 'missed' ? '#EF4444' : '#111827', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {p.eta}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

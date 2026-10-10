import { motion } from 'framer-motion';
import { collectors } from '../../data/mockData';

function RatingStars({ rating }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{rating}</span>
    </div>
  );
}

function Bar({ value, delay }) {
  return (
    <div style={{ height: 3, borderRadius: 100, background: '#F3F4F6', overflow: 'hidden', marginTop: 6 }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay }}
        style={{ height: '100%', borderRadius: 100, background: 'linear-gradient(90deg, #16A34A, #4ADE80)' }}
      />
    </div>
  );
}

export default function CollectorOverview() {
  const onlineCount = collectors.filter(c => c.online).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.42, duration: 0.45 }}
      style={{
        background: '#fff', border: '1px solid #E5E7EB',
        borderRadius: 16, padding: '20px 22px',
        display: 'flex', flexDirection: 'column',
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
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
              Collector Overview
            </h2>
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
            <span style={{ color: '#22C55E', fontWeight: 700 }}>{onlineCount}</span> of {collectors.length} online now
          </p>
        </div>
        <button style={{ fontSize: 12, fontWeight: 600, color: '#16A34A', background: 'none', border: 'none', cursor: 'pointer' }}>
          Manage →
        </button>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {collectors.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.42 + i * 0.07 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 12,
              background: '#F9FAFB', cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F0FDF4'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F9FAFB'; }}
          >
            {/* Avatar + status dot */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11,
                background: c.online ? 'linear-gradient(135deg, #BBF7D0, #86EFAC)' : '#E5E7EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800,
                color: c.online ? '#15803D' : '#9CA3AF',
              }}>
                {c.avatar}
              </div>
              <div style={{
                position: 'absolute', bottom: -1, right: -1,
                width: 10, height: 10, borderRadius: '50%',
                background: c.online ? '#22C55E' : '#D1D5DB',
                border: '2px solid #F9FAFB',
              }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                  {c.name}
                </p>
                <RatingStars rating={c.rating} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                  {c.todayPickups} pickups · {c.zone}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>{c.completionRate}%</span>
              </div>
              <Bar value={c.completionRate} delay={0.42 + i * 0.07} />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

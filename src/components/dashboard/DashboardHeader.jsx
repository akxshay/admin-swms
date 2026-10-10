import { motion } from 'framer-motion';
import { useClock } from '../../hooks/useClock';

export default function DashboardHeader() {
  const { greeting, shortDate, formatted } = useClock();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 22,
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      {/* Greeting */}
      <div>
        <h1 style={{
          fontSize: 24, fontWeight: 800, color: '#111827',
          letterSpacing: '-0.04em', lineHeight: 1.15, margin: 0,
        }}>
          {greeting}, Admin 👋
        </h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4, fontWeight: 400 }}>
          Here's a live overview of today's waste management operations.
        </p>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Operational status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 14px', borderRadius: 100,
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          fontSize: 12, fontWeight: 600, color: '#15803D',
          letterSpacing: '-0.01em',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#22C55E',
            animation: 'pulse-dot 2s ease-in-out infinite',
          }} />
          All systems operational
        </div>

        {/* Today's date */}
        <div style={{
          padding: '6px 14px', borderRadius: 100,
          background: '#fff',
          border: '1px solid #E5E7EB',
          fontSize: 12, fontWeight: 600, color: '#374151',
        }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </motion.div>
  );
}

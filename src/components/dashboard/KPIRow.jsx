import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { kpiMetrics } from '../../data/mockData';

// Mini sparkline SVG
function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 72, H = 28, P = 1;

  const pts = data.map((v, i) => {
    const x = P + (i / (data.length - 1)) * (W - P * 2);
    const y = H - P - ((v - min) / range) * (H - P * 2);
    return [x, y];
  });

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
  const [lx, ly] = pts[pts.length - 1];
  const gradId = `sg-${color.replace('#', '')}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx.toFixed(1)} cy={ly.toFixed(1)} r="3" fill={color} />
    </svg>
  );
}

function KPICard({ metric, index }) {
  const count = useCountUp(metric.value, 1100, index * 90);
  const isPositive = metric.trend >= 0;
  const isPending = metric.id === 'pending';
  const accentColor = isPending ? '#F59E0B' : '#22C55E';
  const bgAccent = isPending ? '#FFFBEB' : '#F0FDF4';
  const textAccent = isPending ? '#92400E' : '#14532D';
  const trendBg = isPositive ? '#DCFCE7' : '#FEE2E2';
  const trendColor = isPositive ? '#15803D' : '#DC2626';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, boxShadow: '0 8px 28px rgba(0,0,0,0.09)' }}
      style={{
        flex: '1 1 160px',
        minWidth: 0,
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 16,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        cursor: 'default',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}
    >
      {/* Icon + trend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: bgAccent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <MetricIcon id={metric.icon} color={accentColor} />
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 3,
          padding: '3px 8px', borderRadius: 100,
          background: trendBg,
          fontSize: 11, fontWeight: 700, color: trendColor,
        }}>
          {isPositive
            ? <TrendingUp size={10} strokeWidth={2.5} />
            : <TrendingDown size={10} strokeWidth={2.5} />
          }
          {Math.abs(metric.trend)}%
        </div>
      </div>

      {/* Number + label */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{
            fontSize: 30, fontWeight: 800,
            color: '#111827',
            letterSpacing: '-0.04em', lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {count.toLocaleString('en-IN')}
          </span>
          {metric.unit && (
            <span style={{ fontSize: 14, fontWeight: 600, color: '#9CA3AF' }}>{metric.unit}</span>
          )}
        </div>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginTop: 5, letterSpacing: '-0.01em' }}>
          {metric.label}
        </p>
        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
          {isPositive ? '↑' : '↓'} {metric.trendLabel}
        </p>
      </div>

      {/* Sparkline */}
      <Sparkline data={metric.sparkline} color={accentColor} />
    </motion.div>
  );
}

function MetricIcon({ id, color }) {
  const s = { width: 18, height: 18, strokeWidth: 2, color };
  if (id === 'Calendar') return (
    <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
  if (id === 'CheckCircle2') return (
    <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
    </svg>
  );
  if (id === 'Recycle') return (
    <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7 19 2 14 7 9"/><polyline points="2 14 12 14 17 9"/><polyline points="17 5 22 10 17 15"/><polyline points="22 10 12 10 7 15"/>
    </svg>
  );
  if (id === 'Users') return (
    <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
  if (id === 'Clock') return (
    <svg viewBox="0 0 24 24" style={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
  return null;
}

export default function KPIRow({ stats }) {
  const metrics = stats
    ? [
        {
          id: 'total-pickups',
          label: 'Total Pickups',
          value: stats.totalPickups ?? 0,
          unit: '',
          trend: 12,
          trendLabel: 'vs last week',
          icon: 'Truck',
          sparkline: [1, 1, 2, 2, stats.totalPickups || 2],
        },
        {
          id: 'users',
          label: 'Active Users',
          value: stats.totalUsers ?? 0,
          unit: '',
          trend: 10,
          trendLabel: 'registered accounts',
          icon: 'Users',
          sparkline: [1, 1, 1, 1, stats.totalUsers || 1],
        },
        {
          id: 'revenue',
          label: 'Revenue (₹)',
          value: Math.round((stats.revenueMinor || 0) / 100),
          unit: '₹',
          trend: 15,
          trendLabel: 'processed minor',
          icon: 'Recycle',
          sparkline: [0, 20, 35, 50, Math.round((stats.revenueMinor || 0) / 100) || 55],
        },
        {
          id: 'pending',
          label: 'Active Pickups',
          value:
            (stats.pickupsByStatus?.REQUESTED || 0) +
            (stats.pickupsByStatus?.ASSIGNED || 0) +
            (stats.pickupsByStatus?.EN_ROUTE || 0),
          unit: '',
          trend: -5,
          trendLabel: 'in progress',
          icon: 'Clock',
          sparkline: [2, 2, 1, 1, 1],
        },
        {
          id: 'hubs',
          label: 'Exchange Hubs',
          value: stats.totalHubs ?? 0,
          unit: '',
          trend: 4,
          trendLabel: 'active partner points',
          icon: 'CheckCircle',
          sparkline: [2, 3, 3, 4, stats.totalHubs || 4],
        },
      ]
    : kpiMetrics;

  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
      {metrics.map((metric, i) => (
        <KPICard key={metric.id} metric={metric} index={i} />
      ))}
    </div>
  );
}

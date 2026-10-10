import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { wasteDistributionData } from '../../data/mockData';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E7EB',
      borderRadius: 10, padding: '8px 12px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      fontSize: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.payload.color }} />
        <span style={{ fontWeight: 700, color: '#111827' }}>{item.name}</span>
        <span style={{ color: '#6B7280' }}>{item.value}%</span>
      </div>
    </div>
  );
};

export default function WasteDistribution() {
  const largest = wasteDistributionData.reduce((a, b) => b.value > a.value ? b : a, wasteDistributionData[0]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.45 }}
      style={{
        background: '#fff', border: '1px solid #E5E7EB',
        borderRadius: 16, padding: '20px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 8,
            background: '#F0FDF4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 19 2 14 7 9"/><polyline points="2 14 12 14 17 9"/><polyline points="17 5 22 10 17 15"/><polyline points="22 10 12 10 7 15"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
            Waste Distribution
          </h2>
        </div>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>By material category (% of total)</p>
      </div>

      {/* Donut chart */}
      <div style={{ position: 'relative', height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={wasteDistributionData}
              cx="50%" cy="50%"
              innerRadius={56} outerRadius={82}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
              animationBegin={300}
              animationDuration={1000}
            >
              {wasteDistributionData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label — show largest category */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {largest.value}%
          </p>
          <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3, fontWeight: 500 }}>
            {largest.name}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginTop: 14 }}>
        {wasteDistributionData.map((item) => (
          <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#4B5563', fontWeight: 500, flex: 1 }}>{item.name}</span>
            <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700 }}>{item.value}%</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

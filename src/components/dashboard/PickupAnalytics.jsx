import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid
} from 'recharts';
import { pickupAnalyticsData } from '../../data/mockData';

const PERIODS = ['Today', '7 Days', '30 Days'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E7EB',
      borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12,
    }}>
      <p style={{ fontWeight: 700, color: '#111827', marginBottom: 8 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color }} />
          <span style={{ color: '#6B7280' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: '#111827' }}>{p.value.toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
};

export default function PickupAnalytics() {
  const [period, setPeriod] = useState('7 Days');

  // Summary stats
  const latest = pickupAnalyticsData[pickupAnalyticsData.length - 1];
  const completionRate = Math.round((latest.completed / latest.scheduled) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.45 }}
      style={{
        background: '#fff', border: '1px solid #E5E7EB',
        borderRadius: 16, padding: '20px 22px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 8, background: '#F0FDF4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
              Pickup Analytics
            </h2>
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
            Scheduled, completed, and missed pickup trends
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Completion rate badge */}
          <div style={{
            padding: '5px 11px', borderRadius: 100,
            background: '#F0FDF4', border: '1px solid #BBF7D0',
            fontSize: 12, fontWeight: 700, color: '#15803D',
          }}>
            {completionRate}% completion
          </div>

          {/* Period toggle */}
          <div style={{
            display: 'flex', gap: 2,
            background: '#F3F4F6', borderRadius: 8, padding: 3,
          }}>
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '4px 10px', borderRadius: 6,
                  border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                  background: period === p ? '#fff' : 'transparent',
                  color: period === p ? '#111827' : '#6B7280',
                  boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={pickupAnalyticsData} margin={{ top: 5, right: 4, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="scheduled" name="Scheduled"
              stroke="#CBD5E1" strokeWidth={1.5} fill="url(#gs)"
              dot={false} activeDot={{ r: 4, fill: '#94A3B8' }} />
            <Area type="monotone" dataKey="completed" name="Completed"
              stroke="#22C55E" strokeWidth={2.2} fill="url(#gc)"
              dot={false} activeDot={{ r: 4, fill: '#22C55E' }} />
            <Area type="monotone" dataKey="missed" name="Missed"
              stroke="#F87171" strokeWidth={1.5} fill="none"
              dot={false} activeDot={{ r: 4, fill: '#F87171' }}
              strokeDasharray="5 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 18, marginTop: 12,
        paddingTop: 12, borderTop: '1px solid #F3F4F6',
      }}>
        {[['#CBD5E1', 'Scheduled'], ['#22C55E', 'Completed'], ['#F87171', 'Missed']].map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

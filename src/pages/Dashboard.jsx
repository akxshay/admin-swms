import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import KPIRow from '../components/dashboard/KPIRow';
import PickupAnalytics from '../components/dashboard/PickupAnalytics';
import WasteDistribution from '../components/dashboard/WasteDistribution';
import LivePickupActivity from '../components/dashboard/LivePickupActivity';
import RecentActivity from '../components/dashboard/RecentActivity';
import CollectorOverview from '../components/dashboard/CollectorOverview';
import { adminApi } from '../lib/api';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, pickupsData] = await Promise.all([
        adminApi.getStats().catch(() => null),
        adminApi.getPickups({ limit: 8 }).catch(() => ({ data: [] })),
      ]);
      if (statsData) setStats(statsData);
      if (pickupsData?.data) setPickups(pickupsData.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // 10-second polling
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
    >
      {/* 1. Compact header */}
      <DashboardHeader />

      {/* 2. KPI row — real metrics */}
      <KPIRow stats={stats} />

      {/* 3. Analytics + Waste Distribution */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 16,
          marginBottom: 16,
          alignItems: 'stretch',
        }}
        className="analytics-grid"
      >
        <PickupAnalytics />
        <WasteDistribution />
      </div>

      {/* 4. Live Pickup Activity with real pickups */}
      <div style={{ marginBottom: 16 }}>
        <LivePickupActivity pickups={pickups} />
      </div>

      {/* 5. Activity Timeline + Collector Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 8,
          alignItems: 'stretch',
        }}
        className="bottom-grid"
      >
        <RecentActivity />
        <CollectorOverview />
      </div>
    </motion.div>
  );
}

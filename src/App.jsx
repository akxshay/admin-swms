import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Pickups from './pages/Pickups';
import Users from './pages/Users';
import Collectors from './pages/Collectors';
import Vendors from './pages/Vendors';
import Marketplace from './pages/Marketplace';
import Rewards from './pages/Rewards';
import Login from './pages/Login';
import { getToken, clearToken } from './lib/api';

// Placeholder pages for items that don't have dedicated pages yet
function PlaceholderPage({ title, description }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{title}</h1>
      <p style={{ fontSize: 14, color: '#6B7280' }}>{description}</p>
    </div>
  );
}

const PAGE_MAP = {
  'dashboard':       Dashboard,
  'pickup-requests': Pickups,
  'users':           Users,
  'collectors':      Collectors,
  'vendors':         Vendors,
  'marketplace':     Marketplace,
  'rewards':         Rewards,
  'live-tracking':   () => <PlaceholderPage title="Live Tracking" description="Real-time GPS tracking for active pickups — coming soon" />,
  'payments':        () => <PlaceholderPage title="Payments" description="Payment transactions and settlements — coming soon" />,
  'reports':         () => <PlaceholderPage title="Reports" description="Analytics and export reports — coming soon" />,
  'notifications':   () => <PlaceholderPage title="Notifications" description="Push notification management — coming soon" />,
  'settings':        () => <PlaceholderPage title="Settings" description="System configuration and preferences — coming soon" />,
};

export default function App() {
  const [authenticated, setAuthenticated] = useState(!!getToken());
  const [activeNav, setActiveNav] = useState('dashboard');

  // Listen for auth expiry events from the API client
  useEffect(() => {
    const handler = () => setAuthenticated(false);
    window.addEventListener('swms:auth:expired', handler);
    return () => window.removeEventListener('swms:auth:expired', handler);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setAuthenticated(true);
    setActiveNav('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setAuthenticated(false);
  }, []);

  if (!authenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const ActivePage = PAGE_MAP[activeNav] || Dashboard;

  return (
    <DashboardLayout activeNav={activeNav} setActiveNav={setActiveNav} onLogout={handleLogout}>
      <ActivePage />
    </DashboardLayout>
  );
}

import { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import { useDarkMode } from '../hooks/useDarkMode';

export default function DashboardLayout({ children, activeNav, setActiveNav, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useDarkMode();

  const sidebarWidth = collapsed ? 64 : 232;

  return (
    <div style={{ minHeight: '100vh', background: dark ? '#0F1117' : '#F8F9FA' }}>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        onLogout={onLogout}
      />

      <div style={{ marginLeft: sidebarWidth, display: 'flex', flexDirection: 'column', minHeight: '100vh', transition: 'margin-left 0.3s ease' }}>
        <TopNav dark={dark} setDark={setDark} onLogout={onLogout} />

        <main style={{ flex: 1, padding: '24px 28px', maxWidth: 1600, width: '100%' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Truck, MapPin, Users, UserCircle, Store,
  ShoppingBag, Star, CreditCard, BarChart3, Bell, Settings,
  ChevronLeft, ChevronRight, Leaf, LogOut
} from 'lucide-react';

const navItems = [
  { id: 'dashboard',        label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'pickup-requests',  label: 'Pickup Requests',  icon: Truck },
  { id: 'live-tracking',    label: 'Live Tracking',    icon: MapPin },
  { id: 'collectors',       label: 'Collectors',       icon: Users },
  { id: 'users',            label: 'Users',            icon: UserCircle },
  { id: 'vendors',          label: 'Vendors',          icon: Store },
  { id: 'marketplace',      label: 'Marketplace',      icon: ShoppingBag },
  { id: 'rewards',          label: 'Rewards',          icon: Star },
  { id: 'payments',         label: 'Payments',         icon: CreditCard },
  { id: 'reports',          label: 'Reports',          icon: BarChart3 },
  { id: 'notifications',    label: 'Notifications',    icon: Bell },
  { id: 'settings',         label: 'Settings',         icon: Settings },
];

export default function Sidebar({ collapsed, setCollapsed, activeNav, setActiveNav, onLogout }) {
  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 232 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col overflow-hidden"
      style={{
        background: '#ffffff',
        borderRight: '1px solid #E5E7EB',
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '18px 16px 16px',
          borderBottom: '1px solid #F3F4F6',
          minHeight: 64,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32, height: 32,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Leaf size={15} color="#fff" strokeWidth={2.5} />
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.16 }}
              style={{ overflow: 'hidden', minWidth: 0 }}
            >
              <p style={{ fontWeight: 800, fontSize: 13, color: '#111827', lineHeight: 1.2, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                SwachhaAdmin
              </p>
              <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1, whiteSpace: 'nowrap' }}>
                Waste Management System
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute',
          right: -12, top: 52,
          width: 24, height: 24,
          background: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          zIndex: 50,
          color: '#6B7280',
        }}
      >
        {collapsed
          ? <ChevronRight size={11} strokeWidth={2.5} />
          : <ChevronLeft size={11} strokeWidth={2.5} />
        }
      </button>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              whileTap={{ scale: 0.97 }}
              title={collapsed ? item.label : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: isActive ? '#F0FDF4' : 'transparent',
                position: 'relative',
                transition: 'background 0.15s ease',
                textAlign: 'left',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F9FAFB'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Active bar */}
              {isActive && (
                <motion.div
                  layoutId="activeSidebarBar"
                  style={{
                    position: 'absolute',
                    left: 0, top: 6, bottom: 6,
                    width: 3,
                    borderRadius: '0 3px 3px 0',
                    background: '#22C55E',
                  }}
                />
              )}

              <Icon
                size={17}
                strokeWidth={isActive ? 2.2 : 1.8}
                style={{
                  color: isActive ? '#16A34A' : '#9CA3AF',
                  flexShrink: 0,
                }}
              />

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.14 }}
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#15803D' : '#4B5563',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                    }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </nav>

      {/* Admin profile at bottom */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid #F3F4F6', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #16A34A, #22C55E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#fff',
          }}>
            AD
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                style={{ flex: 1, minWidth: 0 }}
              >
                <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  admin@swms.local
                </p>
                <p style={{ fontSize: 10, color: '#16A34A', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  System Administrator
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {!collapsed && (
              <motion.button
                onClick={onLogout}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                title="Sign out"
              >
                <LogOut size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}

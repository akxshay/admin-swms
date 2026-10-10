import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Bell, Moon, Sun,
  ChevronDown, Plus, X, MessageSquare
} from 'lucide-react';
import { useClock } from '../../hooks/useClock';

export default function TopNav({ dark, setDark, onLogout }) {
  const { formatted, shortDate } = useClock();
  const [searchVal, setSearchVal] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifications = [
    { id: 1, title: 'Pickup Delayed', desc: 'PK-1042 delayed by 18 min', dot: '#F59E0B', time: '5m' },
    { id: 2, title: 'Missed Pickup', desc: 'PK-1037 · Arun Nair needs attention', dot: '#EF4444', time: '1h' },
    { id: 3, title: 'New Vendor Joined', desc: 'EcoGreen Recyclers registered', dot: '#22C55E', time: '2h' },
  ];

  const btnStyle = {
    width: 36, height: 36,
    borderRadius: 10,
    border: 'none',
    background: dark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    flexShrink: 0,
    transition: 'background 0.15s ease',
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: dark ? 'rgba(15,17,23,0.92)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${dark ? '#2D3142' : '#F3F4F6'}`,
        height: 60,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 20px', gap: 10 }}>

        {/* Search bar */}
        <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
            height: 36,
            borderRadius: 10,
            background: dark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
            border: `1px solid ${searchOpen ? '#22C55E' : 'transparent'}`,
            boxShadow: searchOpen ? '0 0 0 3px rgba(34,197,94,0.12)' : 'none',
            transition: 'all 0.18s ease',
          }}>
            <Search size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
              placeholder="Search pickups, collectors, users…"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                color: dark ? '#F9FAFB' : '#111827',
                fontFamily: 'inherit',
              }}
            />
            {searchVal
              ? <button onClick={() => setSearchVal('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>
                  <X size={13} />
                </button>
              : <span style={{
                  fontSize: 10, padding: '2px 5px', borderRadius: 5,
                  background: dark ? 'rgba(255,255,255,0.1)' : '#fff',
                  color: '#9CA3AF', border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}`,
                  fontFamily: 'monospace', flexShrink: 0,
                }}>⌘K</span>
            }
          </div>

          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.14 }}
                style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                  background: dark ? '#1A1D27' : '#fff',
                  border: `1px solid ${dark ? '#2D3142' : '#E5E7EB'}`,
                  borderRadius: 12, padding: 6,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                }}
              >
                {['Dashboard', 'Pickup Requests', 'Collectors', 'Reports'].map(link => (
                  <button key={link} style={{
                    width: '100%', textAlign: 'left',
                    padding: '8px 10px', borderRadius: 8,
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: dark ? '#E5E7EB' : '#374151',
                    fontFamily: 'inherit',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : '#F0FDF4'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    {link}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>

          {/* Date/time — hidden on small screens */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 4, lineHeight: 1.3 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: dark ? '#F9FAFB' : '#111827', fontVariantNumeric: 'tabular-nums' }}>
              {formatted}
            </span>
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>{shortDate}</span>
          </div>

          {/* Dark mode */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setDark(!dark)}
            style={btnStyle}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? <Sun size={15} color="#FBBF24" /> : <Moon size={15} color="#6B7280" />}
          </motion.button>

          {/* Messages */}
          <motion.button whileTap={{ scale: 0.9 }} style={btnStyle} title="Messages">
            <MessageSquare size={15} color="#6B7280" />
            <span style={{
              position: 'absolute', top: 6, right: 6,
              width: 7, height: 7, borderRadius: '50%',
              background: '#22C55E',
              border: `2px solid ${dark ? '#0F1117' : '#fff'}`,
            }} />
          </motion.button>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
              style={btnStyle}
              title="Notifications"
            >
              <Bell size={15} color="#6B7280" />
              <span style={{
                position: 'absolute', top: 5, right: 5,
                width: 16, height: 16,
                background: '#EF4444',
                color: '#fff', fontSize: 9, fontWeight: 700,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${dark ? '#0F1117' : '#fff'}`,
              }}>3</span>
            </motion.button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.14 }}
                  style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                    width: 300, borderRadius: 14,
                    background: dark ? '#1A1D27' : '#fff',
                    border: `1px solid ${dark ? '#2D3142' : '#E5E7EB'}`,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${dark ? '#2D3142' : '#F3F4F6'}` }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#F9FAFB' : '#111827' }}>Notifications</span>
                    <button style={{ fontSize: 11, fontWeight: 600, color: '#22C55E', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Mark all read
                    </button>
                  </div>
                  {notifications.map(n => (
                    <div key={n.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: `1px solid ${dark ? '#2D3142' : '#F9FAFB'}`,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.dot, flexShrink: 0, marginTop: 4 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: dark ? '#F9FAFB' : '#111827' }}>{n.title}</p>
                        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{n.desc}</p>
                      </div>
                      <span style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>{n.time}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* New Pickup CTA */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 14px', height: 36,
              borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #16A34A, #22C55E)',
              color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(34,197,94,0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            New Pickup
          </motion.button>

          {/* Profile */}
          <div style={{ position: 'relative' }}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 10px 4px 4px',
                borderRadius: 10, border: `1px solid ${dark ? '#2D3142' : '#E5E7EB'}`,
                background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, #16A34A, #22C55E)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: '#fff',
              }}>AD</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: dark ? '#F9FAFB' : '#374151' }}>Admin</span>
              <ChevronDown size={12} color="#9CA3AF" />
            </motion.button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.14 }}
                  style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                    width: 188, borderRadius: 14,
                    background: dark ? '#1A1D27' : '#fff',
                    border: `1px solid ${dark ? '#2D3142' : '#E5E7EB'}`,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                    padding: 6, overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '8px 10px 10px', marginBottom: 2 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: dark ? '#F9FAFB' : '#111827' }}>SWMS Administrator</p>
                    <p style={{ fontSize: 10, color: '#16A34A', fontWeight: 600, marginTop: 1 }}>admin@swms.local</p>
                  </div>
                  <div style={{ height: 1, background: dark ? '#2D3142' : '#F3F4F6', marginBottom: 4 }} />
                  {['My Profile', 'Account Settings', 'Help & Support'].map(item => (
                    <button key={item} style={{
                      width: '100%', textAlign: 'left', padding: '7px 10px',
                      borderRadius: 8, fontSize: 12, color: dark ? '#E5E7EB' : '#374151',
                      fontFamily: 'inherit', background: 'none', border: 'none', cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : '#F0FDF4'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      {item}
                    </button>
                  ))}
                  <div style={{ height: 1, background: dark ? '#2D3142' : '#F3F4F6', margin: '4px 0' }} />
                  <button
                    onClick={onLogout}
                    style={{
                      width: '100%', textAlign: 'left', padding: '7px 10px',
                      borderRadius: 8, fontSize: 12, color: '#EF4444',
                      fontFamily: 'inherit', background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

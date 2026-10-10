import React, { useState, useEffect } from 'react';
import {
  Home,
  Truck,
  Repeat,
  Award,
  User as UserIcon,
  Bell,
  MapPin,
  Plus,
  ChevronDown,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { CustomerProfile, Address, Notification } from '../../lib/types';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';

interface AppLayoutProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenScheduleWizard: () => void;
  profile: CustomerProfile | null;
  defaultAddress?: Address | null;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onTabChange,
  onOpenScheduleWizard,
  profile,
  defaultAddress,
  children,
}) => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showAddressPicker, setShowAddressPicker] = useState<boolean>(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(defaultAddress || null);

  useEffect(() => {
    setSelectedAddress(defaultAddress || null);
  }, [defaultAddress]);

  useEffect(() => {
    loadNotifications();
    loadAddresses();

    // Subscribe to Server-Sent Events (SSE)
    const userId = profile?.userId || 'usr_demo_customer';
    const eventSource = new EventSource(`/api/notifications/stream?userId=${userId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE notification event:', data);
      } catch (e) {
        // ping or raw
      }
    };

    eventSource.addEventListener('notification', (e) => {
      try {
        const notif = JSON.parse(e.data);
        setNotifications((prev) => [notif, ...prev]);
        setUnreadCount((c) => c + 1);
        toast({
          type: notif.type === 'REWARD' ? 'success' : 'info',
          title: notif.title,
          message: notif.body,
        });
      } catch (err) {
        console.error('Error handling SSE notification:', err);
      }
    });

    eventSource.addEventListener('points_updated', (e) => {
      try {
        const payload = JSON.parse(e.data);
        toast({
          type: 'success',
          title: `+${payload.added} Eco Points Credited! 🎉`,
          message: payload.reason,
        });
      } catch (err) {}
    });

    eventSource.addEventListener('payment_confirmed', (e) => {
      try {
        const payload = JSON.parse(e.data);
        toast({
          type: 'success',
          title: 'Payment Confirmed via Razorpay! 💳',
          message: `Order #${payload.orderId?.slice(-6) || ''} verified successfully.`,
        });
      } catch (err) {}
    });

    return () => {
      eventSource.close();
    };
  }, [profile?.userId]);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (e) {}
  };

  const loadAddresses = async () => {
    try {
      const addrs = await api.getAddresses();
      setAddresses(addrs);
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {}
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'pickups', label: 'Pickups', icon: Truck },
    { id: 'exchange', label: 'Exchange', icon: Repeat },
    { id: 'rewards', label: 'Rewards', icon: Award },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-[#F0EDE6] text-[#16181D] flex flex-col lg:flex-row antialiased">
      {/* ======================================================== */}
      {/* DESKTOP SIDEBAR (>=1024px) */}
      {/* ======================================================== */}
      <aside className="hidden lg:flex flex-col w-72 bg-[#1A1B20] text-white p-6 justify-between shrink-0 h-screen sticky top-0 border-r border-black/20">
        <div>
          {/* Brand Logo Header */}
          <div className="flex items-center gap-3 px-2 py-3 mb-8 cursor-pointer" onClick={() => onTabChange('home')}>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8BC83F] to-[#3E8E41] flex items-center justify-center text-white text-xl font-black shadow-lg">
              🌱
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white block">SWMS</span>
              <span className="text-[10px] uppercase tracking-widest text-[#8BC83F] font-bold block">Smart Waste Portal</span>
            </div>
          </div>

          {/* Quick CTA */}
          <div className="mb-6">
            <button
              onClick={onOpenScheduleWizard}
              className="w-full bg-[#8BC83F] hover:bg-[#7db935] text-[#16181D] font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>Schedule Pickup</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#8BC83F] text-[#16181D] shadow-md font-extrabold'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#16181D] stroke-[2.5]' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Eco Tip Widget */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-2 text-xs font-bold text-[#8BC83F] mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Swachh Tip of the Day</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Rinsing plastic milk pouches before collection prevents bacterial degradation and earns 10% bonus points!
          </p>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* TABLET ICON SIDEBAR (640px - 1023px) */}
      {/* ======================================================== */}
      <aside className="hidden sm:flex lg:hidden flex-col w-20 bg-[#1A1B20] text-white py-6 items-center justify-between shrink-0 h-screen sticky top-0 border-r border-black/20">
        <div className="flex flex-col items-center gap-6">
          <div className="w-10 h-10 rounded-2xl bg-[#3E8E41] flex items-center justify-center text-lg shadow-md cursor-pointer" onClick={() => onTabChange('home')}>
            🌱
          </div>
          <button
            onClick={onOpenScheduleWizard}
            className="w-11 h-11 rounded-2xl bg-[#8BC83F] text-[#16181D] flex items-center justify-center shadow-md hover:bg-[#7db935] cursor-pointer"
            title="Schedule Pickup"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
          <div className="flex flex-col gap-2 mt-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={item.label}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                    isActive ? 'bg-[#8BC83F] text-[#16181D] shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>
        <Avatar name={profile?.name} color={profile?.avatarColor} size="sm" />
      </aside>

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 sm:pb-6">
        {/* TOP HEADER BAR */}
        <header className="bg-white/80 backdrop-blur-md border-b border-[#E6E1D6] sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          {/* Location selector */}
          <div className="flex items-center gap-2 min-w-0 relative">
            <div className="w-9 h-9 rounded-full bg-[#E8F5D8] flex items-center justify-center text-[#3E8E41] shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div
              onClick={() => setShowAddressPicker(!showAddressPicker)}
              className="cursor-pointer group flex items-center gap-1.5 min-w-0"
            >
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Doorstep Pickup Area</span>
                <span className="text-xs sm:text-sm font-extrabold text-[#16181D] truncate block group-hover:text-[#3E8E41] transition-colors">
                  {selectedAddress?.formatted || 'Kadri Hills, Mangaluru'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-[#16181D] transition-transform" />
            </div>

            {/* Address Switcher Dropdown */}
            {showAddressPicker && (
              <div className="absolute top-12 left-0 w-80 bg-white rounded-3xl border border-[#E6E1D6] shadow-xl p-4 z-40 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                  <h4 className="text-xs font-black uppercase text-[#16181D]">Saved Addresses</h4>
                  <button onClick={() => setShowAddressPicker(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {addresses.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => {
                        setSelectedAddress(a);
                        setShowAddressPicker(false);
                        toast({ type: 'info', title: `Pickup location set to ${a.label}` });
                      }}
                      className="p-3 rounded-2xl hover:bg-[#F0EDE6] transition-colors cursor-pointer border border-transparent hover:border-[#E6E1D6]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#16181D]">{a.label}</span>
                        {a.isDefault && <span className="text-[10px] bg-[#E8F5D8] text-[#2E7031] font-bold px-2 py-0.5 rounded-full">Default</span>}
                      </div>
                      <p className="text-xs text-[#6B7280] truncate mt-0.5">{a.formatted}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setShowAddressPicker(false);
                    onTabChange('profile');
                  }}
                  className="w-full mt-3 py-2 text-xs font-bold text-[#3E8E41] hover:underline text-center"
                >
                  Manage all addresses in Settings →
                </button>
              </div>
            )}
          </div>

          {/* Right Header Controls (Notifications, Avatar) */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 rounded-full bg-white border border-[#E6E1D6] hover:bg-[#F0EDE6] flex items-center justify-center text-[#16181D] transition-colors cursor-pointer relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popup Tray */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-3xl border border-[#E6E1D6] shadow-2xl p-4 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-[#16181D]">Live Notifications</h4>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F5D8] text-[#2E7031]">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-bold text-[#3E8E41] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-2.5">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-center text-gray-400 py-6">No notifications yet</p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 rounded-2xl transition-colors ${
                            n.read ? 'bg-gray-50/70' : 'bg-[#E8F5D8]/40 border border-[#8BC83F]/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-black text-[#16181D]">{n.title}</h5>
                            <span className="text-[10px] text-gray-400">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">{n.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar Pill */}
            <div
              onClick={() => onTabChange('profile')}
              className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full bg-white border border-[#E6E1D6] hover:bg-[#F0EDE6] transition-colors cursor-pointer select-none"
            >
              <Avatar name={profile?.name} color={profile?.avatarColor} size="sm" />
              <span className="hidden sm:inline text-xs font-extrabold text-[#16181D]">
                {profile?.name || 'Citizen'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* ======================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (<640px) */}
      {/* ======================================================== */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#1A1B20] flex items-center justify-around px-3 z-40 rounded-t-3xl shadow-[0_-8px_24px_rgba(0,0,0,0.25)] border-t border-white/10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="flex flex-col items-center justify-center flex-1 h-full py-1 transition-transform active:scale-90 cursor-pointer"
            >
              <div
                className={`flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#8BC83F] text-[#16181D] px-4 py-1 rounded-full shadow-md'
                    : 'text-gray-400'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight ${
                  isActive ? 'text-[#8BC83F] font-black' : 'text-gray-400 font-semibold'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

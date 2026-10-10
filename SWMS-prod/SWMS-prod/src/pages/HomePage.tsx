import React from 'react';
import {
  Sparkles,
  ArrowRight,
  Plus,
  Truck,
  Repeat,
  Gift,
  Flame,
  Leaf,
  Scale,
  ShieldCheck,
  ChevronRight,
  Clock,
  MapPin,
  Calendar
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { EcoStats, Pickup, CustomerProfile } from '../lib/types';

interface HomePageProps {
  stats: EcoStats | null;
  profile: CustomerProfile | null;
  pickups: Pickup[];
  onNavigateTab: (tab: string) => void;
  onOpenScheduleWizard: () => void;
  onTrackPickup: (pickupId: string) => void;
  onViewPickupDetails: (pickupId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  stats,
  profile,
  pickups,
  onNavigateTab,
  onOpenScheduleWizard,
  onTrackPickup,
  onViewPickupDetails,
}) => {
  // Find active or upcoming pickup
  const activePickup = pickups.find((p) =>
    ['EN_ROUTE', 'ARRIVED', 'COLLECTING', 'COLLECTED', 'VERIFIED'].includes(p.status)
  );
  const nextUpcoming = pickups.find((p) =>
    ['REQUESTED', 'ASSIGNED', 'ACCEPTED'].includes(p.status)
  );

  const featuredPickup = activePickup || nextUpcoming || pickups[0];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* ======================================================== */}
      {/* HERO SECTION: Greeting & Eco Impact Hero Card */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Hero: Eco Points & Tier */}
        <div className="lg:col-span-7 bg-gradient-to-br from-[#3E8E41] via-[#357d38] to-[#2E7031] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between">
          {/* Subtle eco leaf watermark */}
          <div className="absolute -right-10 -bottom-10 text-white/10 select-none pointer-events-none text-9xl">
            🍃
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white">
                <Sparkles className="w-3.5 h-3.5 text-[#F5C518]" />
                <span>Swachh Citizen Tier</span>
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-[#8BC83F] bg-black/20 px-3 py-1 rounded-full">
                {stats?.tier || 'Eco Starter'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Namaskara, {profile?.name ? profile.name.split(' ')[0] : 'Citizen'}! 🌿
            </h1>
            <p className="text-xs sm:text-sm text-green-100 mt-1 max-w-md">
              Doorstep segregation active. Every recyclable collected keeps Mangaluru coastal clean.
            </p>
          </div>

          {/* Points Display & Progress to Next Tier */}
          <div className="mt-6 pt-6 border-t border-white/15">
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                  {stats?.totalPoints || 50}
                </span>
                <span className="text-sm font-bold text-[#8BC83F] ml-2">Eco Points</span>
              </div>
              <button
                onClick={() => onNavigateTab('rewards')}
                className="text-xs font-extrabold text-[#8BC83F] hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Redeem Catalog</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Progress to next tier */}
            <div className="space-y-1.5">
              <div className="w-full bg-black/30 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#8BC83F] to-[#F5C518] h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${stats?.progressToNextTier || 25}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-bold text-green-200">
                <span>{stats?.progressToNextTier || 25}% to next tier</span>
                <span>Target: {stats?.nextTierPoints || 200} pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Hero: Quick Impact Stats 3-Col / 2-Row */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          <Card className="flex flex-col justify-between p-5 bg-white border border-[#E6E1D6]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B7280]">Recycled</span>
              <div className="w-8 h-8 rounded-full bg-[#E8F5D8] flex items-center justify-center text-sm">
                ⚖️
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-[#16181D]">
                {stats?.totalKgRecycled || 0}
              </span>
              <span className="text-xs font-bold text-[#6B7280] ml-1">kg</span>
              <p className="text-[11px] text-[#3E8E41] font-bold mt-0.5">Diverted from Landfill</p>
            </div>
          </Card>

          <Card className="flex flex-col justify-between p-5 bg-white border border-[#E6E1D6]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B7280]">CO₂ Saved</span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
                🛡️
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-[#16181D]">
                {stats?.totalCo2SavedKg || 0}
              </span>
              <span className="text-xs font-bold text-[#6B7280] ml-1">kg</span>
              <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Carbon Offset</p>
            </div>
          </Card>

          <Card className="flex flex-col justify-between p-5 bg-white border border-[#E6E1D6]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B7280]">Pickups</span>
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
                🚚
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-[#16181D]">
                {stats?.completedPickupsCount || 0}
              </span>
              <p className="text-[11px] text-blue-600 font-bold mt-0.5">Doorstep Completed</p>
            </div>
          </Card>

          <Card className="flex flex-col justify-between p-5 bg-white border border-[#E6E1D6]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B7280]">Streak</span>
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
                🔥
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-[#16181D]">
                {stats?.streakDays || 1}
              </span>
              <span className="text-xs font-bold text-[#6B7280] ml-1">days</span>
              <p className="text-[11px] text-amber-600 font-bold mt-0.5">Eco Habit Active</p>
            </div>
          </Card>
        </div>
      </div>

      {/* ======================================================== */}
      {/* QUICK ACTIONS ROW */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={onOpenScheduleWizard}
          className="bg-[#8BC83F] hover:bg-[#7db935] text-[#16181D] p-5 rounded-3xl shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group active:scale-[0.98] cursor-pointer"
        >
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[#16181D]/80 block">Doorstep Service</span>
            <span className="text-lg font-black text-[#16181D] block mt-0.5">Schedule Pickup</span>
            <span className="text-xs text-[#16181D]/80 font-bold block mt-1">S / M / L bags • Today/Tomorrow</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#16181D] text-[#8BC83F] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('exchange')}
          className="bg-white hover:bg-[#F0EDE6] border border-[#E6E1D6] p-5 rounded-3xl shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group active:scale-[0.98] cursor-pointer"
        >
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[#6B7280] block">Community Market</span>
            <span className="text-lg font-black text-[#16181D] block mt-0.5">Eco Exchange</span>
            <span className="text-xs text-[#6B7280] block mt-1">Buy & sell bulk dry recyclables</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#E8F5D8] text-[#3E8E41] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
            <Repeat className="w-6 h-6" />
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('rewards')}
          className="bg-white hover:bg-[#F0EDE6] border border-[#E6E1D6] p-5 rounded-3xl shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group active:scale-[0.98] cursor-pointer"
        >
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[#6B7280] block">Wallet & Catalog</span>
            <span className="text-lg font-black text-[#16181D] block mt-0.5">Redeem Rewards</span>
            <span className="text-xs text-[#6B7280] block mt-1">Bill discounts & sapling vouchers</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#F5C518]/20 text-[#856404] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
            <Gift className="w-6 h-6" />
          </div>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 2-COLUMN DASHBOARD GRID: Upcoming Pickup & Activity Feed */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Upcoming or Active Pickup Card */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-black text-[#16181D]">
              {activePickup ? 'Active Live Pickup' : 'Upcoming Doorstep Pickup'}
            </h3>
            <button
              onClick={() => onNavigateTab('pickups')}
              className="text-xs font-extrabold text-[#3E8E41] hover:underline cursor-pointer"
            >
              View all pickups →
            </button>
          </div>

          {featuredPickup ? (
            <Card hover className="p-6 border-2 border-[#E6E1D6] hover:border-[#3E8E41]/40">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-[#6B7280] block">
                    #{featuredPickup.id.toUpperCase()}
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-[#16181D] mt-0.5">
                    {featuredPickup.pricingSnapshot?.items
                      ?.map((i) => `${i.numberOfBags}x ${i.wasteTypeName} (${i.bagSize[0]})`)
                      .join(' • ')}
                  </h4>
                </div>
                <StatusBadge status={featuredPickup.status} />
              </div>

              {/* Slot and Location Details */}
              <div className="bg-[#F0EDE6] rounded-2xl p-3.5 space-y-2 text-xs mb-5">
                <div className="flex items-center gap-2 text-[#16181D] font-bold">
                  <Calendar className="w-4 h-4 text-[#3E8E41] shrink-0" />
                  <span>
                    {featuredPickup.scheduledDate} • {featuredPickup.scheduledSlot}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[#6B7280]">
                  <MapPin className="w-4 h-4 text-[#6B7280] shrink-0" />
                  <span className="truncate">{featuredPickup.addressSnapshot?.formatted}</span>
                </div>
              </div>

              {/* Card Footer: Amount & Action Button */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-xs text-[#6B7280] block">Estimated Amount</span>
                  <span className="text-xl font-black text-[#16181D]">
                    ₹{(featuredPickup.totalAmountMinor / 100).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => onViewPickupDetails(featuredPickup.id)}
                    variant="secondary"
                    size="sm"
                  >
                    View Details
                  </Button>
                  {['EN_ROUTE', 'ARRIVED'].includes(featuredPickup.status) ? (
                    <Button
                      onClick={() => onTrackPickup(featuredPickup.id)}
                      variant="primary"
                      size="sm"
                      className="font-black animate-pulse"
                    >
                      <Truck className="w-4 h-4 mr-1.5" />
                      <span>Live Tracking 🚚</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => onViewPickupDetails(featuredPickup.id)}
                      variant="accent"
                      size="sm"
                    >
                      <span>Manage</span>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-[#E8F5D8] flex items-center justify-center text-2xl mb-3">
                📦
              </div>
              <h4 className="font-extrabold text-[#16181D] text-base">No scheduled pickups yet</h4>
              <p className="text-xs text-[#6B7280] max-w-xs mt-1 mb-4">
                Schedule your doorstep recyclable pickup in under 60 seconds.
              </p>
              <Button onClick={onOpenScheduleWizard} variant="primary" size="md">
                Schedule Pickup Now
              </Button>
            </Card>
          )}
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-black text-[#16181D]">Recent Activity</h3>
            <span className="text-xs text-[#6B7280]">Live feed</span>
          </div>

          <Card className="p-4 space-y-3">
            {[
              {
                icon: '🌱',
                title: 'Eco Points Joining Bonus',
                desc: '+50 points awarded for joining portal',
                time: 'Recent',
                points: '+50 pts',
              },
              {
                icon: '🚚',
                title: 'Plastic & Paper Pickup Verified',
                desc: 'Doorstep PIN verified by Rajesh Shetty',
                time: 'Yesterday',
                points: '+42 pts',
              },
              {
                icon: '⭐',
                title: 'First Green Step Unlocked',
                desc: 'Completed your first verified pickup',
                time: '2 days ago',
                points: '+50 pts',
              },
              {
                icon: '📦',
                title: 'Cardboard Box Bundle Inquired',
                desc: 'Listed in Eco Exchange',
                time: '3 days ago',
                points: null,
              },
            ].map((act, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 hover:bg-[#F0EDE6] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#E6E1D6] flex items-center justify-center text-base shrink-0 shadow-xs">
                    {act.icon}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-black text-[#16181D] truncate">{act.title}</h5>
                    <p className="text-[11px] text-[#6B7280] truncate">{act.desc}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  {act.points && (
                    <span className="text-xs font-black text-[#3E8E41] block">{act.points}</span>
                  )}
                  <span className="text-[10px] text-gray-400 block">{act.time}</span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Award,
  Flame,
  Gift,
  Leaf,
  Trophy,
  History,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { EcoStats, Achievement, RewardLedger } from '../lib/types';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';

export const RewardsPage: React.FC = () => {
  const { toast, success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'catalog' | 'achievements' | 'leaderboard' | 'history'>('catalog');
  const [stats, setStats] = useState<EcoStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [ledger, setLedger] = useState<RewardLedger[]>([]);
  const [catalog, setCatalog] = useState<Array<{
    id: string;
    title: string;
    description: string;
    points: number;
    icon: string;
    partner: string;
  }>>([]);
  const [leaderboard, setLeaderboard] = useState<{ topThree: any[]; list: any[]; currentUserRank?: any } | null>(null);

  const [selectedReward, setSelectedReward] = useState<any | null>(null);
  const [claimedCode, setClaimedCode] = useState<string | null>(null);

  useEffect(() => {
    loadRewardsData();
    api.getRewardCatalog().then(setCatalog).catch((e) => error('Could not load rewards', e.message));
    loadLeaderboardData();
    const refresh = () => loadRewardsData();
    window.addEventListener('swms:rewards-updated', refresh);
    return () => window.removeEventListener('swms:rewards-updated', refresh);
  }, []);

  const loadRewardsData = async () => {
    try {
      const data = await api.getRewards();
      setStats(data.stats);
      setAchievements(data.achievements);
      setLedger(data.ledger);
    } catch (e) {}
  };

  const loadLeaderboardData = async () => {
    try {
      const data = await api.getLeaderboard();
      setLeaderboard(data);
    } catch (e) {}
  };

  const handleClaimReward = async (item: (typeof catalog)[number]) => {
    try {
      const result = await api.redeemReward(item.id);
      const voucherCode = result.redemption.voucherCode;
      setClaimedCode(voucherCode);
      setSelectedReward(result.reward);
      await loadRewardsData();
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#8BC83F', '#F5C518', '#3E8E41'],
      });
      success('Reward Redeemed! 🎉', `Voucher Code: ${voucherCode}`);
    } catch (e: any) {
      error('Could not redeem reward', e.message);
      return;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#16181D] tracking-tight">
          Rewards & Achievements
        </h1>
        <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
          Earn eco points for every kg of recycled waste and unlock civic bonuses.
        </p>
      </div>

      {/* Wallet Balance Hero Banner */}
      <div className="bg-gradient-to-br from-[#1A1B20] to-[#262830] text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-[#8BC83F] uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Available Eco Balance</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl sm:text-6xl font-black tracking-tight text-white">
              {stats?.totalPoints || 0}
            </span>
            <span className="text-sm font-bold text-[#8BC83F]">Eco Points</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Tier: <span className="text-white font-bold">{stats?.tier || 'Eco Starter'}</span> • {stats?.progressToNextTier || 25}% to next level
          </p>
        </div>

        {/* Streak Flame Box */}
        <div className="bg-white/10 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/10 flex items-center gap-4 relative z-10 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl">
            🔥
          </div>
          <div>
            <span className="text-xs font-bold text-gray-300 block">Recycling Streak</span>
            <span className="text-xl font-black text-white block mt-0.5">
              {stats?.streakDays || 1} Days Active
            </span>
            <span className="text-[11px] text-[#8BC83F] font-bold block mt-0.5">
              Bonus points unlocked!
            </span>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'catalog', label: 'Redeem Catalog 🎁' },
          { id: 'achievements', label: 'Achievements 🏆' },
          { id: 'leaderboard', label: 'City Leaderboard 🥇' },
          { id: 'history', label: 'Points History' },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-[#3E8E41] text-white shadow-sm'
                  : 'bg-white text-[#6B7280] hover:text-[#16181D] border border-[#E6E1D6]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: REDEEM CATALOG */}
      {/* ======================================================== */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
          {catalog.map((item) => {
            const canAfford = (stats?.totalPoints || 0) >= item.points;

            return (
              <Card key={item.id} hover className="p-6 border-2 border-[#E6E1D6] flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#E8F5D8] flex items-center justify-center text-2xl shrink-0">
                      {item.icon}
                    </div>
                    <span className="text-base font-black text-[#3E8E41] bg-[#E8F5D8] px-3 py-1 rounded-full">
                      {item.points} pts
                    </span>
                  </div>

                  <h3 className="text-base font-black text-[#16181D] mb-1">{item.title}</h3>
                  <p className="text-xs text-[#6B7280] leading-relaxed mb-4">{item.description}</p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#6B7280]">Partner: {item.partner}</span>
                  <Button
                    onClick={() => handleClaimReward(item)}
                    variant={canAfford ? 'accent' : 'secondary'}
                    size="sm"
                    disabled={!canAfford}
                    className="font-black"
                  >
                    <span>{canAfford ? 'Redeem Voucher' : 'Need More Pts'}</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ACHIEVEMENTS */}
      {/* ======================================================== */}
      {activeTab === 'achievements' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
          {achievements.map((ach) => {
            const isUnlocked = ach.isUnlocked;
            const progress = Math.min(ach.targetValue, ach.progress);
            const pct = Math.min(100, Math.round((progress / ach.targetValue) * 100));

            return (
              <Card
                key={ach.id}
                className={`p-6 border-2 transition-all ${
                  isUnlocked
                    ? 'border-[#8BC83F] bg-[#E8F5D8]/30 shadow-xs'
                    : 'border-[#E6E1D6] bg-white opacity-90'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-[#E6E1D6] flex items-center justify-center text-2xl shadow-xs">
                      {ach.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[#16181D]">{ach.name}</h4>
                      <span className="text-xs font-bold text-[#3E8E41]">+{ach.bonusPoints} bonus points</span>
                    </div>
                  </div>

                  {isUnlocked ? (
                    <Badge variant="success">Unlocked ✓</Badge>
                  ) : (
                    <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Locked
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#6B7280] mb-4 leading-relaxed">{ach.description}</p>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        isUnlocked ? 'bg-[#3E8E41]' : 'bg-[#8BC83F]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-[#6B7280]">
                    <span>{progress} / {ach.targetValue}</span>
                    <span>{pct}% complete</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CITY LEADERBOARD */}
      {/* ======================================================== */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {leaderboard?.topThree.map((user, idx) => {
              const medals = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'];
              return (
                <Card
                  key={user.id}
                  className={`p-6 text-center border-2 flex flex-col items-center justify-between ${
                    idx === 0 ? 'border-[#F5C518] bg-[#F5C518]/10' : 'border-[#E6E1D6]'
                  }`}
                >
                  <span className="text-xs font-black uppercase tracking-wider text-amber-700 mb-2">
                    {medals[idx]}
                  </span>
                  <Avatar name={user.name} color={user.avatarColor} size="lg" className="my-2" />
                  <h4 className="text-sm font-black text-[#16181D] mt-1">{user.name}</h4>
                  <span className="text-xl font-black text-[#3E8E41] mt-1">{user.points} pts</span>
                  <span className="text-xs text-[#6B7280] font-bold mt-0.5">{user.kgRecycled} kg recycled</span>
                </Card>
              );
            })}
          </div>

          {/* Full Ranked Table */}
          <Card className="p-0 overflow-hidden divide-y divide-gray-100 border border-[#E6E1D6]">
            {leaderboard?.list.map((u) => (
              <div
                key={u.id}
                className={`p-4 flex items-center justify-between transition-colors ${
                  u.isCurrentUser ? 'bg-[#E8F5D8] font-bold border-l-4 border-[#3E8E41]' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="w-6 text-center font-black text-sm text-[#6B7280]">
                    #{u.rank}
                  </span>
                  <Avatar name={u.name} color={u.avatarColor} size="sm" />
                  <div>
                    <span className="text-xs font-black text-[#16181D] block">
                      {u.name} {u.isCurrentUser && '(You)'}
                    </span>
                    <span className="text-[11px] text-[#6B7280]">{u.tier}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-[#3E8E41] block">{u.points} pts</span>
                  <span className="text-[10px] text-gray-400">{u.kgRecycled} kg</span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: POINTS HISTORY LEDGER */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <Card className="p-0 overflow-hidden divide-y divide-gray-100 border border-[#E6E1D6] animate-in fade-in duration-150">
          {ledger.map((entry) => (
            <div key={entry.id} className="p-4 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-[#16181D]">{entry.description}</h4>
                <span className="text-[10px] text-gray-400">
                  {new Date(entry.createdAt).toLocaleDateString()} • {entry.type}
                </span>
              </div>
              <span
                className={`text-sm font-black font-mono ${
                  entry.points >= 0 ? 'text-[#3E8E41]' : 'text-red-500'
                }`}
              >
                {entry.points >= 0 ? `+${entry.points}` : entry.points} pts
              </span>
            </div>
          ))}
        </Card>
      )}

      {/* Claimed Reward Voucher Modal */}
      {claimedCode && selectedReward && (
        <Modal
          isOpen={Boolean(claimedCode)}
          onClose={() => setClaimedCode(null)}
          title="Reward Claimed Successfully! 🎁"
          maxWidth="sm"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#E8F5D8] flex items-center justify-center text-3xl mx-auto">
              {selectedReward.icon}
            </div>
            <h3 className="text-lg font-black text-[#16181D]">{selectedReward.title}</h3>
            <p className="text-xs text-[#6B7280]">
              Show this voucher code at partner counter or apply in bill payment app:
            </p>

            <div className="p-4 bg-gray-100 rounded-2xl border border-dashed border-gray-400">
              <span className="font-mono font-black text-2xl tracking-widest text-[#2E7031] select-all">
                {claimedCode}
              </span>
            </div>

            <Button onClick={() => setClaimedCode(null)} variant="primary" size="md" className="w-full">
              Done
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

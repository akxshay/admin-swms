import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './components/ui/Toast';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { AppLayout } from './components/layout/AppLayout';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { HomePage } from './pages/HomePage';
import { PickupsPage } from './pages/PickupsPage';
import { LiveTrackingPage } from './pages/LiveTrackingPage';
import { EcoExchangePage } from './pages/EcoExchangePage';
import { RewardsPage } from './pages/RewardsPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SchedulePickupWizard } from './pages/SchedulePickupWizard';
import { api, getActiveUserId, setActiveUserId } from './lib/api';
import { User, CustomerProfile, Address, Pickup, EcoStats } from './lib/types';

function AppContent() {
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [stats, setStats] = useState<EcoStats | null>(null);

  // Navigation state
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [trackingPickupId, setTrackingPickupId] = useState<string | null>(null);
  const [complaintPickupId, setComplaintPickupId] = useState<string | undefined>(undefined);
  const [isScheduleWizardOpen, setIsScheduleWizardOpen] = useState<boolean>(false);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const session = await api.getSession();
      if (session?.user) {
        setUser(session.user);
        setProfile(session.profile);
        setNeedsOnboarding(session.needsOnboarding);

        // Load supplementary customer data
        const [addrs, pkps, prof] = await Promise.all([
          api.getAddresses().catch(() => []),
          api.getPickups().catch(() => []),
          api.getProfile().catch(() => null),
        ]);

        setAddresses(addrs);
        setPickups(pkps);
        if (prof?.stats) setStats(prof.stats);
      }
    } catch (err) {
      console.error('Session load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (userId: string, reqOnboarding: boolean) => {
    setNeedsOnboarding(reqOnboarding);
    loadSession();
  };

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
    loadSession();
  };

  const handleLogout = () => {
    setActiveUserId('usr_logged_out');
    setUser(null);
    setProfile(null);
    setCurrentTab('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0EDE6] flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="w-14 h-14 rounded-3xl bg-[#3E8E41] flex items-center justify-center text-3xl shadow-xl text-white mb-4 animate-bounce">
          🌱
        </div>
        <h2 className="text-xl font-black text-[#16181D]">SWMS Clean City Portal</h2>
        <p className="text-xs text-[#6B7280] mt-1">Connecting to doorstep recyclable network...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <AuthPage onSuccess={handleAuthSuccess} />;
  }

  // Logged in but hasn't completed 3-step onboarding
  if (needsOnboarding) {
    return <OnboardingPage onComplete={handleOnboardingComplete} />;
  }

  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];

  return (
    <>
      <OfflineBanner />
      <AppLayout
        currentTab={currentTab}
        onTabChange={(tab) => {
          setTrackingPickupId(null);
          setCurrentTab(tab);
        }}
        onOpenScheduleWizard={() => setIsScheduleWizardOpen(true)}
        profile={profile}
        defaultAddress={defaultAddress}
      >
        {/* Active View Router */}
        {trackingPickupId ? (
          <LiveTrackingPage
            pickupId={trackingPickupId}
            onBack={() => setTrackingPickupId(null)}
            onPickupUpdated={() => {
              api.getPickups().then(setPickups);
              api.getProfile().then((p) => p && setStats(p.stats));
              window.dispatchEvent(new Event('swms:rewards-updated'));
            }}
          />
        ) : (
          <>
            {currentTab === 'home' && (
              <HomePage
                stats={stats}
                profile={profile}
                pickups={pickups}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onOpenScheduleWizard={() => setIsScheduleWizardOpen(true)}
                onTrackPickup={(id) => setTrackingPickupId(id)}
                onViewPickupDetails={(id) => {
                  setCurrentTab('pickups');
                }}
              />
            )}

            {currentTab === 'pickups' && (
              <PickupsPage
                pickups={pickups}
                onOpenScheduleWizard={() => setIsScheduleWizardOpen(true)}
                onTrackPickup={(id) => setTrackingPickupId(id)}
                onOpenComplaints={(pid) => {
                  setComplaintPickupId(pid);
                  setCurrentTab('complaints');
                }}
                onRefreshPickups={() => {
                  api.getPickups().then(setPickups);
                  api.getProfile().then((p) => p && setStats(p.stats));
                }}
              />
            )}

            {currentTab === 'exchange' && <EcoExchangePage />}

            {currentTab === 'rewards' && <RewardsPage />}

            {currentTab === 'complaints' && (
              <ComplaintsPage initialPickupId={complaintPickupId} />
            )}

            {currentTab === 'profile' && (
              <ProfilePage
                profile={profile}
                onProfileUpdated={() => loadSession()}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </AppLayout>

      {/* Global Schedule Pickup Wizard Modal */}
      <SchedulePickupWizard
        isOpen={isScheduleWizardOpen}
        onClose={() => setIsScheduleWizardOpen(false)}
        onPickupCreated={(pickupId) => {
          api.getPickups().then(setPickups);
          setTrackingPickupId(pickupId);
        }}
        addresses={addresses}
      />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

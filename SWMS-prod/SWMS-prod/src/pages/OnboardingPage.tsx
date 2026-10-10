import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  User as UserIcon,
  MapPin,
  Bell,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Navigation,
  Home,
  Building,
  Building2,
  Store
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { LeafletMap } from '../components/shared/LeafletMap';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';

interface OnboardingPageProps {
  onComplete: () => void;
}

const AVATAR_COLORS = [
  '#3E8E41', // Emerald
  '#8BC83F', // Lime
  '#F5C518', // Gold
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#8B5CF6', // Purple
];

const PROPERTY_TYPES = [
  { id: 'Apartment', label: 'Apartment / Flat', icon: Building2 },
  { id: 'Individual House', label: 'Independent House', icon: Home },
  { id: 'Villa', label: 'Villa / Bungalow', icon: Building },
  { id: 'Commercial', label: 'Office / Shop', icon: Store },
];

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const { toast, success, error } = useToast();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState<string>('Akshay Kumar');
  const [email, setEmail] = useState<string>('akshay.swms@gmail.com');
  const [avatarColor, setAvatarColor] = useState<string>('#3E8E41');
  const [propertyCategory, setPropertyCategory] = useState<string>('Apartment');

  // Address State
  const [line1, setLine1] = useState<string>('Flat 402, Green Valley Apartments');
  const [formattedAddress, setFormattedAddress] = useState<string>('Kadri Hills, Mangaluru, Karnataka 575002');
  const [landmark, setLandmark] = useState<string>('Near Kadri Park');
  const [instructions, setInstructions] = useState<string>('Please buzz 402 on intercom');
  const [lat, setLat] = useState<number>(12.8732);
  const [lng, setLng] = useState<number>(74.8474);
  const [locating, setLocating] = useState<boolean>(false);

  // Reminder
  const [reminderPreference, setReminderPreference] = useState<string>('MORNING_8');

  // GPS Location Trigger
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      error('Geolocation not supported by your browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const detectedLat = pos.coords.latitude;
        const detectedLng = pos.coords.longitude;
        setLat(detectedLat);
        setLng(detectedLng);

        try {
          const res = await api.reverseGeocode(detectedLat, detectedLng);
          if (res.formattedAddress) {
            setFormattedAddress(res.formattedAddress);
            if (res.landmark) setLandmark(res.landmark);
          }
          success('Location Detected', 'Pin updated to current GPS location');
        } catch (e) {
          success('Location Detected', `Latitude: ${detectedLat.toFixed(4)}, Longitude: ${detectedLng.toFixed(4)}`);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        let msg = 'Failed to fetch device GPS position.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied by browser. You can enter your doorstep address manually.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS signal unavailable on this device. You can enter your address details manually.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please retry or enter your address details manually.';
        }
        error('Location GPS Notice', msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleFinishOnboarding = async () => {
    setLoading(true);
    try {
      const res = await api.submitOnboarding({
        name,
        email: email || undefined,
        avatarColor,
        propertyCategory,
        reminderPreference,
        address: {
          label: 'Home',
          line1,
          formatted: formattedAddress,
          landmark,
          instructions,
          lat,
          lng,
        },
      });

      if (res.success) {
        // Trigger celebration confetti
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#3E8E41', '#8BC83F', '#F5C518'],
          });
        } catch (e) {}

        success('Onboarding Completed!', '+50 Eco Points welcome bonus credited to your wallet 🌱');
        setTimeout(() => {
          onComplete();
        }, 1200);
      }
    } catch (err: any) {
      error('Could not save onboarding profile', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0EDE6] flex flex-col items-center justify-center p-4 sm:p-6 antialiased">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-[#E6E1D6] p-6 sm:p-8 shadow-xl">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-black text-[#6B7280] uppercase tracking-wider mb-3">
            <span>Step {step} of 3</span>
            <span className="text-[#3E8E41] font-bold">
              {step === 1 ? 'Personal Details' : step === 2 ? 'Doorstep Address' : 'Preferences & Bonus'}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#3E8E41] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* STEP 1: Personal Details */}
        {/* ======================================================== */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl font-black text-[#16181D]">Welcome to SWMS!</h2>
              <p className="text-xs text-[#6B7280] mt-1">
                Tell us about yourself so collectors know who to contact at your doorstep.
              </p>
            </div>

            {/* Avatar Preview & Color Selection */}
            <div className="p-4 bg-[#F0EDE6] rounded-2xl border border-[#E6E1D6] flex flex-col sm:flex-row items-center gap-4">
              <Avatar name={name} color={avatarColor} size="lg" />
              <div className="flex-1 text-center sm:text-left">
                <span className="text-xs font-bold text-[#16181D] block mb-2">Pick Your Avatar Color</span>
                <div className="flex items-center justify-center sm:justify-start gap-2.5">
                  {AVATAR_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setAvatarColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        avatarColor === col ? 'border-[#16181D] scale-110 shadow-md ring-2 ring-black/20' : 'border-white'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <Input
              label="Full Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Akshay Kumar"
              required
            />

            <Input
              label="Email Address (Optional for e-receipts)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="akshay@gmail.com"
            />

            {/* Property category */}
            <div>
              <label className="block text-xs font-bold text-[#16181D] uppercase tracking-wider mb-2">
                Property Category
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {PROPERTY_TYPES.map((pt) => {
                  const Icon = pt.icon;
                  const isSelected = propertyCategory === pt.id;
                  return (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => setPropertyCategory(pt.id)}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#3E8E41] bg-[#E8F5D8] text-[#16181D] font-bold'
                          : 'border-[#E6E1D6] bg-white text-[#6B7280] hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#3E8E41]' : 'text-gray-400'}`} />
                      <span className="text-xs">{pt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              type="button"
              onClick={() => {
                if (!name.trim()) {
                  error('Please enter your name');
                  return;
                }
                setStep(2);
              }}
              variant="primary"
              size="lg"
              className="w-full text-base font-black shadow-lg"
            >
              <span>Continue to Address</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: Doorstep Address */}
        {/* ======================================================== */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl font-black text-[#16181D]">Set Doorstep Location</h2>
              <p className="text-xs text-[#6B7280] mt-1">
                Your primary pickup address in Mangaluru / Dakshina Kannada.
              </p>
            </div>

            {/* Live GPS Detection Button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="w-full p-3.5 bg-[#E8F5D8] hover:bg-[#d8eed0] border border-[#8BC83F] rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold text-[#2E7031] transition-all active:scale-[0.98] cursor-pointer"
            >
              <Navigation className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Locating via GPS...' : '📍 Use Current GPS Location'}</span>
            </button>

            {/* Interactive Leaflet Map Pin */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-[#16181D] uppercase tracking-wider block">
                Drag Pin to Adjust Doorstep
              </span>
              <LeafletMap
                center={[lat, lng]}
                customerLocation={[lat, lng]}
                isDraggable={true}
                onLocationChange={(newLat, newLng) => {
                  setLat(newLat);
                  setLng(newLng);
                  api.reverseGeocode(newLat, newLng).then((res) => {
                    if (res.formattedAddress) setFormattedAddress(res.formattedAddress);
                  });
                }}
                className="h-52 w-full rounded-2xl shadow-inner"
              />
            </div>

            <Input
              label="Flat / Door / House No. & Building Name *"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              placeholder="e.g. Flat 402, Green Valley Apartments"
              required
            />

            <Input
              label="Street / Area / Locality"
              value={formattedAddress}
              onChange={(e) => setFormattedAddress(e.target.value)}
              placeholder="Kadri Hills, Mangaluru"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Landmark"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Opposite Kadri Park"
              />
              <Input
                label="Collector Instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Intercom 402 or call"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={() => setStep(1)}
                variant="secondary"
                size="lg"
                className="flex-1"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                <span>Back</span>
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!line1.trim()) {
                    error('Please specify your door or flat number');
                    return;
                  }
                  setStep(3);
                }}
                variant="primary"
                size="lg"
                className="flex-2 font-black shadow-lg"
              >
                <span>Next: Preferences</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: Reminder Preference & Welcome Bonus */}
        {/* ======================================================== */}
        {step === 3 && (
          <div className="space-y-6 text-center animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl font-black text-[#16181D]">Joining Bonus! 🎉</h2>
              <p className="text-xs text-[#6B7280] mt-1">
                You are ready to start doorstep recycling.
              </p>
            </div>

            {/* Welcome Bonus Card (Shows bonus once, not on every step) */}
            <div className="bg-gradient-to-br from-[#E8F5D8] to-[#8BC83F]/30 p-6 rounded-3xl border-2 border-[#8BC83F] shadow-md flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-3xl shadow-md mb-3 border-2 border-[#8BC83F]">
                🎁
              </div>
              <h3 className="text-3xl font-black text-[#2E7031] tracking-tight">+50 Eco Points</h3>
              <p className="text-xs text-[#16181D] font-bold mt-1">
                Swachh Bharat Citizen Joining Reward
              </p>
              <p className="text-xs text-[#6B7280] mt-2 max-w-xs leading-relaxed">
                Use your eco points to claim electricity bill discounts, free compost bags, or plant saplings.
              </p>
            </div>

            {/* Reminder Preference Selector */}
            <div className="text-left space-y-2">
              <label className="block text-xs font-bold text-[#16181D] uppercase tracking-wider">
                Daily Waste Segregation Reminder
              </label>
              <div className="space-y-2">
                {[
                  { id: 'MORNING_8', label: 'Morning Reminder (8:00 AM)', desc: 'Best for day pickups' },
                  { id: 'EVENING_20', label: 'Evening Reminder (8:00 PM)', desc: 'Set aside before next day' },
                  { id: 'NONE', label: 'No Automatic Reminders', desc: 'I will schedule manually' },
                ].map((rem) => {
                  const isSelected = reminderPreference === rem.id;
                  return (
                    <div
                      key={rem.id}
                      onClick={() => setReminderPreference(rem.id)}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#3E8E41] bg-[#E8F5D8] text-[#16181D]'
                          : 'border-[#E6E1D6] bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block">{rem.label}</span>
                        <span className="text-[11px] text-[#6B7280] block">{rem.desc}</span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-[#3E8E41] bg-[#3E8E41] text-white' : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={() => setStep(2)}
                variant="secondary"
                size="lg"
                className="flex-1"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                <span>Back</span>
              </Button>
              <Button
                type="button"
                onClick={handleFinishOnboarding}
                variant="accent"
                size="lg"
                loading={loading}
                className="flex-2 font-black text-base shadow-xl"
              >
                <span>Claim +50 Pts & Start</span>
                <Sparkles className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

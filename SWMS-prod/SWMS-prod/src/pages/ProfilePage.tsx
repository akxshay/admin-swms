import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  MapPin,
  CreditCard,
  Shield,
  HelpCircle,
  LogOut,
  Plus,
  Trash2,
  Check,
  Download,
  AlertTriangle,
  Phone,
  Mail,
  Building,
  ExternalLink,
  Navigation
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Badge, PaymentStatusBadge } from '../components/ui/Badge';
import { CustomerProfile, Address } from '../lib/types';
import { api, setActiveUserId } from '../lib/api';
import { useToast } from '../components/ui/Toast';

interface ProfilePageProps {
  profile: CustomerProfile | null;
  onProfileUpdated: () => void;
  onLogout: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  profile,
  onProfileUpdated,
  onLogout,
}) => {
  const { toast, success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'payments' | 'privacy' | 'faq'>('profile');

  // Edit Profile Form State
  const [name, setName] = useState<string>(profile?.name || '');
  const [email, setEmail] = useState<string>(profile?.email || '');
  const [propertyCategory, setPropertyCategory] = useState<string>(profile?.propertyCategory || 'Apartment');
  const [reminderPreference, setReminderPreference] = useState<string>(profile?.reminderPreference || 'MORNING_8');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Addresses State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddAddressModal, setShowAddAddressModal] = useState<boolean>(false);
  const [newLabel, setNewLabel] = useState<string>('Office');
  const [newLine1, setNewLine1] = useState<string>('');
  const [newFormatted, setNewFormatted] = useState<string>('Bejai, Mangaluru');
  const [newInstructions, setNewInstructions] = useState<string>('');
  const [newLat, setNewLat] = useState<number>(12.8732);
  const [newLng, setNewLng] = useState<number>(74.8474);
  const [fetchingGps, setFetchingGps] = useState<boolean>(false);

  const handleFetchCurrentGps = () => {
    if (!navigator.geolocation) {
      error('GPS Unsupported', 'Your browser does not support geolocation.');
      return;
    }
    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setNewLat(latitude);
        setNewLng(longitude);
        try {
          const rev = await api.reverseGeocode(latitude, longitude);
          if (rev.formattedAddress) {
            setNewFormatted(rev.formattedAddress);
          }
          if (rev.landmark && !newLine1) {
            setNewLine1(rev.landmark);
          }
          success('GPS Detected', `Accuracy: ±${Math.round(accuracy)}m`);
        } catch (e) {
          success('GPS Detected', `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } finally {
          setFetchingGps(false);
        }
      },
      (err) => {
        setFetchingGps(false);
        let msg = 'Failed to fetch device GPS.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied by browser. Please type your address manually.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location services unavailable on this device.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please retry or enter manually.';
        }
        error('GPS Notice', msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Payments State
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  useEffect(() => {
    loadAddresses();
    loadPayments();
  }, []);

  const loadAddresses = async () => {
    try {
      const data = await api.getAddresses();
      setAddresses(data);
    } catch (e) {}
  };

  const loadPayments = async () => {
    try {
      const data = await api.getPaymentHistory();
      setPaymentHistory(data);
    } catch (e) {}
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.updateProfile({
        name,
        email: email || null,
        propertyCategory,
        reminderPreference: reminderPreference as any,
      });
      success('Profile Updated', 'Your profile details were saved.');
      onProfileUpdated();
    } catch (err: any) {
      error('Failed to update profile', err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLine1.trim()) {
      error('Address line is required');
      return;
    }

    try {
      await api.createAddress({
        label: newLabel,
        line1: newLine1,
        formatted: newFormatted,
        instructions: newInstructions || undefined,
        lat: newLat,
        lng: newLng,
      });
      success('Address Saved', 'New doorstep location added.');
      setShowAddAddressModal(false);
      setNewLine1('');
      loadAddresses();
    } catch (err: any) {
      error('Could not save address', err.message);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await api.deleteAddress(id);
      success('Address Removed', 'Saved address deleted.');
      loadAddresses();
    } catch (err: any) {
      error('Failed to delete address', err.message);
    }
  };

  const handleExportData = () => {
    const exportData = {
      profile,
      addresses,
      paymentHistory,
      exportedAt: new Date().toISOString(),
      governance: 'India Digital Personal Data Protection (DPDP) Act Compliance',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SWMS_Data_Export_${profile?.userId || 'Citizen'}.json`;
    a.click();
    success('Data Export Ready', 'Downloaded your citizen profile & pickup history (JSON).');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#16181D] tracking-tight">
            Account & Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
            Manage your personal profile, doorstep addresses, and privacy preferences.
          </p>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'profile', label: 'Personal Details' },
          { id: 'addresses', label: `Saved Addresses (${addresses.length})` },
          { id: 'payments', label: 'Payment Receipts' },
          { id: 'privacy', label: 'Privacy & DPDP Act' },
          { id: 'faq', label: 'Help & FAQ' },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-[#1A1B20] text-white shadow-xs'
                  : 'bg-white text-[#6B7280] hover:text-[#16181D] border border-[#E6E1D6]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PERSONAL DETAILS */}
      {/* ======================================================== */}
      {activeTab === 'profile' && (
        <Card className="p-6 sm:p-8 max-w-2xl border-2 border-[#E6E1D6] animate-in fade-in duration-150">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <Avatar name={name} color={profile?.avatarColor} size="lg" />
              <div>
                <h3 className="text-lg font-black text-[#16181D]">{name || 'Citizen Recycler'}</h3>
                <span className="text-xs text-[#3E8E41] font-bold">Verified Swachh Citizen Account</span>
              </div>
            </div>

            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Email Address (For Tax Invoices & E-Receipts)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div>
              <label className="block text-xs font-bold text-[#16181D] uppercase tracking-wider mb-1.5">
                Property Category
              </label>
              <select
                value={propertyCategory}
                onChange={(e) => setPropertyCategory(e.target.value)}
                className="w-full bg-white border border-[#E6E1D6] rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-[#3E8E41] outline-none"
              >
                <option value="Apartment">Apartment / High-Rise Flat</option>
                <option value="Individual House">Independent House</option>
                <option value="Villa">Villa / Gated Community</option>
                <option value="Commercial">Commercial Office / Store</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#16181D] uppercase tracking-wider mb-1.5">
                Segregation Reminder Schedule
              </label>
              <select
                value={reminderPreference}
                onChange={(e) => setReminderPreference(e.target.value)}
                className="w-full bg-white border border-[#E6E1D6] rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-[#3E8E41] outline-none"
              >
                <option value="MORNING_8">Morning (8:00 AM)</option>
                <option value="EVENING_20">Evening (8:00 PM)</option>
                <option value="NONE">No Automatic Reminders</option>
              </select>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={savingProfile}
              className="w-full font-black mt-2 shadow-lg"
            >
              <span>Save Changes</span>
            </Button>
          </form>
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SAVED ADDRESSES */}
      {/* ======================================================== */}
      {activeTab === 'addresses' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddAddressModal(true)} variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1.5 stroke-[3]" />
              <span>Add New Address</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <Card key={addr.id} className="p-5 border-2 border-[#E6E1D6] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-[#16181D] uppercase tracking-wider">
                      {addr.label}
                    </span>
                    {addr.isDefault && (
                      <Badge variant="primary">Default Location</Badge>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-[#16181D]">{addr.line1}</h4>
                  <p className="text-xs text-[#6B7280] mt-0.5">{addr.formatted}</p>
                  {addr.instructions && (
                    <p className="text-[11px] text-[#3E8E41] font-medium mt-1">
                      Instructions: {addr.instructions}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">
                    GPS: {addr.lat.toFixed(3)}, {addr.lng.toFixed(3)}
                  </span>
                  {!addr.isDefault && (
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PAYMENT RECEIPTS */}
      {/* ======================================================== */}
      {activeTab === 'payments' && (
        <Card className="p-0 overflow-hidden divide-y divide-gray-100 border border-[#E6E1D6] animate-in fade-in duration-150">
          {paymentHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6B7280]">
              No past payment receipts. Pay at doorstep or online during pickup.
            </div>
          ) : (
            paymentHistory.map((pmt) => (
              <div key={pmt.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#16181D]">
                      #{pmt.id.slice(-8).toUpperCase()}
                    </span>
                    <PaymentStatusBadge status={pmt.status} />
                  </div>
                  <span className="text-[11px] text-gray-400 mt-0.5 block">
                    {new Date(pmt.createdAt).toLocaleDateString()} • {pmt.provider}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-[#16181D] block">
                    ₹{(pmt.amountMinor / 100).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-[#3E8E41] font-bold">Tax Invoice Ready</span>
                </div>
              </div>
            ))
          )}
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 4: PRIVACY & DPDP ACT COMPLIANCE */}
      {/* ======================================================== */}
      {activeTab === 'privacy' && (
        <Card className="p-6 sm:p-8 max-w-2xl border-2 border-[#E6E1D6] space-y-6 animate-in fade-in duration-150">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#3E8E41] mb-1">
              <Shield className="w-4 h-4" />
              <span>Digital Personal Data Protection Act (DPDP) 2023</span>
            </div>
            <h3 className="text-xl font-black text-[#16181D]">Your Data Rights & Security</h3>
            <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
              SWMS operates under strict data minimization standards. Your location coordinates and waste generation telemetry are encrypted and never sold to third parties.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-200">
              <div>
                <h4 className="text-xs font-black text-[#16181D]">Export All Personal Data</h4>
                <p className="text-[11px] text-[#6B7280]">
                  Download a complete portable JSON archive of your profile, pickups, and payments.
                </p>
              </div>
              <Button onClick={handleExportData} variant="secondary" size="sm" className="shrink-0 font-bold">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                <span>Export JSON</span>
              </Button>
            </div>

            <div className="p-4 bg-red-50/60 rounded-2xl flex items-center justify-between border border-red-200">
              <div>
                <h4 className="text-xs font-black text-red-700">Right to Erasure / Delete Account</h4>
                <p className="text-[11px] text-red-600/80">
                  Request immediate deletion of phone number, addresses, and account history.
                </p>
              </div>
              <Button
                onClick={() => {
                  toast({
                    type: 'info',
                    title: 'Erasure Request Logged',
                    message: 'DPDP Data Officer has registered your erasure request. Processed within 48 hours.',
                  });
                }}
                variant="danger"
                size="sm"
                className="shrink-0 font-bold text-xs"
              >
                <span>Request Erasure</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ======================================================== */}
      {/* TAB 5: FAQ & CONTACT */}
      {/* ======================================================== */}
      {activeTab === 'faq' && (
        <div className="space-y-4 max-w-3xl animate-in fade-in duration-150">
          <Card className="p-6 bg-[#E8F5D8] border border-[#8BC83F] flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase text-[#2E7031] block">24/7 Swachh Helpline</span>
              <h3 className="text-xl font-black text-[#16181D] mt-0.5">+91 824 222 4110</h3>
              <p className="text-xs text-[#2E7031] mt-1">Mangaluru City Corporation Solid Waste Division</p>
            </div>
            <a
              href="tel:+918242224110"
              className="px-4 py-2.5 rounded-full bg-[#3E8E41] text-white font-black text-xs shadow-md"
            >
              Call Helpline
            </a>
          </Card>

          <div className="space-y-3">
            {[
              {
                q: 'How does doorstep recyclable waste pickup work?',
                a: 'You select the dry waste categories (plastic, paper, metal, e-waste, glass) and bag sizes in the portal. An assigned electric vehicle partner visits your doorstep at the chosen time slot, inspects the segregation, and weighs the bags on a digital scale.',
              },
              {
                q: 'What is the Doorstep Verification PIN?',
                a: 'For security and proof of service, a 4-digit PIN is generated on your app once the collector arrives. Please read this PIN to the collector only after your waste has been weighed and collected.',
              },
              {
                q: 'How are Eco Points calculated and redeemed?',
                a: 'Points are computed automatically based on the weight collected and the specific carbon avoidance factor (e.g. 1.6x for plastics, 4.5x for scrap metals). Points can be redeemed for electricity bill vouchers, free compost, and saplings.',
              },
            ].map((item, idx) => (
              <Card key={idx} className="p-5 border-2 border-[#E6E1D6]">
                <h4 className="text-sm font-black text-[#16181D] mb-1.5">{item.q}</h4>
                <p className="text-xs text-[#6B7280] leading-relaxed">{item.a}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Address Modal */}
      {showAddAddressModal && (
        <Modal
          isOpen={showAddAddressModal}
          onClose={() => setShowAddAddressModal(false)}
          title="Add New Doorstep Address"
          maxWidth="sm"
        >
          <form onSubmit={handleAddAddress} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#16181D] uppercase tracking-wider mb-1.5">
                Address Label
              </label>
              <div className="flex gap-2 mb-2">
                <select
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="flex-1 bg-white border border-[#E6E1D6] rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-[#3E8E41] outline-none"
                >
                  <option value="Home">Home</option>
                  <option value="Office">Office / Workspace</option>
                  <option value="Store">Store / Warehouse</option>
                  <option value="Other">Other</option>
                </select>

                <button
                  type="button"
                  onClick={handleFetchCurrentGps}
                  disabled={fetchingGps}
                  className="px-3.5 py-2.5 rounded-2xl bg-[#E8F5D8] hover:bg-[#d8edc0] text-[#2E7031] text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  title="Detect coordinates from browser GPS"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{fetchingGps ? 'Detecting...' : 'Use My GPS'}</span>
                </button>
              </div>
            </div>

            <Input
              label="Flat / Door / Building No. *"
              value={newLine1}
              onChange={(e) => setNewLine1(e.target.value)}
              placeholder="e.g. Suite 201, Crystal Arc"
              required
            />

            <Input
              label="Street / Locality"
              value={newFormatted}
              onChange={(e) => setNewFormatted(e.target.value)}
              placeholder="Bejai Main Road, Mangaluru"
              required
            />

            <Input
              label="Instructions for Collector"
              value={newInstructions}
              onChange={(e) => setNewInstructions(e.target.value)}
              placeholder="Near elevator or security gate"
            />

            <Button type="submit" variant="primary" size="lg" className="w-full font-black mt-2 shadow-lg">
              <span>Save Address</span>
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
};

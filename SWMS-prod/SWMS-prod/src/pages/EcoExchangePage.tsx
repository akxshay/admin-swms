import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  MapPin,
  Repeat,
  Building,
  Phone,
  CheckCircle2,
  ExternalLink,
  Filter,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { ExchangeListing, ExchangeHub } from '../lib/types';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';

const MATERIALS = ['ALL', 'Paper & Cardboard', 'Plastics', 'Scrap Metal', 'Glass Bottles', 'E-Waste'];

export const EcoExchangePage: React.FC = () => {
  const { toast, success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'listings' | 'hubs'>('listings');
  const [listings, setListings] = useState<ExchangeListing[]>([]);
  const [hubs, setHubs] = useState<ExchangeHub[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedListing, setSelectedListing] = useState<ExchangeListing | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // New listing form state
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newMaterial, setNewMaterial] = useState<string>('Paper & Cardboard');
  const [newQuantityKg, setNewQuantityKg] = useState<string>('15');
  const [newPriceRupees, setNewPriceRupees] = useState<string>('150');
  const [creating, setCreating] = useState<boolean>(false);

  useEffect(() => {
    loadListings();
    loadHubs();
  }, [selectedMaterial, searchQuery]);

  const loadListings = async () => {
    try {
      const data = await api.getExchangeListings({
        material: selectedMaterial !== 'ALL' ? selectedMaterial : undefined,
        query: searchQuery || undefined,
      });
      setListings(data);
    } catch (e) {}
  };

  const loadHubs = async () => {
    try {
      const data = await api.getExchangeHubs();
      setHubs(data);
    } catch (e) {}
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      error('Title is required');
      return;
    }

    setCreating(true);
    try {
      await api.createExchangeListing({
        title: newTitle,
        description: newDesc,
        material: newMaterial,
        quantityKg: parseFloat(newQuantityKg) || 10,
        priceMinor: Math.round((parseFloat(newPriceRupees) || 100) * 100),
      });

      success('Listing Published! 📦', 'Your recyclables are now visible on Eco Exchange.');
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      loadListings();
    } catch (err: any) {
      error('Could not publish listing', err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#16181D] tracking-tight">
            Eco Exchange
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
            Community marketplace for segregated recyclables & municipal recovery hubs in Mangaluru.
          </p>
        </div>

        <Button onClick={() => setShowCreateModal(true)} variant="primary" size="md" className="shadow-md">
          <Plus className="w-5 h-5 mr-1.5 stroke-[3]" />
          <span>Post New Listing</span>
        </Button>
      </div>

      {/* Primary Tab Bar: Marketplace vs Municipal Hubs */}
      <div className="flex items-center gap-3 border-b border-[#E6E1D6] pb-3">
        <button
          onClick={() => setActiveTab('listings')}
          className={`pb-2 px-1 text-sm font-black border-b-2 transition-all cursor-pointer ${
            activeTab === 'listings'
              ? 'border-[#3E8E41] text-[#3E8E41]'
              : 'border-transparent text-[#6B7280] hover:text-[#16181D]'
          }`}
        >
          Community Listings ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab('hubs')}
          className={`pb-2 px-1 text-sm font-black border-b-2 transition-all cursor-pointer ${
            activeTab === 'hubs'
              ? 'border-[#3E8E41] text-[#3E8E41]'
              : 'border-transparent text-[#6B7280] hover:text-[#16181D]'
          }`}
        >
          Nearby Exchange Hubs ({hubs.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: LISTINGS MARKETPLACE */}
      {/* ======================================================== */}
      {activeTab === 'listings' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Search Bar & Category Filter Pills */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search boxes, clean PET bottles, copper wire..."
                className="w-full bg-white border border-[#E6E1D6] rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#3E8E41] outline-none"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {MATERIALS.map((mat) => (
                <button
                  key={mat}
                  onClick={() => setSelectedMaterial(mat)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    selectedMaterial === mat
                      ? 'bg-[#1A1B20] text-white shadow-xs'
                      : 'bg-white text-[#6B7280] border border-[#E6E1D6] hover:bg-gray-50'
                  }`}
                >
                  {mat}
                </button>
              ))}
            </div>
          </div>

          {/* Listings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((item) => (
              <Card
                key={item.id}
                hover
                onClick={() => setSelectedListing(item)}
                className="p-0 overflow-hidden flex flex-col justify-between border-2 border-[#E6E1D6] hover:border-[#3E8E41]/40 cursor-pointer"
              >
                {/* Photo & Material Badge */}
                <div className="h-48 relative overflow-hidden bg-gray-100">
                  <img
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=500'}
                    alt={item.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=500';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-black text-white">
                    {item.material}
                  </div>
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-black text-[#16181D] shadow-sm">
                    {item.quantityKg} kg
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-base font-black text-[#16181D] leading-snug line-clamp-1">
                        {item.title}
                      </h3>
                      <span className="text-base font-black text-[#3E8E41] shrink-0">
                        ₹{(item.priceMinor / 100).toFixed(0)}
                      </span>
                    </div>

                    <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed mb-4">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-[#6B7280]">
                    <div className="flex items-center gap-2">
                      <Avatar name={item.sellerName} color={item.sellerAvatarColor} size="sm" />
                      <span className="font-bold text-[#16181D] truncate max-w-[100px]">
                        {item.sellerName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-[#3E8E41]" />
                      <span>{item.distanceKm ? `${item.distanceKm} km` : 'Mangaluru'}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: NEARBY MUNICIPAL HUBS */}
      {/* ======================================================== */}
      {activeTab === 'hubs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
          {hubs.map((hub) => (
            <Card key={hub.id} hover className="p-6 border-2 border-[#E6E1D6] space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#E8F5D8] flex items-center justify-center text-[#2E7031] text-2xl shrink-0">
                    🏛️
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#16181D]">{hub.name}</h3>
                    <span className="text-xs text-[#3E8E41] font-bold">
                      {hub.distanceKm ? `≈ ${hub.distanceKm} km from you` : 'Kadri Area'}
                    </span>
                  </div>
                </div>
                <Badge variant="primary">Verified Hub</Badge>
              </div>

              <p className="text-xs text-[#6B7280] leading-relaxed">{hub.description}</p>

              <div className="bg-[#F0EDE6] p-3 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-[#16181D]">
                  <MapPin className="w-3.5 h-3.5 text-[#3E8E41] shrink-0" />
                  <span className="truncate">{hub.address}</span>
                </div>
                <div className="flex items-center justify-between text-[#6B7280]">
                  <span>Timing: {hub.timing}</span>
                  <span className="font-bold text-[#16181D]">{hub.contact}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Listing Details Modal */}
      {selectedListing && (
        <Modal
          isOpen={Boolean(selectedListing)}
          onClose={() => setSelectedListing(null)}
          title={selectedListing.title}
          maxWidth="lg"
        >
          <div className="space-y-5">
            <div className="h-56 rounded-2xl overflow-hidden bg-gray-100">
              <img
                src={selectedListing.imageUrl || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=500'}
                alt={selectedListing.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=500';
                }}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-black text-[#3E8E41]">
                  ₹{(selectedListing.priceMinor / 100).toFixed(0)}
                </span>
                <span className="text-xs text-[#6B7280] ml-2">
                  ({selectedListing.quantityKg} kg bulk material)
                </span>
              </div>
              <Badge variant="accent">{selectedListing.material}</Badge>
            </div>

            <p className="text-xs text-[#16181D] leading-relaxed bg-[#F0EDE6] p-4 rounded-2xl">
              {selectedListing.description}
            </p>

            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border">
              <div className="flex items-center gap-2.5">
                <Avatar name={selectedListing.sellerName} color={selectedListing.sellerAvatarColor} size="md" />
                <div>
                  <span className="text-xs font-bold block">{selectedListing.sellerName}</span>
                  <span className="text-[11px] text-[#6B7280]">Verified Recycler • Mangaluru</span>
                </div>
              </div>
              <span className="text-xs font-bold text-[#3E8E41]">
                📍 {selectedListing.distanceKm || 1.8} km away
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => {
                  toast({
                    type: 'success',
                    title: 'Inquiry Sent! 📩',
                    message: `Contact request sent to ${selectedListing.sellerName}.`,
                  });
                  setSelectedListing(null);
                }}
                variant="primary"
                size="md"
                className="flex-1 font-black"
              >
                <span>Reserve & Enquire</span>
              </Button>
              <Button
                onClick={() => {
                  toast({
                    type: 'info',
                    title: 'Seller Contact',
                    message: '+91 98450 12345 (Priya Hegde)',
                  });
                }}
                variant="secondary"
                size="md"
                className="flex-1"
              >
                <Phone className="w-4 h-4 mr-1.5" />
                <span>Call Seller</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Post New Listing Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Post Recyclables on Eco Exchange"
          maxWidth="md"
        >
          <form onSubmit={handleCreateListing} className="space-y-4">
            <Input
              label="Listing Title *"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. 20 Cardboard Packaging Boxes (Clean)"
              required
            />

            <div>
              <label className="block text-xs font-bold text-[#16181D] uppercase tracking-wider mb-1.5">
                Material Category
              </label>
              <select
                value={newMaterial}
                onChange={(e) => setNewMaterial(e.target.value)}
                className="w-full bg-white border border-[#E6E1D6] rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-[#3E8E41] outline-none"
              >
                {MATERIALS.filter((m) => m !== 'ALL').map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantity (kg) *"
                type="number"
                step="0.5"
                value={newQuantityKg}
                onChange={(e) => setNewQuantityKg(e.target.value)}
                required
              />
              <Input
                label="Price (₹ INR) *"
                type="number"
                value={newPriceRupees}
                onChange={(e) => setNewPriceRupees(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#16181D] uppercase tracking-wider mb-1.5">
                Description & Pickup Notes
              </label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                placeholder="Condition, clean state, packaging, and available times..."
                className="w-full bg-white border border-[#E6E1D6] rounded-2xl p-3.5 text-xs focus:ring-2 focus:ring-[#3E8E41] outline-none"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={creating}
              className="w-full font-black mt-2 shadow-lg"
            >
              <span>Publish Listing Immediately</span>
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
};

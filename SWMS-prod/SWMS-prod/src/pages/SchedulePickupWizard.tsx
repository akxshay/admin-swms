import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Minus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  CreditCard,
  Banknote,
  Sparkles,
  Info,
  Navigation,
  Search,
  Crosshair,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LeafletMap } from '../components/shared/LeafletMap';
import { WasteImage } from '../components/shared/WasteImage';
import { WasteType, Address, BagSize } from '../lib/types';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';

interface SchedulePickupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onPickupCreated: (pickupId: string) => void;
  addresses: Address[];
}

interface SelectedItem {
  wasteTypeId: string;
  wasteTypeName: string;
  bagSize: BagSize;
  numberOfBags: number;
}

const BAG_SIZE_HINTS: Record<BagSize, { label: string; volume: string; approxKg: number }> = {
  SMALL: { label: 'Small Bag', volume: '15-20 Liters', approxKg: 3 },
  MEDIUM: { label: 'Medium Bag', volume: '30-40 Liters', approxKg: 8 },
  LARGE: { label: 'Large Bag', volume: '60+ Liters', approxKg: 18 },
};

const TIME_SLOTS = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
];

export const SchedulePickupWizard: React.FC<SchedulePickupWizardProps> = ({
  isOpen,
  onClose,
  onPickupCreated,
  addresses,
}) => {
  const { toast, success, error } = useToast();

  const [step, setStep] = useState<number>(1);
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Location Selection Modes: 'live_gps' | 'saved' | 'map' | 'search'
  const [locationMode, setLocationMode] = useState<'live_gps' | 'saved' | 'map' | 'search'>(
    addresses.length > 0 ? 'saved' : 'live_gps'
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  // 1. Live Device GPS State
  const [liveGpsCoords, setLiveGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [liveGpsAddress, setLiveGpsAddress] = useState<{
    formatted: string;
    line1: string;
    landmark?: string;
  } | null>(null);
  const [liveGpsLoading, setLiveGpsLoading] = useState<boolean>(false);
  const [liveGpsConfirmed, setLiveGpsConfirmed] = useState<boolean>(false);
  const [liveGpsError, setLiveGpsError] = useState<string | null>(null);

  // 2. Map Pin Drop State
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number }>({
    lat: 12.8732,
    lng: 74.8474,
  });
  const [mapAddress, setMapAddress] = useState<{
    formatted: string;
    line1: string;
    landmark?: string;
  } | null>(null);
  const [mapLoading, setMapLoading] = useState<boolean>(false);

  // 3. Search Address State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<
    Array<{ placeId: string | number; name: string; formatted: string; lat: number; lng: number }>
  >([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Date, Slot, and Payment Mode
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledSlot, setScheduledSlot] = useState<string>('10:00 - 12:00');
  const [paymentMode, setPaymentMode] = useState<'PAY_NOW' | 'PAY_LATER'>('PAY_LATER');
  const [notes, setNotes] = useState<string>('');

  const [quote, setQuote] = useState<{
    totalMinor: number;
    totalEstimatedKg: number;
    totalEstimatedCo2Kg: number;
    items: any[];
  } | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);

  // Load Waste Types & Set Defaults
  useEffect(() => {
    api.getWasteTypes().then((types) => {
      setWasteTypes(types);
      if (selectedItems.length === 0 && types.length > 0) {
        setSelectedItems([
          {
            wasteTypeId: types[1]?.id || types[0].id,
            wasteTypeName: types[1]?.name || types[0].name,
            bagSize: 'MEDIUM',
            numberOfBags: 1,
          },
        ]);
      }
    });

    if (addresses.length > 0 && !selectedAddressId) {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddressId(def.id);
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().split('T')[0]);
  }, [addresses]);

  // Recalculate Live Server Quote whenever items change
  useEffect(() => {
    if (selectedItems.length === 0) {
      setQuote(null);
      return;
    }

    const timer = setTimeout(() => {
      api
        .getPricingQuote(selectedItems)
        .then((data) => setQuote(data))
        .catch(() => {});
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedItems]);

  if (!isOpen) return null;

  // Real Browser GPS Request Handler
  const handleRequestLiveGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      const msg = 'Geolocation is not supported by your browser.';
      setLiveGpsError(msg);
      error('GPS Unsupported', msg);
      return;
    }

    setLiveGpsLoading(true);
    setLiveGpsError(null);
    setLiveGpsConfirmed(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLiveGpsCoords({ lat: latitude, lng: longitude });

        try {
          const rev = await api.reverseGeocode(latitude, longitude);
          setLiveGpsAddress({
            formatted: rev.formattedAddress,
            line1: rev.landmark || 'Current Doorstep GPS Location',
            landmark: rev.city || 'Mangaluru',
          });
          success(
            'GPS Location Detected! 📍',
            `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (Accuracy: ±${Math.round(accuracy)}m)`
          );
        } catch (err) {
          setLiveGpsAddress({
            formatted: `GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            line1: 'Live Device GPS',
            landmark: 'Mangaluru',
          });
          toast({
            type: 'info',
            title: 'GPS Detected',
            message: `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          });
        } finally {
          setLiveGpsLoading(false);
        }
      },
      (geoError) => {
        setLiveGpsLoading(false);
        let errMsg = 'Failed to retrieve live device location.';
        if (geoError.code === geoError.PERMISSION_DENIED) {
          errMsg =
            'Location permission denied. Please enable GPS permission in your browser or select a saved address.';
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          errMsg = 'Location services are disabled or unavailable on this device.';
        } else if (geoError.code === geoError.TIMEOUT) {
          errMsg = 'Location request timed out. Please retry or choose a point on the map.';
        }
        setLiveGpsError(errMsg);
        error('GPS Error', errMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Map Point Drop Handler
  const handleMapLocationChange = async (lat: number, lng: number) => {
    setMapCoords({ lat, lng });
    setMapLoading(true);
    try {
      const rev = await api.reverseGeocode(lat, lng);
      setMapAddress({
        formatted: rev.formattedAddress,
        line1: rev.landmark || 'Pinned Location',
        landmark: rev.city || 'Mangaluru',
      });
    } catch (e) {
      setMapAddress({
        formatted: `Pinned Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        line1: 'Pinned Location',
        landmark: 'Mangaluru',
      });
    } finally {
      setMapLoading(false);
    }
  };

  // Forward Geocode Search Handler
  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.searchAddresses(val);
      setSearchResults(res.results || []);
    } catch (e) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (item: {
    placeId: string | number;
    name: string;
    formatted: string;
    lat: number;
    lng: number;
  }) => {
    setMapCoords({ lat: item.lat, lng: item.lng });
    setMapAddress({
      formatted: item.formatted,
      line1: item.name,
      landmark: 'Mangaluru',
    });
    setLocationMode('map');
    success('Location Selected', item.name);
  };

  // Item Management
  const toggleWasteType = (wt: WasteType) => {
    const exists = selectedItems.find((i) => i.wasteTypeId === wt.id);
    if (exists) {
      if (selectedItems.length === 1) {
        toast({
          type: 'info',
          title: 'Minimum 1 Required',
          message: 'You must keep at least 1 waste type in the pickup.',
        });
        return;
      }
      setSelectedItems(selectedItems.filter((i) => i.wasteTypeId !== wt.id));
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          wasteTypeId: wt.id,
          wasteTypeName: wt.name,
          bagSize: 'MEDIUM',
          numberOfBags: 1,
        },
      ]);
    }
  };

  const updateItemBagSize = (wasteTypeId: string, bagSize: BagSize) => {
    setSelectedItems((prev) =>
      prev.map((i) => (i.wasteTypeId === wasteTypeId ? { ...i, bagSize } : i))
    );
  };

  const updateItemQuantity = (wasteTypeId: string, delta: number) => {
    setSelectedItems((prev) =>
      prev.map((i) => {
        if (i.wasteTypeId === wasteTypeId) {
          const newQty = Math.max(1, Math.min(20, i.numberOfBags + delta));
          return { ...i, numberOfBags: newQty };
        }
        return i;
      })
    );
  };

  // Submit Final Booking
  const handleConfirmPickup = async () => {
    if (!scheduledDate || !scheduledSlot) {
      error('Please pick date and time slot');
      return;
    }

    let payload: any = {
      scheduledDate,
      scheduledSlot,
      paymentMode,
      notes: notes || undefined,
      items: selectedItems,
    };

    if (locationMode === 'saved') {
      if (!selectedAddressId) {
        error('Please select a saved address');
        return;
      }
      payload.addressId = selectedAddressId;
    } else if (locationMode === 'live_gps') {
      if (!liveGpsCoords || !liveGpsConfirmed) {
        error('Please click "Confirm This Location" to use your live device GPS');
        return;
      }
      payload.customAddress = {
        label: 'Live Device GPS',
        line1: liveGpsAddress?.line1 || 'Live GPS Doorstep',
        formatted:
          liveGpsAddress?.formatted ||
          `GPS (${liveGpsCoords.lat.toFixed(4)}, ${liveGpsCoords.lng.toFixed(4)})`,
        landmark: liveGpsAddress?.landmark || 'Mangaluru',
        lat: liveGpsCoords.lat,
        lng: liveGpsCoords.lng,
      };
    } else if (locationMode === 'map' || locationMode === 'search') {
      payload.customAddress = {
        label: 'Map Selected Doorstep',
        line1: mapAddress?.line1 || 'Pinned Doorstep Location',
        formatted:
          mapAddress?.formatted ||
          `GPS (${mapCoords.lat.toFixed(4)}, ${mapCoords.lng.toFixed(4)})`,
        landmark: mapAddress?.landmark || 'Mangaluru',
        lat: mapCoords.lat,
        lng: mapCoords.lng,
      };
    }

    setSubmitting(true);
    try {
      const pickup = await api.createPickup(payload);
      success(
        'Pickup Scheduled! 🗓️',
        `Pickup #${pickup.id.slice(-6)} created. Total ₹${(pickup.totalAmountMinor / 100).toFixed(2)}`
      );
      onClose();
      onPickupCreated(pickup.id);

      if (paymentMode === 'PAY_NOW') {
        const order = await api.createPaymentOrder(pickup.id);
        if (order.provider !== 'RAZORPAY' || !(window as any).Razorpay) {
          throw new Error('Razorpay Checkout is unavailable. Please try again or choose Pay at Doorstep.');
        }

        const razorpay = new (window as any).Razorpay({
          key: order.keyId,
          amount: order.amountMinor,
          currency: order.currency,
          name: 'SWMS Portal',
          description: `Doorstep Waste Pickup #${pickup.id.slice(-6)}`,
          order_id: order.orderId,
          handler: async (response: any) => {
            try {
              await api.verifyPayment({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                pickupId: pickup.id,
              });
              success('Payment Successful! 💳', 'Your pickup booking is paid online.');
            } catch (err: any) {
              error('Payment Verification Failed', err.message);
            }
          },
          theme: { color: '#3E8E41' },
        });

        razorpay.on('payment.failed', (response: any) => {
          error('Payment Failed', response?.error?.description || 'Razorpay payment could not be completed.');
        });
        razorpay.open();
      }
    } catch (err: any) {
      error('Could not schedule pickup', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalRupees = quote ? (quote.totalMinor / 100).toFixed(2) : '0.00';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] w-full max-w-5xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[100dvh] sm:max-h-[92vh] overflow-hidden border border-[#E6E1D6]">
        {/* Header matching original design */}
        <div className="px-6 py-4 bg-white border-b border-[#E6E1D6] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E8F5D8] flex items-center justify-center text-xl shadow-xs">
              🌱
            </div>
            <div>
              <h2 className="text-lg font-black text-[#16181D]">Schedule Doorstep Pickup</h2>
              <span className="text-xs text-[#6B7280]">Step {step} of 5</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal 2-Pane Content: Wizard Step on Left + LIVE ORDER SUMMARY on Right */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT: Wizard Steps */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
            {/* Mobile-only Quick Order Summary Pill */}
            <div className="md:hidden flex items-center justify-between p-3 rounded-2xl bg-[#16181D] text-white text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#8BC83F]" />
                <span className="font-black text-[#8BC83F] uppercase tracking-wider text-[11px]">
                  LIVE ORDER SUMMARY
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-[11px] font-semibold">
                  {selectedItems.length} categories
                </span>
                <span className="font-black text-white text-sm">₹{totalRupees}</span>
              </div>
            </div>

            {/* Step 1: Categories */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-2xl font-black text-[#16181D]">1. Select Waste Categories</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Choose segregated recyclables for doorstep collection.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {wasteTypes.map((wt) => {
                    const isSelected = selectedItems.some((i) => i.wasteTypeId === wt.id);
                    return (
                      <div
                        key={wt.id}
                        onClick={() => toggleWasteType(wt)}
                        className={`rounded-2xl border-2 p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 group relative overflow-hidden ${
                          isSelected
                            ? 'border-[#3E8E41] bg-[#E8F5D8]/40 shadow-sm'
                            : 'border-[#E6E1D6] bg-white hover:border-gray-300'
                        }`}
                      >
                        {/* Waste Image with Reliable SVG/Fallback */}
                        <div className="h-28 rounded-xl overflow-hidden mb-2.5 relative bg-[#EFECE6]">
                          <WasteImage
                            src={wt.imageUrl}
                            alt={wt.name}
                            categorySlug={wt.slug}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#3E8E41] text-white flex items-center justify-center shadow-md">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          )}
                          <div className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-white">
                            {wt.co2Factor}x CO₂ factor
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-black text-[#16181D] leading-tight">{wt.name}</h4>
                          <p className="text-[11px] text-[#6B7280] line-clamp-2 mt-1 leading-snug">
                            {wt.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Quantities & Bag Sizes matching original screenshot */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-2xl font-black text-[#16181D]">2. Quantity & Bag Sizes</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Indicate bag sizes and counts. Prices are quoted live from active municipal tariffs.
                  </p>
                </div>

                <div className="space-y-4">
                  {selectedItems.map((item) => {
                    const wt = wasteTypes.find((w) => w.id === item.wasteTypeId);
                    const sizeInfo = BAG_SIZE_HINTS[item.bagSize];

                    return (
                      <Card
                        key={item.wasteTypeId}
                        className="p-5 border border-gray-200 rounded-3xl bg-white shadow-xs space-y-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                              <WasteImage
                                src={wt?.imageUrl}
                                alt={item.wasteTypeName}
                                categorySlug={wt?.slug}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-[#16181D]">
                                {item.wasteTypeName}
                              </h4>
                              <span className="text-xs text-[#6B7280]">
                                ≈ {sizeInfo.volume} ({sizeInfo.approxKg * item.numberOfBags} kg)
                              </span>
                            </div>
                          </div>

                          {/* Counter Pill */}
                          <div className="flex items-center gap-3 bg-[#F4F2EC] px-2 py-1 rounded-full border border-gray-200">
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(item.wasteTypeId, -1)}
                              className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#16181D] hover:bg-gray-100 font-black shadow-xs cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-4 text-center text-xs font-black text-[#16181D]">
                              {item.numberOfBags}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(item.wasteTypeId, 1)}
                              className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#16181D] hover:bg-gray-100 font-black shadow-xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Bag Size Cards matching original styling */}
                        <div className="grid grid-cols-3 gap-2.5">
                          {(['SMALL', 'MEDIUM', 'LARGE'] as BagSize[]).map((bs) => {
                            const isBsSelected = item.bagSize === bs;
                            const priceForSize = wt?.pricing?.[bs]
                              ? (wt.pricing[bs] / 100).toFixed(0)
                              : bs === 'SMALL'
                              ? '15'
                              : bs === 'MEDIUM'
                              ? '30'
                              : '55';

                            return (
                              <button
                                key={bs}
                                type="button"
                                onClick={() => updateItemBagSize(item.wasteTypeId, bs)}
                                className={`py-3 px-2 rounded-2xl border text-center transition-all cursor-pointer ${
                                  isBsSelected
                                    ? 'border-[#3E8E41] bg-[#E8F5D8] text-[#16181D] shadow-xs'
                                    : 'border-gray-200 bg-white text-[#6B7280] hover:border-gray-300'
                                }`}
                              >
                                <span className="block text-xs font-black">
                                  {BAG_SIZE_HINTS[bs].label}
                                </span>
                                <span className="block text-xs font-bold text-[#6B7280] mt-0.5">
                                  ₹{priceForSize}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Location (Separate Live GPS, Saved, Map, and Search) */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-2xl font-black text-[#16181D]">3. Doorstep Pickup Location</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Choose between your live device GPS location, a saved address, or pin on map.
                  </p>
                </div>

                {/* 4 Dedicated Location Option Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[#F0EDE6] rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setLocationMode('live_gps')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      locationMode === 'live_gps'
                        ? 'bg-white text-[#2E7031] shadow-xs'
                        : 'text-[#6B7280] hover:text-[#16181D]'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Live Device GPS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocationMode('saved')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      locationMode === 'saved'
                        ? 'bg-white text-[#2E7031] shadow-xs'
                        : 'text-[#6B7280] hover:text-[#16181D]'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Saved ({addresses.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocationMode('map')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      locationMode === 'map'
                        ? 'bg-white text-[#2E7031] shadow-xs'
                        : 'text-[#6B7280] hover:text-[#16181D]'
                    }`}
                  >
                    <Crosshair className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Pin on Map</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocationMode('search')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      locationMode === 'search'
                        ? 'bg-white text-[#2E7031] shadow-xs'
                        : 'text-[#6B7280] hover:text-[#16181D]'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Search Area</span>
                  </button>
                </div>

                {/* OPTION 1: LIVE DEVICE GPS */}
                {locationMode === 'live_gps' && (
                  <div className="space-y-3.5 bg-white p-4 sm:p-5 rounded-2xl border-2 border-[#E6E1D6]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-[#16181D] flex items-center gap-1.5">
                          <Navigation className="w-4 h-4 text-[#3E8E41]" />
                          <span>Use My Current Device Location</span>
                        </h4>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          Requests real browser GPS permission to locate your current doorstep.
                        </p>
                      </div>

                      <Button
                        type="button"
                        onClick={handleRequestLiveGps}
                        variant="primary"
                        size="sm"
                        loading={liveGpsLoading}
                        className="shrink-0"
                      >
                        <Crosshair className="w-3.5 h-3.5 mr-1.5" />
                        <span>{liveGpsCoords ? 'Re-detect GPS' : 'Fetch My GPS'}</span>
                      </Button>
                    </div>

                    {liveGpsError && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">GPS Unavailable</span>
                          <span>{liveGpsError}</span>
                        </div>
                      </div>
                    )}

                    {liveGpsCoords && (
                      <div className="space-y-3 pt-2">
                        <div className="bg-[#E8F5D8] border border-[#8BC83F] p-3 rounded-xl">
                          <div className="flex items-center justify-between text-xs font-black text-[#2E7031] mb-1">
                            <span>Live Coordinates Verified ✓</span>
                            <span className="font-mono text-[11px]">
                              {liveGpsCoords.lat.toFixed(5)}, {liveGpsCoords.lng.toFixed(5)}
                            </span>
                          </div>
                          <p className="text-xs text-[#16181D] font-bold">
                            {liveGpsAddress?.formatted || 'Kadri / Mangaluru Area'}
                          </p>
                        </div>

                        <LeafletMap
                          center={[liveGpsCoords.lat, liveGpsCoords.lng]}
                          customerLocation={[liveGpsCoords.lat, liveGpsCoords.lng]}
                          zoom={16}
                          className="h-44 w-full"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            setLiveGpsConfirmed(true);
                            success(
                              'Location Confirmed',
                              'Doorstep pickup set to your live GPS coordinates.'
                            );
                          }}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            liveGpsConfirmed
                              ? 'bg-[#3E8E41] text-white shadow-xs'
                              : 'bg-[#1A1B20] hover:bg-black text-white shadow-md'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>
                            {liveGpsConfirmed
                              ? 'Confirmed for Pickup ✓'
                              : 'Confirm This Location for Pickup'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* OPTION 2: SAVED ADDRESSES */}
                {locationMode === 'saved' && (
                  <div className="space-y-2.5">
                    {addresses.length === 0 ? (
                      <div className="p-6 text-center bg-white rounded-2xl border border-[#E6E1D6] text-xs text-[#6B7280]">
                        No saved addresses found. Use Live Device GPS or Pin on Map.
                      </div>
                    ) : (
                      addresses.map((a) => {
                        const isSelected = selectedAddressId === a.id;
                        return (
                          <div
                            key={a.id}
                            onClick={() => setSelectedAddressId(a.id)}
                            className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-[#3E8E41] bg-[#E8F5D8]/40 shadow-xs'
                                : 'border-[#E6E1D6] bg-white hover:border-gray-300'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-[#3E8E41] bg-[#3E8E41] text-white'
                                  : 'border-gray-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-[#16181D]">{a.label}</span>
                                {a.isDefault && (
                                  <span className="text-[10px] font-bold bg-[#E8F5D8] text-[#2E7031] px-2 py-0.5 rounded-full">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-[#16181D] mt-0.5">{a.line1}</p>
                              <p className="text-xs text-[#6B7280] truncate">{a.formatted}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* OPTION 3: PIN ON MAP */}
                {locationMode === 'map' && (
                  <div className="space-y-3 bg-white p-4 rounded-2xl border-2 border-[#E6E1D6]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-[#16181D]">Move Pin or Click Map</h4>
                        <p className="text-[11px] text-[#6B7280]">
                          Click anywhere or drag the green doorstep pin to position your entrance.
                        </p>
                      </div>
                      {mapLoading && (
                        <span className="text-[11px] text-[#3E8E41] font-bold animate-pulse">
                          Resolving address...
                        </span>
                      )}
                    </div>

                    <LeafletMap
                      center={[mapCoords.lat, mapCoords.lng]}
                      customerLocation={[mapCoords.lat, mapCoords.lng]}
                      isDraggable={true}
                      isSelectingLocation={true}
                      onLocationChange={handleMapLocationChange}
                      onMapClick={handleMapLocationChange}
                      zoom={15}
                      className="h-52 w-full"
                    />

                    <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E6E1D6] text-xs">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                        Selected Pinned Doorstep
                      </span>
                      <span className="font-bold text-[#16181D] block">
                        {mapAddress?.formatted ||
                          `Mangaluru Coordinates: ${mapCoords.lat.toFixed(4)}, ${mapCoords.lng.toFixed(4)}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* OPTION 4: SEARCH AREA / LANDMARK */}
                {locationMode === 'search' && (
                  <div className="space-y-3 bg-white p-4 rounded-2xl border-2 border-[#E6E1D6]">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search landmark (e.g. Kadri Hills, Bejai, Hampankatta)..."
                        className="w-full bg-[#FAF8F5] border border-[#E6E1D6] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#16181D] focus:ring-2 focus:ring-[#3E8E41] outline-none"
                      />
                      <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    </div>

                    {isSearching && (
                      <p className="text-xs text-[#3E8E41] font-bold animate-pulse">
                        Searching Mangaluru locations...
                      </p>
                    )}

                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {searchResults.map((item) => (
                        <div
                          key={item.placeId}
                          onClick={() => selectSearchResult(item)}
                          className="p-2.5 rounded-xl hover:bg-[#E8F5D8] border border-gray-100 hover:border-[#8BC83F] cursor-pointer transition-all text-xs"
                        >
                          <span className="font-bold text-[#16181D] block">{item.name}</span>
                          <span className="text-[11px] text-[#6B7280] line-clamp-1">
                            {item.formatted}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Preferred Date & Time Slot */}
            {step === 4 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-2xl font-black text-[#16181D]">4. Preferred Pickup Slot</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Collection vehicles operate residential routes daily.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#16181D] uppercase tracking-wider mb-2">
                    Date
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {[
                      { label: 'Today', date: new Date().toISOString().split('T')[0] },
                      {
                        label: 'Tomorrow',
                        date: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
                      },
                      {
                        label: 'In 2 Days',
                        date: new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0],
                      },
                    ].map((d) => (
                      <button
                        key={d.label}
                        type="button"
                        onClick={() => setScheduledDate(d.date)}
                        className={`px-4 py-2.5 rounded-2xl border text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                          scheduledDate === d.date
                            ? 'bg-[#3E8E41] text-white border-[#3E8E41] shadow-xs'
                            : 'bg-white text-[#16181D] border-[#E6E1D6] hover:bg-gray-50'
                        }`}
                      >
                        {d.label} ({d.date.slice(5)})
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#16181D] uppercase tracking-wider mb-2">
                    Operating Window
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setScheduledSlot(slot)}
                        className={`p-3 rounded-2xl border text-xs font-black flex items-center justify-between transition-all cursor-pointer ${
                          scheduledSlot === slot
                            ? 'border-[#3E8E41] bg-[#E8F5D8] text-[#2E7031] shadow-xs'
                            : 'border-[#E6E1D6] bg-white text-[#16181D] hover:bg-gray-50'
                        }`}
                      >
                        <span>{slot}</span>
                        {scheduledSlot === slot && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#16181D] uppercase tracking-wider mb-1.5">
                    Doorstep Notes / Gate Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Near Kadri temple gate, buzz 402..."
                    className="w-full bg-white border border-[#E6E1D6] rounded-2xl px-4 py-3 text-xs text-[#16181D] focus:ring-2 focus:ring-[#3E8E41] outline-none"
                  />
                </div>
              </div>
            )}

            {/* Step 5: Review & Payment Option */}
            {step === 5 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-2xl font-black text-[#16181D]">5. Review & Confirm Booking</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Confirm your booking summary and select payment method.
                  </p>
                </div>

                {/* Order Summary Card */}
                <Card className="p-4 border-2 border-[#E6E1D6] space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <span className="text-xs font-bold text-[#6B7280]">Scheduled For</span>
                    <span className="text-xs font-black text-[#16181D]">
                      {scheduledDate} ({scheduledSlot})
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {selectedItems.map((item) => (
                      <div key={item.wasteTypeId} className="flex justify-between text-[#16181D]">
                        <span>
                          {item.wasteTypeName} ({item.numberOfBags}x {item.bagSize})
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between font-black text-sm text-[#16181D]">
                    <span>Total Estimated Fee</span>
                    <span className="text-[#3E8E41] text-base">₹{totalRupees}</span>
                  </div>
                </Card>

                {/* Payment Mode Preference */}
                <div>
                  <label className="block text-xs font-bold text-[#16181D] uppercase tracking-wider mb-2">
                    Payment Choice
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('PAY_LATER')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        paymentMode === 'PAY_LATER'
                          ? 'border-[#3E8E41] bg-[#E8F5D8] text-[#2E7031]'
                          : 'border-[#E6E1D6] bg-white text-[#16181D]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black">Pay at Doorstep</span>
                        <Banknote className="w-4 h-4" />
                      </div>
                      <p className="text-[11px] text-[#6B7280]">Pay via UPI/Cash after bag weigh-in</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMode('PAY_NOW')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        paymentMode === 'PAY_NOW'
                          ? 'border-[#3E8E41] bg-[#E8F5D8] text-[#2E7031]'
                          : 'border-[#E6E1D6] bg-white text-[#16181D]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black">Pay Online</span>
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <p className="text-[11px] text-[#6B7280]">Pay now via Razorpay Gateway</p>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: LIVE ORDER SUMMARY (Exact design from screenshot) */}
          <div className="w-full md:w-80 lg:w-96 bg-[#16181D] text-white p-6 border-t md:border-t-0 md:border-l border-white/10 shrink-0 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-2 text-xs font-black tracking-wider text-[#8BC83F] uppercase">
                <Sparkles className="w-4 h-4 text-[#8BC83F]" />
                <span>LIVE ORDER SUMMARY</span>
              </div>

              {/* Items List */}
              <div className="space-y-4 max-h-[38vh] overflow-y-auto pr-1">
                {quote?.items && quote.items.length > 0 ? (
                  quote.items.map((item, idx) => (
                    <div key={idx} className="pb-3 border-b border-white/10 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-bold text-white leading-snug">
                          {item.wasteTypeName}
                        </span>
                        <span className="text-sm font-black text-white shrink-0">
                          ₹{(item.lineTotalMinor / 100).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {item.numberOfBags}x {item.bagSize} bag
                      </p>
                    </div>
                  ))
                ) : (
                  selectedItems.map((item, idx) => (
                    <div key={idx} className="pb-3 border-b border-white/10 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-bold text-white leading-snug">
                          {item.wasteTypeName}
                        </span>
                        <span className="text-sm font-black text-white shrink-0">
                          ₹{(BAG_SIZE_HINTS[item.bagSize].approxKg * 3.5 * item.numberOfBags).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {item.numberOfBags}x {item.bagSize} bag
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* ESTIMATED GREEN IMPACT Card */}
              <div className="bg-[#202229] border border-white/10 rounded-2xl p-4 space-y-2.5 shadow-sm">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#8BC83F]">
                  ESTIMATED GREEN IMPACT
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">Est. Recyclables:</span>
                  <span className="font-bold text-white">
                    {quote?.totalEstimatedKg ||
                      selectedItems.reduce(
                        (acc, i) => acc + BAG_SIZE_HINTS[i.bagSize].approxKg * i.numberOfBags,
                        0
                      )}{' '}
                    kg
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">CO₂ Avoided:</span>
                  <span className="font-black text-[#8BC83F]">
                    {quote?.totalEstimatedCo2Kg ||
                      (
                        selectedItems.reduce(
                          (acc, i) =>
                            acc + BAG_SIZE_HINTS[i.bagSize].approxKg * i.numberOfBags * 1.6,
                          0
                        )
                      ).toFixed(1)}{' '}
                    kg
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom: ESTIMATED QUOTE */}
            <div className="pt-6 border-t border-white/10 space-y-1 mt-6 lg:mt-0">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase font-extrabold tracking-wider text-gray-400">
                  ESTIMATED QUOTE
                </span>
                <span className="text-3xl font-black text-[#8BC83F]">₹{totalRupees}</span>
              </div>
              <p className="text-[11px] text-gray-400">Based on active municipal tariff rules</p>
            </div>
          </div>
        </div>

        {/* Wizard Footer Nav with rounded pills */}
        <div className="px-6 py-4 bg-white border-t border-[#E6E1D6] flex items-center justify-between shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-5 py-2.5 rounded-full border border-gray-300 text-xs font-black text-[#16181D] hover:bg-gray-50 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {step < 5 ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    step === 3 &&
                    locationMode === 'live_gps' &&
                    (!liveGpsCoords || !liveGpsConfirmed)
                  ) {
                    error('Please fetch GPS and click "Confirm This Location" to proceed.');
                    return;
                  }
                  setStep(step + 1);
                }}
                className="px-6 py-2.5 rounded-full bg-[#3E8E41] hover:bg-[#2E7031] text-white text-xs font-black flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmPickup}
                disabled={submitting}
                className="px-7 py-2.5 rounded-full bg-[#3E8E41] hover:bg-[#2E7031] text-white text-xs font-black flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Confirm Booking (₹{totalRupees})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

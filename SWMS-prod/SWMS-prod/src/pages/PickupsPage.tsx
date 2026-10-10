import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Truck,
  Plus,
  ChevronRight,
  CreditCard,
  XCircle,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge, PaymentStatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Pickup } from '../lib/types';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';

interface PickupsPageProps {
  pickups: Pickup[];
  onOpenScheduleWizard: () => void;
  onTrackPickup: (pickupId: string) => void;
  onOpenComplaints: (pickupId?: string) => void;
  onRefreshPickups: () => void;
}

export const PickupsPage: React.FC<PickupsPageProps> = ({
  pickups,
  onOpenScheduleWizard,
  onTrackPickup,
  onOpenComplaints,
  onRefreshPickups,
}) => {
  const { toast, success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'upcoming' | 'history'>('all');
  const [selectedPickup, setSelectedPickup] = useState<Pickup | null>(null);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [paying, setPaying] = useState<boolean>(false);

  const filteredPickups = pickups.filter((p) => {
    if (activeTab === 'active') {
      return ['EN_ROUTE', 'ARRIVED', 'COLLECTING', 'COLLECTED', 'VERIFIED'].includes(p.status);
    }
    if (activeTab === 'upcoming') {
      return ['REQUESTED', 'ASSIGNED', 'ACCEPTED'].includes(p.status);
    }
    if (activeTab === 'history') {
      return ['COMPLETED', 'CANCELLED', 'MISSED'].includes(p.status);
    }
    return true;
  });

  const handleCancelPickup = async (pickupId: string) => {
    setCancelling(true);
    try {
      await api.cancelPickup(pickupId, 'Customer requested cancellation via portal.');
      success('Pickup Cancelled', 'Your doorstep collection was cancelled.');
      setSelectedPickup(null);
      onRefreshPickups();
    } catch (err: any) {
      error('Could not cancel pickup', err.message);
    } finally {
      setCancelling(false);
    }
  };

  const handlePayNow = async (pickup: Pickup) => {
    setPaying(true);
    try {
      // 1. Create order
      const order = await api.createPaymentOrder(pickup.id);

      // Check if Razorpay checkout script is available or use real checkout
      if (typeof window !== 'undefined' && (window as any).Razorpay && order.provider === 'RAZORPAY') {
        const rzp = new (window as any).Razorpay({
          key: order.keyId,
          amount: order.amountMinor,
          currency: 'INR',
          name: 'SWMS Portal',
          description: `Doorstep Waste Pickup #${pickup.id.slice(-6)}`,
          order_id: order.orderId,
          handler: async (response: any) => {
            await api.verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              pickupId: pickup.id,
            });
            success('Payment Successful! 💳', 'Receipt generated.');
            onRefreshPickups();
            setSelectedPickup(null);
          },
          theme: { color: '#3E8E41' },
        });
        rzp.open();
      } else {
        // Dev / test simulation
        await api.verifyPayment({
          orderId: order.orderId,
          paymentId: `pay_sim_${Date.now()}`,
          signature: 'simulated_valid_signature',
          pickupId: pickup.id,
        });
        success('Payment Verified! 💳', `₹${(order.amountMinor / 100).toFixed(2)} marked as PAID.`);
        onRefreshPickups();
        if (selectedPickup) {
          setSelectedPickup({ ...selectedPickup, paymentStatus: 'SUCCESS' });
        }
      }
    } catch (err: any) {
      error('Payment Failed', err.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Header and Schedule Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#16181D] tracking-tight">
            Doorstep Pickups
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
            Manage scheduled pickups, live collector dispatches, and collection receipts.
          </p>
        </div>

        <Button onClick={onOpenScheduleWizard} variant="accent" size="md" className="shadow-md">
          <Plus className="w-5 h-5 mr-1.5 stroke-[3]" />
          <span>Schedule New Pickup</span>
        </Button>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Pickups' },
          { id: 'active', label: 'Active Live 🚚' },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'history', label: 'History / Completed' },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-[#1A1B20] text-white shadow-sm'
                  : 'bg-white text-[#6B7280] hover:text-[#16181D] border border-[#E6E1D6]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Pickups List */}
      {filteredPickups.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No pickups found in this view"
          description="Schedule a doorstep collection for recyclable plastic, paper, e-waste, metal, or glass."
          actionLabel="Schedule Doorstep Pickup"
          onAction={onOpenScheduleWizard}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPickups.map((p) => {
            const isLive = ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'COLLECTING', 'COLLECTED'].includes(p.status);

            return (
              <Card
                key={p.id}
                hover
                onClick={() => setSelectedPickup(p)}
                className="p-5 flex flex-col justify-between cursor-pointer border-2 hover:border-[#3E8E41]/30"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-mono font-bold text-[#6B7280]">
                      #{p.id.slice(-8).toUpperCase()}
                    </span>
                    <StatusBadge status={p.status} />
                  </div>

                  {/* Summary of Items */}
                  <h3 className="text-base font-black text-[#16181D] mb-1 leading-snug">
                    {p.pricingSnapshot?.items
                      ?.map((i) => `${i.numberOfBags}x ${i.wasteTypeName}`)
                      .join(' • ')}
                  </h3>

                  <div className="bg-[#F0EDE6] p-3 rounded-2xl text-xs space-y-1.5 my-3">
                    <div className="flex items-center gap-1.5 text-[#16181D] font-bold">
                      <Calendar className="w-3.5 h-3.5 text-[#3E8E41]" />
                      <span>{p.scheduledDate}</span>
                      <span className="text-gray-400">•</span>
                      <Clock className="w-3.5 h-3.5 text-[#3E8E41]" />
                      <span>{p.scheduledSlot}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#6B7280] truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{p.addressSnapshot?.formatted}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div>
                    <span className="text-[11px] text-[#6B7280] block">Tariff Total</span>
                    <span className="text-lg font-black text-[#16181D]">
                      ₹{(p.totalAmountMinor / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isLive ? (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTrackPickup(p.id);
                        }}
                        variant="primary"
                        size="sm"
                        className="font-black animate-pulse shadow-sm"
                      >
                        <Truck className="w-4 h-4 mr-1.5" />
                        <span>Live Track 🚚</span>
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm">
                        <span>Details</span>
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pickup Details Modal / Drawer */}
      {selectedPickup && (
        <Modal
          isOpen={Boolean(selectedPickup)}
          onClose={() => setSelectedPickup(null)}
          title={`Pickup Details #${selectedPickup.id.slice(-8).toUpperCase()}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Status and Actions Banner */}
            <div className="flex items-center justify-between p-4 bg-[#F0EDE6] rounded-2xl border border-[#E6E1D6]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                  Collection Status
                </span>
                <div className="mt-1">
                  <StatusBadge status={selectedPickup.status} />
                </div>
              </div>

              {['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'COLLECTING', 'COLLECTED'].includes(
                selectedPickup.status
              ) && (
                <Button
                  onClick={() => {
                    const id = selectedPickup.id;
                    setSelectedPickup(null);
                    onTrackPickup(id);
                  }}
                  variant="primary"
                  size="sm"
                  className="font-black"
                >
                  <Truck className="w-4 h-4 mr-1.5" />
                  <span>Open Live Map</span>
                </Button>
              )}
            </div>

            {/* Itemized Pricing Snapshot (Frozen at time of booking) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black uppercase text-[#16181D]">
                   BILL SUMMARY
                </h4>
                <span className="text-[10px] text-[#3E8E41] font-bold">As of booking</span>
              </div>
              <div className="border border-[#E6E1D6] rounded-2xl overflow-hidden divide-y divide-gray-100 text-xs">
                {selectedPickup.pricingSnapshot?.items?.map((item, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between bg-white">
                    <div>
                      <span className="font-bold text-[#16181D] block">{item.wasteTypeName}</span>
                      <span className="text-[11px] text-[#6B7280]">
                        {item.numberOfBags} bags × ₹{(item.unitPriceMinor / 100).toFixed(2)} ({item.bagSize})
                      </span>
                    </div>
                    <span className="font-mono font-black text-[#16181D]">
                      ₹{(item.lineTotalMinor / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="p-4 bg-[#F0EDE6] flex items-center justify-between font-black text-sm">
                  <span>Grand Total</span>
                  <span className="text-[#3E8E41] text-base">
                    ₹{(selectedPickup.totalAmountMinor / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Address and Slot */}
            <div className="space-y-2 text-xs">
              <span className="font-black text-[#16181D] uppercase block">Location & Schedule</span>
              <div className="p-3.5 bg-gray-50 rounded-2xl space-y-1 border border-gray-200">
                <div className="flex items-center gap-1.5 font-bold text-[#16181D]">
                  <Calendar className="w-3.5 h-3.5 text-[#3E8E41]" />
                  <span>
                    {selectedPickup.scheduledDate} • {selectedPickup.scheduledSlot}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[#6B7280]">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{selectedPickup.addressSnapshot?.formatted}</span>
                </div>
                {selectedPickup.notes && (
                  <p className="text-[11px] text-gray-500 italic pt-1">
                    Customer note: {selectedPickup.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Status & Pay Now Button */}
            <div className="p-4 bg-white border border-[#E6E1D6] rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#6B7280] uppercase block">Payment</span>
                <div className="mt-1">
                  <PaymentStatusBadge
                    status={selectedPickup.paymentStatus}
                    paymentMode={selectedPickup.paymentMode}
                  />
                </div>
              </div>
              {selectedPickup.paymentStatus !== 'SUCCESS' && (
                <Button
                  onClick={() => handlePayNow(selectedPickup)}
                  variant="accent"
                  size="sm"
                  loading={paying}
                  className="font-black"
                >
                  <CreditCard className="w-4 h-4 mr-1.5" />
                  <span>Pay ₹{(selectedPickup.totalAmountMinor / 100).toFixed(2)}</span>
                </Button>
              )}
            </div>

            {/* Action Buttons: Cancel, Raise Complaint */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              {['REQUESTED', 'ASSIGNED', 'ACCEPTED'].includes(selectedPickup.status) ? (
                <button
                  type="button"
                  onClick={() => handleCancelPickup(selectedPickup.id)}
                  disabled={cancelling}
                  className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel Pickup</span>
                </button>
              ) : (
                <span className="text-xs text-gray-400">
                  {selectedPickup.status === 'COMPLETED' ? 'Pickup completed' : 'Cannot cancel while en route'}
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  const id = selectedPickup.id;
                  setSelectedPickup(null);
                  onOpenComplaints(id);
                }}
                className="text-xs font-bold text-[#3E8E41] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Raise an Issue</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

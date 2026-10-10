import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  MessageSquare,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Complaint, Pickup } from '../lib/types';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';

const CATEGORIES = [
  'Missed Pickup',
  'Collector Behavior / Delayed Arrival',
  'Payment & Tariff Issue',
  'Wrong Charge / Inaccurate Weighing',
  'Waste Segregation / Rejection Query',
  'App or Technical Issue',
  'Other Civic Query',
];

export const ComplaintsPage: React.FC<{ initialPickupId?: string }> = ({ initialPickupId }) => {
  const { toast, success, error } = useToast();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(Boolean(initialPickupId));

  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState<string>('');
  const [pickupId, setPickupId] = useState<string>(initialPickupId || '');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadComplaints();
    api.getPickups().then(setPickups).catch(() => {});
  }, []);

  const loadComplaints = async () => {
    try {
      const data = await api.getComplaints();
      setComplaints(data);
    } catch (e) {}
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      error('Please describe your issue');
      return;
    }

    setSubmitting(true);
    try {
      await api.createComplaint({
        category,
        description,
        pickupId: pickupId || undefined,
      });

      success('Support Ticket Raised! 🎫', 'Our grievance desk will reply within 24 hours.');
      setShowCreateModal(false);
      setDescription('');
      loadComplaints();
    } catch (err: any) {
      error('Failed to submit ticket', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulateAdminResolution = async (complaintId: string) => {
    try {
      await api.advanceComplaintStatus(
        complaintId,
        'RESOLVED',
        'Officer verified collector GPS log and credited 20 bonus Eco Points for the delay. Pickup route re-scheduled.'
      );
      success('Ticket Status Updated! ✓', 'Simulated municipal admin officer response.');
      loadComplaints();
    } catch (err: any) {
      error('Error advancing status', err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#16181D] tracking-tight">
            Support & Complaints
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
            Doorstep grievance redressal portal under Swachh Bharat Citizen Charter.
          </p>
        </div>

        <Button onClick={() => setShowCreateModal(true)} variant="primary" size="md" className="shadow-md">
          <Plus className="w-5 h-5 mr-1.5 stroke-[3]" />
          <span>Raise New Issue</span>
        </Button>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {complaints.length === 0 ? (
          <Card className="p-10 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-3xl bg-[#E8F5D8] flex items-center justify-center text-3xl mb-3">
              🛡️
            </div>
            <h3 className="text-base font-black text-[#16181D]">No support tickets registered</h3>
            <p className="text-xs text-[#6B7280] max-w-xs mt-1 mb-4">
              All your pickups and transactions are running smoothly with zero unresolved issues.
            </p>
            <Button onClick={() => setShowCreateModal(true)} variant="secondary" size="md">
              Raise an Issue
            </Button>
          </Card>
        ) : (
          complaints.map((c) => (
            <Card key={c.id} className="p-6 border-2 border-[#E6E1D6] space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-[#6B7280]">
                      #{c.id.slice(-8).toUpperCase()}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs font-bold text-[#3E8E41]">{c.category}</span>
                  </div>
                  <h3 className="text-base font-black text-[#16181D] leading-snug">
                    {c.description}
                  </h3>
                </div>

                <Badge
                  variant={
                    c.status === 'RESOLVED'
                      ? 'success'
                      : c.status === 'IN_REVIEW'
                      ? 'warning'
                      : 'neutral'
                  }
                >
                  {c.status}
                </Badge>
              </div>

              {/* Admin Resolution / Timeline Box */}
              {c.resolution ? (
                <div className="bg-[#E8F5D8] p-4 rounded-2xl border border-[#8BC83F]/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#2E7031]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Officer Resolution</span>
                  </div>
                  <p className="text-xs text-[#16181D] leading-relaxed">{c.resolution}</p>
                </div>
              ) : (
                <div className="bg-gray-50 p-3.5 rounded-2xl flex items-center justify-between text-xs text-[#6B7280]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>Under review by Mangaluru Grievance Officer</span>
                  </div>

                  {/* Dev test simulator button */}
                  <button
                    type="button"
                    onClick={() => handleSimulateAdminResolution(c.id)}
                    className="text-xs font-bold text-[#3E8E41] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Simulate Officer Response</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                <span>Submitted on {new Date(c.createdAt).toLocaleDateString()}</span>
                {c.pickupId && <span>Linked to Pickup #{c.pickupId.slice(-6)}</span>}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Raise Issue Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Raise a Citizen Support Grievance"
          maxWidth="md"
        >
          <form onSubmit={handleCreateComplaint} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#16181D] uppercase tracking-wider mb-1.5">
                Issue Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-[#E6E1D6] rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-[#3E8E41] outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#16181D] uppercase tracking-wider mb-1.5">
                Related Pickup (Optional)
              </label>
              <select
                value={pickupId}
                onChange={(e) => setPickupId(e.target.value)}
                className="w-full bg-white border border-[#E6E1D6] rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-[#3E8E41] outline-none"
              >
                <option value="">None / General Inquiry</option>
                {pickups.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id.slice(-6).toUpperCase()} ({p.scheduledDate} • {p.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#16181D] uppercase tracking-wider mb-1.5">
                Description of the Issue *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe what occurred (e.g. collector arrived 2 hours late, bags weighed inaccurately, etc.)..."
                className="w-full bg-white border border-[#E6E1D6] rounded-2xl p-3.5 text-xs focus:ring-2 focus:ring-[#3E8E41] outline-none leading-relaxed"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              className="w-full font-black mt-2 shadow-lg"
            >
              <span>Submit Support Ticket</span>
              <Send className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
};

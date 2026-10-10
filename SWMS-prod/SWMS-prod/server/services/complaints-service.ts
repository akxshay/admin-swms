import { db, dbManager } from '../db';
import { Complaint, ComplaintStatus } from '../types';
import { realtimeBus } from '../realtime';

export interface CreateComplaintInput {
  customerId: string;
  category: string;
  description: string;
  pickupId?: string;
  attachments?: string[];
}

export function createComplaint(input: CreateComplaintInput): Complaint {
  const complaintId = `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const complaint: Complaint = {
    id: complaintId,
    customerId: input.customerId,
    pickupId: input.pickupId,
    category: input.category,
    description: input.description,
    status: 'OPEN',
    attachments: input.attachments || [],
    createdAt: now,
    updatedAt: now,
  };

  db.complaints.unshift(complaint);
  dbManager.persist();

  // Notification
  const notif = {
    id: `notif_${Date.now()}`,
    userId: input.customerId,
    title: 'Support Ticket Registered 🎫',
    body: `Ticket #${complaintId.slice(-6)} created. Support team will review within 24 hours.`,
    type: 'COMPLAINT' as const,
    read: false,
    link: '/customer/complaints',
    createdAt: now,
  };
  db.notifications.unshift(notif);
  dbManager.persist();

  realtimeBus.emitToUser(input.customerId, 'notification', notif);
  return complaint;
}

export function advanceComplaintStatus(
  complaintId: string,
  newStatus: ComplaintStatus,
  resolution?: string
): Complaint {
  const complaint = db.complaints.find((c) => c.id === complaintId);
  if (!complaint) throw new Error('Complaint not found');

  complaint.status = newStatus;
  if (resolution) complaint.resolution = resolution;
  complaint.updatedAt = new Date().toISOString();
  dbManager.persist();

  const notif = {
    id: `notif_${Date.now()}`,
    userId: complaint.customerId,
    title: `Ticket #${complaint.id.slice(-6)}: ${newStatus}`,
    body: resolution || `Status updated to ${newStatus}.`,
    type: 'COMPLAINT' as const,
    read: false,
    link: '/customer/complaints',
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);
  dbManager.persist();

  realtimeBus.emitToUser(complaint.customerId, 'notification', notif);
  return complaint;
}

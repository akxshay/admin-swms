import React from 'react';
import { PickupStatus, PaymentStatus } from '../../lib/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'accent' | 'gold' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'sm', className = '' }) => {
  const variantStyles = {
    primary: 'bg-[#E8F5D8] text-[#2E7031] border-[#3E8E41]/20',
    accent: 'bg-[#8BC83F]/20 text-[#2E7031] border-[#8BC83F]/30',
    gold: 'bg-[#F5C518]/20 text-[#856404] border-[#F5C518]/40',
    neutral: 'bg-gray-100 text-[#6B7280] border-gray-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  }[variant];

  const sizeStyles = size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border ${variantStyles} ${sizeStyles} ${className}`}
    >
      {children}
    </span>
  );
};

export function StatusBadge({ status }: { status: PickupStatus }) {
  switch (status) {
    case 'REQUESTED':
      return <Badge variant="neutral">Requested</Badge>;
    case 'ASSIGNED':
      return <Badge variant="info">Assigned</Badge>;
    case 'ACCEPTED':
      return <Badge variant="primary">Accepted</Badge>;
    case 'EN_ROUTE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          En Route
        </span>
      );
    case 'ARRIVED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-[#E8F5D8] text-[#2E7031] border border-[#3E8E41]">
          📍 Arrived
        </span>
      );
    case 'COLLECTING':
      return <Badge variant="accent">Collecting</Badge>;
    case 'COLLECTED':
      return <Badge variant="accent">Collected</Badge>;
    case 'VERIFIED':
      return <Badge variant="success">PIN Verified</Badge>;
    case 'COMPLETED':
      return <Badge variant="success">Completed</Badge>;
    case 'CANCELLED':
      return <Badge variant="danger">Cancelled</Badge>;
    case 'MISSED':
      return <Badge variant="danger">Missed</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export function PaymentStatusBadge({
  status,
  paymentMode,
}: {
  status: PaymentStatus;
  paymentMode?: 'PAY_NOW' | 'PAY_LATER';
}) {
  switch (status) {
    case 'SUCCESS':
      return <Badge variant="success">Paid</Badge>;
    case 'PENDING':
      return (
        <Badge variant="warning">
          {paymentMode === 'PAY_NOW' ? 'Pay Online' : 'Pay at Doorstep'}
        </Badge>
      );
    case 'FAILED':
      return <Badge variant="danger">Failed</Badge>;
    case 'REFUNDED':
      return <Badge variant="info">Refunded</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

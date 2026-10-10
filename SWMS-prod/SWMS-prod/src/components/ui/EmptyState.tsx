import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-3xl border border-[#E6E1D6] p-8 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6 ${className}`}
    >
      <div className="w-16 h-16 rounded-3xl bg-[#E8F5D8] flex items-center justify-center text-[#2E7031] text-3xl mb-4">
        {icon || '🌱'}
      </div>
      <h3 className="text-lg font-bold text-[#16181D] mb-1">{title}</h3>
      <p className="text-sm text-[#6B7280] mb-6 leading-relaxed max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

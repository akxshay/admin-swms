import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  pill?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  pill = true,
  disabled,
  type = 'button',
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-bold transition-all duration-200 active:scale-[0.98] select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 min-h-[44px]';

  const sizeClasses = {
    sm: 'text-xs px-3.5 py-1.5 h-9 min-h-[36px]',
    md: 'text-sm px-5 py-2.5 h-11 min-h-[44px]',
    lg: 'text-base px-6 py-3.5 h-13 min-h-[50px]',
  }[size];

  const variantClasses = {
    primary: 'bg-[#3E8E41] hover:bg-[#2E7031] text-white shadow-sm hover:shadow-md',
    accent: 'bg-[#8BC83F] hover:bg-[#7cb934] text-[#16181D] shadow-sm font-extrabold',
    secondary: 'bg-white hover:bg-[#F0EDE6] text-[#16181D] border border-[#E6E1D6]',
    outline: 'bg-transparent border-2 border-[#3E8E41] text-[#3E8E41] hover:bg-[#E8F5D8]',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    ghost: 'bg-transparent hover:bg-black/5 text-[#6B7280] hover:text-[#16181D]',
    gold: 'bg-[#F5C518] hover:bg-[#e0b212] text-[#16181D] font-extrabold shadow-sm',
  }[variant];

  const radiusClass = pill ? 'rounded-full' : 'rounded-2xl';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${radiusClass} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

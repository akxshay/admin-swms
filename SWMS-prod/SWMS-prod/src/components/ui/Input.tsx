import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-[#16181D] uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full bg-white border border-[#E6E1D6] text-[#16181D] placeholder:text-gray-400 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E8E41] focus:border-transparent transition-all min-h-[44px] ${
          error ? 'border-red-500 focus:ring-red-400' : ''
        } ${className}`}
        {...props}
      />
      {hint && !error && <p className="text-xs text-[#6B7280] mt-1">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export const PhoneInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  error?: string;
  label?: string;
  disabled?: boolean;
}> = ({ value, onChange, error, label = 'Phone Number', disabled = false }) => {
  // Strip non-digits and limit to 10 digits
  const handleDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const truncated = raw.slice(0, 10);
    onChange(truncated);
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-bold text-[#16181D] uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex rounded-2xl border border-[#E6E1D6] bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#3E8E41] focus-within:border-transparent min-h-[48px]">
        <div className="flex items-center gap-1.5 px-4 bg-gray-50 border-r border-[#E6E1D6] text-[#16181D] font-bold text-sm select-none">
          <span>🇮🇳</span>
          <span>+91</span>
        </div>
        <input
          type="tel"
          disabled={disabled}
          value={value}
          onChange={handleDigitsChange}
          placeholder="9876543210"
          className="flex-1 px-4 py-3 text-sm font-semibold text-[#16181D] placeholder:text-gray-400 focus:outline-none tracking-wide"
        />
      </div>
      {error && <p className="text-xs font-medium text-red-500 mt-1">{error}</p>}
    </div>
  );
};

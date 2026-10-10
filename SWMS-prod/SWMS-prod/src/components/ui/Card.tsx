import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, hover = false, className = '', ...props }) => {
  return (
    <div
      className={`bg-white rounded-3xl border border-[#E6E1D6] p-5 sm:p-6 shadow-sm transition-all duration-200 ${
        hover ? 'hover:shadow-md hover:border-[#3E8E41]/30 hover:-translate-y-0.5' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

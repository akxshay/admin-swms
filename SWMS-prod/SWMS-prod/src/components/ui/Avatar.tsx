import React from 'react';

interface AvatarProps {
  name?: string | null;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  photoUrl?: string | null;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name = 'Citizen',
  color = '#3E8E41',
  size = 'md',
  photoUrl,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg font-bold',
    xl: 'w-20 h-20 text-2xl font-black',
  }[size];

  const initials = (name || 'Citizen')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name || 'Avatar'}
        className={`${sizeClasses} rounded-full object-cover border-2 border-white shadow-sm ${className}`}
      />
    );
  }

  return (
    <div
      style={{ backgroundColor: color }}
      className={`${sizeClasses} rounded-full flex items-center justify-center text-white font-bold tracking-wider border-2 border-white/60 shadow-sm shrink-0 select-none ${className}`}
    >
      {initials}
    </div>
  );
};

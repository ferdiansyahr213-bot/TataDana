import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'orange' | 'green' | 'blue' | 'red' | 'purple' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'brand',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  const variantClasses = {
    brand: 'bg-blue-50 text-brand-700 border border-blue-200/80',
    orange: 'bg-blue-50 text-brand-700 border border-blue-200/80',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    blue: 'bg-blue-50 text-brand-700 border border-blue-200/80',
    red: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200/80',
    gray: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

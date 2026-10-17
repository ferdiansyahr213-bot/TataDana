import React from 'react';

interface ProgressBarProps {
  percentage: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  showLabel = false,
  size = 'md',
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));

  // Color logic
  let barColor = 'bg-brand-500';
  if (percentage >= 100) {
    barColor = 'bg-rose-500';
  } else if (percentage >= 80) {
    barColor = 'bg-amber-500';
  } else {
    barColor = 'bg-brand-500';
  }

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold mb-1 text-slate-700">
          <span>Progres</span>
          <span className={percentage >= 100 ? 'text-rose-600' : percentage >= 80 ? 'text-amber-600' : 'text-brand-600'}>
            {percentage}%
          </span>
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightClasses[size]}`}>
        <div
          className={`${barColor} ${heightClasses[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

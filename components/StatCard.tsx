import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  color?: 'green' | 'amber' | 'neutral' | 'blue';
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  subValue, 
  icon, 
  color = 'neutral',
  highlight = false
}) => {
  const colorClasses = {
    green: 'text-emoliente-green border-emoliente-green/20 bg-emoliente-green/5',
    amber: 'text-emoliente-amber border-emoliente-amber/20 bg-emoliente-amber/5',
    blue: 'text-blue-400 border-blue-400/20 bg-blue-500/5',
    neutral: 'text-gray-200 border-gray-700 bg-card-bg'
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]} flex flex-col justify-between relative overflow-hidden transition-all duration-200 ${highlight ? 'ring-2 ring-offset-2 ring-offset-emoliente-dark ring-emoliente-green' : ''}`}>
      <div className="z-10">
        <p className="text-xs uppercase tracking-wider font-semibold opacity-70 mb-1">{label}</p>
        <p className="text-2xl font-bold font-mono">{value}</p>
        {subValue && <p className="text-sm opacity-60 mt-1">{subValue}</p>}
      </div>
      {icon && (
        <div className="absolute right-2 bottom-2 opacity-10 scale-150">
          {icon}
        </div>
      )}
    </div>
  );
};
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  badge?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-cyan-50 text-cyan-600',
  badge,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card hover:shadow-elevated transition-all duration-300 flex flex-col justify-between overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>{icon}</div>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-2xl font-bold text-slate-900 tracking-tight truncate">{value}</span>
          {badge}
        </div>
        {subtitle && <p className="text-xs text-slate-500 mt-1 truncate">{subtitle}</p>}
      </div>
    </div>
  );
};

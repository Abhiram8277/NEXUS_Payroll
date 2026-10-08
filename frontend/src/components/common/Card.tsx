import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  headerBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  headerBorder = false,
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-card transition-all duration-200 overflow-hidden ${className}`}
    >
      {(title || action) && (
        <div
          className={`px-6 py-4 flex items-center justify-between ${
            headerBorder ? 'border-b border-slate-100' : ''
          }`}
        >
          <div>
            {title && <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

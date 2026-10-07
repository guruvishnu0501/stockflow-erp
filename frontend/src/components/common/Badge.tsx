import React from 'react';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'secondary'
  | 'default';

export interface BadgeProps {
  status?: string;
  variant?: BadgeVariant | string;
  size?: 'sm' | 'md';
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant,
  size = 'sm',
  children,
}) => {
  const content = children || status || '';

  const getBadgeStyle = (v?: string, stat?: string) => {
    if (v) {
      switch (v.toLowerCase()) {
        case 'success':
          return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10';
        case 'warning':
          return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10';
        case 'danger':
          return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10';
        case 'info':
          return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10';
        case 'secondary':
          return 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/10';
        default:
          return 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/10';
      }
    }

    const val = String(stat || '').toLowerCase();
    switch (val) {
      case 'in stock':
      case 'approved':
      case 'fully received':
      case 'delivered':
      case 'paid':
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10';

      case 'low stock':
      case 'partially received':
      case 'partially delivered':
      case 'partially paid':
      case 'processing':
      case 'packing':
      case 'packed':
      case 'picking':
      case 'submitted':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10';

      case 'out of stock':
      case 'rejected':
      case 'cancelled':
      case 'overdue':
      case 'blocked':
      case 'inactive':
      case 'urgent':
        return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10';

      case 'pending':
      case 'pending approval':
      case 'draft':
      case 'sent to vendor':
      case 'high':
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10';

      case 'overstock':
      case 'converted to po':
      case 'confirmed':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/10';

      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/10';
    }
  };

  const sizeClass =
    size === 'sm' ? 'px-2.5 py-0.5 text-xs font-medium' : 'px-3 py-1 text-sm font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border ring-1 ring-inset ${sizeClass} ${getBadgeStyle(
        variant,
        typeof content === 'string' ? content : undefined
      )}`}
    >
      {content}
    </span>
  );
};

export default Badge;

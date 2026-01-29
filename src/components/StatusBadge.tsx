import React from 'react';
import { ClockIcon, CheckCircleIcon, TruckIcon, AlertTriangleIcon, XCircleIcon, PackageIcon } from '@/components/icons';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<string, {
  label: string;
  icon: React.ElementType;
  colors: string;
}> = {
  pending: {
    label: 'Awaiting Acceptance',
    icon: ClockIcon,
    colors: 'bg-[#6E6658]/20 text-[#6E6658] border-[#6E6658]/30 shadow-[#6E6658]/10',
  },
  accepted: {
    label: 'Accepted',
    icon: CheckCircleIcon,
    colors: 'bg-[#5d2ba3]/20 text-[#5d2ba3] border-[#5d2ba3]/30 shadow-[#5d2ba3]/10',
  },
  shipped: {
    label: 'In Transit',
    icon: TruckIcon,
    colors: 'bg-[#5d2ba3]/20 text-[#5d2ba3] border-[#5d2ba3]/30 shadow-[#5d2ba3]/10',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircleIcon,
    colors: 'bg-[#5d2ba3]/20 text-[#5d2ba3] border-[#5d2ba3]/30 shadow-[#5d2ba3]/10',
  },
  dispute: {
    label: 'Dispute Open',
    icon: AlertTriangleIcon,
    colors: 'bg-[#4F4A41]/20 text-[#4F4A41] border-[#4F4A41]/30 shadow-[#4F4A41]/10',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircleIcon,
    colors: 'bg-[#6E6658]/20 text-[#6E6658] border-[#6E6658]/30 shadow-[#6E6658]/10',
  },
  delivered: {
    label: 'Delivered',
    icon: PackageIcon,
    colors: 'bg-[#5d2ba3]/20 text-[#5d2ba3] border-[#5d2ba3]/30 shadow-[#5d2ba3]/10',
  },
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs gap-1',
  md: 'px-3 py-1.5 text-sm gap-1.5',
  lg: 'px-4 py-2 text-base gap-2',
};

const iconSizes = {
  sm: 12,
  md: 14,
  lg: 16,
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusConfig[status] || {
    label: status,
    icon: PackageIcon,
    colors: 'bg-[#6E6658]/20 text-[#6E6658] border-[#6E6658]/30',
  };

  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center font-semibold rounded-null-full border shadow-sm
        transition-all duration-200 hover:shadow-md
        ${config.colors}
        ${sizeClasses[size]}
      `}
    >
      <Icon size={iconSizes[size]} className="flex-shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;

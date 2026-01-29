import React from 'react';

interface DashboardIconProps {
  className?: string;
  size?: number;
}

export const DashboardIcon: React.FC<DashboardIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      fill="currentColor"
      className={className}
      width={size}
      height={size}
    >
      <path d="M64 64a32 32 0 1 1 0 64 32 32 0 1 1 0-64zM0 128a64 64 0 1 0 128 0A64 64 0 1 0 0 128zM0 384a64 64 0 1 0 128 0A64 64 0 1 0 0 384zM0 256a64 64 0 1 0 128 0A64 64 0 1 0 0 256zM224 0a64 64 0 1 0 0 128 64 64 0 1 0 0-128zM96 256a64 64 0 1 0 128 0 64 64 0 1 0 -128 0zM448 0a64 64 0 1 0 0 128 64 64 0 1 0 0-128zM320 256a64 64 0 1 0 128 0 64 64 0 1 0 -128 0zM320 512a64 64 0 1 0 0-128 64 64 0 1 0 0 128zM448 384a64 64 0 1 0 128 0 64 64 0 1 0 -128 0zM448 256a64 64 0 1 0 128 0 64 64 0 1 0 -128 0zM96 384a64 64 0 1 0 128 0 64 64 0 1 0 -128 0zM224 256a64 64 0 1 0 128 0 64 64 0 1 0 -128 0zM224 512a64 64 0 1 0 0-128 64 64 0 1 0 0 128z"/>
    </svg>
  );
};


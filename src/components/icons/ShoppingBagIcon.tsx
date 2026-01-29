import React from 'react';

interface ShoppingBagIconProps {
  className?: string;
  size?: number;
}

export const ShoppingBagIcon: React.FC<ShoppingBagIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 448 512" 
      fill="currentColor"
      className={className}
      width={size}
      height={size}
    >
      <path d="M160 112c0-35.3 28.7-64 64-64s64 28.7 64 64v48H160V112zm-48 48H48c-26.5 0-48 21.5-48 48v256c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V208c0-26.5-21.5-48-48-48h-64v-48C336 57.4 278.6 0 208 0S80 57.4 80 128v32z"/>
    </svg>
  );
};


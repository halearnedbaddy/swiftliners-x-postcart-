import React from 'react';

interface StoreIconProps {
  className?: string;
  size?: number;
}

export const StoreIcon: React.FC<StoreIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 640 512" 
      fill="currentColor"
      className={className}
      width={size}
      height={size}
    >
      <path d="M36.8 192H603.2c20.6 0 36.8-16.6 32.3-36.8l-54-192C578 15.7 565.5 8 552 8H88C74.5 8 62 15.7 58.5 27.2l-54 192C0 175.4 16.2 192 36.8 192zM64 224v224c0 17.7 14.3 32 32 32h448c17.7 0 32-14.3 32-32V224H64zm384 160c0 17.7-14.3 32-32 32s-32-14.3-32-32 14.3-32 32-32 32 14.3 32 32zm-192-32c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32z"/>
    </svg>
  );
};


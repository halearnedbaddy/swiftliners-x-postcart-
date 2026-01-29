import React from 'react';

interface EscrowIconProps {
  className?: string;
  size?: number;
}

export const EscrowIcon: React.FC<EscrowIconProps> = ({ className = '', size = 32 }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      fill="currentColor"
      className={className}
      width={size}
      height={size}
    >
      <path d="M466.5 83.7l-192-80a48.15 48.15 0 0 0-36.9 0l-192 80C27.7 91.1 16 108.6 16 128c0 198.5 114.5 335.7 221.5 380.3 11.8 4.9 25.1 4.9 36.9 0C360.1 472.6 496 349.3 496 128c0-19.4-11.7-36.9-29.5-44.3zM256.1 446.3l-.1-.1-.1.1C163 405.4 64 281.1 64 128l192-80 192 80c0 153.1-99 277.4-191.9 318.3z"/>
      <path d="M256 160c-17.7 0-32 14.3-32 32v128c0 17.7 14.3 32 32 32s32-14.3 32-32V192c0-17.7-14.3-32-32-32zm0-32c35.3 0 64 28.7 64 64v128c0 35.3-28.7 64-64 64s-64-28.7-64-64V192c0-35.3 28.7-64 64-64z"/>
    </svg>
  );
};


import React from 'react';

interface WifiIconProps {
  className?: string;
  size?: number;
}

export const WifiIcon: React.FC<WifiIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 640 512" 
      fill="currentColor"
      className={className}
      width={size}
      height={size}
    >
      <path d="M54.2 202.9C123.2 136.7 216.8 96 320 96s196.8 40.7 265.8 106.9c12.8 12.2 33 11.8 45.2-.9s11.8-33-.9-45.2C549.7 79.5 440.4 32 320 32S90.3 79.5 9.8 161.1c-12.8 12.2-13.2 32.5-.9 45.2s32.5 13.2 45.2 .9zM320 256c-56.8 0-111.9 16.9-158.7 47.9c-12.4 8.2-15.8 25-7.6 37.4s25 15.8 37.4 7.6C216.5 306.8 267.1 288 320 288s103.5 18.8 140.9 50.9c12.4 8.2 29.2 4.8 37.4-7.6s4.8-29.2-7.6-37.4C431.9 272.9 376.8 256 320 256zM320 416a64 64 0 1 0 0-128 64 64 0 1 0 0 128z"/>
    </svg>
  );
};


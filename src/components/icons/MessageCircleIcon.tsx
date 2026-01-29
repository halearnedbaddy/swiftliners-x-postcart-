import React from 'react';

interface MessageCircleIconProps {
  className?: string;
  size?: number;
}

export const MessageCircleIcon: React.FC<MessageCircleIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      fill="currentColor"
      className={className}
      width={size}
      height={size}
    >
      <path d="M256.6 8C116.5 8 8 110.3 8 250.7c0 72.3 29.7 145.2 83.5 198.2c8.3 9 66.8 95.1 90.2 122.7c7.6 10.7 16.2 19 31.5 19.4c16 .1 35.2-4.6 46.1-12.4c8.6-6.1 22.3-18.8 35.7-35.3c4.3-5.3 8.6-10.5 13-15.7c1.3-1.5 3-1.7 5-.8l83.8 23.1c6.1 1.7 12.2-.3 15.9-5.2s4.2-11.2 1.7-16.9l-42.4-84.9c-1.9-3.9-.6-8.5 2.8-11.1c11.1-8.6 21.8-17.1 32-25.6c4.1-3.4 7.2-8.2 7.2-13.4c0-4.2-1.6-8.4-2.1-12.7c-2.8-24.2-5.6-47.7-5.6-71.5c0-140.4-108.5-242.7-248.4-242.7z"/>
    </svg>
  );
};


import React from 'react';

interface RadioIconProps {
  className?: string;
  size?: number;
}

export const RadioIcon: React.FC<RadioIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="currentColor"
      className={className}
      width={size}
      height={size}
    >
      <path d="M494.8 47c12.7-3.7 20-17.5 16.3-30.2S497.8-3.9 485.1-.2l-320 96C156 99.2 144 111.2 144 126v18.2C108.2 157.2 80 192.3 80 233.2V352c0 88.4 71.6 160 160 160s160-71.6 160-160V233.2c0-40.9-28.2-76-64.2-87.8V126c0-14.8 12-26.8 26.8-28.2L494.8 47zM192 416c-35.3 0-64-28.7-64-64V233.2c0-18.1 12.5-33.8 30.1-38.1l33.9-10.2V352c0 35.3 28.7 64 64 64s64-28.7 64-64V185l33.9 10.2c17.6 4.3 30.1 20 30.1 38.1V352c0 35.3-28.7 64-64 64H192z"/>
    </svg>
  );
};


import React from 'react';

interface AlertTriangleIconProps {
  className?: string;
  size?: number;
}

export const AlertTriangleIcon: React.FC<AlertTriangleIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 576 512" 
      fill="currentColor"
      className={className}
      width={size}
      height={size}
    >
      <path d="M248.747 204.705l6.588 112c.37 6.343 5.765 11.277 12.112 11.277h41.106c6.347 0 11.742-4.934 12.112-11.277l6.588-112c.375-6.874-5.142-12.721-11.816-12.721h-54.736c-6.674 0-12.19 5.847-11.815 12.721zM330 384c0 23.196-18.804 42-42 42s-42-18.804-42-42 18.804-42 42-42 42 18.804 42 42zm-.423-360.015c-18.433-31.951-64.687-32.009-83.154 0L6.477 440.013C-11.945 471.946 11.118 512 48.054 512H527.94c36.865 0 60.035-39.993 41.577-71.987L330.577 23.985zM53.191 455.002L282.803 57.001c12.709-22.044 46.776-22.048 59.485 0l229.612 398.001c12.75 22.092-.773 49.998-29.742 49.998H82.933c-28.97 0-42.492-27.906-29.742-49.998z"/>
    </svg>
  );
};


import React from 'react';

interface QrCodeIconProps {
  className?: string;
  size?: number;
}

export const QrCodeIcon: React.FC<QrCodeIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 448 512" 
      fill="currentColor"
      className={className}
      width={size}
      height={size}
    >
      <path d="M0 80V229.5c0 17 6.7 33.3 18.7 45.3l176 176c25 25 65.5 25 90.5 0L418.7 317.3c25-25 25-65.5 0-90.5L331.5 139.3c-12-12-28.3-18.7-45.3-18.7H192 80 48C21.5 120 0 98.5 0 72V80zm48-8h32v48H48V72zm96 240c-17.7 0-32-14.3-32-32s14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32zm64-128c0-17.7 14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32s-32-14.3-32-32zm192 32c17.7 0 32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32zM48 352h32v48H48V352zm96 0h32v48H144V352zm64 0h32v48H208V352zm64 0h32v48H272V352zm64 0h32v48H336V352zm64 0h32v48H400V352zM48 464h32v32c0 8.8-7.2 16-16 16s-16-7.2-16-16V464zm96 0h32v32c0 8.8-7.2 16-16 16s-16-7.2-16-16V464zm64 0h32v32c0 8.8-7.2 16-16 16s-16-7.2-16-16V464zm64 0h32v32c0 8.8-7.2 16-16 16s-16-7.2-16-16V464zm64 0h32v32c0 8.8-7.2 16-16 16s-16-7.2-16-16V464z"/>
    </svg>
  );
};


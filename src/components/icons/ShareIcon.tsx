import React from 'react';

interface ShareIconProps {
  className?: string;
  size?: number;
}

export const ShareIcon: React.FC<ShareIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      fill="currentColor"
      className={className}
      width={size}
      height={size}
    >
      <path d="M307 34.8c-11.5 5.1-19 16.6-19 29.2v64H176C78.8 128 0 206.8 0 304C0 417.3 81.5 467.9 100.2 478.1c2.5 1.4 5.3 1.9 8.1 1.9c10.9 0 19.7-6.3 22.9-15.7c3.2-9.4 3.2-20.3 0-29.7C119.4 414.2 64 368.3 64 304c0-97.2 78.8-176 176-176h112v64c0 12.6 7.4 24.1 19 29.2s25 3 34.4-5.4l160-144c6.7-6.1 10.6-14.7 10.6-23.8s-3.8-17.7-10.6-23.8l-160-144c-9.4-8.5-22.9-10.6-34.4-5.4z"/>
    </svg>
  );
};


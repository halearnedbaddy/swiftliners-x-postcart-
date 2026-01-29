import React from 'react';

interface ArchiveIconProps {
  className?: string;
  size?: number;
}

export const ArchiveIcon: React.FC<ArchiveIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="currentColor"
      className={className}
      width={size}
      height={size}
    >
      <path d="M32 32H480c17.7 0 32 14.3 32 32V96c0 17.7-14.3 32-32 32V415.3l-19.9 20.1c-6.2 6.2-14.4 9.4-22.6 9.4H74.6c-8.2 0-16.4-3.1-22.6-9.4L32 415.3V160c-17.7 0-32-14.3-32-32V64C0 46.3 14.3 32 32 32zM96 224H416V352H96V224z"/>
    </svg>
  );
};


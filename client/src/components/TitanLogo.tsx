import React from 'react';

interface TitanLogoProps {
  size?: number;
  className?: string;
  fill?: string;
}

export function TitanLogo({ size = 40, className = "", fill = "#22c55e" }: TitanLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        fill={fill}
      />
    </svg>
  );
}
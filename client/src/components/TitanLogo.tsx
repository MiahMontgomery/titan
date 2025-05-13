import React from 'react';

interface TitanLogoProps {
  size?: number;
  className?: string;
  fill?: string;
}

export function TitanLogo({ size = 40, className = "", fill = "#01F9C6" }: TitanLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Star shape based on the provided image */}
      <path
        d="M50 10 L60 40 L90 50 L60 60 L50 90 L40 60 L10 50 L40 40 Z"
        fill={fill}
        stroke={fill}
        strokeWidth="1"
        filter="drop-shadow(0 0 3px rgba(1, 249, 198, 0.8))"
      />
    </svg>
  );
}
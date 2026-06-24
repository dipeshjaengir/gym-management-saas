import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Ledger Book Cover */}
      <rect x="25" y="15" width="50" height="70" rx="8" fill="#111827" stroke="#F59E0B" strokeWidth="4" />
      {/* Spine lines */}
      <line x1="33" y1="15" x2="33" y2="85" stroke="#F59E0B" strokeWidth="2" />
      {/* Ledger lines */}
      <line x1="43" y1="35" x2="65" y2="35" stroke="#F59E0B" strokeWidth="2" />
      <line x1="43" y1="48" x2="65" y2="48" stroke="#F59E0B" strokeWidth="2" />
      <line x1="43" y1="61" x2="65" y2="61" stroke="#F59E0B" strokeWidth="2" />

      {/* Dumbbell bar crossing */}
      <rect x="10" y="44" width="80" height="12" rx="4" fill="#2563EB" stroke="#0B1220" strokeWidth="2" />
      {/* Weight Plates Left */}
      <rect x="20" y="28" width="6" height="44" rx="2" fill="#F59E0B" />
      <rect x="12" y="34" width="6" height="32" rx="2" fill="#F59E0B" />
      {/* Weight Plates Right */}
      <rect x="74" y="28" width="6" height="44" rx="2" fill="#F59E0B" />
      <rect x="82" y="34" width="6" height="32" rx="2" fill="#F59E0B" />
    </svg>
  );
};

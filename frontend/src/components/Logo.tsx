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
      <defs>
        <linearGradient id="logo-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="logo-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="logo-card" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>

      {/* 1. Membership Card (Backdrop - rotated) */}
      <rect
        x="12"
        y="22"
        width="76"
        height="52"
        rx="8"
        transform="rotate(-5 50 48)"
        fill="url(#logo-card)"
        stroke="url(#logo-gold)"
        strokeWidth="3.5"
      />

      {/* Card Chip / Logo Details */}
      <rect
        x="20"
        y="32"
        width="12"
        height="10"
        rx="2"
        fill="url(#logo-gold)"
        opacity="0.85"
        transform="rotate(-5 50 48)"
      />
      
      {/* Card Hologram or Lines */}
      <line x1="38" y1="34" x2="68" y2="30" stroke="#475569" strokeWidth="2.5" transform="rotate(-5 50 48)" />
      <line x1="38" y1="42" x2="58" y2="40" stroke="#475569" strokeWidth="2.5" transform="rotate(-5 50 48)" />

      {/* 2. Ledger Book (Sits inside/above the card) */}
      <rect
        x="44"
        y="28"
        width="36"
        height="40"
        rx="3"
        fill="#0F172A"
        stroke="#475569"
        strokeWidth="1.5"
        transform="rotate(2 50 48)"
      />
      <line x1="48" y1="36" x2="72" y2="37" stroke="url(#logo-gold)" strokeWidth="2" transform="rotate(2 50 48)" />
      <line x1="48" y1="46" x2="72" y2="47" stroke="#94A3B8" strokeWidth="1.5" transform="rotate(2 50 48)" />
      <line x1="48" y1="56" x2="64" y2="57" stroke="#94A3B8" strokeWidth="1.5" transform="rotate(2 50 48)" />

      {/* 3. Dumbbell / Barbell (Striking horizontally across) */}
      {/* Barbell handle */}
      <rect
        x="8"
        y="54"
        width="84"
        height="8"
        rx="3"
        fill="url(#logo-blue)"
        stroke="#0F172A"
        strokeWidth="1.5"
      />
      {/* Left weights */}
      <rect x="18" y="40" width="5" height="36" rx="2" fill="url(#logo-gold)" stroke="#0F172A" strokeWidth="1" />
      <rect x="12" y="46" width="5" height="24" rx="1.5" fill="url(#logo-gold)" stroke="#0F172A" strokeWidth="1" />
      {/* Right weights */}
      <rect x="77" y="40" width="5" height="36" rx="2" fill="url(#logo-gold)" stroke="#0F172A" strokeWidth="1" />
      <rect x="83" y="46" width="5" height="24" rx="1.5" fill="url(#logo-gold)" stroke="#0F172A" strokeWidth="1" />

      {/* Decorative Grid Dot for SaaS feel */}
      <circle cx="50" cy="12" r="3" fill="url(#logo-blue)" />
      <circle cx="88" cy="88" r="2" fill="url(#logo-gold)" />
    </svg>
  );
};

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
      style={{ filter: 'drop-shadow(0px 2px 8px rgba(99, 102, 241, 0.15))' }}
    >
      <defs>
        {/* Modern Neon-Gold Premium Gradient */}
        <linearGradient id="premium-gold" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        
        {/* Dynamic Electric Blue/Indigo SaaS Gradient */}
        <linearGradient id="premium-indigo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>

        {/* Glossy Dark Theme Core Shield */}
        <linearGradient id="shield-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* 1. Outer Premium Shield/Hexagon Frame */}
      <path
        d="M50 8L86 28V68L50 88L14 68V28L50 8Z"
        fill="url(#shield-grad)"
        stroke="url(#premium-indigo)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* 2. Abstract Gym Interlaced Lift Line (Barbell Silhouette inside top) */}
      <path
        d="M32 30H68"
        stroke="url(#premium-gold)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.4"
      />
      <circle cx="30" cy="30" r="2.5" fill="url(#premium-gold)" opacity="0.4" />
      <circle cx="70" cy="30" r="2.5" fill="url(#premium-gold)" opacity="0.4" />

      {/* 3. The Central Dynamic Monogram "G" + "L" (SaaS Grid Concept) */}
      {/* "G" Shape Loop - Left and Bottom */}
      <path
        d="M58 40H38C32.48 40 28 44.48 28 50C28 55.52 32.48 60 38 60H58C60.21 60 62 58.21 62 56V50H48"
        stroke="url(#premium-gold)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* "L" Shape / Growth Ledger Line (Stretches upwards representing ledger scale & SaaS growth) */}
      <path
        d="M48 68H62C67.52 68 72 63.52 72 58V38"
        stroke="url(#premium-indigo)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 4. Glowing Micro-Dot / Active Ledger Point */}
      <circle cx="72" cy="38" r="4.5" fill="#10B981" />
    </svg>
  );
};

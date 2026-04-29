import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const sizes = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-20'
  };

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <svg 
        viewBox="0 0 100 60" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={cn(sizes[size], "w-auto")}
      >
        {/* Chain Link Icon */}
        <g id="chain-links">
          {/* Left Link */}
          <path
            d="M35 20H25C20.5817 20 17 23.5817 17 28C17 32.4183 20.5817 36 25 36H35"
            stroke="#0A2F6F"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Right Link */}
          <path
            d="M45 20H55C59.4183 20 63 23.5817 63 28C63 32.4183 59.4183 36 55 36H45"
            stroke="#0A2F6F"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Connecting bar bottom */}
          <path
            d="M35 36H45"
            stroke="#0A2F6F"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Connecting bar top */}
          <path
            d="M35 20H45"
            stroke="#0A2F6F"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </g>

        {showText && (
          <g id="up-arrow">
            {/* "UP" Text */}
            <text
              x="15"
              y="58"
              fill="#0A2F6F"
              fontFamily="Inter, sans-serif"
              fontWeight="900"
              fontSize="24"
              letterSpacing="-0.05em"
            >
              UP
            </text>
            {/* Green Arrow */}
            <path
              d="M65 58V45M65 45L58 52M65 45L72 52"
              stroke="#10A37F"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
      </svg>
    </div>
  );
}

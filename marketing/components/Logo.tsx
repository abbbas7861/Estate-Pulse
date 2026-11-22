import React from 'react';

interface LogoProps {
  /** pixel size for both width & height — defaults to 36 */
  size?: number;
  /** additional className applied to the <svg> element */
  className?: string;
}

/**
 * EstatePulse brand logo — a house roof fused with a heartbeat pulse line.
 * Primary brand colours: #005d42 (deep emerald) and #97f5cc (mint accent).
 */
export const Logo: React.FC<LogoProps> = ({ size = 36, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="EstatePulse logo"
    role="img"
    className={className}
  >
    {/* Background rounded square */}
    <rect width="48" height="48" rx="11" fill="#005d42" />

    <path
      d={[
        /* left wall base */
        'M 7 30',
        /* rise to roof apex */
        'L 24 12',
        /* down to right wall base */
        'L 41 30',

        /* ── heartbeat segment starting from right wall base ── */
        /* flat run left */
        'L 36 30',
        /* sharp dip down */
        'L 32 37',
        /* sharp spike up */
        'L 28 22',
        /* normal peak */
        'L 25 33',
        /* back to baseline and run off left */
        'L 12 33',
      ].join(' ')}
      stroke="#97f5cc"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />

    {/* Subtle apex dot for polish */}
    <circle cx="24" cy="12" r="2" fill="#97f5cc" />
  </svg>
);

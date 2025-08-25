'use client';
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const AnimatedLogo: React.FC<LogoProps> = ({ size = 'md', animated = true }) => {
  const dimensions = {
    sm: { height: 24, fontSize: 18 },
    md: { height: 32, fontSize: 24 },
    lg: { height: 40, fontSize: 32 }
  };

  const { height, fontSize } = dimensions[size];

  return (
    <div className="flex items-center" style={{ height: `${height}px` }}>
      <svg
        width={height}
        height={height}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          marginRight: '12px',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        className={animated ? 'logo-mark' : ''}
      >
        {/* Geometric E shape */}
        <rect x="8" y="8" width="24" height="4" rx="2" fill="var(--primary)" />
        <rect x="8" y="8" width="4" height="24" rx="2" fill="var(--primary)" />
        <rect x="8" y="18" width="16" height="4" rx="2" fill="var(--secondary)" />
        <rect x="8" y="28" width="24" height="4" rx="2" fill="var(--primary)" />
        
        {/* Accent dot */}
        <circle cx="32" cy="10" r="3" fill="var(--accent)" className={animated ? 'accent-dot' : ''} />
      </svg>
      
      <span 
        style={{ 
          fontSize: `${fontSize}px`,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          lineHeight: 1
        }}
      >
        Estait
      </span>

      <style jsx>{`
        .logo-mark:hover {
          transform: rotate(-5deg) scale(1.05);
        }
        
        .accent-dot {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
import React from 'react';

export interface AnimatedBorderProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  active?: boolean;
}

/**
 * High-end animated gradient border wrapper with rotating neon outline & deep backdrop-blur
 */
export const AnimatedBorder: React.FC<AnimatedBorderProps> = ({
  children,
  className = '',
  glow = true,
  active = true,
}) => {
  return (
    <div className={`relative group p-[1.5px] rounded-[26px] overflow-hidden transition-all duration-300 ${className}`}>
      
      {/* 1. Animated Rotating Conic Gradient Border */}
      {active && (
        <div
          className="absolute -inset-[100%] rounded-[26px] bg-[conic-gradient(from_0deg,#0066FF,#9933FF,#00D084,#0066FF)] animate-rotate-border opacity-70 group-hover:opacity-100 transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* 2. Soft Ambient Glow Halo */}
      {glow && active && (
        <div
          className="absolute inset-0 rounded-[26px] bg-linear-to-tr from-[#0066FF]/40 to-[#9933FF]/40 blur-xl opacity-50 group-hover:opacity-85 transition-opacity duration-300 pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* 3. Card Content Surface */}
      <div className="relative rounded-[25px] overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default AnimatedBorder;

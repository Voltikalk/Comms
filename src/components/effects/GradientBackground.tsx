import React, { memo } from 'react';
import ParticleBackground from './ParticleBackground';

export interface GradientBackgroundProps {
  children?: React.ReactNode;
  showParticles?: boolean;
  className?: string;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = memo(({
  children,
  showParticles = true,
  className = '',
}) => {
  return (
    <div className={`auth-canvas-animated relative overflow-hidden flex items-center justify-center min-h-dvh w-full ${className}`}>
      
      {/* 1. Animated Color Mesh Gradient Canvas */}
      <div className="absolute inset-0 bg-linear-to-br from-[#0066FF] via-[#7A33FF] to-[#9933FF] animate-gradient-slow opacity-95 pointer-events-none" />

      {/* 2. Soft Ambient Blurred Glowing Blobs */}
      <div className="auth-blob blob-1" />
      <div className="auth-blob blob-2" />
      <div className="auth-blob blob-3" />

      {/* 3. Layered Dark Overlay for Crisp Glass Contrast */}
      <div className="absolute inset-0 bg-black/20 dark:bg-black/45 backdrop-blur-[2px] pointer-events-none" />

      {/* 4. Canvas Proximity Particle Network (Mounted Once) */}
      {showParticles && <ParticleBackground opacity={0.75} />}

      {/* 5. Foreground Content Container */}
      <div className="relative z-10 w-full flex items-center justify-center p-4 sm:p-6 min-h-dvh">
        {children}
      </div>
    </div>
  );
});

GradientBackground.displayName = 'GradientBackground';

export default GradientBackground;

import React, { memo } from 'react';
import { useParticles, type ParticleOptions } from './useParticles';

export interface ParticleBackgroundProps extends ParticleOptions {
  className?: string;
  opacity?: number;
}

export const ParticleBackground: React.FC<ParticleBackgroundProps> = memo(({
  className = '',
  opacity = 0.85,
  ...particleOptions
}) => {
  const { canvasRef } = useParticles(particleOptions);

  return (
    <canvas
      ref={canvasRef}
      style={{ opacity }}
      className={`pointer-events-none absolute inset-0 w-full h-full z-0 transition-opacity duration-500 ${className}`}
      aria-hidden="true"
    />
  );
});

ParticleBackground.displayName = 'ParticleBackground';

export default ParticleBackground;

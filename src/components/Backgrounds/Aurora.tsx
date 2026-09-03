import React from 'react';

export interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  speed?: number;
  className?: string;
}

export const Aurora: React.FC<AuroraProps> = ({
  colorStops = ['#3390ec', '#a855f7', '#06b6d4', '#ec4899'],
  amplitude = 1.0,
  speed = 1.0,
  className = '',
}) => {
  return (
    <div className={`relative w-full h-full overflow-hidden bg-slate-950 ${className}`}>
      {/* Background radial gradient layers */}
      <div
        className="absolute -inset-[40%] opacity-60 filter blur-[80px] animate-spin"
        style={{
          animationDuration: `${30 / speed}s`,
          background: `radial-gradient(circle at 50% 50%, ${colorStops[0]} 0%, transparent 60%),
                       radial-gradient(circle at 20% 80%, ${colorStops[1]} 0%, transparent 50%),
                       radial-gradient(circle at 80% 20%, ${colorStops[2]} 0%, transparent 50%),
                       radial-gradient(circle at 80% 80%, ${colorStops[3] || colorStops[0]} 0%, transparent 55%)`,
          transform: `scale(${amplitude})`,
        }}
      />
      {/* Secondary undulating counter-drift layer */}
      <div
        className="absolute -inset-[50%] opacity-40 filter blur-[100px] animate-pulse"
        style={{
          animationDuration: `${8 / speed}s`,
          background: `conic-gradient(from 180deg at 50% 50%, ${colorStops[1]} 0deg, ${colorStops[0]} 120deg, ${colorStops[2]} 240deg, ${colorStops[1]} 360deg)`,
        }}
      />
      {/* Noise texture overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
    </div>
  );
};

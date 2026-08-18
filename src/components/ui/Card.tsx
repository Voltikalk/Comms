import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  maxWidth = 'md',
  className = '',
  ...props
}) => {
  const maxWidthMap = {
    sm: 'max-w-[380px]',
    md: 'max-w-[450px]',
    lg: 'max-w-[540px]',
    full: 'max-w-full',
  };

  return (
    <div
      className={`
        w-full ${maxWidthMap[maxWidth]}
        glass-card rounded-[20px] sm:rounded-[24px] p-4 sm:p-7 md:p-8
        backdrop-blur-[20px] hover:backdrop-blur-[28px]
        relative z-10 transition-all duration-300 contain-card gpu-layer
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <div className={`text-center mb-4 sm:mb-6 ${className}`}>{children}</div>;
};

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <h1 className={`text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight m-0 ${className}`}>
      {children}
    </h1>
  );
};

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <p className={`text-xs sm:text-sm text-slate-500 dark:text-slate-300 font-body mt-1 sm:mt-1.5 ${className}`}>
      {children}
    </p>
  );
};

export default Card;

import React from 'react';
import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion';
import { Check } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { useButtonAnimation } from '../animations/useButtonAnimation';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isSuccess?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isSuccess = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  onClick,
  ...props
}) => {
  const { ripples, createRipple, buttonVariants } = useButtonAnimation();

  const sizeStyles = {
    sm: 'min-h-[40px] py-2 px-3.5 text-xs font-semibold gap-1.5',
    md: 'min-h-[48px] py-3 px-4 text-sm font-semibold gap-2',
    lg: 'min-h-[52px] py-3.5 px-6 text-base font-bold gap-2.5',
  };

  const variantStyles = {
    primary: isSuccess
      ? 'bg-[#00D084] text-white shadow-lg shadow-[#00D084]/40'
      : 'btn-gradient-primary text-white shadow-md',
    secondary: 'btn-glass-secondary text-zinc-800 dark:text-white',
    outline: 'bg-transparent border-2 border-accent text-accent dark:text-accent-soft dark:border-accent-soft hover:bg-accent/10',
    danger: 'bg-danger hover:bg-danger text-white shadow-sm',
    ghost: 'bg-transparent hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-200',
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading && !isSuccess) {
      createRipple(e);
      onClick?.(e);
    }
  };

  return (
    <motion.button
      variants={buttonVariants}
      initial="idle"
      animate={isSuccess ? { scale: [1, 1.03, 1] } : undefined}
      whileHover={disabled || isLoading || isSuccess ? 'disabled' : 'hover'}
      whileTap={disabled || isLoading || isSuccess ? 'disabled' : 'tap'}
      disabled={disabled || isLoading || isSuccess}
      onClick={handleClick}
      className={`
        relative overflow-hidden inline-flex items-center justify-center select-none cursor-pointer
        rounded-[14px] transition-all duration-300 touch-manipulation
        focus:outline-none 
        ${fullWidth ? 'w-full' : ''}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${isLoading ? 'animate-shimmer' : ''}
        ${disabled || isLoading ? 'opacity-55 cursor-not-allowed transform-none' : ''}
        ${className}
`}
      {...props}
    >
      {/* Ripple Animation Elements */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          style={{
            top: ripple.y,
            left: ripple.x,
            width: ripple.size,
            height: ripple.size,
          }}
          className="absolute rounded-full bg-white/30 pointer-events-none animate-[rippleEffect_0.6s_ease-out_forwards]"
        />
      ))}

      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            key="success-state"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 font-bold"
          >
            <Check className="w-5 h-5 animate-success-check" strokeWidth={3} />
            <span>Успешно!</span>
          </motion.div>
        ) : isLoading ? (
          <motion.div
            key="loading-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2"
          >
            <LoadingSpinner size={size === 'lg' ? 'md' : 'sm'} color="white" />
            <span>Подключение...</span>
          </motion.div>
        ) : (
          <motion.div
            key="idle-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2"
          >
            {leftIcon && <span className="inline-flex shrink-0 transition-transform duration-200 group-hover:scale-110">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="inline-flex shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">{rightIcon}</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default Button;

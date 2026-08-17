import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useInputAnimation } from '../animations/useInputAnimation';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  showClearButton?: boolean;
  onClear?: () => void;
  showCount?: boolean;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      onRightIconClick,
      showClearButton = false,
      onClear,
      showCount = false,
      maxLength,
      containerClassName = '',
      className = '',
      id,
      value,
      onFocus,
      onBlur,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const {
      isFocused,
      isHovered,
      handleFocus,
      handleBlur,
      handleChange,
      handleMouseEnter,
      handleMouseLeave,
      iconVariants,
      errorShakeVariants,
    } = useInputAnimation();

    const stringValue = typeof value === 'string' ? value : '';
    const hasValue = stringValue.length > 0;

    return (
      <div
        className={`w-full flex flex-col gap-1.5 transition-smooth ${containerClassName}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Label & Optional Character Counter Header */}
        <div className="flex items-center justify-between px-0.5 select-none">
          {label && (
            <motion.label
              htmlFor={inputId}
              animate={{
                y: isFocused || hasValue ? -1 : 0,
                scale: isFocused || hasValue ? 0.98 : 1,
              }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              className={`
                text-xs font-semibold tracking-wide font-body transition-colors duration-200
                ${isFocused ? 'text-[#0066FF] dark:text-[#9933FF]' : error ? 'text-[#FF3333]' : 'text-slate-700 dark:text-slate-200'}
              `}
            >
              {label}
            </motion.label>
          )}

          {showCount && hasValue && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] font-mono text-slate-400 dark:text-slate-500"
            >
              {stringValue.length}{maxLength ? `/${maxLength}` : ''}
            </motion.span>
          )}
        </div>

        {/* Input Capsule with Left/Right Icon & Clear Button */}
        <div className="relative w-full flex items-center">
          {leftIcon && (
            <motion.div
              variants={iconVariants}
              animate={isFocused ? 'focused' : isHovered ? 'hovered' : 'idle'}
              className={`
                absolute left-3.5 pointer-events-none flex items-center justify-center origin-center transition-colors duration-200 z-10
                ${isFocused ? 'text-[#0066FF] dark:text-[#9933FF]' : 'text-slate-400 dark:text-slate-200'}
              `}
            >
              {leftIcon}
            </motion.div>
          )}

          <input
            id={inputId}
            ref={ref}
            value={value}
            maxLength={maxLength}
            onFocus={(e) => {
              handleFocus();
              onFocus?.(e);
            }}
            onBlur={(e) => {
              handleBlur(e);
              onBlur?.(e);
            }}
            onChange={(e) => {
              handleChange(e);
              onChange?.(e);
            }}
            className={`
              w-full py-2.5 rounded-[12px] text-sm font-body
              glass-input transition-all duration-200
              ${leftIcon ? 'pl-10' : 'pl-3.5'}
              ${rightIcon || (showClearButton && hasValue) ? 'pr-11' : 'pr-3.5'}
              ${error ? 'input-error !bg-[#FF3333]/[0.08] !border-[#FF3333]' : ''}
              placeholder-slate-400/80 dark:placeholder-slate-500/80
              focus:placeholder-slate-400/40
              disabled:opacity-50 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />

          {/* Clear Button (X icon with spring pop) */}
          <AnimatePresence>
            {showClearButton && hasValue && onClear && (
              <motion.button
                type="button"
                onClick={onClear}
                initial={{ opacity: 0, scale: 0.6, rotate: -45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6, rotate: 45 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className={`
                  absolute right-3 p-1 rounded-full bg-slate-200/80 dark:bg-white/15 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white
                  hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer
                  ${rightIcon ? 'right-9' : 'right-3'}
                `}
                title="Очистить поле"
                tabIndex={-1}
              >
                <X className="w-3 h-3" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Right Action / Toggle Icon */}
          {rightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              tabIndex={-1}
              className={`
                absolute right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-200 dark:hover:text-white
                hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center
                ${onRightIconClick ? 'cursor-pointer' : 'pointer-events-none'}
              `}
            >
              {rightIcon}
            </button>
          )}
        </div>

        {/* Error message with slide-down & wobble */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.span
              variants={errorShakeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-xs text-[#FF3333] font-medium font-body flex items-center gap-1.5 mt-0.5 select-none"
            >
              <span className="inline-block animate-icon-wobble">⚠️</span>
              {error}
            </motion.span>
          )}

          {!error && helperText && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-slate-500 dark:text-slate-400 font-body select-none"
            >
              {helperText}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

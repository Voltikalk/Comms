import React, { useId } from 'react';

export interface AuthFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'placeholder' | 'className'> {
  label: string;
  error?: string | null;
  /** Element pinned to the right edge (eye toggle, check mark…). */
  trailing?: React.ReactNode;
  /** Shown under the field when there is no error. */
  hint?: string;
  ref?: React.Ref<HTMLInputElement>;
}

/**
 * Telegram Web K style outlined input: the label sits inside the field and
 * floats onto the border on focus / when filled. Pure CSS (`peer` +
 * `:placeholder-shown`), so autofill and controlled values both work.
 */
export const AuthField: React.FC<AuthFieldProps> = ({ label, error, trailing, hint, id, ...inputProps }) => {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className="w-full text-left">
      <div className="relative">
        <input
          id={inputId}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`peer w-full h-[54px] rounded-xl bg-transparent px-4 ${trailing ? 'pr-12' : ''} text-[15px] text-slate-900 dark:text-white border outline-hidden transition-[border-color,box-shadow] duration-150 disabled:opacity-60 ${
            error
              ? 'border-rose-500'
              : 'border-slate-300/90 dark:border-white/[0.14] hover:border-[#3390EC]/70'
          }`}
          {...inputProps}
        />
        <label
          htmlFor={inputId}
          className={`absolute left-3 px-1 top-1/2 -translate-y-1/2 text-[15px] pointer-events-none bg-white dark:bg-[#17212B] transition-all duration-150 ease-out
            peer-focus:top-0 peer-focus:text-xs
            peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs ${
              error ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500 peer-focus:text-[#3390EC]'
            }`}
        >
          {label}
        </label>
        {trailing && <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">{trailing}</div>}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 px-1 text-[12.5px] text-rose-500 font-medium">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 px-1 text-[12.5px] text-slate-400 dark:text-slate-500">{hint}</p>
      )}
    </div>
  );
};

export default AuthField;

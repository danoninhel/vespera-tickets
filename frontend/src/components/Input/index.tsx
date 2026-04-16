import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-sm font-medium text-text-primary mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full h-12 px-4 text-base text-text-primary
            border border-border rounded-[--radius-md] 
            bg-white placeholder:text-text-secondary
            focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
            disabled:bg-background-secondary disabled:cursor-not-allowed
            transition-colors duration-200
            ${error ? 'border-error focus:border-error focus:ring-error/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-error">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
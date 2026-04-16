import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, className = '', children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-[--radius-md] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50';
    
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-dark',
      secondary: 'bg-transparent text-primary border border-primary hover:bg-background-secondary active:bg-background-secondary',
      ghost: 'bg-transparent text-text-secondary hover:bg-background-secondary active:bg-background-secondary',
    };
    
    const sizes = {
      sm: 'text-sm px-3 py-2',
      md: 'text-base px-6 py-3',
      lg: 'text-base px-8 py-4',
    };
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
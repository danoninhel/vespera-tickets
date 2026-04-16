import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div 
      className={`
        bg-white border border-border rounded-[--radius-lg] p-[--spacing-lg]
        shadow-[0_1px_3px_rgba(0,0,0,0.08)]
        ${hover ? 'hover:shadow-lg hover:transition-all cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
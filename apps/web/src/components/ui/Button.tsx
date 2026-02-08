import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  fullWidth,
  className,
  children,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn('ui-button', fullWidth && 'ui-button-full', className)}
      data-variant={variant}
      style={fullWidth ? { width: '100%' } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}

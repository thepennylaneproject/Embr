import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  loading?: boolean;
  ariaLabel?: string;
}

export function Button({
  variant = 'primary',
  fullWidth,
  loading = false,
  ariaLabel,
  className,
  children,
  disabled,
  ...props
}: PropsWithChildren<ButtonProps>) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={cn('ui-button', fullWidth && 'ui-button-full', className)}
      data-variant={variant}
      style={fullWidth ? { width: '100%' } : undefined}
      disabled={isDisabled}
      aria-busy={loading}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  );
}

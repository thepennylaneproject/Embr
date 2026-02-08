import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ id, label, error, hint, className, ...props }: InputProps) {
  return (
    <label htmlFor={id} style={{ display: 'block' }}>
      {label ? <span className="ui-label">{label}</span> : null}
      <input id={id} className={cn('ui-field', className)} aria-invalid={Boolean(error)} {...props} />
      {error ? <p className="ui-error-text">{error}</p> : null}
      {!error && hint ? <p className="ui-help-text">{hint}</p> : null}
    </label>
  );
}

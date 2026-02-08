import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function TextArea({ id, label, error, hint, className, ...props }: TextAreaProps) {
  return (
    <label htmlFor={id} style={{ display: 'block' }}>
      {label ? <span className="ui-label">{label}</span> : null}
      <textarea
        id={id}
        className={cn('ui-field', 'ui-textarea', className)}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? <p className="ui-error-text">{error}</p> : null}
      {!error && hint ? <p className="ui-help-text">{hint}</p> : null}
    </label>
  );
}

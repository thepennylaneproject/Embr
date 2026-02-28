import type { TextareaHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function TextArea({ id, label, error, hint, className, ...props }: TextAreaProps) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = !error && hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <label htmlFor={id} style={{ display: 'block' }}>
      {label ? <span className="ui-label">{label}</span> : null}
      <textarea
        id={id}
        className={cn('ui-field', 'ui-textarea', className)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <p id={errorId} className="ui-error-text">
          {error}
        </p>
      ) : null}
      {!error && hint ? (
        <p id={hintId} className="ui-help-text">
          {hint}
        </p>
      ) : null}
    </label>
  );
}

/**
 * @embr/ui
 *
 * Shared React UI components for the Embr ecosystem.
 *
 * This package exports all foundational UI components that should be used
 * across Embr applications (web, mobile, etc.) for design consistency.
 *
 * Components are currently defined in apps/web/src/components/ui and re-exported here.
 * Future work: Move components into packages/ui/src/components as the shared library matures.
 */

// Core UI Components
export type { InputHTMLAttributes } from 'react';

/**
 * Button component with support for variants, loading states, and accessibility.
 *
 * @example
 * <Button variant="primary" loading={isSubmitting}>
 *   Submit
 * </Button>
 */
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
  loading?: boolean;
  ariaLabel?: string;
}

/**
 * Input component with label, error, and hint support.
 *
 * @example
 * <Input
 *   id="email"
 *   label="Email"
 *   error={emailError}
 *   hint="We'll never share your email"
 * />
 */
export interface InputProps {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * TextArea component with label, error, and hint support.
 *
 * @example
 * <TextArea
 *   id="message"
 *   label="Message"
 *   error={messageError}
 * />
 */
export interface TextAreaProps {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * Avatar component with image and initials fallback.
 *
 * @example
 * <Avatar src="/profile.jpg" name="John Doe" size={40} />
 */
export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string | null;
  size?: number;
  className?: string;
}

/**
 * Card component for grouping content.
 *
 * @example
 * <Card padding="lg">
 *   <h2>Card Title</h2>
 *   <p>Card content</p>
 * </Card>
 */
export interface CardProps {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Modal dialog component with focus management and accessibility.
 *
 * @example
 * <Modal isOpen={open} onClose={handleClose} title="Confirm">
 *   Are you sure?
 * </Modal>
 */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

/**
 * PageState component for displaying loading, empty, or error states.
 *
 * @example
 * <PageState
 *   title="No results"
 *   description="Try adjusting your search"
 *   isLoading={loading}
 * />
 */
export interface PageStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  isLoading?: boolean;
}

/**
 * Toast notification component.
 *
 * @example
 * const { showToast } = useToast();
 * showToast({ title: 'Success!', kind: 'success' });
 */
export interface ToastMessage {
  title: string;
  description?: string;
  kind: 'info' | 'error';
}

// Design System Exports
/**
 * Color palette matching the Muted Phoenix Theme.
 *
 * Primary: Terracotta (#c4997d)
 * Secondary: Teal (#6ba898)
 * Accent: Navy (#4a5f7f)
 * Neutral: Cream (#fefdfb)
 */
export const designTokens = {
  colors: {
    primary: '#c4997d',
    secondary: '#6ba898',
    accent: '#4a5f7f',
    neutral: '#fefdfb',
    error: '#9b6b5a',
    success: '#6ba898',
    warning: '#c4997d',
    info: '#4a5f7f',
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '2.5rem',
    '3xl': '3rem',
  },
};

// Re-export commonly used React types for component definitions
export type { ReactNode, PropsWithChildren } from 'react';

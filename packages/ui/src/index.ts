/**
 * @embr/ui
 *
 * Shared React UI components for the Embr ecosystem.
 *
 * This package provides a consistent set of UI components designed to be used
 * across Embr applications (web, mobile, etc.) to maintain visual and behavioral consistency.
 *
 * All components are now defined in packages/ui/src/components and properly exported here.
 */

// Core Component Exports
export {
  // Form Components
  Button,
  Input,
  TextArea,
  // Display Components
  Avatar,
  Card,
  PageState,
  // Dialog Components
  Modal,
  // Notification Components
  ToastProvider,
  useToast,
  type ToastKind,
} from './components';

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

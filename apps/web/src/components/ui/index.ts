/**
 * Backward Compatibility Layer
 *
 * This file re-exports components from @embr/ui for backward compatibility
 * during the migration from local components to the shared library.
 *
 * Long-term: Import directly from @embr/ui instead of @/components/ui
 */
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
} from '@embr/ui';

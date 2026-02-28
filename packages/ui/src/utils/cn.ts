/**
 * Utility to conditionally join classnames together.
 * Filters out falsy values for cleaner CSS class composition.
 */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

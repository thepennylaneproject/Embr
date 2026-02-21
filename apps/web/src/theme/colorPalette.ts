/**
 * EMBR BRAND COLOR PALETTE
 * Muted Phoenix Theme - Easy on the nervous system
 *
 * Based on embr logo analysis
 */

export const colorPalette = {
  // Primary - Muted Terracotta (Phoenix bird)
  primary: {
    50: '#faf6f4',
    100: '#f5eee9',
    200: '#ebd7cc',
    300: '#d9baa8',
    400: '#c4977d',  // Main terracotta
    500: '#b88566',
    600: '#a67452',
    700: '#886043',
    800: '#6d4a37',
    900: '#523729',
  },

  // Secondary - Teal (Water/Calm)
  secondary: {
    50: '#f0f7f6',
    100: '#dceee8',
    200: '#b8d9d3',
    300: '#8dbfb0',
    400: '#6ba898',  // Main teal
    500: '#5a9684',
    600: '#497e6f',
    700: '#3a6659',
    800: '#2d5246',
    900: '#213c35',
  },

  // Accent - Navy (Grounding)
  accent: {
    50: '#f5f7fa',
    100: '#e8ecf2',
    200: '#cbd5e3',
    300: '#a1b3c8',
    400: '#6a7f9e',
    500: '#4a5f7f',  // Main navy
    600: '#374563',
    700: '#2c3847',
    800: '#232d39',
    900: '#1a202c',
  },

  // Neutral - Cream (Background)
  neutral: {
    50: '#fefdfb',
    100: '#faf8f5',
    200: '#f3ebe5',
    300: '#e8ddd2',
    400: '#d4ccc0',
    500: '#c0b8ac',
    600: '#a89d91',
    700: '#8f8478',
    800: '#76695e',
    900: '#5d5248',
  },

  // Semantic
  success: '#6ba898',    // Teal
  warning: '#c4977d',    // Terracotta
  error: '#9b6b5a',      // Darker terracotta
  info: '#4a5f7f',       // Navy
};

// Tailwind CSS configuration
export const tailwindConfig = {
  colors: {
    embr: {
      primary: colorPalette.primary,
      secondary: colorPalette.secondary,
      accent: colorPalette.accent,
      neutral: colorPalette.neutral,
      success: colorPalette.success,
      warning: colorPalette.warning,
      error: colorPalette.error,
      info: colorPalette.info,
    },
  },
};

// Component utility classes
export const componentStyles = {
  button: {
    primary: 'bg-embr-primary-400 hover:bg-embr-primary-500 text-white',
    secondary: 'bg-embr-secondary-400 hover:bg-embr-secondary-500 text-white',
    accent: 'bg-embr-accent-500 hover:bg-embr-accent-600 text-white',
    ghost: 'bg-embr-neutral-200 hover:bg-embr-neutral-300 text-embr-accent-900',
  },
  card: 'bg-embr-neutral-50 border border-embr-neutral-200',
  cardDark: 'bg-embr-accent-800 border border-embr-accent-700 text-embr-neutral-50',
  input: 'bg-embr-neutral-100 border border-embr-neutral-300 focus:border-embr-primary-400 text-embr-accent-900',
  badge: {
    primary: 'bg-embr-primary-100 text-embr-primary-700',
    secondary: 'bg-embr-secondary-100 text-embr-secondary-700',
    accent: 'bg-embr-accent-100 text-embr-accent-700',
  },
  text: {
    primary: 'text-embr-accent-900',
    secondary: 'text-embr-accent-600',
    muted: 'text-embr-accent-400',
  },
  gradient: {
    phoenix: 'from-embr-primary-400 via-embr-primary-300 to-embr-primary-200',
    calm: 'from-embr-secondary-400 to-embr-neutral-100',
    depth: 'from-embr-accent-900 via-embr-accent-700 to-embr-accent-800',
  },
};

export default colorPalette;

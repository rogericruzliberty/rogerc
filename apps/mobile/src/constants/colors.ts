/**
 * Liberty Construction Field App — Color Palette & Theme
 *
 * Primary brand colors from Liberty Construction brand guide.
 * Supports light mode with high-contrast option.
 */

export const Colors = {
  // Primary brand
  navy: '#2e358f',
  lightBlue: '#a1b3dd',

  // Backgrounds
  warmBg: '#f8f6f1',
  white: '#ffffff',
  surface: '#f5f7ff',

  // Text
  textPrimary: '#1a1a2e',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  textOnNavy: '#ffffff',

  // Borders
  border: '#e2e4eb',
  borderFocus: '#2e358f',

  // Status
  success: '#16a34a',
  successBg: '#dcfce7',
  warning: '#d97706',
  warningBg: '#fef3c7',
  danger: '#dc2626',
  dangerBg: '#fef2f2',

  // High contrast mode overrides
  highContrast: {
    bg: '#000000',
    surface: '#1a1a1a',
    text: '#f2f2f2',
    border: '#333333',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  title: 32,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

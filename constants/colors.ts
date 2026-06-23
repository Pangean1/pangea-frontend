export const Colors = {
  // Backgrounds
  bg: '#0F1117',
  bgCard: '#1A1D27',
  bgCardAlt: '#21253A',

  // Accent (teal/mint)
  teal: '#2DD4BF',
  tealDim: '#1A998A',
  tealBg: 'rgba(45, 212, 191, 0.12)',
  tealBorder: 'rgba(45, 212, 191, 0.25)',

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#9CA3AF',
    muted: '#6B7280',
    inverse: '#0F1117',
  },

  // Status colors
  success: '#2DD4BF',
  successBg: 'rgba(45, 212, 191, 0.12)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.12)',
  info: '#60A5FA',
  infoBg: 'rgba(96, 165, 250, 0.12)',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.05)',

  // Misc
  white: '#FFFFFF',
  black: '#000000',

  // Legacy aliases (keep for compatibility during transition)
  primary: '#2DD4BF',
  primaryLight: '#2DD4BF',
  primaryDark: '#1A998A',
  primaryBg: 'rgba(45, 212, 191, 0.12)',
} as const;

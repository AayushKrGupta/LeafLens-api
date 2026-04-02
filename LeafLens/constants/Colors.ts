const palette = {
  black: '#0A0A0B',
  charcoal: '#161618',
  gray800: '#1F1F23',
  gray500: '#9CA3AF',
  indigo: '#4F46E5', // Electric blue / Indigo
  indigoLight: '#818CF8',
  white: '#FFFFFF',
  error: '#EF4444',
  success: '#10B981',
};

export default {
  // We're only focused on Dark mode as per request
  dark: {
    text: palette.white,
    textSecondary: palette.gray500,
    background: palette.black,
    card: palette.charcoal,
    cardBorder: palette.gray800,
    accent: palette.indigo,
    accentLight: palette.indigoLight,
    tint: palette.indigo,
    tabIconDefault: palette.gray500,
    tabIconSelected: palette.indigo,
    success: palette.success,
    error: palette.error,
    glass: 'rgba(26, 27, 31, 0.8)',
    glow: 'rgba(79, 70, 229, 0.3)',
  },
  light: {
    // Basic fallback but dark mode is priorized
    text: '#000',
    background: '#fff',
    tint: palette.indigo,
    tabIconDefault: '#ccc',
    tabIconSelected: palette.indigo,
  },
};


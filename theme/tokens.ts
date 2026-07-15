export const colors = {
  bgPrimary: '#0A0A0F',
  bgSurface: '#16161D',
  bgSurfaceRaised: '#1F1F29',

  accentPrimary: '#6C5CE7',

  progressLow: '#6B7280',
  progressMid: '#F59E0B',
  progressHigh: '#10B981',

  textPrimary: '#F5F5F7',
  textSecondary: '#A5ABB6',

  error: '#F87171',

  // Difficulty colors reuse the progress scale per spec intent
  difficultyEasy: '#10B981',
  difficultyMedium: '#F59E0B',
  difficultyHard: '#F87171',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  card: 12,
  sheet: 20,
  pill: 999,
} as const;
/**
 * NutriTracker AI — Design Tokens
 * -------------------------------------------------------------
 * Two complete token sets: darkTokens ("Cyber Neon") and lightTokens ("Frosted Daylight").
 * BOTH token sets have IDENTICAL keys.
 * -------------------------------------------------------------
 */

export const fontFamilies = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
  numeralMedium: 'SpaceGrotesk_500Medium',
  numeralSemiBold: 'SpaceGrotesk_600SemiBold',
  numeralBold: 'SpaceGrotesk_700Bold',
};

export const darkTokens = {
  // Mode identity
  mode: 'dark',
  isDark: true,

  // Background canvas
  bg: '#040406',
  bgSolid: '#040406',

  // Ambient Blobs (4 glowing orbs)
  blobs: {
    blob1: 'rgba(16, 232, 160, 0.16)', // mint
    blob2: 'rgba(0, 210, 255, 0.14)',  // cyan
    blob3: 'rgba(139, 92, 246, 0.14)', // violet
    blob4: 'rgba(255, 184, 0, 0.12)',  // amber
    blur: 90,
  },

  // 1) Glassmorphism — Containers (cards, panels)
  glass: {
    fill: 'rgba(20, 22, 30, 0.65)',
    fillFallback: '#14161E',
    fillSubtle: 'rgba(20, 22, 30, 0.45)',
    border: 'rgba(255, 255, 255, 0.12)',
    borderGradientStart: 'rgba(255, 255, 255, 0.18)',
    borderGradientEnd: 'rgba(255, 255, 255, 0.03)',
    highlight: 'rgba(255, 255, 255, 0.08)',
    shadow: 'rgba(0, 0, 0, 0.55)',
    blur: 24,
  },

  // 2) Liquid Glass — Floating / Interactive (tab bar, buttons, chips, FAB, streak pill, modals)
  liquidGlass: {
    fill: 'rgba(30, 34, 46, 0.55)',
    fillFallback: '#1E222E',
    specularHighlight: 'rgba(255, 255, 255, 0.35)',
    rim: 'rgba(255, 255, 255, 0.16)',
    glow: 'rgba(16, 232, 160, 0.30)',
    coloredShadow: 'rgba(16, 232, 160, 0.22)',
    shadow: 'rgba(0, 0, 0, 0.45)',
    blur: 32,
  },

  // 3) Neumorphism — Tactile controls (tracks, inputs, steppers, slots)
  neumorphic: {
    base: '#0E1016',
    raised: '#12151D',
    inset: '#0A0C10',
    lightShadow: 'rgba(255, 255, 255, 0.05)',
    darkShadow: 'rgba(0, 0, 0, 0.65)',
    border: 'rgba(255, 255, 255, 0.06)',
    track: '#0A0C10',
  },

  neu: {
    base: '#0E1016',
    raised: '#12151D',
    inset: '#0A0C10',
    lightShadow: 'rgba(255, 255, 255, 0.05)',
    darkShadow: 'rgba(0, 0, 0, 0.65)',
    track: '#0A0C10',
  },

  // Inputs
  input: {
    bg: '#0A0C10',
    border: 'rgba(255, 255, 255, 0.10)',
    borderFocused: '#10E8A0',
    placeholder: '#A7B0BC', // Secondary text for >= 4.5:1 contrast
    text: '#F5F7FA',
  },

  // Text
  text: {
    primary: '#F5F7FA',
    secondary: '#A7B0BC',
    muted: '#6B7482', // Decorative only
    inverse: '#040406',
    accent: '#10E8A0',
    primaryInverted: '#040406',
  },

  // Typography scale
  fonts: fontFamilies,
  typography: {
    hero: {
      fontSize: 48,
      fontFamily: fontFamilies.numeralBold,
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.2,
      lineHeight: 56,
    },
    heroSmall: {
      fontSize: 38,
      fontFamily: fontFamilies.numeralBold,
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.2,
      lineHeight: 46,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      fontFamily: fontFamilies.bold,
      letterSpacing: -0.2,
      lineHeight: 28,
    },
    sectionHeading: {
      fontSize: 18,
      fontWeight: '700',
      fontFamily: fontFamilies.bold,
      letterSpacing: -0.15,
      lineHeight: 24,
    },
    body: {
      fontSize: 15,
      fontWeight: '500',
      fontFamily: fontFamilies.medium,
      lineHeight: 22,
      letterSpacing: 0,
    },
    bodyBold: {
      fontSize: 15,
      fontWeight: '700',
      fontFamily: fontFamilies.bold,
      lineHeight: 22,
      letterSpacing: 0,
    },
    caption: {
      fontSize: 13,
      fontWeight: '500',
      fontFamily: fontFamilies.medium,
      lineHeight: 19,
      letterSpacing: 0,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      fontFamily: fontFamilies.semiBold,
      lineHeight: 16,
      letterSpacing: 0,
    },
    uppercaseLabel: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: fontFamilies.bold,
      lineHeight: 16,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    numeralLarge: {
      fontSize: 28,
      fontWeight: '700',
      fontFamily: fontFamilies.numeralBold,
      fontVariant: ['tabular-nums'],
      lineHeight: 34,
    },
    numeralMedium: {
      fontSize: 20,
      fontWeight: '700',
      fontFamily: fontFamilies.numeralBold,
      fontVariant: ['tabular-nums'],
      lineHeight: 26,
    },
    numeralSmall: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: fontFamilies.numeralBold,
      fontVariant: ['tabular-nums'],
      lineHeight: 18,
    },
  },

  // Primary brand / Hero
  primary: '#10E8A0',
  primaryLight: '#34FFA8',
  primaryGlow: 'rgba(16, 232, 160, 0.40)',
  heroGradientStart: '#10E8A0',
  heroGradientEnd: '#00D2FF',

  // Macro Color Families (Same hue family across themes)
  macros: {
    calories: '#FF4D4D',      // Laser Coral
    caloriesGlow: 'rgba(255, 77, 77, 0.35)',
    protein: '#00D2FF',       // Hyper Cyan
    proteinGlow: 'rgba(0, 210, 255, 0.35)',
    carbs: '#FFB800',         // Sunburst Amber
    carbsGlow: 'rgba(255, 184, 0, 0.35)',
    fat: '#FF2D78',           // Hot Magenta
    fatGlow: 'rgba(255, 45, 120, 0.35)',
    fiber: '#4ADE80',         // Laser Green
    fiberGlow: 'rgba(74, 222, 128, 0.35)',
    water: '#38BDF8',         // Sky Blue
    waterGlow: 'rgba(56, 189, 248, 0.35)',
  },

  // Meals
  meals: {
    breakfast: '#FFB800',
    lunch: '#10E8A0',
    dinner: '#8B5CF6',
    snack: '#FF2D78',
  },

  // Semantics
  semantics: {
    success: '#10E8A0',
    warning: '#FFB800',
    danger: '#FF4D4D',
    info: '#00D2FF',
  },

  // Convenient flat colors map
  colors: {
    primary: '#10E8A0',
    primaryText: '#040406',
    primaryLight: '#34FFA8',
    bg: '#040406',
    bgSolid: '#040406',
    cardBg: 'rgba(20, 22, 30, 0.65)',
    glassBg: 'rgba(20, 22, 30, 0.65)',
    liquidGlassBg: 'rgba(30, 34, 46, 0.55)',
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    cardBorderSubtle: 'rgba(255, 255, 255, 0.08)',
    neuBase: '#0E1016',
    inputBg: '#0A0C10',
    inputBorder: 'rgba(255, 255, 255, 0.10)',
    placeholder: '#A7B0BC', // Secondary text
    textPrimary: '#F5F7FA',
    textSecondary: '#A7B0BC',
    textMuted: '#6B7482',
    calories: '#FF4D4D',
    protein: '#00D2FF',
    carbs: '#FFB800',
    fats: '#FF2D78',
    fiber: '#4ADE80',
    water: '#38BDF8',
    warning: '#FFB800',
    danger: '#FF4D4D',
    dangerText: '#FFFFFF',
    success: '#10E8A0',
    accentViolet: '#8B5CF6',
    glassShadow: 'rgba(0, 0, 0, 0.55)',
  },

  // Blur parameters
  blur: {
    card: 24,
    sheet: 32,
    tint: 'dark',
  },

  // Navigation
  nav: {
    bg: 'rgba(20, 22, 30, 0.70)',
    border: 'rgba(255, 255, 255, 0.12)',
    activePill: '#10E8A0',
    activePillText: '#040406',
    inactiveIcon: '#6B7482',
  },

  // Elevation & Radii
  radii: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    full: 999,
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
};

export const lightTokens = {
  // Mode identity
  mode: 'light',
  isDark: false,

  // Background canvas
  bg: '#EAEFF4',
  bgSolid: '#EAEFF4',

  // Ambient Blobs (4 soft pastel orbs)
  blobs: {
    blob1: 'rgba(126, 242, 201, 0.28)', // pastel mint
    blob2: 'rgba(143, 216, 255, 0.28)', // pastel sky
    blob3: 'rgba(196, 181, 253, 0.24)', // pastel lavender
    blob4: 'rgba(255, 213, 154, 0.24)', // pastel peach
    blur: 100,
  },

  // 1) Glassmorphism — Containers (cards, panels)
  glass: {
    fill: 'rgba(255, 255, 255, 0.72)',
    fillFallback: '#FFFFFF',
    fillSubtle: 'rgba(255, 255, 255, 0.55)',
    border: 'rgba(255, 255, 255, 0.70)',
    borderGradientStart: 'rgba(255, 255, 255, 0.90)',
    borderGradientEnd: 'rgba(255, 255, 255, 0.30)',
    highlight: 'rgba(255, 255, 255, 0.80)',
    shadow: 'rgba(15, 23, 42, 0.08)',
    blur: 24,
  },

  // 2) Liquid Glass — Floating / Interactive
  liquidGlass: {
    fill: 'rgba(255, 255, 255, 0.65)',
    fillFallback: '#FFFFFF',
    specularHighlight: 'rgba(255, 255, 255, 0.85)',
    rim: 'rgba(15, 23, 42, 0.08)',
    glow: 'rgba(0, 179, 119, 0.22)',
    coloredShadow: 'rgba(0, 179, 119, 0.18)',
    shadow: 'rgba(15, 23, 42, 0.12)',
    blur: 32,
  },

  // 3) Neumorphism — Tactile controls
  neumorphic: {
    base: '#EAEFF4',
    raised: '#FFFFFF',
    inset: '#DCE4ED',
    lightShadow: '#FFFFFF',
    darkShadow: '#C5CEDA',
    border: 'rgba(15, 23, 42, 0.06)',
    track: '#DCE4ED',
  },

  neu: {
    base: '#EAEFF4',
    raised: '#FFFFFF',
    inset: '#DCE4ED',
    lightShadow: '#FFFFFF',
    darkShadow: '#C5CEDA',
    track: '#DCE4ED',
  },

  // Inputs
  input: {
    bg: '#FFFFFF',
    border: 'rgba(15, 23, 42, 0.12)',
    borderFocused: '#00B377',
    placeholder: '#475569', // Secondary text for >= 4.5:1 contrast
    text: '#0F172A',
  },

  // Text (WCAG AA compliant)
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#94A3B8', // Decorative only
    inverse: '#FFFFFF',
    accent: '#00B377',
    primaryInverted: '#FFFFFF',
  },

  // Typography scale
  fonts: fontFamilies,
  typography: {
    hero: {
      fontSize: 48,
      fontFamily: fontFamilies.numeralBold,
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.2,
      lineHeight: 56,
    },
    heroSmall: {
      fontSize: 38,
      fontFamily: fontFamilies.numeralBold,
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.2,
      lineHeight: 46,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      fontFamily: fontFamilies.bold,
      letterSpacing: -0.2,
      lineHeight: 28,
    },
    sectionHeading: {
      fontSize: 18,
      fontWeight: '700',
      fontFamily: fontFamilies.bold,
      letterSpacing: -0.15,
      lineHeight: 24,
    },
    body: {
      fontSize: 15,
      fontWeight: '400',
      fontFamily: fontFamilies.regular,
      lineHeight: 22,
      letterSpacing: 0,
    },
    bodyBold: {
      fontSize: 15,
      fontWeight: '700',
      fontFamily: fontFamilies.bold,
      lineHeight: 22,
      letterSpacing: 0,
    },
    caption: {
      fontSize: 13,
      fontWeight: '500',
      fontFamily: fontFamilies.medium,
      lineHeight: 19,
      letterSpacing: 0,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      fontFamily: fontFamilies.semiBold,
      lineHeight: 16,
      letterSpacing: 0,
    },
    uppercaseLabel: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: fontFamilies.bold,
      lineHeight: 16,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    numeralLarge: {
      fontSize: 28,
      fontWeight: '700',
      fontFamily: fontFamilies.numeralBold,
      fontVariant: ['tabular-nums'],
      lineHeight: 34,
    },
    numeralMedium: {
      fontSize: 20,
      fontWeight: '700',
      fontFamily: fontFamilies.numeralBold,
      fontVariant: ['tabular-nums'],
      lineHeight: 26,
    },
    numeralSmall: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: fontFamilies.numeralBold,
      fontVariant: ['tabular-nums'],
      lineHeight: 18,
    },
  },

  // Primary brand / Hero
  primary: '#00B377',
  primaryLight: '#10E8A0',
  primaryGlow: 'rgba(0, 179, 119, 0.25)',
  heroGradientStart: '#00B377',
  heroGradientEnd: '#0090C8',

  // Macro Color Families (deeper contrast versions of same hue families)
  macros: {
    calories: '#E03A3A',      // High-contrast Crimson Red
    caloriesGlow: 'rgba(224, 58, 58, 0.20)',
    protein: '#0090C8',       // High-contrast Deep Cyan/Blue
    proteinGlow: 'rgba(0, 144, 200, 0.20)',
    carbs: '#E09A00',         // High-contrast Deep Amber
    carbsGlow: 'rgba(224, 154, 0, 0.20)',
    fat: '#E0245E',           // High-contrast Deep Magenta
    fatGlow: 'rgba(224, 36, 94, 0.20)',
    fiber: '#22A559',         // High-contrast Deep Mint/Green
    fiberGlow: 'rgba(34, 165, 89, 0.20)',
    water: '#0EA5E9',         // High-contrast Cerulean Blue
    waterGlow: 'rgba(14, 165, 233, 0.20)',
  },

  // Meals
  meals: {
    breakfast: '#E09A00',
    lunch: '#00B377',
    dinner: '#6366F1',
    snack: '#E0245E',
  },

  // Semantics
  semantics: {
    success: '#00B377',
    warning: '#E09A00',
    danger: '#E03A3A',
    info: '#0090C8',
  },

  // Convenient flat colors map
  colors: {
    primary: '#00B377',
    primaryText: '#FFFFFF',
    primaryLight: '#10E8A0',
    bg: '#EAEFF4',
    bgSolid: '#EAEFF4',
    cardBg: 'rgba(255, 255, 255, 0.72)',
    glassBg: 'rgba(255, 255, 255, 0.72)',
    liquidGlassBg: 'rgba(255, 255, 255, 0.65)',
    glassBorder: 'rgba(255, 255, 255, 0.70)',
    cardBorderSubtle: 'rgba(15, 23, 42, 0.08)',
    neuBase: '#EAEFF4',
    inputBg: '#FFFFFF',
    inputBorder: 'rgba(15, 23, 42, 0.12)',
    placeholder: '#475569', // Secondary text
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    calories: '#E03A3A',
    protein: '#0090C8',
    carbs: '#E09A00',
    fats: '#E0245E',
    fiber: '#22A559',
    water: '#0EA5E9',
    warning: '#E09A00',
    danger: '#E03A3A',
    dangerText: '#FFFFFF',
    success: '#00B377',
    accentViolet: '#6366F1',
    glassShadow: 'rgba(15, 23, 42, 0.08)',
  },

  // Blur parameters
  blur: {
    card: 24,
    sheet: 32,
    tint: 'light',
  },

  // Navigation
  nav: {
    bg: 'rgba(255, 255, 255, 0.78)',
    border: 'rgba(15, 23, 42, 0.08)',
    activePill: '#00B377',
    activePillText: '#FFFFFF',
    inactiveIcon: '#94A3B8',
  },

  // Elevation & Radii
  radii: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    full: 999,
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
};

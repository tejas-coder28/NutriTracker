import { Platform } from 'react-native';

export const glassColors = {
  bgDark: '#08080A',

  // Frosted glass background cards
  cardBg: 'rgba(255, 255, 255, 0.08)',
  cardBgFallback: 'rgba(24, 25, 32, 0.85)',
  cardBgSubtle: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.15)',
  cardBorderSubtle: 'rgba(255, 255, 255, 0.10)',

  // Elevated Modal / Bottom Sheet backgrounds (stronger blur/opacity)
  modalBg: 'rgba(20, 21, 28, 0.88)',
  modalBgFallback: 'rgba(18, 19, 24, 0.96)',
  modalBorder: 'rgba(255, 255, 255, 0.22)',

  // Input fields (subtle glass treatment)
  inputBg: 'rgba(255, 255, 255, 0.07)',
  inputBorder: 'rgba(255, 255, 255, 0.15)',
  inputBorderFocused: 'rgba(16, 185, 129, 0.5)',

  // Meal type tag colors adapted for frosted glass background contrast
  mealBreakfast: '#FBBF24', // Warm Amber/Gold
  mealLunch: '#34D399',     // Bright Emerald Green
  mealDinner: '#818CF8',    // Bright Indigo/Blue
  mealSnack: '#F472B6',     // Vibrant Pink

  // Macro colors
  protein: '#60A5FA',       // Vibrant Blue
  carbs: '#FBBF24',         // Warm Gold
  fat: '#F472B6',           // Bright Pink
  fiber: '#34D399',         // Mint Green

  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
};

export const glassStyles = {
  card: {
    backgroundColor: glassColors.cardBg,
    borderWidth: 1,
    borderColor: glassColors.cardBorder,
    borderRadius: 20,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 6,
    }),
  },

  cardSubtle: {
    backgroundColor: glassColors.cardBgSubtle,
    borderWidth: 1,
    borderColor: glassColors.cardBorderSubtle,
    borderRadius: 16,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.25)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 3,
    }),
  },

  modalContent: {
    backgroundColor: glassColors.modalBg,
    borderWidth: 1,
    borderColor: glassColors.modalBorder,
    borderRadius: 24,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(28px)',
      WebkitBackdropFilter: 'blur(28px)',
      boxShadow: '0 16px 48px 0 rgba(0, 0, 0, 0.6)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.5,
      shadowRadius: 24,
      elevation: 12,
    }),
  },

  input: {
    backgroundColor: glassColors.inputBg,
    borderWidth: 1,
    borderColor: glassColors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      outlineStyle: 'none',
    } : {}),
  },

  buttonGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    } : {}),
  }
};

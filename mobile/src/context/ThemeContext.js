import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'NUTRITRACK_THEME';

export const darkThemeColors = {
  bg: '#08080A',
  cardBg: 'rgba(255, 255, 255, 0.08)',
  cardBgFallback: 'rgba(24, 25, 32, 0.85)',
  cardBgSubtle: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.15)',
  cardBorderSubtle: 'rgba(255, 255, 255, 0.10)',

  modalBg: 'rgba(20, 21, 28, 0.88)',
  modalBgFallback: 'rgba(18, 19, 24, 0.96)',
  modalBorder: 'rgba(255, 255, 255, 0.22)',

  inputBg: 'rgba(255, 255, 255, 0.07)',
  inputBorder: 'rgba(255, 255, 255, 0.15)',
  inputBorderFocused: 'rgba(16, 185, 129, 0.5)',

  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  placeholder: '#71717A',

  navBg: 'rgba(18, 19, 26, 0.82)',
  navBorder: 'rgba(255, 255, 255, 0.15)',

  // Accents
  primary: '#10B981',
  primaryLight: '#34D399',
  protein: '#60A5FA',
  carbs: '#FBBF24',
  fat: '#F472B6',
  fiber: '#34D399',
  calories: '#F87171',

  mealBreakfast: '#FBBF24',
  mealLunch: '#34D399',
  mealDinner: '#818CF8',
  mealSnack: '#F472B6',
};

export const lightThemeColors = {
  bg: '#F4F5F8',
  cardBg: 'rgba(255, 255, 255, 0.70)',
  cardBgFallback: 'rgba(255, 255, 255, 0.95)',
  cardBgSubtle: 'rgba(255, 255, 255, 0.55)',
  cardBorder: 'rgba(0, 0, 0, 0.08)',
  cardBorderSubtle: 'rgba(0, 0, 0, 0.05)',

  modalBg: 'rgba(255, 255, 255, 0.94)',
  modalBgFallback: '#FFFFFF',
  modalBorder: 'rgba(0, 0, 0, 0.12)',

  inputBg: 'rgba(255, 255, 255, 0.85)',
  inputBorder: 'rgba(0, 0, 0, 0.12)',
  inputBorderFocused: 'rgba(16, 185, 129, 0.6)',

  textPrimary: '#18181B',
  textSecondary: '#52525B',
  textMuted: '#71717A',
  placeholder: '#9CA3AF',

  navBg: 'rgba(255, 255, 255, 0.88)',
  navBorder: 'rgba(0, 0, 0, 0.08)',

  // Accents (enhanced contrast for light background)
  primary: '#059669',
  primaryLight: '#10B981',
  protein: '#2563EB',
  carbs: '#D97706',
  fat: '#DB2777',
  fiber: '#059669',
  calories: '#DC2626',

  mealBreakfast: '#D97706',
  mealLunch: '#059669',
  mealDinner: '#4F46E5',
  mealSnack: '#DB2777',
};

export function getGlassStyles(isDark) {
  const colors = isDark ? darkThemeColors : lightThemeColors;

  return {
    card: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 20,
      ...(Platform.OS === 'web' ? {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: isDark
          ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
          : '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
      } : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 16,
        elevation: 4,
      }),
    },

    cardSubtle: {
      backgroundColor: colors.cardBgSubtle,
      borderWidth: 1,
      borderColor: colors.cardBorderSubtle,
      borderRadius: 16,
      ...(Platform.OS === 'web' ? {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: isDark
          ? '0 4px 20px 0 rgba(0, 0, 0, 0.25)'
          : '0 4px 16px 0 rgba(31, 38, 135, 0.05)',
      } : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.25 : 0.05,
        shadowRadius: 10,
        elevation: 2,
      }),
    },

    modalContent: {
      backgroundColor: colors.modalBg,
      borderWidth: 1,
      borderColor: colors.modalBorder,
      borderRadius: 24,
      ...(Platform.OS === 'web' ? {
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        boxShadow: isDark
          ? '0 16px 48px 0 rgba(0, 0, 0, 0.6)'
          : '0 16px 48px 0 rgba(0, 0, 0, 0.15)',
      } : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: isDark ? 0.5 : 0.15,
        shadowRadius: 24,
        elevation: 12,
      }),
    },

    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 14,
      color: colors.textPrimary,
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
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web' ? {
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      } : {}),
    },
  };
}

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('dark');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
      }
    } catch (e) {
      console.error('Failed to load theme preference:', e);
    } finally {
      setIsReady(true);
    }
  };

  const setTheme = async (newTheme) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.error('Failed to save theme preference:', e);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const isDark = theme === 'dark';
  const themeColors = isDark ? darkThemeColors : lightThemeColors;
  const glassStyles = getGlassStyles(isDark);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined' && document.body) {
      document.body.style.backgroundColor = themeColors.bg;
      document.body.style.color = themeColors.textPrimary;
    }
  }, [theme, themeColors]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        setTheme,
        toggleTheme,
        themeColors,
        glassStyles,
        isReady,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback if component is outside ThemeProvider
    return {
      theme: 'dark',
      isDark: true,
      setTheme: () => {},
      toggleTheme: () => {},
      themeColors: darkThemeColors,
      glassStyles: getGlassStyles(true),
      isReady: true,
    };
  }
  return context;
};

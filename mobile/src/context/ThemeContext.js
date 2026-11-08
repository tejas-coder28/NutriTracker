import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Platform, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTokens, lightTokens } from '../theme/tokens';

const THEME_STORAGE_KEY = 'NUTRITRACK_THEME';

// Backward-compatible adapter: maps token properties to the existing themeColors shape
function mapTokensToThemeColors(tokens) {
  return {
    // Basic backgrounds
    bg: tokens.bg,
    bgSolid: tokens.bgSolid,
    cardBg: tokens.glass.fill,
    cardBgFallback: tokens.glass.fillFallback,
    cardBgSubtle: tokens.glass.fillSubtle,
    cardBorder: tokens.glass.border,
    cardBorderSubtle: tokens.glass.border,

    // Modal
    modalBg: tokens.liquidGlass.fill,
    modalBgFallback: tokens.liquidGlass.fillFallback,
    modalBorder: tokens.liquidGlass.rim,

    // Inputs
    inputBg: tokens.input.bg,
    inputBorder: tokens.input.border,
    inputBorderFocused: tokens.input.borderFocused,

    // Typography
    textPrimary: tokens.text.primary,
    textSecondary: tokens.text.secondary,
    textMuted: tokens.text.muted,
    placeholder: tokens.input.placeholder,

    // Navigation
    navBg: tokens.nav.bg,
    navBorder: tokens.nav.border,

    // Primary & Hero
    primary: tokens.primary,
    primaryLight: tokens.primaryLight,
    heroGradientStart: tokens.heroGradientStart,
    heroGradientEnd: tokens.heroGradientEnd,

    // Macros
    protein: tokens.macros.protein,
    carbs: tokens.macros.carbs,
    fat: tokens.macros.fat,
    fiber: tokens.macros.fiber,
    calories: tokens.macros.calories,
    water: tokens.macros.water,

    // Meals
    mealBreakfast: tokens.meals.breakfast,
    mealLunch: tokens.meals.lunch,
    mealDinner: tokens.meals.dinner,
    mealSnack: tokens.meals.snack,

    // Semantics
    success: tokens.semantics.success,
    warning: tokens.semantics.warning,
    danger: tokens.semantics.danger,
    info: tokens.semantics.info,
  };
}

export const darkThemeColors = mapTokensToThemeColors(darkTokens);
export const lightThemeColors = mapTokensToThemeColors(lightTokens);

export function getGlassStyles(isDark) {
  const tokens = isDark ? darkTokens : lightTokens;

  return {
    card: {
      backgroundColor: tokens.glass.fill,
      borderWidth: 1,
      borderColor: tokens.glass.border,
      borderRadius: tokens.radii.lg,
      ...(Platform.OS === 'web' ? {
        backdropFilter: `blur(${tokens.glass.blur}px)`,
        WebkitBackdropFilter: `blur(${tokens.glass.blur}px)`,
        boxShadow: isDark
          ? '0 12px 36px 0 rgba(0, 0, 0, 0.45)'
          : '0 8px 28px 0 rgba(15, 23, 42, 0.08)',
      } : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 16,
        elevation: 4,
      }),
    },

    cardSubtle: {
      backgroundColor: tokens.glass.fillSubtle,
      borderWidth: 1,
      borderColor: tokens.glass.border,
      borderRadius: tokens.radii.md,
      ...(Platform.OS === 'web' ? {
        backdropFilter: `blur(${tokens.glass.blur * 0.75}px)`,
        WebkitBackdropFilter: `blur(${tokens.glass.blur * 0.75}px)`,
        boxShadow: isDark
          ? '0 6px 20px 0 rgba(0, 0, 0, 0.3)'
          : '0 4px 16px 0 rgba(15, 23, 42, 0.05)',
      } : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.25 : 0.05,
        shadowRadius: 10,
        elevation: 2,
      }),
    },

    modalContent: {
      backgroundColor: tokens.liquidGlass.fill,
      borderWidth: 1,
      borderColor: tokens.liquidGlass.rim,
      borderRadius: tokens.radii.xl,
      ...(Platform.OS === 'web' ? {
        backdropFilter: `blur(${tokens.liquidGlass.blur}px) saturate(140%)`,
        WebkitBackdropFilter: `blur(${tokens.liquidGlass.blur}px) saturate(140%)`,
        boxShadow: isDark
          ? '0 20px 60px 0 rgba(0, 0, 0, 0.75)'
          : '0 16px 48px 0 rgba(15, 23, 42, 0.14)',
      } : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: isDark ? 0.5 : 0.15,
        shadowRadius: 24,
        elevation: 12,
      }),
    },

    input: {
      backgroundColor: tokens.input.bg,
      borderWidth: 1,
      borderColor: tokens.input.border,
      borderRadius: tokens.radii.sm,
      color: tokens.text.primary,
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.md,
      fontSize: 15,
      ...(Platform.OS === 'web' ? {
        outlineStyle: 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      } : {}),
    },

    buttonGlass: {
      backgroundColor: tokens.liquidGlass.fill,
      borderWidth: 1,
      borderColor: tokens.liquidGlass.rim,
      borderRadius: tokens.radii.md,
      paddingVertical: tokens.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web' ? {
        backdropFilter: `blur(${tokens.liquidGlass.blur}px)`,
        WebkitBackdropFilter: `blur(${tokens.liquidGlass.blur}px)`,
        boxShadow: isDark
          ? '0 4px 16px 0 rgba(0, 0, 0, 0.35)'
          : '0 4px 14px 0 rgba(15, 23, 42, 0.08)',
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
  const tokens = useMemo(() => (isDark ? darkTokens : lightTokens), [isDark]);
  const themeColors = useMemo(() => (isDark ? darkThemeColors : lightThemeColors), [isDark]);
  const glassStyles = useMemo(() => getGlassStyles(isDark), [isDark]);

  // Synchronize web DOM styles and mobile StatusBar without flash
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const docEl = document.documentElement;
      const body = document.body;

      if (docEl) {
        docEl.style.colorScheme = isDark ? 'dark' : 'light';
        docEl.style.backgroundColor = tokens.bg;
      }
      if (body) {
        body.style.backgroundColor = tokens.bg;
        body.style.color = tokens.text.primary;
        body.style.transition = 'background-color 250ms ease, color 250ms ease';
      }

      // Meta theme-color
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', tokens.bg);
    }
  }, [theme, isDark, tokens]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        setTheme,
        toggleTheme,
        themeColors,
        glassStyles,
        tokens,
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
    return {
      theme: 'dark',
      isDark: true,
      setTheme: () => {},
      toggleTheme: () => {},
      themeColors: darkThemeColors,
      glassStyles: getGlassStyles(true),
      tokens: darkTokens,
      isReady: true,
    };
  }
  return context;
};

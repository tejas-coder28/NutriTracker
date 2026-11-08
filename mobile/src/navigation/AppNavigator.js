import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, StatusBar, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth, isUserOnboarded } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/ui/Icon';

import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import FoodLogScreen from '../screens/FoodLogScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SplashScreen from '../components/SplashScreen';

export default function AppNavigator() {
  const { user, isLoading } = useAuth();
  const { isDark, tokens, isReady } = useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [showSplash, setShowSplash] = useState(true);

  const handleTabPress = (tab) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setActiveTab(tab);
  };

  const renderScreenContent = () => {
    if (isLoading && !showSplash) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: tokens.bg }]}>
          <ActivityIndicator size="large" color={tokens.primary} />
        </View>
      );
    }

    if (!user) {
      return <AuthScreen />;
    }

    if (!isUserOnboarded(user)) {
      return <OnboardingScreen />;
    }

    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'log':
        return <FoodLogScreen />;
      case 'progress':
        return <ProgressScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  };

  const showBottomNav = !isLoading && user && isUserOnboarded(user);

  const tabs = [
    { id: 'home', label: 'Home', iconActive: 'home', iconInactive: 'home-outline' },
    { id: 'log', label: 'Log Food', iconActive: 'journal', iconInactive: 'journal-outline' },
    { id: 'progress', label: 'Progress', iconActive: 'trending-up', iconInactive: 'trending-up-outline' },
    { id: 'profile', label: 'Profile', iconActive: 'person', iconInactive: 'person-outline' },
  ];

  return (
    <View style={[styles.rootContainer, { backgroundColor: tokens.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={tokens.bg}
        animated={true}
      />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: tokens.bg }]}>
        <View style={styles.contentContainer}>
          {renderScreenContent()}
        </View>

        {showBottomNav && (
          <View style={styles.navWrapper}>
            <View
              style={[
                styles.bottomNav,
                {
                  backgroundColor: tokens.nav.bg,
                  borderColor: tokens.nav.border,
                  borderRadius: tokens.radii.xl,
                  ...(Platform.OS === 'web' ? {
                    backdropFilter: `blur(${tokens.liquidGlass.blur}px) saturate(140%)`,
                    WebkitBackdropFilter: `blur(${tokens.liquidGlass.blur}px) saturate(140%)`,
                    boxShadow: isDark
                      ? '0 12px 32px 0 rgba(0, 0, 0, 0.6)'
                      : '0 8px 24px 0 rgba(15, 23, 42, 0.12)',
                  } : {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: isDark ? 0.45 : 0.12,
                    shadowRadius: 16,
                    elevation: 8,
                  }),
                },
              ]}
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    activeOpacity={0.8}
                    style={[
                      styles.navItem,
                      Platform.OS === 'web' && { outlineStyle: 'none', cursor: 'pointer' },
                      isActive && [
                        styles.activeNavItem,
                        {
                          backgroundColor: isDark
                            ? 'rgba(16, 232, 160, 0.15)'
                            : 'rgba(0, 179, 119, 0.12)',
                          borderColor: isDark
                            ? 'rgba(16, 232, 160, 0.35)'
                            : 'rgba(0, 179, 119, 0.25)',
                        },
                      ],
                    ]}
                    onPress={() => handleTabPress(tab.id)}
                  >
                    <Icon
                      name={isActive ? tab.iconActive : tab.iconInactive}
                      size={20}
                      color={isActive ? tokens.primary : tokens.nav.inactiveIcon}
                    />
                    <Text
                      allowFontScaling={true}
                      maxFontSizeMultiplier={1.3}
                      style={[
                        styles.navText,
                        {
                          color: isActive ? tokens.primary : tokens.nav.inactiveIcon,
                          fontWeight: isActive ? '700' : '600',
                          fontFamily: isActive ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_600SemiBold',
                        },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </SafeAreaView>

      {showSplash && (
        <SplashScreen
          isAppReady={!isLoading && isReady}
          onFinish={() => setShowSplash(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  navWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 14,
    paddingTop: 4,
    alignItems: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    width: '100%',
    maxWidth: 500,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 2,
    minWidth: 68,
    ...(Platform.OS === 'web' ? {
      outlineStyle: 'none',
    } : {}),
  },
  activeNavItem: {
    borderWidth: 1,
  },
  navText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
});

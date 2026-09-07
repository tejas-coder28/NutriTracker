import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, isUserOnboarded } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import FoodLogScreen from '../screens/FoodLogScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SplashScreen from '../components/SplashScreen';

export default function AppNavigator() {
  const { user, isLoading } = useAuth();
  const { isDark, themeColors } = useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [showSplash, setShowSplash] = useState(true);

  const renderScreenContent = () => {
    if (isLoading && !showSplash) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: themeColors.bg }]}>
          <ActivityIndicator size="large" color="#10B981" />
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

  return (
    <View style={styles.rootContainer}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.bg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={themeColors.bg} />
        
        <View style={styles.contentContainer}>
          {renderScreenContent()}
        </View>

        {showBottomNav && (
          <View
            style={[
              styles.bottomNav,
              {
                backgroundColor: themeColors.navBg,
                borderTopColor: themeColors.navBorder,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setActiveTab('home')}
            >
              <Ionicons
                name={activeTab === 'home' ? 'home' : 'home-outline'}
                size={22}
                color={activeTab === 'home' ? '#10B981' : themeColors.textMuted}
              />
              <Text
                style={[
                  styles.navText,
                  { color: themeColors.textMuted },
                  activeTab === 'home' && styles.activeNavText,
                ]}
              >
                Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setActiveTab('log')}
            >
              <Ionicons
                name={activeTab === 'log' ? 'journal' : 'journal-outline'}
                size={22}
                color={activeTab === 'log' ? '#10B981' : themeColors.textMuted}
              />
              <Text
                style={[
                  styles.navText,
                  { color: themeColors.textMuted },
                  activeTab === 'log' && styles.activeNavText,
                ]}
              >
                Log Food
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setActiveTab('progress')}
            >
              <Ionicons
                name={activeTab === 'progress' ? 'trending-up' : 'trending-up-outline'}
                size={22}
                color={activeTab === 'progress' ? '#10B981' : themeColors.textMuted}
              />
              <Text
                style={[
                  styles.navText,
                  { color: themeColors.textMuted },
                  activeTab === 'progress' && styles.activeNavText,
                ]}
              >
                Progress
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setActiveTab('profile')}
            >
              <Ionicons
                name={activeTab === 'profile' ? 'person' : 'person-outline'}
                size={22}
                color={activeTab === 'profile' ? '#10B981' : themeColors.textMuted}
              />
              <Text
                style={[
                  styles.navText,
                  { color: themeColors.textMuted },
                  activeTab === 'profile' && styles.activeNavText,
                ]}
              >
                Profile
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {showSplash && (
        <SplashScreen
          isAppReady={!isLoading}
          onFinish={() => setShowSplash(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#000000',
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
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
    } : {}),
  },
  navItem: {
    alignItems: 'center',
    gap: 3,
  },
  navText: {
    fontSize: 11,
    fontWeight: '500',
  },
  activeNavText: {
    fontWeight: '700',
  },
});

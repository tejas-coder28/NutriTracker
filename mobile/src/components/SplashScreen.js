import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Dimensions, Platform } from 'react-native';
import { SplashScreen as CapacitorSplashScreen } from '@capacitor/splash-screen';

const LOGO_IMAGE = require('../../assets/logo.png');

/**
 * SplashScreen component — Smooth animated launch splash screen with Capacitor handoff.
 */
export default function SplashScreen({ isAppReady, onFinish }) {
  const [minAnimDone, setMinAnimDone] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  // Animated values
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0.1)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Hide native Capacitor splash screen to achieve smooth handoff to web animated splash
    CapacitorSplashScreen.hide().catch(() => {});

    // Parallel entrance animation for logo (scale + fade in)
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1.0,
        duration: 750,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1.0,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Guarantee minimum display time (1000ms) so intro animation is clearly visible
    const timer = setTimeout(() => {
      setMinAnimDone(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Dismiss when both minimum animation time is reached AND app state is ready
  useEffect(() => {
    if (minAnimDone && isAppReady && !isDismissing) {
      setIsDismissing(true);
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }
  }, [minAnimDone, isAppReady, isDismissing, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: splashOpacity }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={LOGO_IMAGE}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const { width } = Dimensions.get('window');
const LOGO_SIZE = Math.min(width * 0.55, 240);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    elevation: 999999,
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
        }
      : {}),
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
});


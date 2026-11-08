import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const LOGO_IMAGE = require('../../assets/logo.png');

/**
 * SplashScreen component — Fast, smooth animated launch splash screen.
 *
 * Requirements:
 * - Total duration ~600-800ms (snappy intro).
 * - Background: Solid black (#000000).
 * - Animation: Logo starts at 85% scale (0.85) and 0 opacity -> animates to 100% (1.0) scale and 1 opacity.
 * - Easing: Ease-out timing (fast start, smooth settle).
 * - Runs IN PARALLEL with background initialization (`isAppReady` / `isLoading`).
 * - Disappears smoothly with a 200ms fade-out as soon as both (a) min animation played & (b) app init complete.
 */
export default function SplashScreen({ isAppReady, onFinish }) {
  const [minAnimDone, setMinAnimDone] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  // Animated values for GPU-accelerated 60fps animations
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Parallel entrance animation for logo (650ms, ease-out)
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1.0,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1.0,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMinAnimDone(true);
    });
  }, []);

  // When both minimum animation timer is done AND background app initialization is complete, dismiss!
  useEffect(() => {
    if (minAnimDone && isAppReady && !isDismissing) {
      setIsDismissing(true);
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }
  }, [minAnimDone, isAppReady, isDismissing]);

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
    zIndex: 99999,
    elevation: 99999,
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

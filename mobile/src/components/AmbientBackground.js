import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function AmbientBackground({ children, style }) {
  const { isDark, themeColors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }, style]}>
      <View style={styles.blobContainer} pointerEvents="none">
        {/* Blob 1: Green/Teal glow top-left */}
        <View style={[styles.blobGreen, !isDark && styles.blobGreenLight]} />
        {/* Blob 2: Purple glow top-right / middle */}
        <View style={[styles.blobPurple, !isDark && styles.blobPurpleLight]} />
        {/* Blob 3: Amber/Orange glow mid-bottom */}
        <View style={[styles.blobOrange, !isDark && styles.blobOrangeLight]} />
        {/* Blob 4: Cyan/Blue glow bottom-right */}
        <View style={[styles.blobCyan, !isDark && styles.blobCyanLight]} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  blobContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  blobGreen: {
    position: 'absolute',
    top: -60,
    left: -80,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    ...(Platform.OS === 'web' ? {
      filter: 'blur(80px)',
      WebkitFilter: 'blur(80px)',
    } : {
      opacity: 0.35,
    }),
  },
  blobGreenLight: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    ...(Platform.OS === 'web' ? {
      filter: 'blur(100px)',
      WebkitFilter: 'blur(100px)',
    } : {
      opacity: 0.25,
    }),
  },
  blobPurple: {
    position: 'absolute',
    top: '25%',
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(139, 92, 246, 0.20)',
    ...(Platform.OS === 'web' ? {
      filter: 'blur(90px)',
      WebkitFilter: 'blur(90px)',
    } : {
      opacity: 0.3,
    }),
  },
  blobPurpleLight: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    ...(Platform.OS === 'web' ? {
      filter: 'blur(100px)',
      WebkitFilter: 'blur(100px)',
    } : {
      opacity: 0.2,
    }),
  },
  blobOrange: {
    position: 'absolute',
    bottom: '22%',
    left: -80,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    ...(Platform.OS === 'web' ? {
      filter: 'blur(85px)',
      WebkitFilter: 'blur(85px)',
    } : {
      opacity: 0.25,
    }),
  },
  blobOrangeLight: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    ...(Platform.OS === 'web' ? {
      filter: 'blur(100px)',
      WebkitFilter: 'blur(100px)',
    } : {
      opacity: 0.18,
    }),
  },
  blobCyan: {
    position: 'absolute',
    bottom: -60,
    right: -50,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(6, 182, 212, 0.18)',
    ...(Platform.OS === 'web' ? {
      filter: 'blur(75px)',
      WebkitFilter: 'blur(75px)',
    } : {
      opacity: 0.25,
    }),
  },
  blobCyanLight: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    ...(Platform.OS === 'web' ? {
      filter: 'blur(90px)',
      WebkitFilter: 'blur(90px)',
    } : {
      opacity: 0.18,
    }),
  },
});

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function AmbientBackground({ children, style }) {
  const { tokens, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg }, style]}>
      <View style={styles.blobContainer} pointerEvents="none">
        {/* Blob 1: Mint glow top-left */}
        <View
          style={[
            styles.blob,
            styles.blobTopLeft,
            {
              backgroundColor: tokens.blobs.blob1,
              ...(Platform.OS === 'web' ? {
                filter: `blur(${tokens.blobs.blur}px)`,
                WebkitFilter: `blur(${tokens.blobs.blur}px)`,
              } : {
                opacity: isDark ? 0.35 : 0.45,
              }),
            },
          ]}
        />

        {/* Blob 2: Cyan / Sky glow top-right */}
        <View
          style={[
            styles.blob,
            styles.blobTopRight,
            {
              backgroundColor: tokens.blobs.blob2,
              ...(Platform.OS === 'web' ? {
                filter: `blur(${tokens.blobs.blur}px)`,
                WebkitFilter: `blur(${tokens.blobs.blur}px)`,
              } : {
                opacity: isDark ? 0.3 : 0.4,
              }),
            },
          ]}
        />

        {/* Blob 3: Violet / Lavender glow mid-bottom */}
        <View
          style={[
            styles.blob,
            styles.blobMidBottom,
            {
              backgroundColor: tokens.blobs.blob3,
              ...(Platform.OS === 'web' ? {
                filter: `blur(${tokens.blobs.blur}px)`,
                WebkitFilter: `blur(${tokens.blobs.blur}px)`,
              } : {
                opacity: isDark ? 0.25 : 0.35,
              }),
            },
          ]}
        />

        {/* Blob 4: Amber / Peach glow bottom-right */}
        <View
          style={[
            styles.blob,
            styles.blobBottomRight,
            {
              backgroundColor: tokens.blobs.blob4,
              ...(Platform.OS === 'web' ? {
                filter: `blur(${tokens.blobs.blur}px)`,
                WebkitFilter: `blur(${tokens.blobs.blur}px)`,
              } : {
                opacity: isDark ? 0.25 : 0.35,
              }),
            },
          ]}
        />
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
  blob: {
    position: 'absolute',
    borderRadius: 200,
  },
  blobTopLeft: {
    top: -60,
    left: -80,
    width: 380,
    height: 380,
  },
  blobTopRight: {
    top: '20%',
    right: -100,
    width: 400,
    height: 400,
  },
  blobMidBottom: {
    bottom: '22%',
    left: -80,
    width: 360,
    height: 360,
  },
  blobBottomRight: {
    bottom: -60,
    right: -60,
    width: 340,
    height: 340,
  },
});

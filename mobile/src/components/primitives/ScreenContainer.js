import React from 'react';
import { View, StyleSheet, Platform, SafeAreaView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function ScreenContainer({ children, style, maxWidth = 520, ...props }) {
  const { tokens } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: tokens.bg }]}>
      <View style={styles.outerCenter}>
        <View style={[styles.innerContent, { maxWidth, backgroundColor: 'transparent' }, style]} {...props}>
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  outerCenter: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  innerContent: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
});


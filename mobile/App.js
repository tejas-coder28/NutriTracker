import React from 'react';
import { LogBox } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

LogBox.ignoreLogs([
  '"shadow*" style props are deprecated. Use "boxShadow".',
]);

if (typeof console !== 'undefined' && console.warn) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('"shadow*" style props are deprecated')) {
      return;
    }
    originalWarn(...args);
  };
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AmbientBackground from '../components/AmbientBackground';

// Inline SVG-free Google logo using text + colours
function GoogleLogo({ size = 18 }) {
  return (
    <View style={[googleLogoStyles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[googleLogoStyles.letter, { fontSize: size * 0.65 }]}>G</Text>
    </View>
  );
}

const googleLogoStyles = StyleSheet.create({
  circle: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  letter: {
    fontWeight: '700',
    color: '#4285F4',
    lineHeight: undefined,
  },
});

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register, signInWithGoogle, authError } = useAuth();
  const { isDark, themeColors, glassStyles } = useTheme();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleTabSwitch = (loginState) => {
    setIsLogin(loginState);
    setLocalError(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async () => {
    setLocalError(null);
    setSuccessMsg(null);

    const cleanEmail = (email || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      setLocalError('Please enter both Email and Password.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(cleanEmail, cleanPassword);
      } else {
        if (!name.trim()) {
          setLocalError('Please enter your full name.');
          setLoading(false);
          return;
        }
        await register({
          name: name.trim(),
          email: cleanEmail,
          password: cleanPassword,
        });
      }
    } catch (err) {
      setLocalError(err.message || 'Authentication failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setSuccessMsg(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Navigation is handled by AppNavigator reacting to auth state
    } catch (err) {
      setLocalError(err.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const displayError = localError || authError;

  const dividerColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const googleBtnBg = isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF';
  const googleBtnBorder = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
  const googleBtnText = themeColors.textPrimary;

  return (
    <AmbientBackground style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header Branding */}
          <View style={styles.header}>
            <View style={[styles.logoBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.35)' }]}>
              <Ionicons name="sparkles" size={28} color="#10B981" />
            </View>
            <Text style={[styles.title, { color: themeColors.textPrimary }]}>NutriTrack AI</Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>Personalized On-Device AI Macro &amp; Weight Tracker</Text>
          </View>

          {/* Tab Toggle */}
          <View style={[styles.tabContainer, { backgroundColor: isDark ? '#18181B' : 'rgba(0,0,0,0.06)' }]}>
            <TouchableOpacity
              style={[styles.tabButton, isLogin && [styles.activeTab, { backgroundColor: isDark ? '#27272A' : '#FFFFFF' }]]}
              onPress={() => handleTabSwitch(true)}
            >
              <Text style={[styles.tabText, { color: themeColors.textMuted }, isLogin && styles.activeTabText]}>Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, !isLogin && [styles.activeTab, { backgroundColor: isDark ? '#27272A' : '#FFFFFF' }]]}
              onPress={() => handleTabSwitch(false)}
            >
              <Text style={[styles.tabText, { color: themeColors.textMuted }, !isLogin && styles.activeTabText]}>Register</Text>
            </TouchableOpacity>
          </View>

          {successMsg && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          )}

          {displayError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}

          <View style={[glassStyles.card, styles.card]}>
            {!isLogin && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Full Name</Text>
                <TextInput
                  style={[glassStyles.input, { color: themeColors.textPrimary }]}
                  placeholder="Tejas Muralidhar"
                  placeholderTextColor={themeColors.placeholder}
                  value={name}
                  onChangeText={(t) => { setName(t); setLocalError(null); }}
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Email Address</Text>
              <TextInput
                style={[glassStyles.input, { color: themeColors.textPrimary }]}
                placeholder="tejas@example.com"
                placeholderTextColor={themeColors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(t) => { setEmail(t); setLocalError(null); setSuccessMsg(null); }}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Password</Text>
              <TextInput
                style={[glassStyles.input, { color: themeColors.textPrimary }]}
                placeholder="••••••••"
                placeholderTextColor={themeColors.placeholder}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={(t) => { setPassword(t); setLocalError(null); setSuccessMsg(null); }}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading || googleLoading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitText}>{isLogin ? 'Log In' : 'Create Account'}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* ── OR Divider ──────────────────────────────────────────────── */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: dividerColor }]} />
              <Text style={[styles.dividerText, { color: themeColors.textMuted }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: dividerColor }]} />
            </View>

            {/* ── Continue with Google ─────────────────────────────────────── */}
            <TouchableOpacity
              style={[
                styles.googleBtn,
                {
                  backgroundColor: googleBtnBg,
                  borderColor: googleBtnBorder,
                },
              ]}
              onPress={handleGoogleSignIn}
              disabled={loading || googleLoading}
              activeOpacity={0.75}
            >
              {googleLoading ? (
                <ActivityIndicator color="#4285F4" size="small" />
              ) : (
                <>
                  <GoogleLogo size={20} />
                  <Text style={[styles.googleBtnText, { color: googleBtnText }]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: {
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginVertical: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {},
  tabText: {
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabText: {
    color: '#10B981',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98115',
    borderWidth: 1,
    borderColor: '#10B98140',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    color: '#34D399',
    fontSize: 13,
    flex: 1,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444440',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    flex: 1,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // ── Divider ────────────────────────────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  // ── Google Button ─────────────────────────────────────────────────────────
  googleBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});

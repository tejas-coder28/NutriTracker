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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AmbientBackground from '../components/AmbientBackground';
import GlassCard from '../components/primitives/GlassCard';
import LiquidButton from '../components/primitives/LiquidButton';
import NeuSegmented from '../components/primitives/NeuSegmented';
import NeuInset from '../components/primitives/NeuInset';
import Icon from '../components/ui/Icon';

// Inline Google Logo icon
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
  },
});

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register, signInWithGoogle, authError } = useAuth();
  const { isDark, tokens } = useTheme();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleTabSwitch = (val) => {
    setIsLogin(val === 'login');
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
    } catch (err) {
      setLocalError(err.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <AmbientBackground style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            {/* Header Branding */}
            <View style={styles.header}>
              <View
                style={[
                  styles.logoBadge,
                  {
                    backgroundColor: isDark ? 'rgba(16, 232, 160, 0.18)' : 'rgba(0, 179, 119, 0.12)',
                    borderColor: tokens.primary,
                    ...(Platform.OS === 'web' ? {
                      boxShadow: `0 0 24px ${tokens.primaryGlow}`,
                    } : {}),
                  },
                ]}
              >
                <Icon name="sparkles" size={28} color={tokens.primary} />
              </View>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
                style={[styles.title, { color: tokens.text.primary }]}
              >
                NutriTracker AI
              </Text>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
                style={[styles.subtitle, { color: tokens.text.secondary }]}
              >
                AI-powered macro & weight tracker
              </Text>
            </View>

            {/* Neumorphic Segmented Tab Toggle */}
            <NeuSegmented
              options={[
                { value: 'login', label: 'Log In' },
                { value: 'register', label: 'Register' },
              ]}
              value={isLogin ? 'login' : 'register'}
              onChange={handleTabSwitch}
              style={{ marginBottom: 16 }}
            />

            {successMsg && (
              <View
                style={[
                  styles.successBanner,
                  {
                    backgroundColor: isDark ? 'rgba(16, 232, 160, 0.15)' : 'rgba(0, 179, 119, 0.12)',
                    borderColor: tokens.semantics.success,
                  },
                ]}
              >
                <Icon name="checkmark-circle" size={18} color={tokens.semantics.success} />
                <Text
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.3}
                  style={[styles.successText, { color: tokens.semantics.success }]}
                >
                  {successMsg}
                </Text>
              </View>
            )}

            {displayError && (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: isDark ? 'rgba(255, 77, 77, 0.15)' : 'rgba(224, 58, 58, 0.12)',
                    borderColor: tokens.semantics.danger,
                  },
                ]}
              >
                <Icon name="alert-circle" size={18} color={tokens.semantics.danger} />
                <Text
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.3}
                  style={[styles.errorText, { color: tokens.semantics.danger }]}
                >
                  {displayError}
                </Text>
              </View>
            )}

            {/* Glass Card Container */}
            <GlassCard style={styles.card}>
              {!isLogin && (
                <View style={styles.fieldGroup}>
                  <Text
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.3}
                    style={[styles.label, { color: tokens.text.secondary }]}
                  >
                    Full Name
                  </Text>
                  <NeuInset radius={12} style={styles.neuInputWrap}>
                    <TextInput
                      style={[styles.inputField, { color: tokens.text.primary }]}
                      placeholder="Tejas Muralidhar"
                      placeholderTextColor={tokens.input.placeholder}
                      value={name}
                      onChangeText={(t) => { setName(t); setLocalError(null); }}
                    />
                  </NeuInset>
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Text
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.3}
                  style={[styles.label, { color: tokens.text.secondary }]}
                >
                  Email Address
                </Text>
                <NeuInset radius={12} style={styles.neuInputWrap}>
                  <TextInput
                    style={[styles.inputField, { color: tokens.text.primary }]}
                    placeholder="tejas@example.com"
                    placeholderTextColor={tokens.input.placeholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setLocalError(null); setSuccessMsg(null); }}
                  />
                </NeuInset>
              </View>

              <View style={styles.fieldGroup}>
                <Text
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.3}
                  style={[styles.label, { color: tokens.text.secondary }]}
                >
                  Password
                </Text>
                <NeuInset radius={12} style={[styles.neuInputWrap, styles.passwordRow]}>
                  <TextInput
                    style={[styles.inputField, { color: tokens.text.primary, flex: 1 }]}
                    placeholder="••••••••"
                    placeholderTextColor={tokens.input.placeholder}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setLocalError(null); setSuccessMsg(null); }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={tokens.text.secondary}
                    />
                  </TouchableOpacity>
                </NeuInset>
              </View>

              {/* Liquid-Glass Primary Submit Button */}
              <LiquidButton
                onPress={handleSubmit}
                disabled={loading || googleLoading}
                style={{ marginTop: 8 }}
              >
                {loading ? 'Please wait...' : (isLogin ? 'Log In' : 'Create Account')}
              </LiquidButton>

              {/* OR Divider */}
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: tokens.neumorphic.border }]} />
                <Text
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.3}
                  style={[styles.dividerText, { color: tokens.text.secondary }]}
                >
                  or
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: tokens.neumorphic.border }]} />
              </View>

              {/* Glass Google Sign-In Button */}
              <LiquidButton
                variant="glass"
                onPress={handleGoogleSignIn}
                disabled={loading || googleLoading}
                icon={<GoogleLogo size={19} />}
              >
                {googleLoading ? 'Connecting...' : 'Continue with Google'}
              </LiquidButton>
            </GlassCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  formContainer: {
    width: '100%',
    maxWidth: 420, // Centered form max ~420px
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 4,
    textAlign: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    gap: 8,
  },
  successText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    lineHeight: 18,
  },
  card: {
    padding: 20,
    gap: 14,
  },
  fieldGroup: {
    gap: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0,
  },
  neuInputWrap: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeBtn: {
    padding: 4,
  },
  inputField: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});

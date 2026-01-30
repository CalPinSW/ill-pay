import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';

interface SignInScreenProps {
  onNavigateToSignUp: () => void;
  onNavigateToForgotPassword: () => void;
}

export function SignInScreen({
  onNavigateToSignUp,
  onNavigateToForgotPassword,
}: SignInScreenProps) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signIn = useAuthStore((state) => state.signIn);
  const signInWithSocial = useAuthStore((state) => state.signInWithSocial);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    const { error } = await signIn({ email, password });

    if (error) {
      Alert.alert('Sign In Failed', error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to continue splitting bills</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.inputPlaceholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="Enter your password"
              placeholderTextColor={colors.inputPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
            />
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={onNavigateToForgotPassword}
          >
            <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isLoading || socialLoading !== null}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textTertiary }]}>or continue with</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: colors.surface, borderColor: colors.border }, socialLoading === 'google' && styles.buttonDisabled]}
              onPress={async () => {
                setSocialLoading('google');
                const { error } = await signInWithSocial('google');
                setSocialLoading(null);
                if (error) Alert.alert('Error', error.message);
              }}
              disabled={isLoading || socialLoading !== null}
            >
              {socialLoading === 'google' ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={[styles.socialButtonText, { color: colors.text }]}>Google</Text>
              )}
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.socialButton, styles.appleButton, socialLoading === 'apple' && styles.buttonDisabled]}
                onPress={async () => {
                  setSocialLoading('apple');
                  const { error } = await signInWithSocial('apple');
                  setSocialLoading(null);
                  if (error) Alert.alert('Error', error.message);
                }}
                disabled={isLoading || socialLoading !== null}
              >
                {socialLoading === 'apple' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.appleButtonText}> Apple</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account?</Text>
          <TouchableOpacity onPress={onNavigateToSignUp}>
            <Text style={[styles.linkText, { color: colors.primary }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#4F46E5',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  linkText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#999',
  },
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  appleButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

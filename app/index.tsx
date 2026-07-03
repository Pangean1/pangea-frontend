import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendCode, verifyCode, getOrCreateWallet } from '../lib/auth';
import { Colors } from '../constants/colors';

type AuthStep = 'email' | 'code';

export default function LoginScreen() {
  const { user, isLoading, login, logout } = useAuth();

  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      setError('Enter a valid email address');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await sendCode(trimmed);
      setStep('code');
    } catch (e: any) {
      setError(e.message ?? 'Could not send code. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const { address } = await getOrCreateWallet(trimmedEmail);
      const { token } = await verifyCode(trimmedEmail, code, address);
      await login(token);
    } catch (e: any) {
      setError(e.message ?? 'Incorrect code. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.teal} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={Colors.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.logoArea}>
            <Image source={require('../assets/logo.jpg')} style={styles.logoImage} />
            <Text style={styles.brandName}>PANGEA</Text>
            <Text style={styles.tagline}>Humanitarian Giving</Text>
          </View>

          <View style={styles.valueProps}>
            <ValueProp text="Peer to Peer Donations" />
            <ValueProp text="100% Reaches Beneficiaries" />
            <ValueProp text="Every transaction verifiable on Polygon" />
          </View>

          <View style={styles.cta}>
            {user ? (
              <>
                <Text style={styles.signedInAs}>Signed in as {user.email}</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.roleButton}
                    onPress={() => router.replace('/donor')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.roleButtonText}>Donor</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.roleButton}
                    onPress={() => router.replace('/recipient')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.roleButtonText}>Beneficiary</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={logout} activeOpacity={0.7}>
                  <Text style={styles.logoutLink}>Sign out</Text>
                </TouchableOpacity>
              </>
            ) : step === 'email' ? (
              <>
                <Text style={styles.authLabel}>Sign in to continue</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your email address"
                  placeholderTextColor={Colors.text.muted}
                  value={email}
                  onChangeText={t => { setEmail(t); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSendCode}
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <TouchableOpacity
                  style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
                  onPress={handleSendCode}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting
                    ? <ActivityIndicator size="small" color={Colors.text.inverse} />
                    : <Text style={styles.primaryButtonText}>Continue</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.authLabel}>Check your email</Text>
                <Text style={styles.authSubLabel}>We sent a 6-digit code to {email}</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="000000"
                  placeholderTextColor={Colors.text.muted}
                  value={code}
                  onChangeText={t => { setCode(t.replace(/\D/g, '')); setError(''); }}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyCode}
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <TouchableOpacity
                  style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
                  onPress={handleVerifyCode}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting
                    ? <ActivityIndicator size="small" color={Colors.text.inverse} />
                    : <Text style={styles.primaryButtonText}>Verify code</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setStep('email'); setCode(''); setError(''); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backLink}>← Use a different email</Text>
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.termsText}>
              By continuing you agree to our{' '}
              <Text style={styles.termsLink}>Terms</Text>
            </Text>
            <Text style={styles.versionText}>v{Constants.expoConfig?.version}</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ValueProp({ text }: { text: string }) {
  return (
    <View style={styles.valuePropRow}>
      <Text style={styles.valuePropIcon}>●</Text>
      <Text style={styles.valuePropText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
  },
  logoArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 24,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  brandName: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.text.primary,
    letterSpacing: 8,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: Colors.text.secondary,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  valueProps: {
    gap: 12,
    marginBottom: 32,
  },
  valuePropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  valuePropIcon: {
    fontSize: 8,
    color: Colors.teal,
    lineHeight: 20,
  },
  valuePropText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  cta: {
    gap: 14,
  },
  signedInAs: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.teal,
    borderRadius: 14,
    paddingVertical: 16,
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  logoutLink: {
    fontSize: 13,
    color: Colors.text.muted,
    textAlign: 'center',
  },
  authLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  authSubLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: -6,
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: -6,
  },
  primaryButton: {
    backgroundColor: Colors.teal,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  backLink: {
    fontSize: 14,
    color: Colors.teal,
    textAlign: 'center',
  },
  termsText: {
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  termsLink: {
    color: Colors.teal,
    fontWeight: '600',
  },
  versionText: {
    fontSize: 11,
    color: Colors.text.muted,
    textAlign: 'center',
  },
});

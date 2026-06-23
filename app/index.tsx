import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={Colors.bg} />

      {/* Logo area */}
      <View style={styles.logoArea}>
        <Image source={require('../assets/logo.jpg')} style={styles.logoImage} />
        <Text style={styles.brandName}>PANGEA</Text>
        <Text style={styles.tagline}>Humanitarian giving, peer to peer</Text>
      </View>

      {/* Stats / trust signals */}
      <View style={styles.statsRow}>
        <StatCard value="0%" label="Platform fee" highlight />
        <StatCard value="100%" label="Reaches beneficiary" highlight />
      </View>

      {/* Value props */}
      <View style={styles.valueProps}>
        <ValueProp icon="●" text="No hidden fees" />
        <ValueProp icon="●" text="Every transaction verifiable on Polygon" />
        <ValueProp icon="●" text="Real-time impact updates from beneficiaries" />
      </View>

      {/* CTA */}
      <View style={styles.cta}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.replace('/donor')}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>Donor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.replace('/recipient')}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>Beneficiary</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.termsText}>
          By continuing you agree to our{' '}
          <Text style={styles.termsLink}>Terms</Text>
        </Text>
        <Text style={styles.versionText}>v{Constants.expoConfig?.version}</Text>
      </View>
    </SafeAreaView>
  );
}

function StatCard({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  return (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ValueProp({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.valuePropRow}>
      <Text style={styles.valuePropIcon}>{icon}</Text>
      <Text style={styles.valuePropText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: 24,
  },
  logoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
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
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statCardHighlight: {
    borderColor: Colors.tealBorder,
    backgroundColor: Colors.tealBg,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  statValueHighlight: {
    color: Colors.teal,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    textAlign: 'center',
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
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    gap: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ctaButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.teal,
    borderRadius: 14,
    paddingVertical: 16,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  termsText: {
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
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

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { getWalletPrivateKey, restoreWalletKey } from '../lib/auth';
import { getWalletAddress } from '../lib/blockchain';

export default function WalletRecovery() {
  const { user } = useAuth();
  const [deviceAddress, setDeviceAddress] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => { getWalletAddress().then(setDeviceAddress); }, []));

  const registeredAddress = user?.walletAddress ?? null;
  const matches = !!registeredAddress && !!deviceAddress
    && registeredAddress.toLowerCase() === deviceAddress.toLowerCase();

  async function handleReveal() {
    Alert.alert(
      'Show private key?',
      'This key controls your wallet. It stays on this screen only — never share it with anyone, and only paste it into the PANGEA app on a device you own.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Show it',
          onPress: async () => {
            const key = await getWalletPrivateKey();
            setRevealedKey(key);
          },
        },
      ]
    );
  }

  async function handleCopyRevealed() {
    if (!revealedKey) return;
    await Clipboard.setStringAsync(revealedKey);
    Alert.alert('Copied', 'Private key copied. Paste it only into the PANGEA app on the other device.');
  }

  async function handleRestore() {
    if (!user) return;
    const text = importText.trim();
    if (!text) return;

    setBusy(true);
    try {
      // Dry-run: derive the address this key controls before touching storage,
      // so we can warn if it doesn't match this account's registered wallet.
      const { getSmartAccountClient } = await import('../lib/zerodev');
      let derivedAddress: string;
      try {
        const result = await getSmartAccountClient(text.trim());
        derivedAddress = result.address;
      } catch {
        Alert.alert('Invalid key', 'That doesn\'t look like a valid private key.');
        return;
      }

      const proceed = () =>
        restoreWalletKey(user.email, text).then(address => {
          setImportText('');
          setRevealedKey(null);
          getWalletAddress().then(setDeviceAddress);
          Alert.alert('Wallet restored', `This device now uses the wallet at ${address}.`);
        }).catch(err => {
          Alert.alert('Could not restore', err instanceof Error ? err.message : String(err));
        });

      if (registeredAddress && derivedAddress.toLowerCase() !== registeredAddress.toLowerCase()) {
        Alert.alert(
          'Address mismatch',
          `This key controls ${derivedAddress}, but your account's registered wallet is ${registeredAddress}. Restoring it anyway will make this device sign as a different wallet than your account history. Continue?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Restore anyway', style: 'destructive', onPress: proceed },
          ]
        );
      } else {
        await proceed();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Wallet recovery</Text>
        <Text style={styles.subtitle}>
          Advanced — only use this if this device is showing the wrong wallet address for your account.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Account</Text>
          <Text style={styles.value}>{user?.email ?? '—'}</Text>
          <Text style={styles.label}>Registered wallet</Text>
          <Text style={styles.value}>{registeredAddress ?? '—'}</Text>
          <Text style={styles.label}>This device's active wallet</Text>
          <Text style={styles.value}>{deviceAddress ?? '—'}</Text>
          {registeredAddress && deviceAddress && (
            <Text style={[styles.status, matches ? styles.statusOk : styles.statusBad]}>
              {matches ? '✓ This device has the correct key.' : '⚠ This device does not have your real wallet key.'}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Reveal this device's key</Text>
          <Text style={styles.hint}>
            Do this on the device that already has your correct wallet (e.g. Expo Go), so you can copy it into the app on another device.
          </Text>
          {revealedKey ? (
            <>
              <Text selectable style={styles.keyText}>{revealedKey}</Text>
              <TouchableOpacity style={styles.button} onPress={handleCopyRevealed} activeOpacity={0.85}>
                <Text style={styles.buttonText}>Copy key</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleReveal} activeOpacity={0.85}>
              <Text style={styles.buttonText}>Show private key</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Restore a key on this device</Text>
          <Text style={styles.hint}>
            Paste a private key copied from another device to make this device sign with it instead.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="0x..."
            placeholderTextColor={Colors.text.muted}
            value={importText}
            onChangeText={setImportText}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
          <TouchableOpacity
            style={[styles.button, (!importText.trim() || busy) && styles.buttonDisabled]}
            onPress={handleRestore}
            disabled={!importText.trim() || busy}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{busy ? 'Restoring…' : 'Restore key on this device'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text.primary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Colors.text.secondary, marginBottom: 20 },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.text.primary, marginBottom: 6 },
  hint: { fontSize: 12, color: Colors.text.secondary, marginBottom: 12 },
  label: { fontSize: 11, color: Colors.text.muted, marginTop: 8 },
  value: { fontSize: 13, color: Colors.text.primary, fontFamily: 'monospace' },
  status: { fontSize: 13, marginTop: 12, fontWeight: '600' },
  statusOk: { color: Colors.success },
  statusBad: { color: Colors.warning },
  keyText: {
    fontSize: 12,
    color: Colors.text.primary,
    fontFamily: 'monospace',
    backgroundColor: Colors.bgCardAlt,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.bgCardAlt,
    borderRadius: 8,
    padding: 10,
    color: Colors.text.primary,
    fontFamily: 'monospace',
    fontSize: 12,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  button: {
    backgroundColor: Colors.teal,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.text.inverse, fontWeight: '700', fontSize: 14 },
  backButton: { alignItems: 'center', paddingVertical: 12 },
  backText: { color: Colors.text.secondary, fontSize: 14 },
});

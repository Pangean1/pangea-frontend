import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Colors } from '../../../constants/colors';
import { fetchCampaign } from '../../../lib/api';
import { shortenAddress } from '../../../lib/format';
import { getCampaignMedia } from '../../../lib/campaignMedia';
import { executeDonation, getExplorerUrl, type DonationStatus } from '../../../lib/blockchain';

type Step = 'enter' | 'confirm' | 'success';

const PRESET_AMOUNTS = ['10', '25', '50', '100'];

const STATUS_LABELS: Record<DonationStatus, string> = {
  checking:       'Checking wallet...',
  approving:      'Approving USDC...',
  waiting_approve:'Waiting for approval...',
  donating:       'Sending donation...',
  confirming:     'Confirming on-chain...',
  done:           'Done!',
};

export default function DonateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('enter');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<string>('');
  const [txStatus, setTxStatus] = useState<DonationStatus | null>(null);
  const [txError, setTxError] = useState<string>('');

  const { data: campaign } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => fetchCampaign(id),
    enabled: !!id,
  });

  const numericAmount = parseFloat(amount);
  const isValidAmount = !isNaN(numericAmount) && numericAmount >= 1;
  const campaignMedia = getCampaignMedia(id ?? '');

  const handleConfirm = async () => {
    if (!campaign) return;
    setTxError('');
    setTxStatus('checking');

    try {
      const hash = await executeDonation(
        campaign.on_chain_id,
        numericAmount,
        '',
        setTxStatus,
      );
      setTxHash(hash);
      setStep('success');
      // The campaign's raised amount/percent and the donor's history won't
      // reflect this donation until these are invalidated — otherwise the
      // 5-minute query staleTime leaves stale numbers on screen.
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['donations'] });
    } catch (e: any) {
      setTxStatus(null);
      const msg: string = e?.message ?? 'Transaction failed.';
      if (msg.includes('insufficient') || msg.includes('balance')) {
        setTxError('Insufficient USDC balance in your wallet.');
      } else if (msg.includes('user rejected') || msg.includes('denied')) {
        setTxError('Transaction cancelled.');
      } else if (msg.includes('Timed out')) {
        setTxError('Transaction is taking longer than expected. Check Polygonscan for your wallet address to see if it went through.');
      } else {
        setTxError('Transaction failed. Please try again.');
      }
    }
  };

  if (step === 'success') {
    return (
      <SuccessScreen
        campaignName={campaign?.name ?? ''}
        amount={amount}
        txHash={txHash}
        onDone={() => router.replace('/donor')}
      />
    );
  }

  if (step === 'confirm') {
    const isSending = txStatus !== null;

    return (
      <SafeAreaView style={styles.screen}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => { if (!isSending) setStep('enter'); }}
          activeOpacity={isSending ? 1 : 0.7}
        >
          <Text style={[styles.backText, isSending && styles.backTextDisabled]}>← Back</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.pageTitle}>Confirm donation</Text>

          <View style={styles.summaryCard}>
            <SummaryRow label="Campaign" value={campaign?.name ?? '…'} />
            <SummaryRow label="Recipient" value={shortenAddress(campaign?.recipient_address ?? '')} />
            <View style={styles.divider} />
            <SummaryRow label="Amount" value={`$${numericAmount.toFixed(2)} USDC`} highlight />
            <SummaryRow label="Platform fee" value="$0.00" />
            <SummaryRow label="Gas (POL)" value="~$0.01" />
            <View style={styles.divider} />
            <SummaryRow label="Recipient receives" value={`$${numericAmount.toFixed(2)} USDC`} highlight />
          </View>

          <View style={styles.transparencyNote}>
            <Text style={styles.transparencyText}>
              This transaction will be recorded on Polygon. You can verify it publicly at any time.
            </Text>
          </View>

          {txError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{txError}</Text>
            </View>
          ) : null}

          {isSending ? (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color={Colors.teal} style={{ marginRight: 10 }} />
              <Text style={styles.statusText}>{STATUS_LABELS[txStatus!]}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.confirmButton, isSending && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={isSending}
            activeOpacity={0.85}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={Colors.text.inverse} />
            ) : (
              <Text style={styles.confirmButtonText}>
                Confirm — send ${numericAmount.toFixed(2)} USDC
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Enter amount step
  return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.pageTitle}>Donate to</Text>
          <Text style={styles.campaignName}>{campaign?.name ?? '…'}</Text>

          {campaignMedia && (
            <View style={styles.mediaCard}>
              {campaignMedia.type === 'image' ? (
                <Image source={{ uri: campaignMedia.uri }} style={styles.mediaImage} />
              ) : (
                <View style={styles.videoPreview}>
                  <Text style={styles.videoIcon}>🎬</Text>
                  <Text style={styles.videoLabel}>Video from beneficiary</Text>
                </View>
              )}
              <Text style={styles.mediaCaption}>Shared by the beneficiary</Text>
            </View>
          )}

          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Amount in USDC</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.text.muted}
                maxLength={8}
                autoFocus
              />
            </View>
            <View style={styles.presets}>
              {PRESET_AMOUNTS.map(preset => (
                <TouchableOpacity
                  key={preset}
                  style={[styles.presetPill, amount === preset && styles.presetPillActive]}
                  onPress={() => setAmount(preset)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.presetText, amount === preset && styles.presetTextActive]}>
                    ${preset}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.zeroFeeNote}>
            <Text style={styles.zeroFeeText}>● 0% platform fee — 100% reaches the recipient</Text>
          </View>

          <TouchableOpacity
            style={[styles.nextButton, !isValidAmount && styles.nextButtonDisabled]}
            onPress={() => isValidAmount && setStep('confirm')}
            activeOpacity={isValidAmount ? 0.85 : 1}
          >
            <Text style={styles.nextButtonText}>
              {isValidAmount ? `Review donation — $${numericAmount.toFixed(2)}` : 'Enter an amount'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.summaryValueHighlight]}>{value}</Text>
    </View>
  );
}

function SuccessScreen({
  campaignName,
  amount,
  txHash,
  onDone,
}: {
  campaignName: string;
  amount: string;
  txHash: string;
  onDone: () => void;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.successContainer}>
        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Donation sent!</Text>
        <Text style={styles.successAmount}>${parseFloat(amount).toFixed(2)}</Text>
        <Text style={styles.successCampaign}>{campaignName}</Text>
        <Text style={styles.successNote}>
          Your donation is confirmed on-chain. 100% reached the recipient.
        </Text>

        {txHash ? (
          <TouchableOpacity
            style={styles.explorerButton}
            onPress={() => Linking.openURL(getExplorerUrl(txHash))}
            activeOpacity={0.8}
          >
            <Text style={styles.explorerButtonText}>View on Polygonscan</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.doneButton} onPress={onDone} activeOpacity={0.85}>
          <Text style={styles.doneButtonText}>Back to dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backText: {
    fontSize: 15,
    color: Colors.teal,
    fontWeight: '600',
  },
  backTextDisabled: {
    color: Colors.text.muted,
  },
  scroll: {
    padding: 20,
    gap: 16,
  },
  pageTitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  campaignName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.primary,
    lineHeight: 28,
    marginTop: -8,
  },
  amountCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
    marginTop: 4,
  },
  amountLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dollarSign: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  amountInput: {
    flex: 1,
    fontSize: 48,
    fontWeight: '900',
    color: Colors.teal,
    padding: 0,
  },
  presets: {
    flexDirection: 'row',
    gap: 8,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.bgCardAlt,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetPillActive: {
    backgroundColor: Colors.tealBg,
    borderColor: Colors.tealBorder,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.secondary,
  },
  presetTextActive: {
    color: Colors.teal,
  },
  mediaCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  mediaImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  videoPreview: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bgCard,
  },
  videoIcon: {
    fontSize: 36,
  },
  videoLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  mediaCaption: {
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.bgCard,
  },
  zeroFeeNote: {
    paddingHorizontal: 4,
  },
  zeroFeeText: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  nextButton: {
    backgroundColor: Colors.teal,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  nextButtonDisabled: {
    backgroundColor: Colors.bgCardAlt,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.inverse,
  },
  summaryCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'right',
    flex: 1,
    paddingLeft: 16,
  },
  summaryValueHighlight: {
    color: Colors.teal,
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  transparencyNote: {
    paddingHorizontal: 4,
  },
  transparencyText: {
    fontSize: 12,
    color: Colors.text.muted,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    lineHeight: 18,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.tealBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.tealBorder,
  },
  statusText: {
    fontSize: 14,
    color: Colors.teal,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: Colors.teal,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 56,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.inverse,
  },
  successContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.tealBg,
    borderWidth: 2,
    borderColor: Colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successIconText: {
    fontSize: 36,
    color: Colors.teal,
    fontWeight: '900',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.text.primary,
  },
  successAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.teal,
  },
  successCampaign: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  successNote: {
    fontSize: 13,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  explorerButton: {
    borderWidth: 1,
    borderColor: Colors.tealBorder,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  explorerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.teal,
  },
  doneButton: {
    backgroundColor: Colors.teal,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginTop: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.inverse,
  },
});

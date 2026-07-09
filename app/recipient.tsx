import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/colors';
import { fetchCampaigns, fetchDonations, fetchUser, fetchImpactUpdates, postImpactUpdate, type DonationRecord, type Campaign } from '../lib/api';
import { formatUsdc, usdcPercent, shortenAddress, formatTimeAgo, formatMonthYear } from '../lib/format';
import { getWalletAddress } from '../lib/blockchain';

// Explorer base URL and contract address come from env config so these links point
// at the right network (Amoy testnet today, Polygon mainnet later) without code changes.
const EXPLORER_BASE_URL = process.env.EXPO_PUBLIC_EXPLORER_BASE_URL!;
const CONTRACT_ADDRESS = process.env.EXPO_PUBLIC_CONTRACT_ADDRESS!;
const CONTRACT_EVENTS_URL = `${EXPLORER_BASE_URL}/address/${CONTRACT_ADDRESS}#events`;
const CONTRACT_READ_URL = `${EXPLORER_BASE_URL}/address/${CONTRACT_ADDRESS}#readContract`;

// ─── Real data mapping ─────────────────────────────────────────────────────────

export interface IncomingDonation {
  id: string;
  donorInitials: string;
  donorColor: string;
  donorLabel: string;
  campaign: string;
  amount: string;
  time: string;
}

export function donationRecordToIncomingRow(d: DonationRecord, campaignName: string): IncomingDonation {
  return {
    id: d.id,
    donorInitials: d.donor_address.slice(2, 4).toUpperCase(),
    donorColor: Colors.teal,
    donorLabel: shortenAddress(d.donor_address),
    campaign: campaignName,
    amount: formatUsdc(d.amount_wei),
    time: formatTimeAgo(d.block_timestamp),
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RecipientDashboard() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  useFocusEffect(useCallback(() => { getWalletAddress().then(setWalletAddress); }, []));

  const { data: campaigns, isLoading, isError } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => fetchCampaigns(),
  });
  const myCampaigns: Campaign[] = walletAddress
    ? (campaigns ?? []).filter(c => c.recipient_address.toLowerCase() === walletAddress.toLowerCase())
    : [];

  const { data: user } = useQuery({
    queryKey: ['user', walletAddress],
    queryFn: () => fetchUser(walletAddress!),
    enabled: !!walletAddress,
    retry: false,
  });

  const { data: incomingDonationsData } = useQuery({
    queryKey: ['donations', 'recipient', walletAddress],
    queryFn: () => fetchDonations({ recipient_address: walletAddress!, limit: 50 }),
    enabled: !!walletAddress,
  });
  const incomingDonations: IncomingDonation[] = (incomingDonationsData?.items ?? []).map(d => {
    const campaignName = myCampaigns.find(c => c.on_chain_id === d.on_chain_campaign_id)?.name
      ?? 'Unknown campaign';
    return donationRecordToIncomingRow(d, campaignName);
  });

  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [updateSent, setUpdateSent] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);

  const totalReceivedWei = (incomingDonationsData?.items ?? [])
    .reduce((sum, d) => sum + BigInt(d.amount_wei), 0n)
    .toString();
  const totalReceivedCount = incomingDonationsData?.total ?? 0;

  const { data: myImpactUpdatesData } = useQuery({
    queryKey: ['impact-updates', 'recipient', walletAddress],
    queryFn: () => fetchImpactUpdates({ recipient_address: walletAddress! }),
    enabled: !!walletAddress,
  });

  function handleBack() {
    router.replace('/');
  }

  function resetModal() {
    setUpdateText('');
    setSelectedCampaign('');
    setMediaUri(null);
    setMediaType(null);
    setPostError(null);
  }

  async function handlePostUpdate() {
    if (!updateText.trim() || !selectedCampaign || posting) return;
    setPosting(true);
    setPostError(null);
    try {
      await postImpactUpdate(
        selectedCampaign,
        updateText.trim(),
        mediaUri ? { uri: mediaUri, type: mediaType ?? 'image' } : undefined
      );
      setUpdateSent(true);
      setTimeout(() => {
        setUpdateModalVisible(false);
        resetModal();
        setUpdateSent(false);
      }, 1800);
    } catch (err: any) {
      setPostError(err?.response?.data?.detail ?? 'Could not send update. Please try again.');
    } finally {
      setPosting(false);
    }
  }

  async function handlePickMedia() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setMediaUri(asset.uri);
      setMediaType(asset.type === 'video' ? 'video' : 'image');
    }
  }

  const visibleCampaigns = myCampaigns.slice(0, 2);
  const visibleDonations = incomingDonations.slice(0, 2);
  const hasMoreDonations = incomingDonations.length > 2;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Avatar initials={walletAddress ? walletAddress.slice(2, 4).toUpperCase() : '—'} color={Colors.warning} size={40} />
          <View>
            <Text style={styles.headerName}>Beneficiary</Text>
            <Text style={styles.headerRole}>
              {walletAddress ? shortenAddress(walletAddress) : '—'}
              {user ? ` · member since ${formatMonthYear(user.created_at)}` : ''}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard label="Total received" value={formatUsdc(totalReceivedWei)} sub={`across ${totalReceivedCount} donations`} teal />
          <StatCard label="Campaigns" value={String(myCampaigns.length)} sub="on Amoy testnet" />
          <StatCard label="Updates" value={String(myImpactUpdatesData?.total ?? 0)} sub="impact updates" />
        </View>

        {/* My campaigns */}
        <SectionCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My campaigns</Text>
            {visibleCampaigns.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/recipient-all-campaigns')} activeOpacity={0.7}>
                <Text style={styles.seeAllLink}>See all</Text>
              </TouchableOpacity>
            )}
          </View>
          {isLoading && <ActivityIndicator color={Colors.teal} style={{ paddingVertical: 20 }} />}
          {isError && <Text style={styles.errorText}>Could not load campaigns.</Text>}
          {!isLoading && !isError && visibleCampaigns.length === 0 && (
            <Text style={styles.emptyText}>No campaigns yet.</Text>
          )}
          {visibleCampaigns.map(c => {
            const percent = usdcPercent(c.total_raised_wei, c.goal_wei);
            const raised = formatUsdc(c.total_raised_wei);
            const goal = formatUsdc(c.goal_wei);
            const barColor = percent >= 75 ? Colors.warning : Colors.teal;
            return (
              <View key={c.id} style={styles.campaignRow}>
                <View style={styles.campaignRowTop}>
                  <Text style={styles.campaignName}>{c.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: Colors.successBg }]}>
                    <Text style={[styles.statusBadgeText, { color: Colors.success }]}>Active</Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${percent}%` as any, backgroundColor: barColor }]} />
                </View>
                <Text style={styles.campaignMeta}>{raised} of {goal} · {percent}% funded</Text>
              </View>
            );
          })}
        </SectionCard>

        {/* Incoming donations */}
        <SectionCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Incoming donations</Text>
            {hasMoreDonations && (
              <TouchableOpacity onPress={() => router.push('/recipient-all-donations')} activeOpacity={0.7}>
                <Text style={styles.seeAllLink}>See all</Text>
              </TouchableOpacity>
            )}
          </View>
          {visibleDonations.length === 0 && (
            <Text style={styles.emptyText}>No donations yet.</Text>
          )}
          {visibleDonations.map(d => (
            <DonationRow key={d.id} item={d} />
          ))}
        </SectionCard>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/recipient-create-campaign')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>Create</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (myCampaigns.length === 0) {
                Alert.alert(
                  'No campaigns yet',
                  'You need to create a campaign before you can post an impact update for it.'
                );
                return;
              }
              setUpdateModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>Updates</Text>
          </TouchableOpacity>
        </View>

        {/* Transparency note */}
        <View style={styles.transparencyNote}>
          <Text style={styles.transparencyText}>
            ● All donations arrive directly to your wallet on Polygon — PANGEA never holds your funds.
          </Text>
        </View>

        {/* On-chain data links */}
        <View style={styles.onchainLinks}>
          <TouchableOpacity onPress={() => Linking.openURL(CONTRACT_EVENTS_URL)} activeOpacity={0.7}>
            <Text style={styles.onchainLinkText}>Campaigns general data ↗</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(CONTRACT_READ_URL)} activeOpacity={0.7}>
            <Text style={styles.onchainLinkText}>Campaign detailed data ↗</Text>
          </TouchableOpacity>
          <Text style={styles.onchainLinkHint}>
            For detailed data: open the link, tap "campaigns", enter a campaign's id (e.g. 7), then tap "Query".
          </Text>
        </View>

        {/* Back */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Post update modal */}
      <Modal
        visible={updateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setUpdateModalVisible(false); resetModal(); }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            {updateSent ? (
              <View style={styles.sentContainer}>
                <View style={styles.sentIcon}>
                  <Text style={styles.sentIconText}>✓</Text>
                </View>
                <Text style={styles.sentTitle}>Update sent!</Text>
                <Text style={styles.sentSub}>Your donors will be notified.</Text>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Post impact update</Text>
                  <TouchableOpacity onPress={() => { setUpdateModalVisible(false); resetModal(); }}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalLabel}>Campaign</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.campaignPills}>
                  {myCampaigns.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.campaignPill, selectedCampaign === c.id && styles.campaignPillActive]}
                      onPress={() => setSelectedCampaign(c.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.campaignPillText, selectedCampaign === c.id && styles.campaignPillTextActive]}>
                        {c.name.split(' — ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.modalLabel}>Your message</Text>
                <TextInput
                  style={styles.updateInput}
                  value={updateText}
                  onChangeText={setUpdateText}
                  placeholder="Tell your donors how the funds are being used..."
                  placeholderTextColor={Colors.text.muted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text style={styles.charCount}>{updateText.length}/500</Text>

                <Text style={styles.modalLabel}>Photo / video (optional)</Text>
                {mediaUri ? (
                  <View style={styles.mediaPreview}>
                    {mediaType === 'image' ? (
                      <Image source={{ uri: mediaUri }} style={styles.mediaThumb} />
                    ) : (
                      <View style={styles.videoPreview}>
                        <Text style={styles.videoIcon}>🎬</Text>
                        <Text style={styles.videoLabel}>Video selected</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => { setMediaUri(null); setMediaType(null); }}
                      style={styles.mediaRemove}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.mediaRemoveText}>✕ Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.mediaPickerButton} onPress={handlePickMedia} activeOpacity={0.7}>
                    <Text style={styles.mediaPickerText}>📎  Upload photo / video</Text>
                  </TouchableOpacity>
                )}

                {postError && <Text style={styles.postErrorText}>{postError}</Text>}

                <TouchableOpacity
                  style={[styles.sendButton, (!updateText.trim() || !selectedCampaign || posting) && styles.sendButtonDisabled]}
                  onPress={handlePostUpdate}
                  activeOpacity={0.85}
                  disabled={!updateText.trim() || !selectedCampaign || posting}
                >
                  <Text style={styles.sendButtonText}>
                    {posting ? 'Sending…' : 'Send update to donors'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ initials, color, size = 36 }: { initials: string; color: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

function StatCard({ label, value, sub, teal }: { label: string; value: string; sub?: string; teal?: boolean }) {
  return (
    <View style={[styles.statCard, teal && styles.statCardTeal]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, teal && styles.statValueTeal]}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function DonationRow({ item }: { item: IncomingDonation }) {
  return (
    <View style={styles.donationRow}>
      <View style={[styles.avatar, { width: 36, height: 36, borderRadius: 18, backgroundColor: item.donorColor }]}>
        <Text style={[styles.avatarText, { fontSize: 12 }]}>{item.donorInitials}</Text>
      </View>
      <View style={styles.donationInfo}>
        <Text style={styles.donorLabel}>{item.donorLabel}</Text>
        <Text style={styles.donationCampaign}>{item.campaign}</Text>
      </View>
      <View style={styles.donationRight}>
        <Text style={styles.donationAmount}>{item.amount}</Text>
        <Text style={styles.donationTime}>{item.time}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16, gap: 12 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  headerName: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  headerRole: { fontSize: 11, color: Colors.text.secondary },

  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: Colors.border },
  statCardTeal: { borderColor: Colors.tealBorder },
  statLabel: { fontSize: 10, color: Colors.text.secondary, marginBottom: 4, lineHeight: 14 },
  statValue: { fontSize: 16, fontWeight: '800', color: Colors.text.primary },
  statValueTeal: { color: Colors.teal },
  statSub: { fontSize: 9, color: Colors.text.muted, marginTop: 2, lineHeight: 13 },

  card: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  seeAllLink: { fontSize: 12, fontWeight: '600', color: Colors.teal },

  campaignRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, gap: 6 },
  campaignRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  campaignName: { fontSize: 13, fontWeight: '700', color: Colors.text.primary, flex: 1, lineHeight: 18 },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  campaignMeta: { fontSize: 11, color: Colors.text.muted },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '600' },

  donationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  donationInfo: { flex: 1, gap: 3 },
  donorLabel: { fontSize: 13, fontWeight: '700', color: Colors.text.primary },
  donationCampaign: { fontSize: 11, color: Colors.text.secondary },
  donationRight: { alignItems: 'flex-end', gap: 4 },
  donationAmount: { fontSize: 13, fontWeight: '700', color: Colors.teal },
  donationTime: { fontSize: 10, color: Colors.text.muted },

  avatar: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: Colors.text.inverse, fontWeight: '800' },

  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center', backgroundColor: Colors.teal },
  actionButtonText: { fontSize: 15, fontWeight: '800', color: Colors.text.inverse },

  transparencyNote: { paddingHorizontal: 4 },
  transparencyText: { fontSize: 12, color: Colors.text.muted, lineHeight: 18 },

  backButton: { alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginTop: 4 },
  backText: { fontSize: 14, fontWeight: '600', color: Colors.text.secondary },

  onchainLinks: { paddingHorizontal: 4, gap: 4 },
  onchainLinkText: { fontSize: 12, fontWeight: '600', color: Colors.teal },
  onchainLinkHint: { fontSize: 11, color: Colors.text.muted, marginTop: 2 },

  errorText: { fontSize: 13, color: Colors.error, paddingVertical: 12 },
  emptyText: { fontSize: 13, color: Colors.text.muted, paddingVertical: 12, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  modalClose: { fontSize: 18, color: Colors.text.secondary, padding: 4 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8 },

  campaignPills: { flexGrow: 0, marginBottom: 4 },
  campaignPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.bgCardAlt, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  campaignPillActive: { backgroundColor: Colors.tealBg, borderColor: Colors.tealBorder },
  campaignPillText: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary },
  campaignPillTextActive: { color: Colors.teal },

  updateInput: { backgroundColor: Colors.bgCardAlt, borderRadius: 12, padding: 14, fontSize: 14, color: Colors.text.primary, borderWidth: 1, borderColor: Colors.border, minHeight: 100 },
  charCount: { fontSize: 11, color: Colors.text.muted, textAlign: 'right', marginTop: -6 },

  mediaPickerButton: { backgroundColor: Colors.bgCardAlt, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', paddingVertical: 14, alignItems: 'center' },
  mediaPickerText: { fontSize: 14, color: Colors.text.secondary, fontWeight: '600' },
  mediaPreview: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  mediaThumb: { width: '100%', height: 160, resizeMode: 'cover' },
  videoPreview: { backgroundColor: Colors.bgCardAlt, paddingVertical: 20, alignItems: 'center', gap: 6 },
  videoIcon: { fontSize: 28 },
  videoLabel: { fontSize: 13, color: Colors.text.secondary, fontWeight: '600' },
  mediaRemove: { padding: 10, alignItems: 'center', backgroundColor: Colors.bgCardAlt },
  mediaRemoveText: { fontSize: 13, color: Colors.error, fontWeight: '600' },

  postErrorText: { fontSize: 12, color: Colors.error, textAlign: 'center' },
  sendButton: { backgroundColor: Colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: Colors.bgCardAlt },
  sendButtonText: { fontSize: 15, fontWeight: '800', color: Colors.text.inverse },

  sentContainer: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 40 },
  sentIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.tealBg, borderWidth: 2, borderColor: Colors.teal, alignItems: 'center', justifyContent: 'center' },
  sentIconText: { fontSize: 28, color: Colors.teal, fontWeight: '900' },
  sentTitle: { fontSize: 22, fontWeight: '900', color: Colors.text.primary },
  sentSub: { fontSize: 14, color: Colors.text.secondary },
});

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/colors';
import { fetchCampaigns } from '../lib/api';
import { formatUsdc, usdcPercent, shortenAddress } from '../lib/format';

// ─── Mock incoming donations ──────────────────────────────────────────────────

export interface IncomingDonation {
  id: string;
  donorInitials: string;
  donorColor: string;
  donorLabel: string;
  campaign: string;
  amount: string;
  time: string;
  acknowledged: boolean;
}

export const INCOMING_DONATIONS: IncomingDonation[] = [
  { id: '1', donorInitials: 'A', donorColor: '#2DD4BF', donorLabel: 'Anonymous donor', campaign: 'Emergency Food Relief — Sudan', amount: '$120.00', time: '2 min ago', acknowledged: false },
  { id: '2', donorInitials: 'M', donorColor: '#60A5FA', donorLabel: 'Anonymous donor', campaign: 'Flood Recovery — Bangladesh', amount: '$50.00', time: '1 hour ago', acknowledged: false },
  { id: '3', donorInitials: 'A', donorColor: '#A78BFA', donorLabel: 'Anonymous donor', campaign: 'Solar Panels — Kenya', amount: '$75.00', time: 'Yesterday', acknowledged: true },
  { id: '4', donorInitials: 'A', donorColor: '#F59E0B', donorLabel: 'Anonymous donor', campaign: 'Emergency Food Relief — Sudan', amount: '$200.00', time: '3 days ago', acknowledged: true },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RecipientDashboard() {
  const { data: campaigns, isLoading, isError } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => fetchCampaigns(),
  });

  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [updateSent, setUpdateSent] = useState(false);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);

  const totalReceivedUsd = INCOMING_DONATIONS.reduce((sum, d) => {
    return sum + parseFloat(d.amount.replace('$', ''));
  }, 0);

  function handleSignOut() {
    router.replace('/');
  }

  function resetModal() {
    setUpdateText('');
    setSelectedCampaign('');
    setMediaUri(null);
    setMediaType(null);
  }

  function handlePostUpdate() {
    if (!updateText.trim()) return;
    setUpdateSent(true);
    setTimeout(() => {
      setUpdateModalVisible(false);
      resetModal();
      setUpdateSent(false);
    }, 1800);
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

  const visibleCampaigns = campaigns?.slice(0, 2) ?? [];
  const visibleDonations = INCOMING_DONATIONS.slice(0, 2);
  const hasMoreCampaigns = (campaigns?.length ?? 0) > 2;
  const hasMoreDonations = INCOMING_DONATIONS.length > 2;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Avatar initials="RK" color={Colors.warning} size={40} />
          <View>
            <Text style={styles.headerName}>Beneficiary</Text>
            <Text style={styles.headerRole}>Beneficiary · {shortenAddress('0xA1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0')} · member since Jan 2026</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard label="Total received" value={`$${totalReceivedUsd.toFixed(0)}`} sub="since Jan 2026" teal />
          <StatCard label="Campaigns" value={String(campaigns?.length ?? '—')} sub="on Amoy testnet" />
          <StatCard label="Updates" value="2" sub="impact updates" />
        </View>

        {/* My campaigns */}
        <SectionCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My campaigns</Text>
            {hasMoreCampaigns && (
              <TouchableOpacity onPress={() => router.push('/recipient-all-campaigns')} activeOpacity={0.7}>
                <Text style={styles.seeAllLink}>See all</Text>
              </TouchableOpacity>
            )}
          </View>
          {isLoading && <ActivityIndicator color={Colors.teal} style={{ paddingVertical: 20 }} />}
          {isError && <Text style={styles.errorText}>Could not load campaigns.</Text>}
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
            onPress={() => setUpdateModalVisible(true)}
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

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
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
                  {campaigns?.map(c => (
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

                <TouchableOpacity
                  style={[styles.sendButton, (!updateText.trim() || !selectedCampaign) && styles.sendButtonDisabled]}
                  onPress={handlePostUpdate}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sendButtonText}>Send update to donors</Text>
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

  signOutButton: { alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginTop: 4 },
  signOutText: { fontSize: 14, fontWeight: '600', color: Colors.text.secondary },

  errorText: { fontSize: 13, color: Colors.error, paddingVertical: 12 },

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

  sendButton: { backgroundColor: Colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: Colors.bgCardAlt },
  sendButtonText: { fontSize: 15, fontWeight: '800', color: Colors.text.inverse },

  sentContainer: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 40 },
  sentIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.tealBg, borderWidth: 2, borderColor: Colors.teal, alignItems: 'center', justifyContent: 'center' },
  sentIconText: { fontSize: 28, color: Colors.teal, fontWeight: '900' },
  sentTitle: { fontSize: 22, fontWeight: '900', color: Colors.text.primary },
  sentSub: { fontSize: 14, color: Colors.text.secondary },
});

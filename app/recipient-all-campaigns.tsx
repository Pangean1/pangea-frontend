import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/colors';
import {
  fetchCampaigns,
  updateCampaignApi,
  setCampaignStatusApi,
  setCampaignMediaApi,
  removeCampaignMediaApi,
  type Campaign,
} from '../lib/api';
import { formatUsdc, usdcPercent } from '../lib/format';
import { queryClient } from '../lib/queryClient';
import { getWalletAddress } from '../lib/blockchain';

export default function AllCampaigns() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  useFocusEffect(useCallback(() => { getWalletAddress().then(setWalletAddress); }, []));

  // active_only=false so a beneficiary can still see (and reactivate) their own deactivated campaigns.
  // Uses the ['campaigns', 'all'] key (not ['campaigns']) to avoid colliding with the active-only
  // cache other screens (e.g. the dashboard) populate under the plain ['campaigns'] key — otherwise
  // this screen would render that stale active-only cache first, hiding Inactive campaigns until refetch.
  const { data: allCampaigns, isLoading, isError } = useQuery({
    queryKey: ['campaigns', 'all'],
    queryFn: () => fetchCampaigns(false),
  });
  const campaigns: Campaign[] = walletAddress
    ? (allCampaigns ?? []).filter(c => c.recipient_address.toLowerCase() === walletAddress.toLowerCase())
    : [];

  // ── Per-campaign media ─────────────────────────────────────────────────────
  const [mediaUpdatingId, setMediaUpdatingId] = useState<string | null>(null);

  async function handlePickCampaignMedia(campaignId: string) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setMediaUpdatingId(campaignId);
      try {
        await setCampaignMediaApi(campaignId, {
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
        });
        queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      } finally {
        setMediaUpdatingId(null);
      }
    }
  }

  async function handleRemoveCampaignMedia(campaignId: string) {
    setMediaUpdatingId(campaignId);
    try {
      await removeCampaignMediaApi(campaignId);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } finally {
      setMediaUpdatingId(null);
    }
  }

  // ── Deactivate / reactivate ─────────────────────────────────────────────────
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  async function handleSetStatus(campaignId: string, active: boolean) {
    setStatusUpdatingId(campaignId);
    try {
      await setCampaignStatusApi(campaignId, active);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (e: any) {
      // surfaced inline via the campaign row itself staying unchanged on failure
    } finally {
      setStatusUpdatingId(null);
    }
  }

  // ── Edit fields (goal / deadline only — name/description are fixed on-chain at creation) ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGoal, setEditGoal] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function startEdit(c: Campaign) {
    setEditingId(c.id);
    setEditGoal(String(parseInt(c.goal_wei, 10) / 1_000_000));
    setEditDeadline(c.deadline ? c.deadline.slice(0, 10) : '');
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(campaignId: string) {
    if (!(parseFloat(editGoal) > 0)) {
      setEditError('A positive goal is required.');
      return;
    }
    if (editDeadline.trim() && isNaN(Date.parse(editDeadline.trim()))) {
      setEditError('Deadline must be a valid date (YYYY-MM-DD), or left blank.');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await updateCampaignApi(campaignId, {
        goal_usd: String(parseFloat(editGoal)),
        deadline: editDeadline.trim() ? editDeadline.trim() : null,
      });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setEditingId(null);
    } catch (e: any) {
      setEditError(e?.response?.data?.detail ?? e?.message ?? 'Could not save changes.');
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My campaigns</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          {isLoading && <ActivityIndicator color={Colors.teal} style={{ paddingVertical: 20 }} />}
          {isError && <Text style={styles.errorText}>Could not load campaigns.</Text>}
          {!isLoading && !isError && campaigns.length === 0 && (
            <Text style={styles.emptyText}>No campaigns yet.</Text>
          )}
          {campaigns.map((c, index) => {
            const percent = usdcPercent(c.total_raised_wei, c.goal_wei);
            const raised = formatUsdc(c.total_raised_wei);
            const goal = formatUsdc(c.goal_wei);
            const barColor = percent >= 75 ? Colors.warning : Colors.teal;
            const isLast = index === campaigns.length - 1;
            const isEditing = editingId === c.id;
            const isUpdatingMedia = mediaUpdatingId === c.id;
            const isUpdatingStatus = statusUpdatingId === c.id;
            const deadlinePassed = !!c.deadline && new Date(c.deadline).getTime() < Date.now();

            return (
              <View key={c.id} style={[styles.campaignRow, !isLast && styles.campaignRowBorder]}>
                <View style={styles.campaignRowTop}>
                  <Text style={styles.campaignName}>{c.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: c.active ? Colors.successBg : Colors.errorBg }]}>
                    <Text style={[styles.statusBadgeText, { color: c.active ? Colors.success : Colors.error }]}>
                      {c.active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${percent}%` as any, backgroundColor: barColor }]} />
                </View>
                <Text style={styles.campaignMeta}>{raised} of {goal} · {percent}% funded</Text>
                {c.deadline && (
                  <Text style={[styles.campaignMeta, deadlinePassed && styles.deadlinePassed]}>
                    Deadline: {new Date(c.deadline).toLocaleDateString()}
                    {deadlinePassed ? ' · passed — not automatic, tap Deactivate below' : ''}
                  </Text>
                )}

                {isEditing ? (
                  <View style={styles.editBlock}>
                    {editError && <Text style={styles.errorText}>{editError}</Text>}

                    <Text style={styles.fieldHint}>Campaign name and description are fixed on-chain and can't be edited after creation.</Text>

                    <Text style={styles.fieldLabel}>Goal (USDC)</Text>
                    <TextInput
                      style={styles.input}
                      value={editGoal}
                      onChangeText={t => setEditGoal(t.replace(/[^0-9.]/g, ''))}
                      keyboardType="decimal-pad"
                      maxLength={10}
                    />

                    <Text style={styles.fieldLabel}>Deadline (optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={editDeadline}
                      onChangeText={setEditDeadline}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={Colors.text.muted}
                      maxLength={10}
                    />
                    <Text style={styles.fieldHint}>Shown on the campaign — not automatic. You still have to tap Deactivate yourself once it passes.</Text>

                    <View style={styles.editButtonsRow}>
                      <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit} disabled={editSaving}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={() => saveEdit(c.id)}
                        disabled={editSaving}
                      >
                        {editSaving
                          ? <ActivityIndicator color={Colors.text.inverse} size="small" />
                          : <Text style={styles.saveButtonText}>Save</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => startEdit(c)}>
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSetStatus(c.id, !c.active)}
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus
                        ? <ActivityIndicator color={Colors.text.secondary} size="small" />
                        : <Text style={[styles.actionButtonText, !c.active && { color: Colors.success }]}>
                            {c.active ? 'Deactivate' : 'Reactivate'}
                          </Text>}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Per-campaign media */}
                {isUpdatingMedia ? (
                  <View style={styles.mediaPickerButton}>
                    <ActivityIndicator color={Colors.teal} />
                  </View>
                ) : c.media_url ? (
                  <View style={styles.mediaPreview}>
                    {c.media_type === 'image' ? (
                      <Image source={{ uri: c.media_url }} style={styles.mediaThumb} />
                    ) : (
                      <View style={styles.videoPreview}>
                        <Text style={styles.videoIcon}>🎬</Text>
                        <Text style={styles.videoLabel}>Video attached</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => handleRemoveCampaignMedia(c.id)}
                      style={styles.mediaRemove}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.mediaRemoveText}>✕ Remove photo / video</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.mediaPickerButton}
                    onPress={() => handlePickCampaignMedia(c.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.mediaPickerText}>📎  Add photo / video</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: { paddingVertical: 4 },
  backText: { fontSize: 14, color: Colors.teal, fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
  scroll: { padding: 16, paddingTop: 8 },
  card: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },

  campaignRow: { paddingTop: 12, paddingBottom: 12, gap: 8 },
  campaignRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  campaignRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  campaignName: { fontSize: 13, fontWeight: '700', color: Colors.text.primary, flex: 1, lineHeight: 18 },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  campaignMeta: { fontSize: 11, color: Colors.text.muted },
  deadlinePassed: { color: Colors.warning, fontWeight: '600' },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '600' },

  actionsRow: { flexDirection: 'row', gap: 8 },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.bgCardAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: { fontSize: 11, fontWeight: '700', color: Colors.text.secondary },

  editBlock: { gap: 8, backgroundColor: Colors.bgCardAlt, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  fieldHint: { fontSize: 11, color: Colors.text.muted },
  input: { backgroundColor: Colors.bgCard, borderRadius: 10, padding: 10, fontSize: 13, color: Colors.text.primary, borderWidth: 1, borderColor: Colors.border },
  editButtonsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  cancelButtonText: { fontSize: 13, fontWeight: '700', color: Colors.text.secondary },
  saveButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: Colors.teal },
  saveButtonText: { fontSize: 13, fontWeight: '700', color: Colors.text.inverse },

  mediaPickerButton: { backgroundColor: Colors.bgCardAlt, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', paddingVertical: 16, alignItems: 'center' },
  mediaPickerText: { fontSize: 14, color: Colors.text.secondary, fontWeight: '600' },
  mediaPreview: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.tealBorder },
  mediaThumb: { width: '100%', height: 180, resizeMode: 'cover' },
  videoPreview: { backgroundColor: Colors.bgCardAlt, paddingVertical: 24, alignItems: 'center', gap: 6 },
  videoIcon: { fontSize: 32 },
  videoLabel: { fontSize: 13, color: Colors.text.secondary, fontWeight: '600' },
  mediaRemove: { padding: 10, alignItems: 'center', backgroundColor: Colors.bgCardAlt },
  mediaRemoveText: { fontSize: 13, color: Colors.error, fontWeight: '600' },

  errorText: { fontSize: 12, color: Colors.error, paddingVertical: 4 },
  emptyText: { fontSize: 13, color: Colors.text.muted, paddingVertical: 12, textAlign: 'center' },
});

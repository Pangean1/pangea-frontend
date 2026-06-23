import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
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
import { fetchCampaigns, type Campaign } from '../lib/api';
import { formatUsdc, usdcPercent } from '../lib/format';
import { queryClient } from '../lib/queryClient';
import { addLocalCampaign, removeLocalCampaign } from '../lib/localCampaigns';
import {
  setCampaignMedia,
  removeCampaignMedia,
  type CampaignMediaEntry,
} from '../lib/campaignMedia';

export default function CreateCampaign() {
  const { data: campaigns, isLoading, isError } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => fetchCampaigns(),
  });

  // ── New campaign form ─────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [formMediaUri, setFormMediaUri] = useState<string | null>(null);
  const [formMediaType, setFormMediaType] = useState<'image' | 'video' | null>(null);
  const [successBanner, setSuccessBanner] = useState(false);

  // ── Existing campaign management ──────────────────────────────────────────
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [campaignMediaMap, setCampaignMediaMap] = useState<Record<string, CampaignMediaEntry>>({});

  // All four fields must be filled for the button to activate
  const canCreate =
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    parseFloat(goal) > 0 &&
    formMediaUri !== null;

  async function handlePickFormMedia() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setFormMediaUri(asset.uri);
      setFormMediaType(asset.type === 'video' ? 'video' : 'image');
    }
  }

  function handleCreate() {
    if (!canCreate || !formMediaUri || !formMediaType) return;

    const newCampaign: Campaign = {
      id: `local_${Date.now()}`,
      on_chain_id: 0,
      recipient_address: '0xA1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0',
      name: name.trim(),
      description: description.trim(),
      active: true,
      total_raised_wei: '0',
      goal_wei: String(Math.round(parseFloat(goal) * 1_000_000)),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Link the uploaded media to this campaign's ID
    setCampaignMedia(newCampaign.id, { uri: formMediaUri, type: formMediaType });

    // Add to module store so all screens pick it up on next fetch
    addLocalCampaign(newCampaign);
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });

    // Reset form
    setName('');
    setDescription('');
    setGoal('');
    setFormMediaUri(null);
    setFormMediaType(null);
    setSuccessBanner(true);
  }

  function handleDelete(id: string) {
    setDeletedIds(prev => new Set(prev).add(id));
    removeLocalCampaign(id);
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  }

  async function handlePickCampaignMedia(campaignId: string) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const entry: CampaignMediaEntry = {
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
      };
      setCampaignMedia(campaignId, entry);
      setCampaignMediaMap(prev => ({ ...prev, [campaignId]: entry }));
    }
  }

  function handleRemoveCampaignMedia(campaignId: string) {
    removeCampaignMedia(campaignId);
    setCampaignMediaMap(prev => {
      const next = { ...prev };
      delete next[campaignId];
      return next;
    });
  }

  const visibleCampaigns = (campaigns ?? []).filter(c => !deletedIds.has(c.id));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Campaigns</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── Success banner ────────────────────────────────────────────── */}
          {successBanner && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>✓  Campaign created successfully</Text>
              <TouchableOpacity
                onPress={() => setSuccessBanner(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.successBannerDismiss}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Create form ───────────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>New campaign</Text>

            {/* Campaign name */}
            <Text style={styles.fieldLabel}>Campaign name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Emergency Food Relief — Sudan"
              placeholderTextColor={Colors.text.muted}
              maxLength={80}
            />

            {/* Description */}
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the purpose of this campaign and how funds will be used..."
              placeholderTextColor={Colors.text.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={400}
            />
            <Text style={styles.charCount}>{description.length}/400</Text>

            {/* Goal */}
            <Text style={styles.fieldLabel}>Goal (USDC)</Text>
            <TextInput
              style={styles.input}
              value={goal}
              onChangeText={text => setGoal(text.replace(/[^0-9.]/g, ''))}
              placeholder="e.g. 5000"
              placeholderTextColor={Colors.text.muted}
              keyboardType="decimal-pad"
              maxLength={10}
            />

            {/* Photo / video — required */}
            <Text style={styles.fieldLabel}>Photo / video</Text>
            {formMediaUri ? (
              <View style={styles.mediaPreview}>
                {formMediaType === 'image' ? (
                  <Image source={{ uri: formMediaUri }} style={styles.mediaThumb} />
                ) : (
                  <View style={styles.videoPreview}>
                    <Text style={styles.videoIcon}>🎬</Text>
                    <Text style={styles.videoLabel}>Video selected</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => { setFormMediaUri(null); setFormMediaType(null); }}
                  style={styles.mediaRemove}
                  activeOpacity={0.7}
                >
                  <Text style={styles.mediaRemoveText}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.mediaPickerButton}
                onPress={handlePickFormMedia}
                activeOpacity={0.7}
              >
                <Text style={styles.mediaPickerText}>📎  Upload photo / video</Text>
              </TouchableOpacity>
            )}

            {/* Create button — active only when all fields are filled */}
            <TouchableOpacity
              style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
              onPress={handleCreate}
              activeOpacity={canCreate ? 0.85 : 1}
            >
              <Text style={[styles.createButtonText, !canCreate && styles.createButtonTextDisabled]}>
                Create campaign
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── My campaigns ─────────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>My campaigns</Text>

            {isLoading && <ActivityIndicator color={Colors.teal} style={{ paddingVertical: 20 }} />}
            {isError && <Text style={styles.errorText}>Could not load campaigns.</Text>}
            {!isLoading && !isError && visibleCampaigns.length === 0 && (
              <Text style={styles.emptyText}>No campaigns yet.</Text>
            )}

            {visibleCampaigns.map((c, index) => {
              const percent = usdcPercent(c.total_raised_wei, c.goal_wei);
              const raised = formatUsdc(c.total_raised_wei);
              const goalFmt = formatUsdc(c.goal_wei);
              const barColor = percent >= 75 ? Colors.warning : Colors.teal;
              const hasNoDonations = c.total_raised_wei === '0' || c.total_raised_wei === '0x0';
              const isFirst = index === 0;
              const media = campaignMediaMap[c.id];

              return (
                <View key={c.id} style={[styles.campaignRow, !isFirst && styles.campaignRowBorder]}>

                  <View style={styles.campaignRowTop}>
                    <Text style={styles.campaignName}>{c.name}</Text>
                    {hasNoDonations && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDelete(c.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${percent}%` as any, backgroundColor: barColor }]} />
                  </View>
                  <Text style={styles.campaignMeta}>{raised} of {goalFmt} · {percent}% funded</Text>

                  {/* Per-campaign media (for existing campaigns) */}
                  {media ? (
                    <View style={styles.mediaPreview}>
                      {media.type === 'image' ? (
                        <Image source={{ uri: media.uri }} style={styles.mediaThumb} />
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
      </KeyboardAvoidingView>
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
  scroll: { padding: 16, paddingTop: 8, gap: 12 },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.tealBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.tealBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  successBannerText: { fontSize: 14, fontWeight: '700', color: Colors.teal, flex: 1 },
  successBannerDismiss: { fontSize: 16, color: Colors.teal, fontWeight: '700', paddingLeft: 12 },

  card: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: -4 },
  input: { backgroundColor: Colors.bgCardAlt, borderRadius: 12, padding: 14, fontSize: 14, color: Colors.text.primary, borderWidth: 1, borderColor: Colors.border },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: Colors.text.muted, textAlign: 'right', marginTop: -8 },

  mediaPickerButton: { backgroundColor: Colors.bgCardAlt, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', paddingVertical: 16, alignItems: 'center' },
  mediaPickerText: { fontSize: 14, color: Colors.text.secondary, fontWeight: '600' },
  mediaPreview: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.tealBorder },
  mediaThumb: { width: '100%', height: 180, resizeMode: 'cover' },
  videoPreview: { backgroundColor: Colors.bgCardAlt, paddingVertical: 24, alignItems: 'center', gap: 6 },
  videoIcon: { fontSize: 32 },
  videoLabel: { fontSize: 13, color: Colors.text.secondary, fontWeight: '600' },
  mediaRemove: { padding: 10, alignItems: 'center', backgroundColor: Colors.bgCardAlt },
  mediaRemoveText: { fontSize: 13, color: Colors.error, fontWeight: '600' },

  createButton: { backgroundColor: Colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  createButtonDisabled: { backgroundColor: Colors.bgCardAlt },
  createButtonText: { fontSize: 15, fontWeight: '800', color: Colors.text.inverse },
  createButtonTextDisabled: { color: Colors.text.muted },

  campaignRow: { paddingTop: 12, gap: 8 },
  campaignRowBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  campaignRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  campaignName: { fontSize: 13, fontWeight: '700', color: Colors.text.primary, flex: 1, lineHeight: 18 },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  campaignMeta: { fontSize: 11, color: Colors.text.muted },

  deleteButton: { backgroundColor: Colors.errorBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' },
  deleteButtonText: { fontSize: 11, fontWeight: '700', color: Colors.error },

  errorText: { fontSize: 13, color: Colors.error, paddingVertical: 12 },
  emptyText: { fontSize: 13, color: Colors.text.muted, paddingVertical: 12, textAlign: 'center' },
});

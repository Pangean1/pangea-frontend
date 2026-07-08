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
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Colors } from '../constants/colors';
import { createCampaign } from '../lib/api';
import { queryClient } from '../lib/queryClient';

export default function CreateCampaign() {
  // ── New campaign form ─────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [formMediaUri, setFormMediaUri] = useState<string | null>(null);
  const [formMediaType, setFormMediaType] = useState<'image' | 'video' | null>(null);
  const [successBanner, setSuccessBanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const deadlineValid = deadline.trim().length === 0 || !isNaN(Date.parse(deadline.trim()));

  const canCreate =
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    parseFloat(goal) > 0 &&
    deadlineValid &&
    !submitting;

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

  async function handleCreate() {
    if (!canCreate) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createCampaign({
        name: name.trim(),
        description: description.trim(),
        goal_usd: String(parseFloat(goal)),
        deadline: deadline.trim() ? deadline.trim() : undefined,
        media: formMediaUri && formMediaType ? { uri: formMediaUri, type: formMediaType } : undefined,
      });
      setName('');
      setDescription('');
      setGoal('');
      setDeadline('');
      setFormMediaUri(null);
      setFormMediaType(null);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setSuccessBanner(true);
    } catch (e: any) {
      setSubmitError(e?.response?.data?.detail ?? e?.message ?? 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Campaign</Text>
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

          {/* ── Error banner ──────────────────────────────────────────────── */}
          {submitError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{submitError}</Text>
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

            {/* Deadline — optional, display-only */}
            <Text style={styles.fieldLabel}>Deadline (optional)</Text>
            <TextInput
              style={styles.input}
              value={deadline}
              onChangeText={setDeadline}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.text.muted}
              maxLength={10}
            />
            <Text style={styles.fieldHint}>Shown on the campaign — not automatic. You still have to tap Deactivate yourself once it passes.</Text>
            {!deadlineValid && (
              <Text style={styles.fieldError}>Enter a valid date as YYYY-MM-DD, or leave blank.</Text>
            )}

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
              {submitting
                ? <ActivityIndicator color={Colors.text.inverse} />
                : <Text style={[styles.createButtonText, !canCreate && styles.createButtonTextDisabled]}>
                    Submit Campaign
                  </Text>
              }
            </TouchableOpacity>
          </View>

          {/* ── Link to management screen ────────────────────────────────── */}
          <TouchableOpacity
            style={styles.manageLink}
            onPress={() => router.push('/recipient-all-campaigns')}
            activeOpacity={0.7}
          >
            <Text style={styles.manageLinkText}>Manage my existing campaigns →</Text>
          </TouchableOpacity>

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

  errorBanner: { backgroundColor: Colors.errorBg, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', paddingHorizontal: 16, paddingVertical: 12 },
  errorBannerText: { fontSize: 14, fontWeight: '600', color: Colors.error },

  card: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: -4 },
  input: { backgroundColor: Colors.bgCardAlt, borderRadius: 12, padding: 14, fontSize: 14, color: Colors.text.primary, borderWidth: 1, borderColor: Colors.border },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: Colors.text.muted, textAlign: 'right', marginTop: -8 },
  fieldError: { fontSize: 11, color: Colors.error, marginTop: -8 },
  fieldHint: { fontSize: 11, color: Colors.text.muted, marginTop: -8 },

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

  manageLink: { alignItems: 'center', paddingVertical: 8 },
  manageLinkText: { fontSize: 13, fontWeight: '600', color: Colors.teal },
});

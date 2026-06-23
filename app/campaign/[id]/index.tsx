import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '../../../constants/colors';
import { fetchCampaign } from '../../../lib/api';
import { formatUsdc, usdcPercent, shortenAddress } from '../../../lib/format';
import { getCampaignMedia } from '../../../lib/campaignMedia';

export default function CampaignDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const campaignMedia = getCampaignMedia(id ?? '');

  const { data: campaign, isLoading, isError } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => fetchCampaign(id),
    enabled: !!id,
  });

  return (
    <SafeAreaView style={styles.screen}>

      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.teal} size="large" />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load campaign.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      )}

      {campaign && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.name}>{campaign.name}</Text>
            <View style={styles.recipientRow}>
              <Text style={styles.recipientLabel}>Recipient wallet</Text>
              <Text style={styles.recipientAddress}>{shortenAddress(campaign.recipient_address)}</Text>
            </View>
          </View>

          {/* Progress card */}
          <View style={styles.card}>
            <ProgressSection campaign={campaign} />
          </View>

          {/* Description card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>About this campaign</Text>
            <Text style={styles.description}>{campaign.description}</Text>
          </View>

          {/* Beneficiary media */}
          {campaignMedia && (
            <View style={styles.mediaCard}>
              {campaignMedia.type === 'image' ? (
                <Image source={{ uri: campaignMedia.uri }} style={styles.mediaImage} />
              ) : (
                <View style={styles.videoBox}>
                  <Text style={styles.videoIcon}>🎬</Text>
                  <Text style={styles.videoLabel}>Video from beneficiary</Text>
                </View>
              )}
              <Text style={styles.mediaCaption}>Shared by the beneficiary</Text>
            </View>
          )}

          {/* Transparency note */}
          <View style={styles.transparencyRow}>
            <Text style={styles.transparencyText}>
              ● Every donation goes directly on-chain to the recipient. Zero platform fee.
            </Text>
          </View>

          {/* Donate button */}
          <TouchableOpacity
            style={styles.donateButton}
            onPress={() => router.push(`/campaign/${id}/donate`)}
            activeOpacity={0.85}
          >
            <Text style={styles.donateButtonText}>Donate to this campaign</Text>
          </TouchableOpacity>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ProgressSection({ campaign }: { campaign: ReturnType<typeof fetchCampaign> extends Promise<infer T> ? T : never }) {
  const percent = usdcPercent(campaign.total_raised_wei, campaign.goal_wei);
  const raised = formatUsdc(campaign.total_raised_wei);
  const goal = formatUsdc(campaign.goal_wei);
  const barColor = percent >= 60 ? Colors.warning : Colors.teal;

  return (
    <View style={styles.progressSection}>
      <View style={styles.progressAmounts}>
        <View>
          <Text style={styles.raisedAmount}>{raised}</Text>
          <Text style={styles.raisedLabel}>raised</Text>
        </View>
        <View style={styles.progressRight}>
          <Text style={styles.goalAmount}>{goal}</Text>
          <Text style={styles.goalLabel}>goal</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percent}%` as any, backgroundColor: barColor }]} />
      </View>

      <Text style={styles.percentText}>{percent}% funded</Text>
    </View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
  },
  linkText: {
    fontSize: 14,
    color: Colors.teal,
    fontWeight: '600',
  },
  scroll: {
    padding: 20,
    gap: 16,
  },

  // Header
  header: {
    gap: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text.primary,
    lineHeight: 30,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recipientLabel: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  recipientAddress: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '600',
  },

  // Card
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  description: {
    fontSize: 15,
    color: Colors.text.secondary,
    lineHeight: 23,
  },

  // Progress
  progressSection: {
    gap: 10,
  },
  progressAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  raisedAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.teal,
  },
  raisedLabel: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
  },
  progressRight: {
    alignItems: 'flex-end',
  },
  goalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  goalLabel: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '600',
  },

  // Beneficiary media
  mediaCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  mediaImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  videoBox: {
    backgroundColor: Colors.bgCard,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  videoIcon: { fontSize: 36 },
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

  // Transparency
  transparencyRow: {
    paddingHorizontal: 4,
  },
  transparencyText: {
    fontSize: 12,
    color: Colors.text.muted,
    lineHeight: 18,
  },

  // Donate button
  donateButton: {
    backgroundColor: Colors.teal,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  donateButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.inverse,
  },
});

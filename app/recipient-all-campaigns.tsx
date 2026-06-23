import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '../constants/colors';
import { fetchCampaigns } from '../lib/api';
import { formatUsdc, usdcPercent } from '../lib/format';

export default function AllCampaigns() {
  const { data: campaigns, isLoading, isError } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => fetchCampaigns(),
  });

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
          {!isLoading && !isError && campaigns?.length === 0 && (
            <Text style={styles.emptyText}>No campaigns yet.</Text>
          )}
          {campaigns?.map((c, index) => {
            const percent = usdcPercent(c.total_raised_wei, c.goal_wei);
            const raised = formatUsdc(c.total_raised_wei);
            const goal = formatUsdc(c.goal_wei);
            const barColor = percent >= 75 ? Colors.warning : Colors.teal;
            const isLast = index === (campaigns.length - 1);
            return (
              <View key={c.id} style={[styles.campaignRow, isLast && styles.campaignRowLast]}>
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
  scroll: { padding: 16, paddingTop: 0 },
  card: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },

  campaignRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, gap: 6 },
  campaignRowLast: { borderBottomWidth: 0 },
  campaignRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  campaignName: { fontSize: 13, fontWeight: '700', color: Colors.text.primary, flex: 1, lineHeight: 18 },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  campaignMeta: { fontSize: 11, color: Colors.text.muted },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '600' },

  errorText: { fontSize: 13, color: Colors.error, paddingVertical: 12 },
  emptyText: { fontSize: 13, color: Colors.text.muted, paddingVertical: 12, textAlign: 'center' },
});

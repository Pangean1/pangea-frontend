import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Colors } from '../../constants/colors';
import { fetchCampaigns, fetchImpactUpdates } from '../../lib/api';
import { getWalletAddress } from '../../lib/blockchain';
import { ImpactUpdateCard, impactUpdateRecordToCard } from '../../lib/donorShared';

export default function AllImpactUpdates() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  useFocusEffect(useCallback(() => { getWalletAddress().then(setWalletAddress); }, []));

  // Unfiltered — an update's campaign may have since been deactivated, but
  // should still resolve to its real name here, not "Unknown campaign".
  const { data: campaigns } = useQuery({
    queryKey: ['campaigns', 'all'],
    queryFn: () => fetchCampaigns(false),
  });

  const { data: updatesData, isLoading } = useQuery({
    queryKey: ['impact-updates', walletAddress],
    queryFn: () => fetchImpactUpdates({ donor_address: walletAddress!, limit: 100 }),
    enabled: !!walletAddress,
  });
  const impactUpdateCards = (updatesData?.items ?? []).map(u => {
    const campaignName = campaigns?.find(c => c.id === u.campaign_id)?.name
      ?? 'Unknown campaign';
    return impactUpdateRecordToCard(u, campaignName);
  });

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Impact updates</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {isLoading && (
          <ActivityIndicator color={Colors.teal} style={{ paddingVertical: 24 }} />
        )}
        {!isLoading && impactUpdateCards.length === 0 && (
          <Text style={styles.emptyText}>No impact updates yet.</Text>
        )}
        {impactUpdateCards.map(u => (
          <ImpactUpdateCard key={u.id} item={u} />
        ))}
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
  scroll: { padding: 16, paddingTop: 4 },
  emptyText: {
    fontSize: 13,
    color: Colors.text.muted,
    textAlign: 'center',
    paddingVertical: 16,
  },
});

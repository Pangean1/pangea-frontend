import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Colors } from '../../constants/colors';
import { fetchCampaigns, fetchDonations } from '../../lib/api';
import { getWalletAddress } from '../../lib/blockchain';
import { DonationRow, donationRecordToRow } from '../../lib/donorShared';

export default function AllDonations() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  useEffect(() => { getWalletAddress().then(setWalletAddress); }, []);

  // Unfiltered — a donation's campaign may have since been deactivated, but
  // should still resolve to its real name here, not "Unknown campaign".
  const { data: campaigns } = useQuery({
    queryKey: ['campaigns', 'all'],
    queryFn: () => fetchCampaigns(false),
  });

  const { data: donationsData, isLoading } = useQuery({
    queryKey: ['donations', walletAddress],
    queryFn: () => fetchDonations({ donor_address: walletAddress!, limit: 100 }),
    enabled: !!walletAddress,
  });
  const allDonations = (donationsData?.items ?? []).map(d => {
    const campaignName = campaigns?.find(c => c.on_chain_id === d.on_chain_campaign_id)?.name
      ?? 'Unknown campaign';
    return donationRecordToRow(d, campaignName);
  });

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My donations</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          {isLoading && (
            <ActivityIndicator color={Colors.teal} style={{ paddingVertical: 24 }} />
          )}
          {!isLoading && allDonations.length === 0 && (
            <Text style={styles.emptyText}>No donations yet.</Text>
          )}
          {allDonations.map(d => (
            <DonationRow key={d.id} item={d} />
          ))}
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
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.text.muted,
    textAlign: 'center',
    paddingVertical: 16,
  },
});

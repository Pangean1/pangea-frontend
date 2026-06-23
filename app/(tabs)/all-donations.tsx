import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import { shortenAddress } from '../../lib/format';
import type { SessionDonation } from '../../lib/sessionDonations';
import { MY_DONATIONS, DonationRow, type Donation, type DonationStatus } from '../../lib/donorShared';

export default function AllDonations() {
  const { data: sessionDonations = [] } = useQuery<SessionDonation[]>({
    queryKey: ['sessionDonations'],
    queryFn: () => [],
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const sessionRows: Donation[] = sessionDonations.map(d => ({
    id: `session_${d.id}`,
    initials: d.campaignName.slice(0, 2).toUpperCase(),
    avatarColor: Colors.teal,
    name: shortenAddress(d.recipientAddress),
    campaign: d.campaignName,
    amount: `$${d.amount}`,
    time: 'Just now',
    status: 'In transit' as DonationStatus,
  }));
  const allDonations = [...sessionRows, ...MY_DONATIONS];

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
});

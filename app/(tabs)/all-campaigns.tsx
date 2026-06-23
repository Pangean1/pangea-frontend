import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import { fetchCampaigns } from '../../lib/api';
import { CampaignRow } from '../../lib/donorShared';

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
        <Text style={styles.title}>Discover campaigns</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          {isLoading && (
            <ActivityIndicator color={Colors.teal} style={{ paddingVertical: 24 }} />
          )}
          {isError && (
            <Text style={styles.errorText}>Could not load campaigns. Check connection.</Text>
          )}
          {campaigns?.map(c => (
            <CampaignRow key={c.id} item={c} />
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
  errorText: {
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
    paddingVertical: 16,
  },
});

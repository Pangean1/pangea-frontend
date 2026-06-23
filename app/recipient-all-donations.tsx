import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { INCOMING_DONATIONS, DonationRow } from './recipient';

export default function AllDonations() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Incoming donations</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          {INCOMING_DONATIONS.map(d => (
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

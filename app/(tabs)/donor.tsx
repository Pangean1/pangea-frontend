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
import { useEffect, useState } from 'react';
import { Colors } from '../../constants/colors';
import { fetchCampaigns, fetchDonations, fetchImpactUpdates } from '../../lib/api';
import { formatUsdc, formatTimeAgo, shortenAddress } from '../../lib/format';
import { getWalletAddress } from '../../lib/blockchain';
import {
  Avatar,
  DonationRow,
  ImpactUpdateCard,
  CampaignRow,
  donationRecordToRow,
  impactUpdateRecordToCard,
} from '../../lib/donorShared';

// ─── Screen ───────────────────────────────────────────────────────────────────

const TRACKER_STEPS = ['Initiated', 'On-chain', 'Arriving', 'Notified', 'Impact\nconfirmed'];

export default function DonorDashboard() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  useEffect(() => { getWalletAddress().then(setWalletAddress); }, []);

  const { data: campaigns, isLoading: campaignsLoading, isError: campaignsError } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => fetchCampaigns(),
  });

  // Separate, unfiltered list used only to resolve names for past
  // donations/updates — a donation's campaign may have since been
  // deactivated, but it should still show its real name, not "Unknown".
  const { data: allCampaigns } = useQuery({
    queryKey: ['campaigns', 'all'],
    queryFn: () => fetchCampaigns(false),
  });

  const { data: myDonationsData } = useQuery({
    queryKey: ['donations', walletAddress],
    queryFn: () => fetchDonations({ donor_address: walletAddress!, limit: 20 }),
    enabled: !!walletAddress,
  });
  const latestDonation = myDonationsData?.items[0];
  const latestDonationCampaign = allCampaigns?.find(
    c => c.on_chain_id === latestDonation?.on_chain_campaign_id
  );
  const myDonationRows = (myDonationsData?.items ?? []).map(d => {
    const campaignName = allCampaigns?.find(c => c.on_chain_id === d.on_chain_campaign_id)?.name
      ?? 'Unknown campaign';
    return donationRecordToRow(d, campaignName);
  });

  const totalDonatedWei = (myDonationsData?.items ?? [])
    .reduce((sum, d) => sum + BigInt(d.amount_wei), 0n)
    .toString();
  const donationCount = myDonationsData?.total ?? 0;

  const { data: impactUpdatesData } = useQuery({
    queryKey: ['impact-updates', walletAddress],
    queryFn: () => fetchImpactUpdates({ donor_address: walletAddress!, limit: 20 }),
    enabled: !!walletAddress,
  });
  const impactUpdateCards = (impactUpdatesData?.items ?? []).map(u => {
    const campaignName = allCampaigns?.find(c => c.id === u.campaign_id)?.name
      ?? 'Unknown campaign';
    return impactUpdateRecordToCard(u, campaignName);
  });

  function handleBack() {
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Avatar initials={walletAddress ? walletAddress.slice(2, 4).toUpperCase() : '—'} color={Colors.teal} size={40} />
          <View>
            <Text style={styles.headerRole}>Donor dashboard</Text>
            {walletAddress ? (
              <Text style={styles.walletAddress}>Wallet: {shortenAddress(walletAddress)}</Text>
            ) : null}
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            label="Total donated"
            value={formatUsdc(totalDonatedWei)}
            sub={`across ${donationCount} donation${donationCount === 1 ? '' : 's'}`}
          />
          <StatCard label="Impact updates" value={String(impactUpdatesData?.total ?? 0)} sub="from beneficiaries" />
        </View>

        {/* Latest donation tracker */}
        <SectionCard>
          <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>Latest donation — path of the donation</Text>
          {latestDonation ? (
            <>
              <Text style={styles.trackerSub}>
                {formatUsdc(latestDonation.amount_wei)} USDC → {latestDonationCampaign?.name ?? 'Unknown campaign'} · {formatTimeAgo(latestDonation.block_timestamp)}
              </Text>
              <TrackerBar currentStep={3} />
            </>
          ) : (
            <Text style={styles.trackerSub}>No donations yet — make your first donation to see it tracked here.</Text>
          )}
        </SectionCard>

        {/* My donations + Impact updates */}
        <View style={styles.twoCol}>

          {/* My donations */}
          <SectionCard style={styles.halfCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My donations</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/all-donations')}>
                <Text style={styles.linkText}>See all</Text>
              </TouchableOpacity>
            </View>
            {myDonationRows.length === 0 && (
              <Text style={styles.emptyText}>No donations yet.</Text>
            )}
            {myDonationRows.slice(0, 2).map(d => (
              <DonationRow key={d.id} item={d} />
            ))}
          </SectionCard>

          {/* Impact updates */}
          <SectionCard style={styles.halfCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Impact updates from beneficiaries</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/all-impact-updates')}>
                <Text style={styles.linkText}>See all</Text>
              </TouchableOpacity>
            </View>
            {impactUpdateCards.length === 0 && (
              <Text style={styles.emptyText}>No impact updates yet.</Text>
            )}
            {impactUpdateCards.slice(0, 2).map(u => (
              <ImpactUpdateCard key={u.id} item={u} />
            ))}
          </SectionCard>

        </View>

        {/* Discover campaigns */}
        <SectionCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Discover campaigns</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/all-campaigns')}>
              <Text style={styles.linkText}>See all</Text>
            </TouchableOpacity>
          </View>
          {campaignsLoading && (
            <ActivityIndicator color={Colors.teal} style={{ paddingVertical: 24 }} />
          )}
          {campaignsError && (
            <Text style={styles.errorText}>Could not load campaigns. Check connection.</Text>
          )}
          {campaigns?.slice(0, 2).map(c => (
            <CampaignRow key={c.id} item={c} />
          ))}
        </SectionCard>

        {/* Back */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function TrackerBar({ currentStep }: { currentStep: number }) {
  return (
    <View style={styles.trackerRow}>
      {TRACKER_STEPS.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <View key={i} style={styles.trackerStep}>
            <View style={[
              styles.trackerDot,
              done && styles.trackerDotDone,
              active && styles.trackerDotActive,
            ]}>
              {done ? <Text style={styles.trackerCheck}>✓</Text> : (
                <Text style={[styles.trackerNum, active && styles.trackerNumActive]}>{i + 1}</Text>
              )}
            </View>
            {i < TRACKER_STEPS.length - 1 && (
              <View style={[styles.trackerLine, done && styles.trackerLineDone]} />
            )}
            <Text style={[styles.trackerLabel, (done || active) && styles.trackerLabelActive]}>
              {step}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    padding: 16,
    gap: 12,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  headerRole: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  walletAddress: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 2,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.text.secondary,
    marginBottom: 4,
    lineHeight: 14,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  statSub: {
    fontSize: 9,
    color: Colors.text.muted,
    marginTop: 2,
    lineHeight: 13,
  },

  // Card
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  linkText: {
    fontSize: 12,
    color: Colors.teal,
    fontWeight: '600',
  },

  // Tracker
  trackerSub: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  trackerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  trackerStep: {
    flex: 1,
    alignItems: 'center',
  },
  trackerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bgCardAlt,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  trackerDotDone: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  trackerDotActive: {
    borderColor: Colors.teal,
    backgroundColor: Colors.tealBg,
  },
  trackerLine: {
    position: 'absolute',
    top: 13,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: Colors.border,
  },
  trackerLineDone: {
    backgroundColor: Colors.teal,
  },
  trackerCheck: {
    color: Colors.text.inverse,
    fontSize: 12,
    fontWeight: '900',
  },
  trackerNum: {
    color: Colors.text.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  trackerNumActive: {
    color: Colors.teal,
  },
  trackerLabel: {
    fontSize: 9,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12,
  },
  trackerLabelActive: {
    color: Colors.text.secondary,
  },

  // Two-column layout
  twoCol: {
    gap: 12,
  },
  halfCard: {},

  errorText: {
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.text.muted,
    paddingVertical: 8,
  },

  // Back
  backButton: {
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
});

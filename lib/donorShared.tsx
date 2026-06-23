import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { formatUsdc, usdcPercent, shortenAddress } from './format';
import type { Campaign } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DonationStatus = 'In transit' | 'Update received' | 'Delivered';

export interface Donation {
  id: string;
  initials: string;
  avatarColor: string;
  name: string;
  campaign: string;
  amount: string;
  time: string;
  status: DonationStatus;
}

export interface ImpactUpdate {
  id: string;
  initials: string;
  name: string;
  time: string;
  message: string;
  hasPhoto?: boolean;
  donationRef: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

export const MY_DONATIONS: Donation[] = [
  { id: '1', initials: 'CW', avatarColor: '#2DD4BF', name: '', campaign: 'Clean Water — Malawi', amount: '$120.00', time: '2 min ago', status: 'In transit' },
  { id: '2', initials: 'MA', avatarColor: '#F59E0B', name: '', campaign: 'Medical Aid — Ghana', amount: '$75.00', time: '3 days ago', status: 'Update received' },
  { id: '3', initials: 'SS', avatarColor: '#60A5FA', name: '', campaign: 'School Supplies — Nigeria', amount: '$50.00', time: '1 week ago', status: 'Delivered' },
  { id: '4', initials: 'FR', avatarColor: '#A78BFA', name: '', campaign: 'Food Relief — Sudan', amount: '$100.00', time: '2 weeks ago', status: 'Delivered' },
];

export const IMPACT_UPDATES: ImpactUpdate[] = [
  {
    id: '1',
    initials: 'B',
    name: 'Beneficiary',
    time: 'Yesterday',
    message: '"The medical supplies arrived at the clinic. We\'ve already helped 14 families this week. Thank you so much."',
    hasPhoto: true,
    donationRef: 'Re: your $75.00 donation',
  },
  {
    id: '2',
    initials: 'B',
    name: 'Beneficiary',
    time: '1 week ago',
    message: '"Books and stationery distributed to 32 students. School starts Monday!"',
    donationRef: 'Re: your $50.00 donation',
  },
];

// ─── Shared components ────────────────────────────────────────────────────────

export function Avatar({ initials, color, size = 36 }: { initials: string; color: string; size?: number }) {
  return (
    <View style={[shared.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[shared.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

export function DonationRow({ item }: { item: Donation }) {
  const statusColor =
    item.status === 'Delivered' ? Colors.success :
    item.status === 'Update received' ? Colors.warning :
    Colors.info;

  return (
    <View style={shared.donationRow}>
      <Avatar initials={item.initials} color={item.avatarColor} size={36} />
      <View style={shared.donationInfo}>
        <Text style={shared.donationName}>{item.campaign}</Text>
        <View style={[shared.statusBadge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[shared.statusBadgeText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </View>
      <View style={shared.donationRight}>
        <Text style={shared.donationAmount}>{item.amount}</Text>
        <Text style={shared.donationTime}>{item.time}</Text>
      </View>
    </View>
  );
}

export function ImpactUpdateCard({ item }: { item: ImpactUpdate }) {
  return (
    <View style={shared.impactCard}>
      <View style={shared.impactHeader}>
        <Avatar initials={item.initials} color={Colors.warning} size={28} />
        <Text style={shared.impactName}>{item.name}</Text>
        <Text style={shared.impactTime}>{item.time}</Text>
      </View>
      <Text style={shared.impactMessage}>{item.message}</Text>
      {item.hasPhoto && (
        <View style={shared.photoTag}>
          <Text style={shared.photoTagText}>📷 Photo update attached</Text>
        </View>
      )}
      <View style={shared.donationRefBadge}>
        <Text style={shared.donationRefText}>{item.donationRef}</Text>
      </View>
    </View>
  );
}

export function CampaignRow({ item }: { item: Campaign }) {
  const percent = usdcPercent(item.total_raised_wei, item.goal_wei);
  const raised = formatUsdc(item.total_raised_wei);
  const goal = formatUsdc(item.goal_wei);
  const barColor = percent >= 60 ? Colors.warning : Colors.teal;

  return (
    <TouchableOpacity
      style={shared.campaignRow}
      onPress={() => router.push(`/campaign/${item.id}`)}
      activeOpacity={0.7}
    >
      <Text style={shared.campaignTitle}>{item.name}</Text>
      <Text style={shared.campaignBy}>{shortenAddress(item.recipient_address)}</Text>
      <View style={shared.progressBar}>
        <View style={[shared.progressFill, { width: `${percent}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={shared.campaignMeta}>
        {raised} of {goal} · {percent}%
      </Text>
    </TouchableOpacity>
  );
}

export const shared = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: Colors.text.inverse,
    fontWeight: '800',
  },
  donationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  donationInfo: {
    flex: 1,
    gap: 3,
  },
  donationName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  donationCampaign: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  donationRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  donationAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.teal,
  },
  donationTime: {
    fontSize: 10,
    color: Colors.text.muted,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  impactCard: {
    backgroundColor: Colors.bgCardAlt,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  impactName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  impactTime: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  impactMessage: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  photoTag: {
    backgroundColor: Colors.bgCard,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoTagText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  donationRefBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.tealBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.tealBorder,
  },
  donationRefText: {
    fontSize: 11,
    color: Colors.teal,
    fontWeight: '600',
  },
  campaignRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 6,
  },
  campaignTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  campaignBy: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  campaignMeta: {
    fontSize: 11,
    color: Colors.text.muted,
  },
});

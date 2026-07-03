import axios from 'axios';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  on_chain_id: number;
  recipient_address: string;
  name: string;
  description: string;
  active: boolean;
  total_raised_wei: string;
  goal_wei: string;
  created_at: string;
  updated_at: string;
}

// ─── Campaign endpoints ───────────────────────────────────────────────────────

export async function fetchCampaigns(activeOnly = true): Promise<Campaign[]> {
  const { getLocalCampaigns } = await import('./localCampaigns');
  const { data } = await api.get<{ items: Campaign[]; total: number }>(
    '/campaigns',
    { params: { active_only: activeOnly } }
  );
  return [...getLocalCampaigns(), ...data.items];
}


export async function createCampaign(payload: {
  name: string;
  description: string;
  goal_usd: string;
}): Promise<Campaign> {
  const { data } = await api.post('/campaigns', payload);
  return data;
}

export async function fetchCampaign(id: string): Promise<Campaign> {
  const { getLocalCampaign } = await import('./localCampaigns');
  const local = getLocalCampaign(id);
  if (local) return local;
  const { data } = await api.get<Campaign>(`/campaigns/${id}`);
  return data;
}

// ─── Dev / test faucet ─────────────────────────────────────────────────────────
// Testnet-only: tops up the signed-in wallet with mock USDC so new donor
// accounts don't need to be funded by hand. Backend 404s this in production.

export async function fundWalletIfNeeded(): Promise<void> {
  await api.post('/dev/fund-wallet');
}

// ─── Donation endpoints ───────────────────────────────────────────────────────

export interface DonationRecord {
  id: string;
  tx_hash: string;
  campaign_id: string | null;
  on_chain_campaign_id: number;
  donor_address: string;
  recipient_address: string;
  token_address: string;
  amount_wei: string;
  message: string;
  block_timestamp: string;
  block_number: number;
  created_at: string;
}

// The backend's on-chain event listener indexes donations asynchronously
// (polls the chain every few seconds) — it can lag behind a UserOperation
// that just confirmed. Poll until the donation is actually in the DB before
// declaring the donation flow done, so dashboards don't show stale data.
export async function waitForDonationIndexed(txHash: string): Promise<void> {
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      await api.get<DonationRecord>(`/donations/${txHash}`);
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export async function fetchDonations(params: {
  donor_address?: string;
  recipient_address?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ items: DonationRecord[]; total: number }> {
  const { data } = await api.get<{ items: DonationRecord[]; total: number }>(
    '/donations',
    { params }
  );
  return data;
}

// ─── User endpoints ───────────────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  wallet_address: string;
  fcm_token: string | null;
  username: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchUser(walletAddress: string): Promise<UserRecord> {
  const { data } = await api.get<UserRecord>(`/users/${walletAddress}`);
  return data;
}

// ─── Impact update endpoints ──────────────────────────────────────────────────

export interface ImpactUpdateRecord {
  id: string;
  campaign_id: string;
  message: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  created_at: string;
}

export async function fetchImpactUpdates(params: {
  donor_address?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ items: ImpactUpdateRecord[]; total: number }> {
  const { data } = await api.get<{ items: ImpactUpdateRecord[]; total: number }>(
    '/impact-updates',
    { params }
  );
  return data;
}

export async function fetchCampaignImpactUpdates(
  campaignId: string,
  params: { limit?: number; offset?: number } = {}
): Promise<{ items: ImpactUpdateRecord[]; total: number }> {
  const { data } = await api.get<{ items: ImpactUpdateRecord[]; total: number }>(
    `/campaigns/${campaignId}/impact-updates`,
    { params }
  );
  return data;
}

export async function postImpactUpdate(
  campaignId: string,
  message: string,
  media?: { uri: string; type: 'image' | 'video' }
): Promise<ImpactUpdateRecord> {
  const form = new FormData();
  form.append('message', message);
  if (media) {
    const filename = media.uri.split('/').pop() ?? 'upload';
    form.append('media', {
      uri: media.uri,
      name: filename,
      type: media.type === 'video' ? 'video/mp4' : 'image/jpeg',
    } as unknown as Blob);
  }
  const { data } = await api.post<ImpactUpdateRecord>(
    `/campaigns/${campaignId}/impact-updates`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

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

export async function fetchCampaign(id: string): Promise<Campaign> {
  const { getLocalCampaign } = await import('./localCampaigns');
  const local = getLocalCampaign(id);
  if (local) return local;
  const { data } = await api.get<Campaign>(`/campaigns/${id}`);
  return data;
}

import type { Campaign } from './api';

const store: Campaign[] = [];

export function addLocalCampaign(campaign: Campaign) {
  store.unshift(campaign);
}

export function removeLocalCampaign(id: string) {
  const idx = store.findIndex(c => c.id === id);
  if (idx !== -1) store.splice(idx, 1);
}

export function getLocalCampaigns(): Campaign[] {
  return store;
}

export function getLocalCampaign(id: string): Campaign | undefined {
  return store.find(c => c.id === id);
}

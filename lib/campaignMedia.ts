export type CampaignMediaEntry = { uri: string; type: 'image' | 'video' };

const store = new Map<string, CampaignMediaEntry>();

export function setCampaignMedia(campaignId: string, entry: CampaignMediaEntry) {
  store.set(campaignId, entry);
}

export function getCampaignMedia(campaignId: string): CampaignMediaEntry | undefined {
  return store.get(campaignId);
}

export function removeCampaignMedia(campaignId: string) {
  store.delete(campaignId);
}

// USDC has 6 decimals — 1_000_000 wei = $1.00 USDC
export function formatUsdc(weiStr: string): string {
  const dollars = Math.floor(parseInt(weiStr, 10) / 1_000_000);
  if (dollars >= 10_000) return `$${(dollars / 1000).toFixed(0)}k`;
  if (dollars >= 1_000) {
    const formatted = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `$${formatted}`;
  }
  return `$${dollars}`;
}

export function usdcPercent(raisedWei: string, goalWei: string): number {
  const goal = parseInt(goalWei, 10);
  if (!goal) return 0;
  return Math.min(100, Math.round((parseInt(raisedWei, 10) / goal) * 100));
}

export function shortenAddress(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatMonthYear(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Used on campaign cards (Changes1.txt items 1f/1g) to show how long until a
// campaign's deadline. Returns null when there's no deadline set at all (8 of
// 15 campaigns as of 2026-09-27) so callers can hide the line entirely rather
// than show a misleading date.
export function formatTimeLeft(deadline: string | null): string | null {
  if (!deadline) return null;
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs <= 0) return 'Deadline passed';
  const days = Math.ceil(diffMs / 86_400_000);
  if (days === 1) return '1 day left';
  if (days < 30) return `${days} days left`;
  const months = Math.round(days / 30.44);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} left`;
  const years = Math.round(days / 365.25);
  return `${years} year${years === 1 ? '' : 's'} left`;
}

export function formatTimeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

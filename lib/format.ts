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

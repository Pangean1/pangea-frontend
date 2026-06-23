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

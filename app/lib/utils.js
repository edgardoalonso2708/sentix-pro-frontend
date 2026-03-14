// ═══════════════════════════════════════════════════════════════════════════════
// SENTIX PRO — Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

import { colors } from './theme';

export function getSignalFreshness(signal) {
  if (!signal.timestamp) return { label: '—', color: colors.muted, opacity: 1 };
  const ageMs = Date.now() - new Date(signal.timestamp).getTime();
  const ageMin = Math.round(ageMs / 60000);
  const label = ageMin < 1 ? 'just now' : ageMin < 60 ? `${ageMin}m ago` : `${Math.round(ageMin / 60)}h ago`;
  const freshness = signal.freshness || 'fresh';
  const cfg = {
    fresh:   { color: colors.green, opacity: 1.0 },
    aging:   { color: colors.amber, opacity: 0.85 },
    stale:   { color: colors.red,   opacity: 0.65 },
    expired: { color: colors.muted, opacity: 0.45 },
  };
  return { label, ageMin, ...(cfg[freshness] || cfg.fresh) };
}

export function formatPrice(price) {
  if (!price) return '$0';
  if (price >= 1000) return `$${price.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

export function formatLargeNumber(num) {
  if (!num) return '$0';
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toFixed(2)}`;
}

export function computePaperEquityCurve(trades, initialCapital) {
  if (!trades || trades.length === 0) return [];
  const sorted = [...trades]
    .filter(t => t.exit_at && t.realized_pnl != null)
    .sort((a, b) => new Date(a.exit_at) - new Date(b.exit_at));
  if (sorted.length === 0) return [];

  let cumulative = initialCapital;
  let peak = initialCapital;
  const curve = [{
    date: sorted[0].entry_at ? new Date(sorted[0].entry_at).toLocaleDateString('es', { month: 'short', day: 'numeric' }) : 'Start',
    equity: initialCapital,
    drawdown: 0
  }];
  for (const trade of sorted) {
    cumulative += parseFloat(trade.realized_pnl);
    if (cumulative > peak) peak = cumulative;
    const dd = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
    curve.push({
      date: new Date(trade.exit_at).toLocaleDateString('es', { month: 'short', day: 'numeric' }),
      equity: Math.round(cumulative * 100) / 100,
      drawdown: Math.round(dd * 100) / 100
    });
  }
  return curve;
}

export function computeDailyPnl(trades) {
  if (!trades || trades.length === 0) return [];
  const dailyMap = {};
  for (const t of trades) {
    if (!t.exit_at || t.realized_pnl == null) continue;
    const day = new Date(t.exit_at).toLocaleDateString('es', { month: 'short', day: 'numeric' });
    if (!dailyMap[day]) dailyMap[day] = { date: day, pnl: 0, trades: 0 };
    dailyMap[day].pnl += parseFloat(t.realized_pnl);
    dailyMap[day].trades += 1;
  }
  return Object.values(dailyMap).map(d => ({
    ...d,
    pnl: Math.round(d.pnl * 100) / 100
  }));
}

export function computeAssetPerformance(trades) {
  if (!trades || trades.length === 0) return [];
  const assetMap = {};
  for (const t of trades) {
    if (t.realized_pnl == null) continue;
    const asset = t.asset || 'Unknown';
    if (!assetMap[asset]) assetMap[asset] = { asset, wins: 0, losses: 0, totalPnl: 0 };
    if (parseFloat(t.realized_pnl) > 0) {
      assetMap[asset].wins += 1;
    } else {
      assetMap[asset].losses += 1;
    }
    assetMap[asset].totalPnl += parseFloat(t.realized_pnl);
  }
  return Object.values(assetMap)
    .sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))
    .slice(0, 10)
    .map(d => ({ ...d, totalPnl: Math.round(d.totalPnl * 100) / 100 }));
}

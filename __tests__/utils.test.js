import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSignalFreshness,
  formatPrice,
  formatLargeNumber,
  computePaperEquityCurve,
  computeDailyPnl,
  computeAssetPerformance,
} from '../app/lib/utils';
import { colors } from '../app/lib/theme';

// ─── formatPrice ──────────────────────────────────────────────────────────────
describe('formatPrice', () => {
  it('returns $0 for falsy values', () => {
    expect(formatPrice(0)).toBe('$0');
    expect(formatPrice(null)).toBe('$0');
    expect(formatPrice(undefined)).toBe('$0');
  });

  it('formats prices >= 1000 with no decimals', () => {
    // toLocaleString separator is locale-dependent (comma or dot)
    expect(formatPrice(1000)).toMatch(/^\$1[.,]000$/);
    expect(formatPrice(65432)).toMatch(/^\$65[.,]432$/);
  });

  it('formats prices >= 1 with 2 decimals', () => {
    expect(formatPrice(1)).toBe('$1.00');
    expect(formatPrice(99.999)).toBe('$100.00');
    expect(formatPrice(5.5)).toBe('$5.50');
  });

  it('formats prices < 1 with 4 decimals', () => {
    expect(formatPrice(0.1234)).toBe('$0.1234');
    expect(formatPrice(0.00056789)).toBe('$0.0006');
  });
});

// ─── formatLargeNumber ────────────────────────────────────────────────────────
describe('formatLargeNumber', () => {
  it('returns $0 for falsy values', () => {
    expect(formatLargeNumber(0)).toBe('$0');
    expect(formatLargeNumber(null)).toBe('$0');
    expect(formatLargeNumber(undefined)).toBe('$0');
  });

  it('formats trillions', () => {
    expect(formatLargeNumber(1.5e12)).toBe('$1.50T');
    expect(formatLargeNumber(2.34e12)).toBe('$2.34T');
  });

  it('formats billions', () => {
    expect(formatLargeNumber(3.21e9)).toBe('$3.21B');
  });

  it('formats millions', () => {
    expect(formatLargeNumber(45.6e6)).toBe('$45.60M');
  });

  it('formats numbers below 1M with 2 decimals', () => {
    expect(formatLargeNumber(12345.678)).toBe('$12345.68');
  });
});

// ─── getSignalFreshness ───────────────────────────────────────────────────────
describe('getSignalFreshness', () => {
  it('returns dash label when no timestamp', () => {
    const result = getSignalFreshness({});
    expect(result.label).toBe('—');
    expect(result.color).toBe(colors.muted);
  });

  it('returns "just now" for very recent signal', () => {
    const result = getSignalFreshness({
      timestamp: new Date().toISOString(),
      freshness: 'fresh',
    });
    expect(result.label).toBe('just now');
    expect(result.color).toBe(colors.green);
    expect(result.opacity).toBe(1.0);
  });

  it('returns minutes ago label', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    const result = getSignalFreshness({ timestamp: fiveMinAgo, freshness: 'aging' });
    expect(result.label).toBe('5m ago');
    expect(result.color).toBe(colors.amber);
    expect(result.opacity).toBe(0.85);
  });

  it('returns hours ago label', () => {
    const twoHoursAgo = new Date(Date.now() - 120 * 60000).toISOString();
    const result = getSignalFreshness({ timestamp: twoHoursAgo, freshness: 'stale' });
    expect(result.label).toBe('2h ago');
    expect(result.color).toBe(colors.red);
    expect(result.opacity).toBe(0.65);
  });

  it('defaults to fresh config if freshness is unknown', () => {
    const result = getSignalFreshness({
      timestamp: new Date().toISOString(),
      freshness: 'unknown_value',
    });
    expect(result.color).toBe(colors.green);
    expect(result.opacity).toBe(1.0);
  });

  it('defaults to fresh when freshness field is missing', () => {
    const result = getSignalFreshness({
      timestamp: new Date().toISOString(),
    });
    expect(result.color).toBe(colors.green);
  });
});

// ─── computePaperEquityCurve ──────────────────────────────────────────────────
describe('computePaperEquityCurve', () => {
  it('returns empty array for null/empty trades', () => {
    expect(computePaperEquityCurve(null, 10000)).toEqual([]);
    expect(computePaperEquityCurve([], 10000)).toEqual([]);
  });

  it('filters out trades without exit_at or realized_pnl', () => {
    const trades = [
      { entry_at: '2024-01-01', exit_at: null, realized_pnl: 100 },
      { entry_at: '2024-01-01', exit_at: '2024-01-02', realized_pnl: null },
    ];
    expect(computePaperEquityCurve(trades, 10000)).toEqual([]);
  });

  it('computes equity curve with drawdown', () => {
    const trades = [
      { entry_at: '2024-01-01', exit_at: '2024-01-02', realized_pnl: '500' },
      { entry_at: '2024-01-02', exit_at: '2024-01-03', realized_pnl: '-200' },
      { entry_at: '2024-01-03', exit_at: '2024-01-04', realized_pnl: '300' },
    ];
    const curve = computePaperEquityCurve(trades, 10000);

    // Initial point + 3 trades = 4 data points
    expect(curve).toHaveLength(4);
    expect(curve[0].equity).toBe(10000);
    expect(curve[0].drawdown).toBe(0);
    expect(curve[1].equity).toBe(10500);
    expect(curve[2].equity).toBe(10300);
    // Drawdown after losing: (10500 - 10300) / 10500 * 100
    expect(curve[2].drawdown).toBeCloseTo(1.90, 1);
    expect(curve[3].equity).toBe(10600);
  });

  it('sorts trades by exit_at', () => {
    const trades = [
      { entry_at: '2024-01-03', exit_at: '2024-01-04', realized_pnl: '100' },
      { entry_at: '2024-01-01', exit_at: '2024-01-02', realized_pnl: '200' },
    ];
    const curve = computePaperEquityCurve(trades, 5000);
    // Should process 200 first, then 100
    expect(curve[1].equity).toBe(5200);
    expect(curve[2].equity).toBe(5300);
  });
});

// ─── computeDailyPnl ─────────────────────────────────────────────────────────
describe('computeDailyPnl', () => {
  it('returns empty array for null/empty trades', () => {
    expect(computeDailyPnl(null)).toEqual([]);
    expect(computeDailyPnl([])).toEqual([]);
  });

  it('skips trades without exit_at or realized_pnl', () => {
    const trades = [
      { exit_at: null, realized_pnl: 100 },
      { exit_at: '2024-01-01', realized_pnl: null },
    ];
    expect(computeDailyPnl(trades)).toEqual([]);
  });

  it('aggregates trades on the same day', () => {
    const trades = [
      { exit_at: '2024-01-15T10:00:00Z', realized_pnl: '100.50' },
      { exit_at: '2024-01-15T14:00:00Z', realized_pnl: '-30.25' },
      { exit_at: '2024-01-16T10:00:00Z', realized_pnl: '50' },
    ];
    const result = computeDailyPnl(trades);
    expect(result).toHaveLength(2);

    // Find Jan 15 entry
    const jan15 = result.find(d => d.trades === 2);
    expect(jan15).toBeDefined();
    expect(jan15.pnl).toBeCloseTo(70.25, 2);
    expect(jan15.trades).toBe(2);

    const jan16 = result.find(d => d.trades === 1);
    expect(jan16).toBeDefined();
    expect(jan16.pnl).toBe(50);
  });
});

// ─── computeAssetPerformance ──────────────────────────────────────────────────
describe('computeAssetPerformance', () => {
  it('returns empty array for null/empty trades', () => {
    expect(computeAssetPerformance(null)).toEqual([]);
    expect(computeAssetPerformance([])).toEqual([]);
  });

  it('skips trades without realized_pnl', () => {
    const trades = [{ asset: 'bitcoin', realized_pnl: null }];
    expect(computeAssetPerformance(trades)).toEqual([]);
  });

  it('groups by asset and counts wins/losses', () => {
    const trades = [
      { asset: 'bitcoin', realized_pnl: '100' },
      { asset: 'bitcoin', realized_pnl: '-50' },
      { asset: 'ethereum', realized_pnl: '200' },
    ];
    const result = computeAssetPerformance(trades);
    expect(result).toHaveLength(2);

    const btc = result.find(d => d.asset === 'bitcoin');
    expect(btc.wins).toBe(1);
    expect(btc.losses).toBe(1);
    expect(btc.totalPnl).toBe(50);

    const eth = result.find(d => d.asset === 'ethereum');
    expect(eth.wins).toBe(1);
    expect(eth.losses).toBe(0);
    expect(eth.totalPnl).toBe(200);
  });

  it('sorts by total trade count descending', () => {
    const trades = [
      { asset: 'bitcoin', realized_pnl: '10' },
      { asset: 'ethereum', realized_pnl: '10' },
      { asset: 'ethereum', realized_pnl: '10' },
      { asset: 'ethereum', realized_pnl: '10' },
    ];
    const result = computeAssetPerformance(trades);
    expect(result[0].asset).toBe('ethereum');
    expect(result[1].asset).toBe('bitcoin');
  });

  it('caps at 10 assets', () => {
    const trades = Array.from({ length: 15 }, (_, i) => ({
      asset: `asset-${i}`,
      realized_pnl: '10',
    }));
    expect(computeAssetPerformance(trades)).toHaveLength(10);
  });

  it('uses "Unknown" for missing asset field', () => {
    const trades = [{ realized_pnl: '100' }];
    const result = computeAssetPerformance(trades);
    expect(result[0].asset).toBe('Unknown');
  });
});

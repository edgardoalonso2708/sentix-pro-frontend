import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock authFetch
const mockAuthFetch = vi.fn();
vi.mock('../app/lib/api', () => ({
  authFetch: (...args) => mockAuthFetch(...args),
}));

import { useBacktest } from '../app/hooks/useBacktest';

const API = 'http://localhost:3001';
const USER = 'user-123';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useBacktest', () => {
  it('initializes with default config', () => {
    const { result } = renderHook(() => useBacktest(API, USER));

    expect(result.current.config.asset).toBe('bitcoin');
    expect(result.current.config.days).toBe(90);
    expect(result.current.config.capital).toBe(10000);
    expect(result.current.running).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBe(0);
  });

  it('updates config via setConfig', () => {
    const { result } = renderHook(() => useBacktest(API, USER));

    act(() => {
      result.current.setConfig(prev => ({ ...prev, asset: 'ethereum', days: 30 }));
    });

    expect(result.current.config.asset).toBe('ethereum');
    expect(result.current.config.days).toBe(30);
  });

  // ─── loadHistory ──────────────────────────────────────────────────────────
  describe('loadHistory', () => {
    it('fetches and sets history', async () => {
      const historyData = [
        { id: '1', status: 'completed', created_at: new Date().toISOString() },
        { id: '2', status: 'completed', created_at: new Date().toISOString() },
      ];
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(historyData),
      });

      const { result } = renderHook(() => useBacktest(API, USER));

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(mockAuthFetch).toHaveBeenCalledWith(`${API}/api/backtest/history/${USER}`);
      expect(result.current.history).toHaveLength(2);
    });

    it('marks stale running backtests as failed', async () => {
      const staleTime = new Date(Date.now() - 20 * 60 * 1000).toISOString(); // 20 min ago
      const historyData = [
        { id: '1', status: 'running', created_at: staleTime },
      ];
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(historyData),
      });

      const { result } = renderHook(() => useBacktest(API, USER));

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(result.current.history[0].status).toBe('failed');
      expect(result.current.history[0].error_message).toBe('Timed out');
    });
  });

  // ─── run ──────────────────────────────────────────────────────────────────
  describe('run', () => {
    it('posts config and starts polling on success', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'bt-42' }),
      });

      const { result } = renderHook(() => useBacktest(API, USER));

      await act(async () => {
        await result.current.run();
      });

      expect(result.current.running).toBe(true);
      expect(mockAuthFetch).toHaveBeenCalledWith(
        `${API}/api/backtest/run`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('sets error on failed launch', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Rate limited' }),
      });

      const { result } = renderHook(() => useBacktest(API, USER));

      await act(async () => {
        await result.current.run();
      });

      expect(result.current.running).toBe(false);
      expect(result.current.error).toBe('Rate limited');
    });
  });

  // ─── loadHistoricResult ───────────────────────────────────────────────────
  describe('loadHistoricResult', () => {
    it('loads and sets result', async () => {
      const btResult = { status: 'completed', trades: [], metrics: {} };
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(btResult),
      });

      const { result } = renderHook(() => useBacktest(API, USER));

      await act(async () => {
        await result.current.loadHistoricResult('bt-99');
      });

      expect(mockAuthFetch).toHaveBeenCalledWith(`${API}/api/backtest/results/bt-99`);
      expect(result.current.result).toEqual(btResult);
      expect(result.current.tradesPage).toBe(0);
    });
  });

  // ─── deleteSelected ───────────────────────────────────────────────────────
  describe('deleteSelected', () => {
    it('deletes selected items and reloads history', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });

      const { result } = renderHook(() => useBacktest(API, USER));

      act(() => {
        result.current.setSelected(new Set(['bt-1', 'bt-2']));
      });

      await act(async () => {
        await result.current.deleteSelected();
      });

      // 2 DELETE calls + 1 loadHistory call
      const deleteCalls = mockAuthFetch.mock.calls.filter(
        c => c[1]?.method === 'DELETE'
      );
      expect(deleteCalls).toHaveLength(2);
      expect(result.current.selected.size).toBe(0);
    });

    it('does nothing when no items selected', async () => {
      const { result } = renderHook(() => useBacktest(API, USER));

      await act(async () => {
        await result.current.deleteSelected();
      });

      expect(mockAuthFetch).not.toHaveBeenCalled();
    });
  });

  // ─── inheritFromPaperConfig ───────────────────────────────────────────────
  describe('inheritFromPaperConfig', () => {
    it('merges paper config fields into backtest config', () => {
      const { result } = renderHook(() => useBacktest(API, USER));

      act(() => {
        result.current.inheritFromPaperConfig({
          risk_per_trade: 0.03,
          min_confluence: 3,
          min_rr_ratio: 2.0,
          allowed_strength: ['STRONG BUY'],
        });
      });

      expect(result.current.config.riskPerTrade).toBe(0.03);
      expect(result.current.config.minConfluence).toBe(3);
      expect(result.current.config.minRR).toBe(2.0);
      expect(result.current.config.allowedStrength).toEqual(['STRONG BUY']);
      expect(result.current.inherited).toBe(true);
    });

    it('does nothing when paperConfigForm is null', () => {
      const { result } = renderHook(() => useBacktest(API, USER));
      const before = { ...result.current.config };

      act(() => {
        result.current.inheritFromPaperConfig(null);
      });

      expect(result.current.config.riskPerTrade).toBe(before.riskPerTrade);
      expect(result.current.inherited).toBe(false);
    });
  });
});

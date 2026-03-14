import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock authFetch
const mockAuthFetch = vi.fn();
vi.mock('../app/lib/api', () => ({
  authFetch: (...args) => mockAuthFetch(...args),
}));

import { useOptimization } from '../app/hooks/useOptimization';

const API = 'http://localhost:3001';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useOptimization', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useOptimization(API));

    expect(result.current.optConfig.asset).toBe('bitcoin');
    expect(result.current.optConfig.days).toBe(90);
    expect(result.current.optRunning).toBe(false);
    expect(result.current.optResult).toBeNull();
    expect(result.current.optError).toBeNull();
    expect(result.current.optParams).toEqual([]);
    expect(result.current.optHistory).toEqual([]);
  });

  // ─── loadOptParams ──────────────────────────────────────────────────────
  describe('loadOptParams', () => {
    it('fetches and sets params, auto-selects first', async () => {
      const params = [
        { key: 'minConfluence', label: 'Min Confluence' },
        { key: 'minRR', label: 'Min R:R' },
      ];
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ params }),
      });

      const { result } = renderHook(() => useOptimization(API));

      await act(async () => {
        await result.current.loadOptParams();
      });

      expect(mockAuthFetch).toHaveBeenCalledWith(`${API}/api/optimize/params`);
      expect(result.current.optParams).toEqual(params);
      expect(result.current.optConfig.paramName).toBe('minConfluence');
    });

    it('handles fetch failure gracefully', async () => {
      mockAuthFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useOptimization(API));

      await act(async () => {
        await result.current.loadOptParams();
      });

      expect(result.current.optParams).toEqual([]);
    });
  });

  // ─── loadOptHistory ─────────────────────────────────────────────────────
  describe('loadOptHistory', () => {
    it('fetches and sets optimization history', async () => {
      const history = [{ id: '1', param: 'minRR', best: 2.0 }];
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(history),
      });

      const { result } = renderHook(() => useOptimization(API));

      await act(async () => {
        await result.current.loadOptHistory();
      });

      expect(result.current.optHistory).toEqual(history);
    });
  });

  // ─── loadAutoTuneData ───────────────────────────────────────────────────
  describe('loadAutoTuneData', () => {
    it('fetches history, config, and pending in parallel', async () => {
      mockAuthFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ history: [{ id: 'at-1' }] }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ isRunning: true }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ pending: [{ param: 'x' }] }) });

      const { result } = renderHook(() => useOptimization(API));

      await act(async () => {
        await result.current.loadAutoTuneData();
      });

      expect(result.current.autoTuneHistory).toEqual([{ id: 'at-1' }]);
      expect(result.current.autoTuneRunning).toBe(true);
      expect(result.current.autoTunePending).toEqual([{ param: 'x' }]);
    });
  });

  // ─── runOptimize ────────────────────────────────────────────────────────
  describe('runOptimize', () => {
    it('posts config and starts polling', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'opt-42' }),
      });

      const { result } = renderHook(() => useOptimization(API));

      await act(async () => {
        await result.current.runOptimize();
      });

      expect(result.current.optRunning).toBe(true);
      expect(mockAuthFetch).toHaveBeenCalledWith(
        `${API}/api/optimize/run`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('sets error on failed launch', async () => {
      mockAuthFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid param' }),
      });

      const { result } = renderHook(() => useOptimization(API));

      await act(async () => {
        await result.current.runOptimize();
      });

      expect(result.current.optRunning).toBe(false);
      expect(result.current.optError).toBe('Invalid param');
    });
  });

  // ─── applyResult ────────────────────────────────────────────────────────
  describe('applyResult', () => {
    it('applies best value and reloads auto-tune data', async () => {
      // Setup: first set a result
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ history: [], pending: [] }),
      });

      const { result } = renderHook(() => useOptimization(API));

      // Manually set optResult
      act(() => {
        result.current.setOptResult({ bestValue: 3, paramKey: 'minConfluence', paramLabel: 'Min Confluence' });
      });

      mockAuthFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      let applyResponse;
      await act(async () => {
        applyResponse = await result.current.applyResult();
      });

      expect(applyResponse.success).toBe(true);
      expect(applyResponse.message).toContain('Min Confluence');
    });
  });

  // ─── setOptConfig ───────────────────────────────────────────────────────
  describe('setOptConfig', () => {
    it('updates optimization config', () => {
      const { result } = renderHook(() => useOptimization(API));

      act(() => {
        result.current.setOptConfig({ asset: 'ethereum', days: 60, paramName: 'minRR' });
      });

      expect(result.current.optConfig.asset).toBe('ethereum');
      expect(result.current.optConfig.days).toBe(60);
    });
  });
});

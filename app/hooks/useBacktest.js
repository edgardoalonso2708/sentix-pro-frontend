'use client';
import { useState, useCallback, useEffect } from 'react';
import { authFetch } from '../lib/api';

export function useBacktest(apiUrl, userId) {
  const [config, setConfig] = useState({
    asset: 'bitcoin', days: 90, capital: 10000, riskPerTrade: 0.02,
    minConfluence: 2, minRR: 1.5, stepInterval: '4h',
    allowedStrength: ['STRONG BUY', 'STRONG SELL'], cooldownBars: 6,
    kellySizing: {
      kelly: { enabled: false, fraction: 0.5, minTrades: 20 },
      volatilityTargeting: { enabled: false, targetATRPercent: 2.0 }
    }
  });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [polling, setPolling] = useState(null);
  const [progress, setProgress] = useState(0);
  const [tradesPage, setTradesPage] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [strategyOverrides, setStrategyOverrides] = useState({});
  const [inherited, setInherited] = useState(false);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (polling) clearInterval(polling); };
  }, [polling]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await authFetch(`${apiUrl}/api/backtest/history/${userId}`);
      if (res.ok) {
        const data = await res.json();
        const STALE_MS = 15 * 60 * 1000;
        const now = Date.now();
        const cleaned = data.map(bt => {
          if (bt.status === 'running' && bt.created_at && (now - new Date(bt.created_at).getTime()) > STALE_MS) {
            return { ...bt, status: 'failed', error_message: 'Timed out' };
          }
          return bt;
        });
        setHistory(cleaned);
      }
    } catch (e) { console.error('Backtest history fetch error', e); }
  }, [apiUrl, userId]);

  const pollResults = useCallback((id) => {
    let errorCount = 0;
    const MAX_ERRORS = 10;
    const startTime = Date.now();
    const POLL_TIMEOUT = 12 * 60 * 1000;

    const stopPolling = (reason) => {
      clearInterval(interval);
      setPolling(null);
      setRunning(false);
      if (reason) setError(reason);
    };

    const interval = setInterval(async () => {
      if (Date.now() - startTime > POLL_TIMEOUT) {
        stopPolling('Backtest timed out (12 min). Revisa el servidor.');
        loadHistory();
        return;
      }
      try {
        const res = await authFetch(`${apiUrl}/api/backtest/results/${id}`);
        if (!res.ok) {
          errorCount++;
          if (errorCount >= MAX_ERRORS) {
            stopPolling(`Backend no responde (${errorCount} errores consecutivos)`);
            loadHistory();
          }
          return;
        }
        errorCount = 0;
        const data = await res.json();
        setProgress(data.progress || 0);

        if (data.status === 'completed') {
          stopPolling(null);
          setResult(data);
          setProgress(100);
          loadHistory();
        } else if (data.status === 'failed') {
          stopPolling(data.error_message || 'Backtest failed');
          loadHistory();
        }
      } catch (e) {
        errorCount++;
        if (errorCount >= MAX_ERRORS) {
          stopPolling('Conexion perdida con el backend');
          loadHistory();
        }
      }
    }, 4000);
    setPolling(interval);
  }, [apiUrl, loadHistory]);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setTradesPage(0);

    try {
      const res = await authFetch(`${apiUrl}/api/backtest/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          userId,
          strategyConfig: Object.keys(strategyOverrides).length > 0 ? strategyOverrides : undefined
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to launch backtest');
      }
      const { id } = await res.json();
      pollResults(id);
    } catch (e) {
      setRunning(false);
      setError(e.message);
    }
  }, [apiUrl, userId, config, strategyOverrides, pollResults]);

  const loadHistoricResult = useCallback(async (id) => {
    try {
      const res = await authFetch(`${apiUrl}/api/backtest/results/${id}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setTradesPage(0);
      }
    } catch (e) { console.error('Error loading backtest result', e); }
  }, [apiUrl]);

  const deleteSelected = useCallback(async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      for (const id of selected) {
        await authFetch(`${apiUrl}/api/backtest/results/${id}`, { method: 'DELETE' });
      }
      setSelected(new Set());
      loadHistory();
    } catch (e) { console.error('Delete error', e); }
    setDeleting(false);
  }, [apiUrl, selected, loadHistory]);

  // Inherit config from paper trading config
  const inheritFromPaperConfig = useCallback((paperConfigForm) => {
    if (!paperConfigForm) return;
    setConfig(prev => ({
      ...prev,
      riskPerTrade: paperConfigForm.risk_per_trade ?? prev.riskPerTrade,
      minConfluence: paperConfigForm.min_confluence ?? prev.minConfluence,
      minRR: paperConfigForm.min_rr_ratio ?? prev.minRR,
      allowedStrength: paperConfigForm.allowed_strength ?? prev.allowedStrength,
    }));
    setInherited(true);
  }, []);

  return {
    config, setConfig, running, result, setResult, history, error, progress,
    tradesPage, setTradesPage, selected, setSelected, deleting,
    strategyOverrides, setStrategyOverrides, inherited, setInherited,
    run, loadHistoricResult, loadHistory, deleteSelected, inheritFromPaperConfig,
  };
}

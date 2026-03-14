'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { authFetch } from '../lib/api';

export function useOptimization(apiUrl) {
  const [optParams, setOptParams] = useState([]);
  const [optConfig, setOptConfig] = useState({ asset: 'bitcoin', days: 90, paramName: '' });
  const [optPhase, setOptPhase] = useState(0);
  const [optRunning, setOptRunning] = useState(false);
  const [optResult, setOptResult] = useState(null);
  const [optError, setOptError] = useState(null);
  const [optProgress, setOptProgress] = useState({ current: 0, total: 0, message: '' });
  const [optHistory, setOptHistory] = useState([]);
  const [optApplying, setOptApplying] = useState(false);
  const [showSignalParams, setShowSignalParams] = useState(false);

  // Auto-tune state
  const [autoTuneHistory, setAutoTuneHistory] = useState([]);
  const [autoTuneConfig, setAutoTuneConfig] = useState(null);
  const [autoTuneRunning, setAutoTuneRunning] = useState(false);
  const [autoTuneExpanded, setAutoTuneExpanded] = useState(true);
  const [autoTunePending, setAutoTunePending] = useState([]);

  const pollRef = useRef(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const loadOptParams = useCallback(async () => {
    try {
      const res = await authFetch(`${apiUrl}/api/optimize/params`);
      if (res.ok) {
        const data = await res.json();
        setOptParams(data.params || []);
        if (data.params?.length > 0) {
          setOptConfig(c => c.paramName ? c : { ...c, paramName: data.params[0].key });
        }
      }
    } catch (e) { console.error('Optimize params fetch error', e); }
  }, [apiUrl]);

  const loadOptHistory = useCallback(async () => {
    try {
      const res = await authFetch(`${apiUrl}/api/optimize/history`);
      if (res.ok) {
        const data = await res.json();
        setOptHistory(data);
      }
    } catch (e) { console.error('Optimize history fetch error', e); }
  }, [apiUrl]);

  const loadAutoTuneData = useCallback(async () => {
    try {
      const [histRes, cfgRes, pendRes] = await Promise.all([
        authFetch(`${apiUrl}/api/autotune/history?limit=10`),
        authFetch(`${apiUrl}/api/autotune/config`),
        authFetch(`${apiUrl}/api/autotune/pending`),
      ]);
      if (histRes.ok) {
        const d = await histRes.json();
        setAutoTuneHistory(d.history || []);
      }
      if (cfgRes.ok) {
        const d = await cfgRes.json();
        setAutoTuneConfig(d);
        setAutoTuneRunning(d.isRunning || false);
      }
      if (pendRes.ok) {
        const d = await pendRes.json();
        setAutoTunePending(d.pending || []);
      }
    } catch (e) { console.error('Auto-tune data fetch error', e); }
  }, [apiUrl]);

  const pollOptStatus = useCallback((jobId) => {
    const interval = setInterval(async () => {
      try {
        const res = await authFetch(`${apiUrl}/api/optimize/status/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();

        setOptProgress({
          current: data.current || 0,
          total: data.total || 0,
          message: data.message || ''
        });

        if (data.status === 'completed') {
          clearInterval(interval);
          pollRef.current = null;
          setOptRunning(false);
          setOptResult(data.result);
          setOptProgress({ current: 0, total: 0, message: 'Completado' });
          loadOptHistory();
        } else if (data.status === 'error') {
          clearInterval(interval);
          pollRef.current = null;
          setOptRunning(false);
          setOptError(data.error || 'Optimization failed');
        }
      } catch (e) { /* continue polling */ }
    }, 3000);
    pollRef.current = interval;
  }, [apiUrl, loadOptHistory]);

  const runOptimize = useCallback(async () => {
    setOptRunning(true);
    setOptError(null);
    setOptResult(null);
    setOptProgress({ current: 0, total: 0, message: 'Iniciando...' });

    try {
      const res = await authFetch(`${apiUrl}/api/optimize/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optConfig)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start optimization');
      }
      const { jobId } = await res.json();
      pollOptStatus(jobId);
    } catch (e) {
      setOptRunning(false);
      setOptError(e.message);
    }
  }, [apiUrl, optConfig, pollOptStatus]);

  const applyResult = useCallback(async () => {
    if (!optResult?.bestValue === undefined) return;
    setOptApplying(true);
    try {
      const applyRes = await authFetch(`${apiUrl}/api/autotune/apply-param`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paramName: optResult.paramKey || optConfig.paramName,
          value: optResult.bestValue,
          source: 'optimizer'
        })
      });
      if (applyRes.ok) {
        loadAutoTuneData();
        return { success: true, message: `${optResult.paramLabel || optConfig.paramName} = ${optResult.bestValue} aplicado a la estrategia` };
      } else {
        const err = await applyRes.json();
        return { success: false, message: err.error };
      }
    } catch (e) {
      return { success: false, message: e.message };
    } finally {
      setOptApplying(false);
    }
  }, [apiUrl, optResult, optConfig, loadAutoTuneData]);

  return {
    optParams, optConfig, setOptConfig, optPhase, setOptPhase,
    optRunning, optResult, setOptResult, optError, optProgress, optHistory,
    optApplying, showSignalParams, setShowSignalParams,
    autoTuneHistory, autoTuneConfig, autoTuneRunning,
    autoTuneExpanded, setAutoTuneExpanded, autoTunePending,
    loadOptParams, loadOptHistory, loadAutoTuneData,
    runOptimize, applyResult,
  };
}

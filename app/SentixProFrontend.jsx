'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from 'next/navigation';
import { useSSE } from './hooks/useSSE';
import { useAuth } from './contexts/AuthContext';
import { authFetch } from './lib/api';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine
} from 'recharts';

// Extracted tabs
import GuideTab from './components/tabs/GuideTab';
import BacktestTab from './components/tabs/BacktestTab';
import OptimizeTab from './components/tabs/OptimizeTab';
import SignalsTab from './components/tabs/SignalsTab';
import AlertsTab from './components/tabs/AlertsTab';
import APMTab from './components/tabs/APMTab';
import DashboardTab from './components/tabs/DashboardTab';
import PortfolioTab from './components/tabs/PortfolioTab';
import ExecutionTab from './components/tabs/ExecutionTab';

// Custom hooks
import { useBacktest } from './hooks/useBacktest';
import { useOptimization } from './hooks/useOptimization';

// Shared modules
import { SHARED_ASSETS, SHARED_DAY_OPTIONS } from './lib/constants';
import { colors, card, sTitle } from './lib/theme';
import { getSignalFreshness, formatPrice, formatLargeNumber, computePaperEquityCurve, computeDailyPnl, computeAssetPerformance } from './lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// SENTIX PRO - FRONTEND COMPLETO
// Dashboard, Señales, Portfolio, Alertas - Versión Full
// ═══════════════════════════════════════════════════════════════════════════════

export default function SentixProFrontend() {
  
  // ─── CONFIGURATION ─────────────────────────────────────────────────────────
  const rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
  const API_URL = rawApiUrl.startsWith('http') ? rawApiUrl : `https://${rawApiUrl}`;
  
  // ─── STATE ─────────────────────────────────────────────────────────────────
  const [marketData, setMarketData] = useState(null);
  const [signals, setSignals] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tab, setTab] = useState("dashboard");
  
  // Alert config
  const [alertConfig, setAlertConfig] = useState({
    email: "edgardoalonso2708@gmail.com",
    telegramEnabled: false,
    minConfidence: 75,
  });

  // Portfolio & Wallets
  const [portfolio, setPortfolio] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const { userId: authUserId, authEnabled, loading: authLoading, user: authUser, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const USER_ID = authUserId || 'default-user';

  // Redirect to login if auth is enabled but no session
  useEffect(() => {
    if (!authLoading && authEnabled && !authUser) {
      router.push('/auth');
    }
  }, [authLoading, authEnabled, authUser, router]);

  // ─── SHARED CONSTANTS (imported from lib/constants.js) ────────────────────

  // Paper Trading
  const [paperConfig, setPaperConfig] = useState(null);
  const [paperPositions, setPaperPositions] = useState([]);
  const [paperHistory, setPaperHistory] = useState([]);
  const [paperMetrics, setPaperMetrics] = useState(null);
  const [correlationData, setCorrelationData] = useState(null);
  const [paperLoading, setPaperLoading] = useState(false);
  const [paperShowConfig, setPaperShowConfig] = useState(false);
  const [paperConfigForm, setPaperConfigForm] = useState(null);
  const [paperSavingConfig, setPaperSavingConfig] = useState(false);
  const [paperClosingTrade, setPaperClosingTrade] = useState(null);
  const [paperHistoryPage, setPaperHistoryPage] = useState(0);
  const [paperHistoryTotal, setPaperHistoryTotal] = useState(0);
  const [paperConfirmReset, setPaperConfirmReset] = useState(false);

  // Execution system
  const [execOrders, setExecOrders] = useState([]);
  const [execRiskDashboard, setExecRiskDashboard] = useState(null);
  const [execAuditLog, setExecAuditLog] = useState([]);
  const [execKillSwitchActive, setExecKillSwitchActive] = useState(false);
  const [execMode, setExecMode] = useState('paper');
  const [execAutoExecute, setExecAutoExecute] = useState(true);
  const [execLoading, setExecLoading] = useState(false);
  const [execSubTab, setExecSubTab] = useState('dashboard'); // dashboard | positions | history | risk | orders | audit
  const [strategySubTab, setStrategySubTab] = useState('config'); // config | backtest | optimize
  const [execFeedback, setExecFeedback] = useState(null); // { type: 'success'|'error', message }
  const [execManualOrdersEnabled, setExecManualOrdersEnabled] = useState(false); // manual order entry OFF by default

  // Advanced Performance
  const [advancedPerf, setAdvancedPerf] = useState(null);
  const [advancedPerfDays, setAdvancedPerfDays] = useState(90);
  const [showAdvancedPerf, setShowAdvancedPerf] = useState(false);

  // Alerts tab state (lifted to parent to survive re-renders)
  const [alertShowFilters, setAlertShowFilters] = useState(false);
  const [alertFilterForm, setAlertFilterForm] = useState(null);
  const [alertSavingFilters, setAlertSavingFilters] = useState(false);
  const [alertFilterSaveMsg, setAlertFilterSaveMsg] = useState(null);
  const [alertTestResult, setAlertTestResult] = useState(null);
  const [alertTesting, setAlertTesting] = useState(false);

  // Dashboard consolidated
  const [backtestHistory, setBacktestHistory] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);

  // Candlestick chart

  // Dashboard charts data (uses paperHistory for closed trades — single source of truth)
  const [backtestEquityCurve, setBacktestEquityCurve] = useState([]);
  const [realtimeEquityCurve, setRealtimeEquityCurve] = useState([]);

  // Signal Accuracy
  const [signalAccuracy, setSignalAccuracy] = useState(null);
  const [accuracyDays, setAccuracyDays] = useState(7);

  // Portfolio tab state (lifted to parent to survive re-renders)
  const [ptShowAddForm, setPtShowAddForm] = useState(false);
  const [ptShowBatchUpload, setPtShowBatchUpload] = useState(false);
  const [ptShowCreateWallet, setPtShowCreateWallet] = useState(false);
  const [ptUploadStatus, setPtUploadStatus] = useState(null);
  const [ptUploading, setPtUploading] = useState(false);
  const [ptSaving, setPtSaving] = useState(false);
  const [ptSelectedWalletFilter, setPtSelectedWalletFilter] = useState('all');
  const [ptNewPosition, setPtNewPosition] = useState({ asset: 'bitcoin', amount: '', buyPrice: '', walletId: '' });
  const [ptNewWallet, setPtNewWallet] = useState({ name: '', type: 'exchange', provider: 'binance', color: '#6366f1' });
  const [ptUploadWalletId, setPtUploadWalletId] = useState('');

  // Backtest tab state (via useBacktest hook)
  const bt = useBacktest(API_URL, USER_ID);

  // Optimize tab state (via useOptimization hook)
  const opt = useOptimization(API_URL);

  // Guide tab state moved to GuideTab component

  // APM/Monitor tab state
  const [apmData, setApmData] = useState(null);

  // ─── FETCH APM METRICS ───────────────────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/metrics`);
      if (res.ok) setApmData(await res.json());
    } catch (_) { /* backend unavailable */ }
  }, [API_URL]);

  // ─── FETCH MARKET DATA ─────────────────────────────────────────────────────
  const fetchMarketData = useCallback(async () => {
    try {
      const response = await authFetch(`${API_URL}/api/market`);
      const data = await response.json();
      setMarketData(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  }, [API_URL]);

  const fetchSignals = useCallback(async () => {
    try {
      const response = await authFetch(`${API_URL}/api/signals`);
      const data = await response.json();
      setSignals(data);
    } catch (error) {
      console.error('Error fetching signals:', error);
    }
  }, [API_URL]);

  const fetchAccuracy = useCallback(async (days) => {
    try {
      const d = days || accuracyDays;
      const res = await authFetch(`${API_URL}/api/signals/accuracy?days=${d}`);
      if (res.ok) {
        const data = await res.json();
        setSignalAccuracy(data);
      }
    } catch (err) {
      console.error('Error fetching accuracy:', err);
    }
  }, [API_URL, accuracyDays]);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await authFetch(`${API_URL}/api/alerts`);
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  }, [API_URL]);

  // ─── FETCH LOCKS (prevent concurrent overlapping calls) ─────────────────
  const dashboardPaperFetching = useRef(false);
  const paperDataFetching = useRef(false);
  const executionDataFetching = useRef(false);

  // ─── DASHBOARD CONSOLIDATED FETCHES ─────────────────────────────────────
  const fetchDashboardPaper = useCallback(async () => {
    if (dashboardPaperFetching.current) return;
    dashboardPaperFetching.current = true;
    try {
      const [cfgRes, posRes, perfRes, histRes, eqRes, advRes] = await Promise.allSettled([
        authFetch(`${API_URL}/api/paper/config/${USER_ID}`),
        authFetch(`${API_URL}/api/paper/positions/${USER_ID}`),
        authFetch(`${API_URL}/api/paper/performance/${USER_ID}`),
        authFetch(`${API_URL}/api/paper/history/${USER_ID}?status=closed&limit=200&offset=0`),
        authFetch(`${API_URL}/api/paper/equity/${USER_ID}?days=7`),
        authFetch(`${API_URL}/api/paper/performance-advanced/${USER_ID}?days=${advancedPerfDays}`),
      ]);
      if (cfgRes.status === 'fulfilled' && cfgRes.value.ok) {
        const d = await cfgRes.value.json();
        const cfg = d.config || d;
        setPaperConfig(cfg);
        if (!paperConfigForm) setPaperConfigForm(cfg);
      }
      if (posRes.status === 'fulfilled' && posRes.value.ok) {
        const d = await posRes.value.json();
        setPaperPositions(d.positions || []);
      }
      if (perfRes.status === 'fulfilled' && perfRes.value.ok) {
        const d = await perfRes.value.json();
        setPaperMetrics(d.metrics);  // FIX: era setPaperMetrics(d)
      }
      if (histRes.status === 'fulfilled' && histRes.value.ok) {
        const d = await histRes.value.json();
        setPaperHistory(d.trades || []);
        setPaperHistoryTotal(d.total || 0);
      }
      if (eqRes.status === 'fulfilled' && eqRes.value.ok) {
        const d = await eqRes.value.json();
        setRealtimeEquityCurve(d.curve || []);
      }
      if (advRes.status === 'fulfilled' && advRes.value.ok) {
        const d = await advRes.value.json();
        if (d.total !== undefined) setAdvancedPerf(d);
      }
    } catch (error) {
      console.error('Error fetching dashboard paper data:', error);
    } finally {
      dashboardPaperFetching.current = false;
    }
  }, [API_URL, advancedPerfDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBacktestHistory = useCallback(async () => {
    try {
      const response = await authFetch(`${API_URL}/api/backtest/history/${USER_ID}`);
      if (response.ok) {
        const data = await response.json();
        setBacktestHistory(data);
      }
    } catch (error) {
      console.error('Error fetching backtest history:', error);
    }
  }, [API_URL]);

  const fetchSystemHealth = useCallback(async () => {
    try {
      const response = await authFetch(`${API_URL}/api/health`);
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data);
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
    }
  }, [API_URL]);

  // ─── FETCH WALLETS & PORTFOLIO FROM BACKEND ──────────────────────────────
  const fetchWallets = useCallback(async () => {
    try {
      setWalletsLoading(true);
      const response = await authFetch(`${API_URL}/api/wallets/${USER_ID}`);
      if (response.ok) {
        const data = await response.json();
        setWallets(data.wallets || []);
      }
    } catch (error) {
      console.error('Error fetching wallets:', error);
    } finally {
      setWalletsLoading(false);
    }
  }, [API_URL]);

  const fetchPortfolio = useCallback(async () => {
    try {
      setPortfolioLoading(true);
      const response = await authFetch(`${API_URL}/api/portfolio/${USER_ID}`);
      if (response.ok) {
        const data = await response.json();
        // Flatten wallet positions into portfolio array
        const positions = [];
        if (data.byWallet && Array.isArray(data.byWallet)) {
          for (const wallet of data.byWallet) {
            if (wallet.positions) {
              for (const pos of wallet.positions) {
                positions.push({
                  id: pos.id,
                  asset: pos.asset,
                  amount: pos.amount,
                  buyPrice: pos.buy_price,
                  date: pos.purchase_date,
                  walletId: pos.wallet_id,
                  walletName: wallet.walletName,
                  walletColor: wallet.walletColor,
                });
              }
            }
          }
        }
        setPortfolio(positions);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setPortfolioLoading(false);
    }
  }, [API_URL]);

  // ─── SSE (Server-Sent Events) — Real-time updates ─────────────────────────
  const sseHandlers = useMemo(() => ({
    market: (data) => {
      if (data) {
        setMarketData(data);
        setLastUpdate(new Date());
      }
    },
    signals: (data) => {
      if (Array.isArray(data)) {
        setSignals(data);
      }
    },
    paper_trade: () => {
      // Refresh paper data when a trade event occurs
      fetchDashboardPaper();
      if (tab === 'execution') loadExecutionData();
    },
    kill_switch: (data) => {
      if (data) {
        setExecKillSwitchActive(data.active || false);
      }
    },
  }), [fetchDashboardPaper, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const { connected: sseConnected } = useSSE(API_URL, sseHandlers);

  // ─── INITIAL LOAD & AUTO-REFRESH ───────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.allSettled([
        fetchMarketData(),
        fetchSignals(),
        fetchAlerts(),
        fetchDashboardPaper(),
        fetchBacktestHistory(),
        fetchSystemHealth(),
        fetchMetrics(),
        fetchAccuracy(),
      ]);
      setLoading(false);
    };

    loadData();

    // Fallback polling only when SSE is disconnected (market + signals covered by SSE)
    const interval = setInterval(() => {
      if (!sseConnected) {
        fetchMarketData();
        fetchSignals();
      }
      fetchDashboardPaper(); // Always poll paper positions (not covered by SSE push)
    }, 30000);

    // Slow refresh every 5 minutes (health + backtest history + metrics + accuracy)
    const slowInterval = setInterval(() => {
      fetchSystemHealth();
      fetchBacktestHistory();
      fetchMetrics();
      fetchAccuracy();
    }, 300000);

    return () => {
      clearInterval(interval);
      clearInterval(slowInterval);
    };
  }, [fetchMarketData, fetchSignals, fetchAlerts, fetchDashboardPaper, fetchBacktestHistory, fetchSystemHealth, fetchMetrics, fetchAccuracy, sseConnected]);

  // ─── FETCH BACKTEST EQUITY CURVE ─────────────────────────────────────────
  useEffect(() => {
    if (backtestHistory.length > 0 && backtestHistory[0].id && backtestHistory[0].status === 'completed') {
      authFetch(`${API_URL}/api/backtest/results/${backtestHistory[0].id}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.equity_curve) setBacktestEquityCurve(data.equity_curve);
        })
        .catch(() => {});
    }
  }, [backtestHistory, API_URL]);

  // ─── PORTFOLIO TAB DATA LOADING (lifted from PortfolioTab) ────────────────
  useEffect(() => {
    if (tab === 'portfolio') {
      fetchWallets();
      fetchPortfolio();
    }
  }, [tab, fetchWallets, fetchPortfolio]);

  useEffect(() => {
    if (wallets.length > 0 && !ptNewPosition.walletId) {
      setPtNewPosition(prev => ({ ...prev, walletId: wallets[0].id }));
      if (!ptUploadWalletId) setPtUploadWalletId(wallets[0].id);
    }
  }, [wallets, ptNewPosition.walletId, ptUploadWalletId]);

  // ─── TAB DATA LOADING (via hooks) ──────────────────────────────────────────
  useEffect(() => {
    if (tab === 'strategy' && strategySubTab === 'backtest') {
      bt.loadHistory();
      if (paperConfigForm) bt.inheritFromPaperConfig(paperConfigForm);
    }
    if (tab === 'strategy' && strategySubTab === 'optimize') {
      opt.loadOptParams();
      opt.loadOptHistory();
      opt.loadAutoTuneData();
    }
    if (tab === 'strategy' && strategySubTab === 'config') {
      opt.loadAutoTuneData();
      opt.loadOptParams();
    }
  }, [tab, strategySubTab, bt.loadHistory, bt.inheritFromPaperConfig, opt.loadOptParams, opt.loadOptHistory, opt.loadAutoTuneData, paperConfigForm]);

  // APM tab: refresh metrics every 15s when active
  useEffect(() => {
    if (tab !== 'apm') return;
    fetchMetrics();
    const iv = setInterval(fetchMetrics, 15000);
    return () => clearInterval(iv);
  }, [tab, fetchMetrics]);

  // ─── PORTFOLIO FUNCTIONS ───────────────────────────────────────────────────
  const addToPortfolio = (asset, amount, buyPrice) => {
    const newPosition = {
      id: Date.now(),
      asset,
      amount: parseFloat(amount),
      buyPrice: parseFloat(buyPrice),
      date: new Date().toISOString(),
    };
    setPortfolio(prev => [...prev, newPosition]);
  };

  const removeFromPortfolio = (id) => {
    setPortfolio(prev => prev.filter(p => p.id !== id));
  };

  const calculatePortfolioValue = () => {
    if (!marketData || !marketData.crypto) return 0;
    
    return portfolio.reduce((total, position) => {
      const currentPrice = marketData.crypto[position.asset]?.price || 0;
      return total + (position.amount * currentPrice);
    }, 0);
  };

  const calculatePortfolioPnL = () => {
    if (!marketData || !marketData.crypto) return { pnl: 0, percentage: 0 };
    
    let totalInvested = 0;
    let totalCurrent = 0;
    
    portfolio.forEach(position => {
      const currentPrice = marketData.crypto[position.asset]?.price || 0;
      totalInvested += position.amount * position.buyPrice;
      totalCurrent += position.amount * currentPrice;
    });
    
    const pnl = totalCurrent - totalInvested;
    const percentage = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
    
    return { pnl, percentage };
  };

  // ─── ALERT FILTERS: Load once on mount ─────────────────────────────────────
  useEffect(() => {
    if (alertFilterForm) return; // already loaded
    const defaults = {
      assets: [], actions: ['BUY', 'SELL', 'STRONG BUY', 'STRONG SELL'],
      min_confidence: 50, min_score: 25, telegram_enabled: true,
      email_enabled: true, alert_emails: '', cooldown_minutes: 20, enabled: true
    };
    (async () => {
      try {
        const res = await authFetch(`${API_URL}/api/alert-filters/default-user`);
        if (res.ok) {
          const data = await res.json();
          setAlertFilterForm({
            assets: data.assets || defaults.assets,
            actions: data.actions || defaults.actions,
            min_confidence: data.min_confidence ?? defaults.min_confidence,
            min_score: data.min_score ?? defaults.min_score,
            telegram_enabled: data.telegram_enabled ?? defaults.telegram_enabled,
            email_enabled: data.email_enabled ?? defaults.email_enabled,
            alert_emails: data.alert_emails || defaults.alert_emails,
            cooldown_minutes: data.cooldown_minutes ?? defaults.cooldown_minutes,
            enabled: data.enabled ?? defaults.enabled
          });
        } else {
          // API returned error (e.g. 500 if table not yet created) — use defaults
          setAlertFilterForm(defaults);
        }
      } catch (e) {
        setAlertFilterForm(defaults);
      }
    })();
  }, [alertFilterForm]);

  // ─── PAPER TRADING: Load data & auto-refresh (moved from PaperTradingTab) ──
  const PAPER_HISTORY_PAGE_SIZE = 10;

  // loadPaperData: only fetches correlation data (config/positions/history/metrics already covered by fetchDashboardPaper)
  const loadPaperData = useCallback(async () => {
    if (paperDataFetching.current) return;
    paperDataFetching.current = true;
    setPaperLoading(true);
    try {
      // Correlation needs ≥2 positions
      if (paperPositions.length >= 2) {
        try {
          const corrRes = await authFetch(`${API_URL}/api/paper/correlation/${USER_ID}`);
          if (corrRes.ok) {
            const corrData = await corrRes.json();
            setCorrelationData(corrData.correlation || null);
          }
        } catch { setCorrelationData(null); }
      } else {
        setCorrelationData(null);
      }
    } catch (err) {
      console.error('Paper data load error:', err);
    } finally {
      setPaperLoading(false);
      paperDataFetching.current = false;
    }
  }, [paperPositions.length, API_URL]);

  // Load just config for strategy tab (lightweight, no positions/history)
  const loadConfigOnly = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/paper/config/${USER_ID}`);
      if (res.ok) {
        const d = await res.json();
        setPaperConfig(d.config);
        setPaperConfigForm(d.config);
      }
    } catch (err) {
      console.error('Config load error:', err);
    }
  }, []);

  // Load correlation when execution tab is active, load config for strategy tab
  useEffect(() => {
    if (tab === 'execution') loadPaperData(); // Only fetches correlation now
    else if (tab === 'strategy') loadConfigOnly();
  }, [tab, loadPaperData, loadConfigOnly]);

  // Test alert is now handled directly in AlertsTab

  // ─── EXECUTION SYSTEM FETCHES ───────────────────────────────────────────────
  const loadExecutionData = useCallback(async () => {
    if (executionDataFetching.current) return;
    executionDataFetching.current = true;
    setExecLoading(true);
    try {
      const [ordersRes, riskRes, auditRes, ksRes] = await Promise.allSettled([
        authFetch(`${API_URL}/api/orders/${USER_ID}?limit=50`),
        authFetch(`${API_URL}/api/risk/${USER_ID}/dashboard`),
        authFetch(`${API_URL}/api/execution-log/${USER_ID}?limit=50`),
        authFetch(`${API_URL}/api/risk/${USER_ID}/kill-switch`)
      ]);

      if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
        const data = await ordersRes.value.json();
        setExecOrders(data.orders || []);
      }
      if (riskRes.status === 'fulfilled' && riskRes.value.ok) {
        const data = await riskRes.value.json();
        setExecRiskDashboard(data);
        setExecMode(data.executionMode || 'paper');
        setExecAutoExecute(data.autoExecute !== false);
      }
      if (auditRes.status === 'fulfilled' && auditRes.value.ok) {
        const data = await auditRes.value.json();
        setExecAuditLog(data.logs || []);
      }
      if (ksRes.status === 'fulfilled' && ksRes.value.ok) {
        const data = await ksRes.value.json();
        setExecKillSwitchActive(data.active || false);
      }
    } catch (err) {
      console.error('Execution data load error:', err);
    } finally {
      setExecLoading(false);
      executionDataFetching.current = false;
    }
  }, [API_URL, USER_ID]);

  useEffect(() => {
    if (tab === 'execution') {
      loadExecutionData();
      fetchDashboardPaper();
    }
  }, [tab, loadExecutionData, fetchDashboardPaper]);

  // Show nothing while checking auth (prevents flash of dashboard)
  // IMPORTANT: This must be AFTER all hooks to avoid React rules violation
  if (authEnabled && (authLoading || !authUser)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0f', color: '#888' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚡ SENTIX PRO</div>
          <div>Verificando autenticación...</div>
        </div>
      </div>
    );
  }

  const handleCreateOrder = async (orderSpec) => {
    try {
      const res = await authFetch(`${API_URL}/api/orders/${USER_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderSpec)
      });
      if (res.ok) {
        loadExecutionData();
        return { success: true };
      }
      const err = await res.json();
      return { success: false, error: err.error || 'Error creating order' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const showFeedback = (type, message) => {
    setExecFeedback({ type, message });
    setTimeout(() => setExecFeedback(null), 5000);
  };

  const handleCancelOrder = async (orderId) => {
    try {
      const res = await authFetch(`${API_URL}/api/orders/${USER_ID}/${orderId}/cancel`, { method: 'POST' });
      if (res.ok) {
        showFeedback('success', 'Orden cancelada');
      } else {
        const d = await res.json().catch(() => ({}));
        showFeedback('error', d.error || `Error cancelando orden (${res.status})`);
      }
      loadExecutionData();
    } catch (err) {
      showFeedback('error', `Error de red: ${err.message}`);
    }
  };

  const handleSubmitOrder = async (orderId) => {
    try {
      const res = await authFetch(`${API_URL}/api/orders/${USER_ID}/${orderId}/submit`, { method: 'POST' });
      if (res.ok) {
        const d = await res.json().catch(() => ({}));
        showFeedback('success', d.trade ? `Orden ejecutada a $${d.trade.entry_price}` : 'Orden enviada');
      } else {
        const d = await res.json().catch(() => ({}));
        showFeedback('error', d.error || `Error ejecutando orden (${res.status})`);
      }
      loadExecutionData();
    } catch (err) {
      showFeedback('error', `Error de red: ${err.message}`);
    }
  };

  const handleKillSwitch = async (activate, reason) => {
    try {
      let res;
      if (activate) {
        res = await authFetch(`${API_URL}/api/risk/${USER_ID}/kill-switch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason || 'Manual activation' })
        });
      } else {
        res = await authFetch(`${API_URL}/api/risk/${USER_ID}/kill-switch`, { method: 'DELETE' });
      }
      if (res.ok) {
        const d = await res.json().catch(() => ({}));
        showFeedback('success', activate
          ? `Kill switch activado — ${d.cancelledOrders || 0} órdenes canceladas, ${d.closedPositions || 0} posiciones cerradas`
          : 'Trading re-habilitado');
      } else {
        const d = await res.json().catch(() => ({}));
        showFeedback('error', d.error || `Error en kill switch (${res.status})`);
      }
      loadExecutionData();
      fetchDashboardPaper(); // Refresh positions after kill switch closes them
    } catch (err) {
      showFeedback('error', `Error de red: ${err.message}`);
    }
  };

  // ─── STYLES (imported from lib/theme.js) ────────────────────────────────
  const { bg, bg2, bg3, border, text, muted, green, red, amber, blue, purple } = colors;

  // ─── STRATEGY CONFIG TAB (with sub-tabs: Config, Backtest, Optimize) ─────
  const StrategyTab = () => {
    const subTab = strategySubTab;
    const setSubTab = setStrategySubTab;

    const STRATEGY_SUB_TABS = [
      { k: 'config', label: '⚙ Configuración', desc: 'Parámetros de trading' },
      { k: 'backtest', label: '🔬 Backtest', desc: 'Validar estrategia' },
      { k: 'optimize', label: '⚡ Optimizar', desc: 'Ajustar parámetros' }
    ];

    return (
      <div style={{ fontFamily: 'monospace' }}>
        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {STRATEGY_SUB_TABS.map(({ k, label, desc }) => (
            <button
              key={k}
              onClick={() => setSubTab(k)}
              style={{
                flex: '1 1 auto',
                padding: '8px 14px',
                background: subTab === k ? `${purple}20` : bg2,
                border: subTab === k ? `1px solid ${purple}` : `1px solid ${border}`,
                borderRadius: 6,
                color: subTab === k ? purple : muted,
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: subTab === k ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              {label}
              <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{desc}</div>
            </button>
          ))}
        </div>

        {/* Config sub-tab */}
        {subTab === 'config' && StrategyConfigContent()}

        {/* Backtest sub-tab */}
        {subTab === 'backtest' && <BacktestTab {...bt} apiUrl={API_URL} userId={USER_ID} paperConfigForm={paperConfigForm} />}

        {/* Optimize sub-tab */}
        {subTab === 'optimize' && <OptimizeTab {...opt} apiUrl={API_URL} onVerifyWithBacktest={({ asset, days, paramKey, bestValue }) => {
          bt.setConfig(prev => ({ ...prev, asset, days }));
          bt.setStrategyOverrides(prev => ({ ...prev, [paramKey]: bestValue }));
          setStrategySubTab('backtest');
        }} />}
      </div>
    );
  };

  // ─── STRATEGY CONFIG CONTENT (extracted from old StrategyTab) ─────────────
  const StrategyConfigContent = () => {
    const configForm = paperConfigForm, setConfigForm = setPaperConfigForm;
    const savingConfig = paperSavingConfig, setSavingConfig = setPaperSavingConfig;

    const inputStyle = {
      width: '100%', padding: '8px 12px', background: bg3,
      border: `1px solid ${border}`, borderRadius: 6,
      color: text, fontFamily: 'monospace', fontSize: 12
    };

    const handleSaveStrategy = async () => {
      if (!configForm) return;
      setSavingConfig(true);
      try {
        const res = await authFetch(`${API_URL}/api/paper/config/${USER_ID}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Risk management
            risk_per_trade: parseFloat(configForm.risk_per_trade),
            max_daily_loss_percent: parseFloat(configForm.max_daily_loss_percent),
            max_position_percent: parseFloat(configForm.max_position_percent),
            // Position management
            max_open_positions: parseInt(configForm.max_open_positions),
            cooldown_minutes: parseInt(configForm.cooldown_minutes),
            max_holding_hours: parseInt(configForm.max_holding_hours),
            partial_close_ratio: parseFloat(configForm.partial_close_ratio),
            move_sl_to_breakeven_after_tp1: configForm.move_sl_to_breakeven_after_tp1,
            // ATR multipliers
            atr_stop_mult: parseFloat(configForm.atr_stop_mult),
            atr_tp2_mult: parseFloat(configForm.atr_tp2_mult),
            atr_trailing_mult: parseFloat(configForm.atr_trailing_mult),
            atr_trailing_activation: parseFloat(configForm.atr_trailing_activation),
            // Signal filters
            min_confluence: parseInt(configForm.min_confluence),
            min_rr_ratio: parseFloat(configForm.min_rr_ratio),
            allowed_strength: configForm.allowed_strength,
            // Portfolio limits
            max_portfolio_correlation: parseFloat(configForm.max_portfolio_correlation),
            max_sector_exposure_pct: parseFloat(configForm.max_sector_exposure_pct),
            max_same_direction_crypto: parseInt(configForm.max_same_direction_crypto)
          })
        });
        if (res.ok) {
          const d = await res.json();
          setPaperConfig(d.config);
          setConfigForm(d.config);
        }
      } catch (err) {
        console.error('Save strategy error:', err);
      } finally {
        setSavingConfig(false);
      }
    };

    if (!configForm) return (
      <div style={{ ...card, padding: 20, textAlign: "center" }}>
        <div style={{ color: muted, fontSize: 12 }}>Cargando configuración...</div>
      </div>
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={sTitle}>⚙ ESTRATEGIA DE TRADING</div>
          <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>
            Parámetros que definen tu estrategia. Aplican tanto a Paper Trading como a trading real.
          </div>
        </div>

        {/* ── GESTIÓN DE RIESGO ── */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={sTitle}>💰 GESTIÓN DE RIESGO</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Riesgo por Trade (%)</label>
              <input type="number" step="0.5" min="0.1" max="10" value={(configForm.risk_per_trade || 0.01) * 100}
                onChange={e => setConfigForm(prev => ({ ...prev, risk_per_trade: parseFloat(e.target.value) / 100 }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>% del capital arriesgado por operación</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Pérdida Diaria Máx (%)</label>
              <input type="number" step="1" min="1" max="20" value={(configForm.max_daily_loss_percent || 0.05) * 100}
                onChange={e => setConfigForm(prev => ({ ...prev, max_daily_loss_percent: parseFloat(e.target.value) / 100 }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Detiene trading al alcanzar esta pérdida diaria</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Máx Posición (%)</label>
              <input type="number" step="5" min="5" max="50" value={(configForm.max_position_percent || 0.30) * 100}
                onChange={e => setConfigForm(prev => ({ ...prev, max_position_percent: parseFloat(e.target.value) / 100 }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Máx % del capital por posición</div>
            </div>
          </div>
        </div>

        {/* ── POSICIONES ── */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={sTitle}>📊 GESTIÓN DE POSICIONES</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Máx Posiciones Abiertas</label>
              <input type="number" min="1" max="10" value={configForm.max_open_positions || 3}
                onChange={e => setConfigForm(prev => ({ ...prev, max_open_positions: e.target.value }))}
                style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Cooldown entre Trades (min)</label>
              <input type="number" min="5" max="1440" value={configForm.cooldown_minutes || 30}
                onChange={e => setConfigForm(prev => ({ ...prev, cooldown_minutes: e.target.value }))}
                style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Máx Holding (horas)</label>
              <input type="number" min="0" max="720" value={configForm.max_holding_hours || 168}
                onChange={e => setConfigForm(prev => ({ ...prev, max_holding_hours: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>0 = sin límite</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Cierre Parcial en TP1 (%)</label>
              <input type="number" step="5" min="25" max="75" value={(configForm.partial_close_ratio || 0.5) * 100}
                onChange={e => setConfigForm(prev => ({ ...prev, partial_close_ratio: parseFloat(e.target.value) / 100 }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>% de posición cerrada al TP1</div>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 10, color: muted, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={configForm.move_sl_to_breakeven_after_tp1 !== false}
                onChange={e => setConfigForm(prev => ({ ...prev, move_sl_to_breakeven_after_tp1: e.target.checked }))} />
              Mover SL a breakeven después de TP1
            </label>
          </div>
        </div>

        {/* ── STOP LOSS & TAKE PROFIT (ATR) ── */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={sTitle}>🎯 STOP LOSS & TAKE PROFIT (ATR)</div>
          <div style={{ fontSize: 9, color: muted, marginTop: 4, marginBottom: 12, lineHeight: 1.5 }}>
            Multiplicadores del ATR (Average True Range). Mayor valor = más espacio para volatilidad. Crypto recomendado: SL ≥ 2.0, Trailing Activation ≥ 2.0
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Stop Loss (× ATR)</label>
              <input type="number" step="0.1" min="0.5" max="5.0" value={configForm.atr_stop_mult || 2.5}
                onChange={e => setConfigForm(prev => ({ ...prev, atr_stop_mult: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Distancia SL desde soporte. Recomendado: 2.5</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Take Profit 2 (× ATR)</label>
              <input type="number" step="0.1" min="0.5" max="5.0" value={configForm.atr_tp2_mult || 2.0}
                onChange={e => setConfigForm(prev => ({ ...prev, atr_tp2_mult: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Distancia TP2 desde resistencia</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Trailing Stop (× ATR)</label>
              <input type="number" step="0.1" min="0.5" max="5.0" value={configForm.atr_trailing_mult || 2.5}
                onChange={e => setConfigForm(prev => ({ ...prev, atr_trailing_mult: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Distancia del trailing stop</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Trailing Activación (× ATR)</label>
              <input type="number" step="0.1" min="0.5" max="5.0" value={configForm.atr_trailing_activation || 2.0}
                onChange={e => setConfigForm(prev => ({ ...prev, atr_trailing_activation: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Profit mínimo para activar trailing. Recomendado: 2.0</div>
            </div>
          </div>
        </div>

        {/* ── FILTROS DE SEÑALES ── */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={sTitle}>📡 FILTROS DE SEÑALES</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Confluencia Mínima</label>
              <input type="number" min="1" max="5" value={configForm.min_confluence || 3}
                onChange={e => setConfigForm(prev => ({ ...prev, min_confluence: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Timeframes alineados requeridos (2-5)</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>R:R Mínimo</label>
              <input type="number" step="0.1" min="0.5" max="5.0" value={configForm.min_rr_ratio || 1.5}
                onChange={e => setConfigForm(prev => ({ ...prev, min_rr_ratio: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Risk:Reward mínimo aceptable</div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 10, color: muted, marginBottom: 6, display: "block", fontWeight: 700 }}>SEÑALES ACEPTADAS</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {['STRONG BUY', 'BUY', 'WEAK BUY', 'STRONG SELL', 'SELL', 'WEAK SELL'].map(str => {
                const isActive = (configForm.allowed_strength || []).includes(str);
                const isBuy = str.includes('BUY');
                const clr = isBuy ? green : red;
                return (
                  <button key={str} onClick={() => {
                    setConfigForm(prev => {
                      const current = prev.allowed_strength || [];
                      return { ...prev, allowed_strength: isActive ? current.filter(s => s !== str) : [...current, str] };
                    });
                  }} style={{
                    padding: "4px 10px", borderRadius: 4, fontSize: 10, fontFamily: "monospace", fontWeight: 700,
                    cursor: "pointer", border: `1px solid ${isActive ? clr : border}`,
                    background: isActive ? `${clr}22` : "transparent",
                    color: isActive ? clr : muted
                  }}>{str}</button>
                );
              })}
            </div>
            <div style={{ fontSize: 9, color: muted, marginTop: 4 }}>
              Solo STRONG = conservador · Incluir BUY/SELL = recomendado · WEAK = agresivo
            </div>
          </div>
        </div>

        {/* ── PORTFOLIO LIMITS ── */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={sTitle}>🛡 LÍMITES DE PORTFOLIO</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Correlación Máx Portfolio</label>
              <input type="number" step="0.05" min="0.3" max="1.0" value={configForm.max_portfolio_correlation || 0.70}
                onChange={e => setConfigForm(prev => ({ ...prev, max_portfolio_correlation: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Bloquea trades si correlación promedio excede</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Exposición Sector Máx (%)</label>
              <input type="number" step="5" min="30" max="100" value={(configForm.max_sector_exposure_pct || 0.60) * 100}
                onChange={e => setConfigForm(prev => ({ ...prev, max_sector_exposure_pct: parseFloat(e.target.value) / 100 }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Máx % capital en mismo sector</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Máx Misma Dirección Crypto</label>
              <input type="number" min="1" max="10" value={configForm.max_same_direction_crypto || 3}
                onChange={e => setConfigForm(prev => ({ ...prev, max_same_direction_crypto: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Máx posiciones LONG o SHORT simultáneas</div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <button onClick={handleSaveStrategy} disabled={savingConfig}
            style={{
              padding: "10px 28px", background: `linear-gradient(135deg, ${purple}, #7c3aed)`,
              border: "none", borderRadius: 6, color: "#fff",
              fontFamily: "monospace", fontSize: 13, fontWeight: 700, cursor: "pointer",
              opacity: savingConfig ? 0.6 : 1, width: "100%"
            }}>
            {savingConfig ? 'Guardando...' : '💾 GUARDAR ESTRATEGIA'}
          </button>
        </div>

        {/* Paper Account Settings (capital, enabled, reset) */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            onClick={() => setPaperShowConfig(!paperShowConfig)}>
            <div style={sTitle}>💰 CUENTA PAPER</div>
            <span style={{ color: muted, fontSize: 12 }}>{paperShowConfig ? '▲' : '▼'}</span>
          </div>

          {paperShowConfig && paperConfigForm && (() => {
            const inputStyle = {
              width: '100%', padding: '8px 12px', background: bg3,
              border: `1px solid ${border}`, borderRadius: 6,
              color: text, fontFamily: 'monospace', fontSize: 12
            };
            const handleSaveConfig = async () => {
              setPaperSavingConfig(true);
              try {
                const res = await authFetch(`${API_URL}/api/paper/config/${USER_ID}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    is_enabled: paperConfigForm.is_enabled,
                    initial_capital: parseFloat(paperConfigForm.initial_capital)
                  })
                });
                if (res.ok) {
                  const d = await res.json();
                  setPaperConfig(d.config);
                  setPaperConfigForm(d.config);
                }
              } catch (err) {
                console.error('Save config error:', err);
              } finally {
                setPaperSavingConfig(false);
              }
            };
            const handleReset = async () => {
              try {
                const res = await authFetch(`${API_URL}/api/paper/reset/${USER_ID}`, { method: 'POST' });
                if (res.ok) {
                  setPaperConfirmReset(false);
                  await fetchDashboardPaper();
                }
              } catch (err) {
                console.error('Reset error:', err);
              }
            };
            return (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Capital Inicial ($)</label>
                    <input type="number" value={paperConfigForm.initial_capital || 10000}
                      onChange={e => setPaperConfigForm(prev => ({ ...prev, initial_capital: e.target.value }))}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Trading Habilitado</label>
                    <label style={{ fontSize: 10, color: muted, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginTop: 4 }}>
                      <input type="checkbox" checked={paperConfigForm.is_enabled !== false}
                        onChange={e => setPaperConfigForm(prev => ({ ...prev, is_enabled: e.target.checked }))} />
                      {paperConfigForm.is_enabled !== false ? 'Activo' : 'Pausado'}
                    </label>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                  <button onClick={handleSaveConfig} disabled={paperSavingConfig}
                    style={{
                      padding: "8px 20px", background: `linear-gradient(135deg, ${purple}, #7c3aed)`,
                      border: "none", borderRadius: 6, color: "#fff",
                      fontFamily: "monospace", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      opacity: paperSavingConfig ? 0.6 : 1
                    }}>
                    {paperSavingConfig ? 'Guardando...' : '💾 GUARDAR'}
                  </button>
                  {!paperConfirmReset ? (
                    <button onClick={() => setPaperConfirmReset(true)}
                      style={{
                        padding: "8px 20px", background: "rgba(239,68,68,0.1)",
                        border: `1px solid ${red}`, borderRadius: 6,
                        color: red, fontFamily: "monospace", fontSize: 12, fontWeight: 700, cursor: "pointer"
                      }}>
                      🔄 RESET CUENTA
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: red }}>¿Seguro? Cierra todos los trades y resetea capital.</span>
                      <button onClick={handleReset} style={{
                        padding: "6px 14px", background: red, border: "none", borderRadius: 4,
                        color: "#fff", fontFamily: "monospace", fontSize: 11, fontWeight: 700, cursor: "pointer"
                      }}>SÍ</button>
                      <button onClick={() => setPaperConfirmReset(false)} style={{
                        padding: "6px 14px", background: bg3, border: `1px solid ${border}`, borderRadius: 4,
                        color: muted, fontFamily: "monospace", fontSize: 11, cursor: "pointer"
                      }}>NO</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Signal Generation Parameters (read-only, from strategyConfig) */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div
            onClick={() => opt.setShowSignalParams(!opt.showSignalParams)}
            style={{ ...sTitle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: opt.showSignalParams ? 12 : 0 }}
          >
            <span>
              🧠 PARAMETROS DE GENERACION DE SENALES
              {opt.autoTuneConfig?.source === 'saved' && (
                <span style={{ color: green, fontSize: 9, marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>AUTO-TUNED</span>
              )}
            </span>
            <span style={{ fontSize: 12 }}>{opt.showSignalParams ? '▼' : '▶'}</span>
          </div>
          {opt.showSignalParams && (
            <div>
              <div style={{ fontSize: 10, color: muted, marginBottom: 12 }}>
                Estos parametros controlan la generacion de senales. Se modifican desde el tab Optimizar o Auto-Tune.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                {opt.optParams.map(p => {
                  const currentVal = opt.autoTuneConfig?.config?.[p.key] ?? p.defaultValue;
                  const isModified = currentVal !== p.defaultValue;
                  return (
                    <div key={p.key} style={{
                      background: bg3, borderRadius: 6, padding: '8px 10px',
                      border: isModified ? `1px solid ${green}30` : `1px solid ${border}`
                    }}>
                      <div style={{ fontSize: 9, color: muted, marginBottom: 2 }}>{p.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: isModified ? green : text }}>
                        {currentVal}
                        {isModified && (
                          <span style={{ fontSize: 9, color: muted, marginLeft: 4, fontWeight: 400 }}>(def: {p.defaultValue})</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {opt.optParams.length === 0 && (
                <div style={{ fontSize: 11, color: muted, textAlign: 'center', padding: 20 }}>
                  Cargando parametros...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── PAPER TRADING TAB (REMOVED — consolidated into ExecutionTab) ────────
  const PaperTradingTab_REMOVED = () => {
    // State is lifted to parent to survive re-renders (parent re-creates this function on each render)
    const showConfig = paperShowConfig, setShowConfig = setPaperShowConfig;
    const configForm = paperConfigForm, setConfigForm = setPaperConfigForm;
    const savingConfig = paperSavingConfig, setSavingConfig = setPaperSavingConfig;
    const closingTrade = paperClosingTrade, setClosingTrade = setPaperClosingTrade;
    const historyPage = paperHistoryPage, setHistoryPage = setPaperHistoryPage;
    const historyTotal = paperHistoryTotal, setHistoryTotal = setPaperHistoryTotal;
    const confirmReset = paperConfirmReset, setConfirmReset = setPaperConfirmReset;

    // NOTE: loadPaperData and useEffects moved to parent level to avoid remount issues

    const handleSaveConfig = async () => {
      if (!configForm) return;
      setSavingConfig(true);
      try {
        const res = await authFetch(`${API_URL}/api/paper/config/${USER_ID}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_enabled: configForm.is_enabled,
            initial_capital: parseFloat(configForm.initial_capital)
          })
        });
        if (res.ok) {
          const d = await res.json();
          setPaperConfig(d.config);
          setConfigForm(d.config);
        }
      } catch (err) {
        console.error('Save config error:', err);
      } finally {
        setSavingConfig(false);
      }
    };

    const handleCloseTrade = async (tradeId) => {
      setClosingTrade(tradeId);
      try {
        const res = await authFetch(`${API_URL}/api/paper/close/${tradeId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: USER_ID })
        });
        if (res.ok) await fetchDashboardPaper();
      } catch (err) {
        console.error('Close trade error:', err);
      } finally {
        setClosingTrade(null);
      }
    };

    const handleReset = async () => {
      try {
        const res = await authFetch(`${API_URL}/api/paper/reset/${USER_ID}`, { method: 'POST' });
        if (res.ok) {
          setConfirmReset(false);
          await fetchDashboardPaper();
        }
      } catch (err) {
        console.error('Reset error:', err);
      }
    };

    const handleToggleEnabled = async () => {
      const newVal = !paperConfig?.is_enabled;
      try {
        // When re-enabling, also reset daily_pnl to prevent immediate auto-disable
        const payload = newVal
          ? { is_enabled: true, daily_pnl: 0, daily_pnl_reset_at: new Date().toISOString() }
          : { is_enabled: false };
        const res = await authFetch(`${API_URL}/api/paper/config/${USER_ID}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const d = await res.json();
          setPaperConfig(d.config);
          if (configForm) setConfigForm(prev => ({ ...prev, is_enabled: newVal }));
        }
      } catch (err) {
        console.error('Toggle error:', err);
      }
    };

    const formatDuration = (entryAt, exitAt) => {
      const ms = new Date(exitAt || Date.now()) - new Date(entryAt);
      const hours = Math.floor(ms / 3600000);
      const mins = Math.floor((ms % 3600000) / 60000);
      if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m`;
    };

    const inputStyle = {
      width: '100%', padding: '8px 12px', background: bg3,
      border: `1px solid ${border}`, borderRadius: 6,
      color: text, fontFamily: 'monospace', fontSize: 12
    };

    const isEnabled = paperConfig?.is_enabled;
    const capital = parseFloat(paperConfig?.current_capital || 10000);
    const initialCap = parseFloat(paperConfig?.initial_capital || 10000);
    const capitalPnl = capital - initialCap;
    const capitalPnlPct = initialCap > 0 ? ((capitalPnl / initialCap) * 100) : 0;

    return (
      <div>
        {/* Status Banner */}
        <div style={{
          background: isEnabled ? "rgba(0, 212, 170, 0.08)" : "rgba(239, 68, 68, 0.08)",
          border: `1px solid ${isEnabled ? green : red}`,
          borderRadius: 8, padding: "14px 18px", marginBottom: 16,
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: isEnabled ? green : red,
              boxShadow: `0 0 8px ${isEnabled ? green : red}`,
              animation: isEnabled ? "pulse 2s infinite" : "none"
            }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: isEnabled ? green : red }}>
                PAPER TRADING {isEnabled ? 'ACTIVO' : 'DESACTIVADO'}
              </div>
              <div style={{ fontSize: 10, color: muted, fontFamily: "monospace" }}>
                Capital: ${capital.toLocaleString(undefined, { minimumFractionDigits: 2 })} ·
                P&L: <span style={{ color: capitalPnl >= 0 ? green : red }}>
                  {capitalPnl >= 0 ? '+' : ''}${capitalPnl.toFixed(2)} ({capitalPnlPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
          <button onClick={handleToggleEnabled} style={{
            padding: "6px 16px", background: isEnabled ? "rgba(239,68,68,0.2)" : "rgba(0,212,170,0.2)",
            border: `1px solid ${isEnabled ? red : green}`, borderRadius: 6,
            color: isEnabled ? red : green, fontFamily: "monospace", fontSize: 11,
            fontWeight: 700, cursor: "pointer"
          }}>
            {isEnabled ? '⏸ PAUSAR' : '▶ ACTIVAR'}
          </button>
        </div>

        {/* Performance Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
          {[
            { label: "P&L TOTAL", value: `$${(paperMetrics?.totalPnl || 0).toFixed(2)}`, color: (paperMetrics?.totalPnl || 0) >= 0 ? green : red },
            { label: "WIN RATE", value: `${paperMetrics?.winRate || 0}%`, color: (paperMetrics?.winRate || 0) >= 50 ? green : (paperMetrics?.winRate || 0) > 0 ? amber : muted },
            { label: "TRADES", value: `${paperMetrics?.totalTrades || 0}`, sub: `${paperMetrics?.winCount || 0}W / ${paperMetrics?.lossCount || 0}L`, color: text },
            { label: "CAPITAL", value: `$${capital.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: capital >= initialCap ? green : red },
            { label: "MAX DRAWDOWN", value: `$${(paperMetrics?.maxDrawdown || 0).toFixed(2)}`, color: red },
            { label: "PROFIT FACTOR", value: paperMetrics?.profitFactor === Infinity ? '∞' : `${(paperMetrics?.profitFactor || 0).toFixed(2)}`, color: (paperMetrics?.profitFactor || 0) >= 1.5 ? green : (paperMetrics?.profitFactor || 0) >= 1 ? amber : red },
          ].map((stat, i) => (
            <div key={i} style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6 }}>{stat.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color: stat.color }}>{stat.value}</div>
              {stat.sub && <div style={{ fontSize: 10, color: muted, fontFamily: "monospace", marginTop: 2 }}>{stat.sub}</div>}
            </div>
          ))}
        </div>

        {/* ═══ ADVANCED PERFORMANCE ANALYTICS ═══ */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            onClick={() => setShowAdvancedPerf(!showAdvancedPerf)}>
            <div style={sTitle}>📊 ANALYTICS AVANZADOS {showAdvancedPerf ? '▾' : '▸'}</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {[30, 90, 0].map(d => (
                <button key={d} onClick={(e) => { e.stopPropagation(); setAdvancedPerfDays(d); }} style={{
                  padding: "3px 10px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700,
                  background: advancedPerfDays === d ? green : bg3, color: advancedPerfDays === d ? "#000" : muted
                }}>{d === 0 ? 'Todo' : `${d}d`}</button>
              ))}
            </div>
          </div>

          {showAdvancedPerf && (() => {
            if (!advancedPerf || advancedPerf.total < 5) {
              return <div style={{ padding: 20, textAlign: "center", color: muted, fontSize: 12 }}>
                Necesitas al menos 5 trades cerrados para ver analytics avanzados ({advancedPerf?.total || 0} actuales)
              </div>;
            }

            const hitColor = (rate) => rate >= 55 ? green : rate >= 45 ? amber : red;

            return (
              <div style={{ marginTop: 14 }}>
                {/* Row 1: By Asset - Horizontal Bar Chart */}
                {advancedPerf.byAsset && advancedPerf.byAsset.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>P&L POR ASSET</div>
                    <div style={{ background: bg3, borderRadius: 8, padding: 10 }}>
                      <ResponsiveContainer width="100%" height={Math.max(120, advancedPerf.byAsset.length * 32)}>
                        <BarChart data={advancedPerf.byAsset} layout="vertical" margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 9, fill: muted }} />
                          <YAxis type="category" dataKey="asset" tick={{ fontSize: 10, fill: "#e5e7eb" }} width={55} />
                          <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, fontSize: 11 }}
                            formatter={(v, name, props) => {
                              const d = props.payload;
                              return [`$${v} | WR: ${d.winRate}% | ${d.trades} trades | avg: $${d.avgPnl}`, 'P&L'];
                            }} />
                          <Bar dataKey="totalPnl" radius={[0, 4, 4, 0]}>
                            {advancedPerf.byAsset.map((entry, i) => (
                              <Cell key={i} fill={entry.totalPnl >= 0 ? green : red} fillOpacity={0.8} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Row 2: By Hour + By Day of Week */}
                <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12, marginBottom: 16 }}>
                  {/* By Hour */}
                  {advancedPerf.byHour && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>WIN RATE POR HORA (UTC)</div>
                      <div style={{ background: bg3, borderRadius: 8, padding: 10 }}>
                        <ResponsiveContainer width="100%" height={140}>
                          <BarChart data={advancedPerf.byHour}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                            <XAxis dataKey="hour" tick={{ fontSize: 8, fill: muted }} />
                            <YAxis tick={{ fontSize: 8, fill: muted }} domain={[0, 100]} unit="%" />
                            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, fontSize: 10 }}
                              formatter={(v, name, props) => {
                                const d = props.payload;
                                return d.trades > 0 ? [`${v}% (${d.trades} trades, $${d.totalPnl})`, 'Win Rate'] : ['Sin trades', ''];
                              }} />
                            <ReferenceLine y={50} stroke={amber} strokeDasharray="3 3" strokeWidth={1} />
                            <Bar dataKey="winRate" radius={[2, 2, 0, 0]}>
                              {advancedPerf.byHour.map((entry, i) => (
                                <Cell key={i} fill={entry.trades === 0 ? "#1a1a1a" : entry.totalPnl >= 0 ? green : red} fillOpacity={entry.trades === 0 ? 0.1 : 0.7} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* By Day of Week */}
                  {advancedPerf.byDayOfWeek && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>WIN RATE POR DIA</div>
                      <div style={{ background: bg3, borderRadius: 8, padding: 10 }}>
                        <ResponsiveContainer width="100%" height={140}>
                          <BarChart data={advancedPerf.byDayOfWeek}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                            <XAxis dataKey="label" tick={{ fontSize: 9, fill: muted }} />
                            <YAxis tick={{ fontSize: 8, fill: muted }} domain={[0, 100]} unit="%" />
                            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, fontSize: 10 }}
                              formatter={(v, name, props) => {
                                const d = props.payload;
                                return d.trades > 0 ? [`${v}% (${d.trades} trades, $${d.totalPnl})`, 'Win Rate'] : ['Sin trades', ''];
                              }} />
                            <ReferenceLine y={50} stroke={amber} strokeDasharray="3 3" strokeWidth={1} />
                            <Bar dataKey="winRate" radius={[2, 2, 0, 0]}>
                              {advancedPerf.byDayOfWeek.map((entry, i) => (
                                <Cell key={i} fill={entry.trades === 0 ? "#1a1a1a" : entry.totalPnl >= 0 ? green : red} fillOpacity={entry.trades === 0 ? 0.1 : 0.7} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                {/* Row 3: P&L Distribution Histogram */}
                {advancedPerf.pnlDistribution && advancedPerf.pnlDistribution.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>DISTRIBUCION DE P&L (%)</div>
                    <div style={{ background: bg3, borderRadius: 8, padding: 10 }}>
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={advancedPerf.pnlDistribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                          <XAxis dataKey="bucket" tick={{ fontSize: 7, fill: muted }} interval={0} angle={-45} textAnchor="end" height={50} />
                          <YAxis tick={{ fontSize: 8, fill: muted }} allowDecimals={false} />
                          <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, fontSize: 10 }}
                            formatter={(v) => [v, 'Trades']} />
                          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                            {advancedPerf.pnlDistribution.map((entry, i) => (
                              <Cell key={i} fill={entry.bucket.includes('-') || entry.bucket.startsWith('<') ? red : green} fillOpacity={0.7} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Row 4: Exit Reason + Direction */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {/* By Exit Reason */}
                  {advancedPerf.byExitReason && advancedPerf.byExitReason.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>POR RAZON DE CIERRE</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {advancedPerf.byExitReason.map(r => {
                          const reasonColor = r.reason === 'stop_loss' ? red : r.reason.includes('take_profit') ? green : r.reason === 'trailing_stop' ? amber : muted;
                          return (
                            <div key={r.reason} style={{ background: bg3, borderRadius: 6, padding: "8px 12px", borderLeft: `3px solid ${reasonColor}` }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: reasonColor }}>{r.reason.replace(/_/g, ' ').toUpperCase()}</span>
                                <span style={{ fontSize: 10, color: muted }}>{r.count} trades</span>
                              </div>
                              <div style={{ display: "flex", gap: 14, fontSize: 10, marginTop: 4 }}>
                                <span style={{ color: hitColor(r.winRate) }}>WR: {r.winRate}%</span>
                                <span style={{ color: r.avgPnl >= 0 ? green : red }}>Avg: ${r.avgPnl}</span>
                                <span style={{ color: r.avgPnlPct >= 0 ? green : red }}>Avg: {r.avgPnlPct}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* By Direction */}
                  {advancedPerf.byDirection && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>POR DIRECCION</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {["LONG", "SHORT"].map(dir => {
                          const d = advancedPerf.byDirection[dir];
                          if (!d || d.trades === 0) return null;
                          const dirColor = dir === "LONG" ? green : red;
                          return (
                            <div key={dir} style={{ background: bg3, borderRadius: 6, padding: "10px 14px", borderLeft: `3px solid ${dirColor}` }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: dirColor }}>{dir === "LONG" ? "▲ LONG" : "▼ SHORT"}</span>
                                <span style={{ fontSize: 11, color: muted }}>{d.trades} trades</span>
                              </div>
                              <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
                                <div>
                                  <span style={{ color: muted }}>Win Rate: </span>
                                  <span style={{ color: hitColor(d.winRate), fontWeight: 700 }}>{d.winRate}%</span>
                                </div>
                                <div>
                                  <span style={{ color: muted }}>P&L: </span>
                                  <span style={{ color: d.totalPnl >= 0 ? green : red, fontWeight: 700 }}>${d.totalPnl}</span>
                                </div>
                                <div>
                                  <span style={{ color: muted }}>W/L: </span>
                                  <span style={{ fontWeight: 600 }}>{d.wins}/{d.trades - d.wins}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Monthly Trend */}
                      {advancedPerf.tradesByMonth && advancedPerf.tradesByMonth.length > 1 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>P&L MENSUAL</div>
                          <div style={{ background: bg3, borderRadius: 8, padding: 10 }}>
                            <ResponsiveContainer width="100%" height={100}>
                              <BarChart data={advancedPerf.tradesByMonth}>
                                <XAxis dataKey="month" tick={{ fontSize: 8, fill: muted }} tickFormatter={m => m.substring(5)} />
                                <YAxis tick={{ fontSize: 8, fill: muted }} />
                                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, fontSize: 10 }}
                                  formatter={(v, name, props) => [`$${v} | WR: ${props.payload.winRate}% | ${props.payload.trades}t`, 'P&L']} />
                                <Bar dataKey="totalPnl" radius={[2, 2, 0, 0]}>
                                  {advancedPerf.tradesByMonth.map((entry, i) => (
                                    <Cell key={i} fill={entry.totalPnl >= 0 ? green : red} fillOpacity={0.8} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Open Positions */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={sTitle}>
            POSICIONES ABIERTAS ({paperPositions.length})
          </div>
          {paperPositions.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: muted, fontSize: 12 }}>
              No hay trades abiertos. El sistema abrirá automáticamente cuando detecte señales fuertes.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {paperPositions.map(pos => {
                const isLong = pos.direction === 'LONG';
                const pnlColor = pos.unrealizedPnl >= 0 ? green : red;
                return (
                  <div key={pos.id} style={{
                    background: bg3, borderRadius: 8, padding: "12px 16px",
                    borderLeft: `3px solid ${isLong ? green : red}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    flexWrap: "wrap", gap: 8
                  }}>
                    <div style={{ minWidth: 120 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>
                        <span style={{ color: isLong ? green : red }}>{isLong ? '▲' : '▼'}</span>{' '}
                        {pos.asset}
                      </div>
                      <div style={{ fontSize: 10, color: muted, fontFamily: "monospace" }}>
                        {pos.direction} · {pos.entry_signal_strength} · {formatDuration(pos.entry_at)}
                      </div>
                    </div>

                    <div style={{ textAlign: "center", minWidth: 100 }}>
                      <div style={{ fontSize: 10, color: muted }}>Entrada → Actual</div>
                      <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600 }}>
                        ${Number(pos.entry_price).toLocaleString()} → <span style={{ color: pnlColor }}>${pos.currentPrice ? pos.currentPrice.toLocaleString() : '...'}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <span style={{ background: "rgba(239,68,68,0.15)", color: red, padding: "2px 6px", borderRadius: 4, fontSize: 9, fontFamily: "monospace" }}>
                        SL ${Number(pos.stop_loss).toLocaleString()}
                      </span>
                      <span style={{ background: "rgba(0,212,170,0.15)", color: green, padding: "2px 6px", borderRadius: 4, fontSize: 9, fontFamily: "monospace" }}>
                        TP1 ${Number(pos.take_profit_1).toLocaleString()}
                      </span>
                      {pos.trailing_active && (
                        <span style={{ background: "rgba(245,158,11,0.15)", color: amber, padding: "2px 6px", borderRadius: 4, fontSize: 9, fontFamily: "monospace" }}>
                          TRAIL ${Number(pos.trailing_stop_current).toLocaleString()}
                        </span>
                      )}
                      <span style={{ background: pos.status === 'partial' ? "rgba(245,158,11,0.15)" : "transparent", color: pos.status === 'partial' ? amber : muted, padding: "2px 6px", borderRadius: 4, fontSize: 9, fontFamily: "monospace" }}>
                        {pos.status === 'partial' ? 'PARCIAL' : 'OPEN'}
                      </span>
                    </div>

                    <div style={{ textAlign: "right", minWidth: 90 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "monospace", color: pnlColor }}>
                        {pos.unrealizedPnl >= 0 ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 10, fontFamily: "monospace", color: pnlColor }}>
                        {pos.unrealizedPnlPercent >= 0 ? '+' : ''}{pos.unrealizedPnlPercent.toFixed(2)}%
                      </div>
                    </div>

                    <button
                      onClick={() => handleCloseTrade(pos.id)}
                      disabled={closingTrade === pos.id}
                      style={{
                        padding: "4px 10px", background: "rgba(239,68,68,0.15)",
                        border: `1px solid ${red}`, borderRadius: 4,
                        color: red, fontFamily: "monospace", fontSize: 10,
                        fontWeight: 700, cursor: "pointer", opacity: closingTrade === pos.id ? 0.5 : 1
                      }}
                    >
                      {closingTrade === pos.id ? '...' : 'CERRAR'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Position Correlation */}
        {correlationData && correlationData.pairs && correlationData.pairs.length > 0 && (
          <div style={{ ...card, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={sTitle}>CORRELACIÓN DE POSICIONES</div>
              <div style={{
                fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 4,
                background: correlationData.riskLevel === 'high' ? `${red}20` : correlationData.riskLevel === 'medium' ? `${amber}20` : `${green}20`,
                color: correlationData.riskLevel === 'high' ? red : correlationData.riskLevel === 'medium' ? amber : green,
                textTransform: "uppercase"
              }}>
                Riesgo: {correlationData.riskLevel}
              </div>
            </div>

            {/* Correlation pairs table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 11, marginBottom: 10 }}>
              <thead>
                <tr>
                  {["Par", "Correlación", "Nivel"].map((h, i) => (
                    <th key={i} style={{ textAlign: "left", padding: "4px 8px", color: muted, fontSize: 9, fontWeight: 600, borderBottom: `1px solid ${bg3}`, textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {correlationData.pairs.map((pair, i) => {
                  const absCorr = Math.abs(pair.correlation);
                  const corrColor = absCorr >= 0.75 ? red : absCorr >= 0.5 ? amber : absCorr >= 0.3 ? "#eab308" : green;
                  return (
                    <tr key={i}>
                      <td style={{ padding: "4px 8px", fontSize: 11 }}>
                        {pair.assetA} ↔ {pair.assetB}
                      </td>
                      <td style={{ padding: "4px 8px", fontWeight: 700, color: corrColor }}>
                        {pair.correlation > 0 ? '+' : ''}{pair.correlation}
                      </td>
                      <td style={{ padding: "4px 8px" }}>
                        <span style={{
                          fontSize: 9, padding: "2px 6px", borderRadius: 3,
                          background: `${corrColor}20`, color: corrColor, fontWeight: 600
                        }}>
                          {pair.level.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Diversification bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: muted, marginBottom: 4 }}>
                <span>Diversificación Efectiva</span>
                <span style={{ fontWeight: 700, color: text }}>{(correlationData.effectiveDiversification * 100).toFixed(0)}%</span>
              </div>
              <div style={{ height: 6, background: bg3, borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  width: `${Math.max(2, correlationData.effectiveDiversification * 100)}%`,
                  background: correlationData.effectiveDiversification >= 0.5 ? green : correlationData.effectiveDiversification >= 0.25 ? amber : red
                }} />
              </div>
            </div>

            {/* Warnings */}
            {correlationData.warnings && correlationData.warnings.length > 0 && (
              <div style={{ fontSize: 10, color: amber, marginTop: 6 }}>
                {correlationData.warnings.map((w, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>⚠ {w}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trade History */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={sTitle}>
              HISTORIAL DE TRADES ({historyTotal})
            </div>
          </div>

          {paperHistory.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: muted, fontSize: 12 }}>
              Aún no hay trades cerrados.
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 11 }}>
                  <thead>
                    <tr>
                      {["Asset", "Dir", "Entrada", "Salida", "P&L", "%", "Duración", "Razón"].map((h, i) => (
                        <th key={i} style={{
                          padding: "6px 8px", textAlign: "left", fontSize: 9, color: muted,
                          textTransform: "uppercase", letterSpacing: "0.08em",
                          borderBottom: `1px solid ${border}`, fontWeight: 700
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paperHistory.map((trade, i) => {
                      const pnl = parseFloat(trade.realized_pnl || 0);
                      const pnlPct = parseFloat(trade.realized_pnl_percent || 0);
                      const isWin = pnl > 0;
                      return (
                        <tr key={trade.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                          <td style={{ padding: "6px 8px", fontWeight: 600 }}>{trade.asset}</td>
                          <td style={{ padding: "6px 8px", color: trade.direction === 'LONG' ? green : red }}>{trade.direction === 'LONG' ? '▲ L' : '▼ S'}</td>
                          <td style={{ padding: "6px 8px" }}>${Number(trade.entry_price).toLocaleString()}</td>
                          <td style={{ padding: "6px 8px" }}>${Number(trade.exit_price).toLocaleString()}</td>
                          <td style={{ padding: "6px 8px", color: isWin ? green : red, fontWeight: 700 }}>
                            {isWin ? '+' : ''}${pnl.toFixed(2)}
                          </td>
                          <td style={{ padding: "6px 8px", color: isWin ? green : red }}>
                            {isWin ? '+' : ''}{pnlPct.toFixed(2)}%
                          </td>
                          <td style={{ padding: "6px 8px", color: muted }}>{formatDuration(trade.entry_at, trade.exit_at)}</td>
                          <td style={{ padding: "6px 8px" }}>
                            <span style={{
                              padding: "2px 6px", borderRadius: 4, fontSize: 9,
                              background: trade.exit_reason === 'stop_loss' ? "rgba(239,68,68,0.15)" :
                                trade.exit_reason?.includes('take_profit') ? "rgba(0,212,170,0.15)" :
                                trade.exit_reason === 'trailing_stop' ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)",
                              color: trade.exit_reason === 'stop_loss' ? red :
                                trade.exit_reason?.includes('take_profit') ? green :
                                trade.exit_reason === 'trailing_stop' ? amber : muted
                            }}>
                              {(trade.exit_reason || 'unknown').replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {historyTotal > PAPER_HISTORY_PAGE_SIZE && (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" }}>
                  <button onClick={() => setHistoryPage(p => Math.max(0, p - 1))} disabled={historyPage === 0}
                    style={{ padding: "4px 12px", background: bg3, border: `1px solid ${border}`, borderRadius: 4, color: historyPage === 0 ? muted : text, fontFamily: "monospace", fontSize: 10, cursor: historyPage === 0 ? "default" : "pointer" }}>
                    ← Prev
                  </button>
                  <span style={{ fontSize: 10, color: muted, fontFamily: "monospace" }}>
                    {historyPage + 1} / {Math.ceil(historyTotal / PAPER_HISTORY_PAGE_SIZE)}
                  </span>
                  <button onClick={() => setHistoryPage(p => p + 1)} disabled={(historyPage + 1) * PAPER_HISTORY_PAGE_SIZE >= historyTotal}
                    style={{ padding: "4px 12px", background: bg3, border: `1px solid ${border}`, borderRadius: 4, color: (historyPage + 1) * PAPER_HISTORY_PAGE_SIZE >= historyTotal ? muted : text, fontFamily: "monospace", fontSize: 10, cursor: (historyPage + 1) * PAPER_HISTORY_PAGE_SIZE >= historyTotal ? "default" : "pointer" }}>
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Paper-specific settings: capital & account */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            onClick={() => setShowConfig(!showConfig)}>
            <div style={sTitle}>⚙ CUENTA PAPER</div>
            <span style={{ color: muted, fontSize: 12 }}>{showConfig ? '▲' : '▼'}</span>
          </div>

          {showConfig && configForm && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Capital Inicial ($)</label>
                  <input type="number" value={configForm.initial_capital || 10000}
                    onChange={e => setConfigForm(prev => ({ ...prev, initial_capital: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Trading Habilitado</label>
                  <label style={{ fontSize: 10, color: muted, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginTop: 4 }}>
                    <input type="checkbox" checked={configForm.is_enabled !== false}
                      onChange={e => setConfigForm(prev => ({ ...prev, is_enabled: e.target.checked }))} />
                    {configForm.is_enabled !== false ? 'Activo' : 'Pausado'}
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <button onClick={handleSaveConfig} disabled={savingConfig}
                  style={{
                    padding: "8px 20px", background: `linear-gradient(135deg, ${purple}, #7c3aed)`,
                    border: "none", borderRadius: 6, color: "#fff",
                    fontFamily: "monospace", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    opacity: savingConfig ? 0.6 : 1
                  }}>
                  {savingConfig ? 'Guardando...' : '💾 GUARDAR'}
                </button>

                {!confirmReset ? (
                  <button onClick={() => setConfirmReset(true)}
                    style={{
                      padding: "8px 20px", background: "rgba(239,68,68,0.1)",
                      border: `1px solid ${red}`, borderRadius: 6,
                      color: red, fontFamily: "monospace", fontSize: 12, fontWeight: 700, cursor: "pointer"
                    }}>
                    🔄 RESET CUENTA
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: red }}>¿Seguro? Cierra todos los trades y resetea capital.</span>
                    <button onClick={handleReset} style={{
                      padding: "6px 14px", background: red, border: "none", borderRadius: 4,
                      color: "#fff", fontFamily: "monospace", fontSize: 11, fontWeight: 700, cursor: "pointer"
                    }}>SÍ</button>
                    <button onClick={() => setConfirmReset(false)} style={{
                      padding: "6px 14px", background: bg3, border: `1px solid ${border}`, borderRadius: 4,
                      color: muted, fontFamily: "monospace", fontSize: 11, cursor: "pointer"
                    }}>NO</button>
                  </div>
                )}
              </div>

              <div style={{ fontSize: 9, color: muted, marginTop: 12, padding: 8, background: `${purple}11`, borderRadius: 4 }}>
                Para configurar parámetros de estrategia (riesgo, ATR, señales, portfolio), usa la tab <strong>⚙ ESTRATEGIA</strong>
              </div>
            </div>
          )}
        </div>

        {/* Extra stats */}
        {paperMetrics && paperMetrics.totalTrades > 0 && (
          <div style={{ ...card, padding: "16px 20px" }}>
            <div style={sTitle}>ESTADÍSTICAS DETALLADAS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              {[
                { label: "Promedio Ganancia", value: `+$${(paperMetrics.avgProfit || 0).toFixed(2)}`, color: green },
                { label: "Promedio Pérdida", value: `-$${(paperMetrics.avgLoss || 0).toFixed(2)}`, color: red },
                { label: "Mejor Trade", value: paperMetrics.bestTrade ? `${paperMetrics.bestTrade.asset} +$${paperMetrics.bestTrade.pnl.toFixed(2)}` : '-', color: green },
                { label: "Peor Trade", value: paperMetrics.worstTrade ? `${paperMetrics.worstTrade.asset} $${paperMetrics.worstTrade.pnl.toFixed(2)}` : '-', color: red },
                { label: "Tiempo Promedio", value: `${(paperMetrics.avgHoldingTimeHours || 0).toFixed(1)}h`, color: text },
                { label: "Racha Actual", value: `${paperMetrics.currentStreak || 0} ${paperMetrics.streakType === 'win' ? 'victorias' : paperMetrics.streakType === 'loss' ? 'derrotas' : '-'}`, color: paperMetrics.streakType === 'win' ? green : paperMetrics.streakType === 'loss' ? red : muted },
              ].map((stat, i) => (
                <div key={i} style={{ background: bg3, padding: "10px 14px", borderRadius: 6 }}>
                  <div style={{ fontSize: 9, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {paperLoading && (
          <div style={{ textAlign: "center", padding: 10, fontSize: 10, color: muted, fontFamily: "monospace" }}>
            Actualizando datos...
          </div>
        )}
      </div>
    );
  };

  // ─── LOADING STATE ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        fontFamily: "'Inter', sans-serif",
        background: bg,
        minHeight: "100vh",
        color: text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>◈</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Cargando SENTIX Pro...</div>
          <div style={{ fontSize: 13, color: muted, marginTop: 8 }}>Conectando con APIs en tiempo real</div>
        </div>
      </div>
    );
  }

  // ─── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: "'Inter', sans-serif",
      background: bg,
      minHeight: "100vh",
      color: text,
      padding: 0
    }}>
      {/* Grid Background */}
      <div style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(168,85,247,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.015) 1px, transparent 1px)",
        backgroundSize: "50px 50px",
        zIndex: 0
      }} />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 24px", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 18,
          marginBottom: 24,
          borderBottom: `1px solid ${border}`,
          flexWrap: "wrap",
          gap: 16
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 42,
              height: 42,
              border: `2px solid ${purple}`,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: purple,
              fontWeight: 700,
              boxShadow: `0 0 20px rgba(168,85,247,0.3)`
            }}>◈</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.02em" }}>
                SENTIX <span style={{ fontSize: 12, color: purple, fontWeight: 500 }}>PRO</span>
              </div>
              <div style={{ fontSize: 10, color: muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Real-time Trading System · Connected
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontFamily: "monospace", color: marketData?.macro?.fearGreed < 30 ? red : amber, fontWeight: 700 }}>
                {marketData?.macro?.fearLabel || 'Loading...'} {marketData?.macro?.fearGreed || '--'}/100
              </div>
              <div style={{ fontSize: 10, color: muted, fontFamily: "monospace" }}>
                BTC Dom {marketData?.macro?.btcDom || '--'}%
              </div>
            </div>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: green,
              boxShadow: `0 0 8px ${green}`
            }} />
            {/* Monitor — admin only */}
            {authEnabled && isAdmin && (
              <button
                onClick={() => setTab('apm')}
                style={{
                  padding: '6px 14px',
                  background: tab === 'apm' ? 'rgba(168,85,247,0.25)' : 'rgba(168,85,247,0.1)',
                  border: `1px solid ${tab === 'apm' ? 'rgba(168,85,247,0.5)' : 'rgba(168,85,247,0.2)'}`,
                  borderRadius: 8,
                  color: '#a855f7',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📡 Monitor
              </button>
            )}
            {/* Help — always visible */}
            <button
              onClick={() => setTab('guide')}
              style={{
                padding: '6px 14px',
                background: tab === 'guide' ? 'rgba(107,114,128,0.25)' : 'rgba(107,114,128,0.1)',
                border: `1px solid ${tab === 'guide' ? 'rgba(107,114,128,0.4)' : 'rgba(107,114,128,0.2)'}`,
                borderRadius: 8,
                color: '#9ca3af',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📖 Ayuda
            </button>
            {authEnabled && isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                style={{
                  padding: '6px 14px',
                  background: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 8,
                  color: '#6366f1',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ⚙ Admin
              </button>
            )}
            {authEnabled && authUser && (
              <button
                onClick={() => signOut()}
                style={{
                  padding: '6px 14px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8,
                  color: '#ef4444',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Salir
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { k: "dashboard", label: "📊 DASHBOARD", desc: "Overview" },
            { k: "signals", label: "🎯 SEÑALES", desc: "Todas las alertas" },
            { k: "execution", label: "⚡ EJECUCIÓN", desc: "Trading y métricas" },
            { k: "strategy", label: "⚙ ESTRATEGIA", desc: "Config, Backtest y Optimización" },
            { k: "alerts", label: "🔔 ALERTAS", desc: "Configuración" },
            { k: "portfolio", label: "💼 PORTFOLIO", desc: "Tus posiciones" }
          ].map(({ k, label, desc }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                flex: "1 1 auto",
                minWidth: 140,
                padding: "12px 18px",
                background: tab === k ? `linear-gradient(135deg, ${purple}, #7c3aed)` : bg2,
                border: tab === k ? "none" : `1px solid ${border}`,
                borderRadius: 8,
                color: tab === k ? "#fff" : text,
                fontFamily: "monospace",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "center"
              }}
            >
              <div>{label}</div>
              <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>{desc}</div>
            </button>
          ))}
        </div>

        {/* Tab Content — ALL tabs use direct function calls to prevent remount on 30s re-render.
            All hooks lifted to parent level. */}
        {tab === "dashboard" && <DashboardTab marketData={marketData} signals={signals} paperMetrics={paperMetrics} paperHistory={paperHistory} paperPositions={paperPositions} paperConfig={paperConfig} realtimeEquityCurve={realtimeEquityCurve} backtestHistory={backtestHistory} backtestEquityCurve={backtestEquityCurve} systemHealth={systemHealth} sseConnected={sseConnected} lastUpdate={lastUpdate} setTab={setTab} setStrategySubTab={setStrategySubTab} apiUrl={API_URL} />}
        {tab === "signals" && <SignalsTab signals={signals} signalAccuracy={signalAccuracy} accuracyDays={accuracyDays} setAccuracyDays={setAccuracyDays} fetchAccuracy={fetchAccuracy} />}
        {tab === "portfolio" && <PortfolioTab
          portfolio={portfolio} wallets={wallets} marketData={marketData}
          portfolioLoading={portfolioLoading} walletsLoading={walletsLoading}
          showAddForm={ptShowAddForm} setShowAddForm={setPtShowAddForm}
          showBatchUpload={ptShowBatchUpload} setShowBatchUpload={setPtShowBatchUpload}
          showCreateWallet={ptShowCreateWallet} setShowCreateWallet={setPtShowCreateWallet}
          uploadStatus={ptUploadStatus} setUploadStatus={setPtUploadStatus}
          uploading={ptUploading} setUploading={setPtUploading}
          saving={ptSaving} setSaving={setPtSaving}
          selectedWalletFilter={ptSelectedWalletFilter} setSelectedWalletFilter={setPtSelectedWalletFilter}
          newPosition={ptNewPosition} setNewPosition={setPtNewPosition}
          newWallet={ptNewWallet} setNewWallet={setPtNewWallet}
          uploadWalletId={ptUploadWalletId} setUploadWalletId={setPtUploadWalletId}
          calculatePortfolioValue={calculatePortfolioValue} calculatePortfolioPnL={calculatePortfolioPnL}
          fetchWallets={fetchWallets} fetchPortfolio={fetchPortfolio}
          addToPortfolio={addToPortfolio} removeFromPortfolio={removeFromPortfolio}
          authFetch={authFetch} apiUrl={API_URL} userId={USER_ID}
        />}
        {tab === "alerts" && <AlertsTab alertConfig={alertConfig} setAlertConfig={setAlertConfig} alerts={alerts} alertTestResult={alertTestResult} setAlertTestResult={setAlertTestResult} alertTesting={alertTesting} setAlertTesting={setAlertTesting} alertShowFilters={alertShowFilters} setAlertShowFilters={setAlertShowFilters} alertFilterForm={alertFilterForm} setAlertFilterForm={setAlertFilterForm} alertSavingFilters={alertSavingFilters} setAlertSavingFilters={setAlertSavingFilters} alertFilterSaveMsg={alertFilterSaveMsg} setAlertFilterSaveMsg={setAlertFilterSaveMsg} apiUrl={API_URL} />}
        {tab === "execution" && <ExecutionTab
          execSubTab={execSubTab} setExecSubTab={setExecSubTab}
          execOrders={execOrders} execRiskDashboard={execRiskDashboard} execAuditLog={execAuditLog}
          execKillSwitchActive={execKillSwitchActive} execMode={execMode} execAutoExecute={execAutoExecute}
          execManualOrdersEnabled={execManualOrdersEnabled} execFeedback={execFeedback} execLoading={execLoading}
          paperConfig={paperConfig} paperPositions={paperPositions} paperHistory={paperHistory} paperMetrics={paperMetrics}
          paperConfigForm={paperConfigForm} setPaperConfigForm={setPaperConfigForm}
          paperClosingTrade={paperClosingTrade} setPaperClosingTrade={setPaperClosingTrade}
          paperHistoryPage={paperHistoryPage} setPaperHistoryPage={setPaperHistoryPage}
          paperHistoryTotal={paperHistoryTotal} paperLoading={paperLoading}
          correlationData={correlationData} showAdvancedPerf={showAdvancedPerf} setShowAdvancedPerf={setShowAdvancedPerf}
          advancedPerfDays={advancedPerfDays} setAdvancedPerfDays={setAdvancedPerfDays} advancedPerf={advancedPerf}
          setExecMode={setExecMode} setExecAutoExecute={setExecAutoExecute} setExecManualOrdersEnabled={setExecManualOrdersEnabled}
          setExecFeedback={setExecFeedback} setPaperConfig={setPaperConfig}
          handleKillSwitch={handleKillSwitch} handleCreateOrder={handleCreateOrder}
          handleCancelOrder={handleCancelOrder} handleSubmitOrder={handleSubmitOrder}
          fetchDashboardPaper={fetchDashboardPaper} loadExecutionData={loadExecutionData}
          authFetch={authFetch} apiUrl={API_URL} userId={USER_ID}
        />}
        {tab === "strategy" && StrategyTab()}
        {/* Paper tab removed — content consolidated into Execution tab */}
        {tab === "apm" && <APMTab apmData={apmData} systemHealth={systemHealth} />}
        {tab === "guide" && <GuideTab />}

        {/* Footer */}
        <div style={{
          textAlign: "center",
          fontSize: 10,
          color: "#1f2937",
          fontFamily: "monospace",
          padding: "16px 0",
          borderTop: `1px solid ${border}`,
          marginTop: 20,
          lineHeight: 1.8
        }}>
          SENTIX PRO v2.0 · Real-time Trading System · Connected to Live APIs<br />
          ⚠ Herramienta de análisis. No constituye asesoramiento financiero.
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        button:hover:not(:disabled) { opacity: 0.85 !important; }
        * { box-sizing: border-box; }
        input:focus, select:focus { border-color: ${purple} !important; outline: none; }
        
        /* Mobile responsive */
        @media (max-width: 768px) {
          .grid-auto-fit { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

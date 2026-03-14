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

// Execution components
import OrderEntryForm from './components/execution/OrderEntryForm';
import OrderBook from './components/execution/OrderBook';
import PositionMonitor from './components/execution/PositionMonitor';
import RiskDashboard from './components/execution/RiskDashboard';
import KillSwitchButton from './components/execution/KillSwitchButton';
import ExecutionModeToggle from './components/execution/ExecutionModeToggle';
import ExecutionAuditLog from './components/execution/ExecutionAuditLog';

// Extracted tabs
import GuideTab from './components/tabs/GuideTab';
import BacktestTab from './components/tabs/BacktestTab';
import OptimizeTab from './components/tabs/OptimizeTab';

// Custom hooks
import { useBacktest } from './hooks/useBacktest';
import { useOptimization } from './hooks/useOptimization';

// Charts
import CandlestickChart from './components/charts/CandlestickChart';

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
  const [chartAsset, setChartAsset] = useState('bitcoin');
  const [chartInterval, setChartInterval] = useState('1h');

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

  // ─── COMPONENTS ────────────────────────────────────────────────────────────

  const DashboardTab = () => {
    if (!marketData || !marketData.crypto) {
      return <div style={{ padding: 40, textAlign: 'center', color: muted }}>Loading market data...</div>;
    }

    const topGainers = Object.entries(marketData.crypto)
      .sort((a, b) => b[1].change24h - a[1].change24h)
      .slice(0, 3);

    const topLosers = Object.entries(marketData.crypto)
      .sort((a, b) => a[1].change24h - b[1].change24h)
      .slice(0, 3);

    return (
      <div>
        {/* Live Status */}
        <div style={{
          background: "rgba(0, 212, 170, 0.1)",
          border: `1px solid ${green}`,
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: green,
              boxShadow: `0 0 10px ${green}`,
              animation: "pulse 2s infinite"
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: green }}>
              🔴 LIVE - {sseConnected ? 'SSE tiempo real' : 'Polling cada 30s'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: sseConnected ? '#22c55e' : '#ef4444',
              boxShadow: sseConnected ? '0 0 6px #22c55e' : '0 0 6px #ef4444'
            }} />
            <span style={{ fontSize: 11, color: muted, fontFamily: 'monospace' }}>
              {sseConnected ? 'SSE' : 'Polling'}
              {lastUpdate && ` · ${lastUpdate.toLocaleTimeString()}`}
            </span>
          </div>
        </div>

        {/* Macro Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
          {[
            { 
              label: "Fear & Greed", 
              value: marketData.macro?.fearGreed || 'N/A',
              sublabel: marketData.macro?.fearLabel || '',
              color: (marketData.macro?.fearGreed || 0) < 30 ? red : (marketData.macro?.fearGreed || 0) > 70 ? green : amber
            },
            { 
              label: "BTC Dominance", 
              value: `${marketData.macro?.btcDom || 'N/A'}%`,
              sublabel: "Market share",
              color: amber 
            },
            {
              label: "DXY (Dollar)",
              value: marketData.macro?.dxy || '—',
              sublabel: marketData.macro?.dxyTrend === 'rising' ? 'Rising (bearish crypto)' : marketData.macro?.dxyTrend === 'falling' ? 'Falling (bullish crypto)' : 'Stable',
              color: marketData.macro?.dxyTrend === 'rising' ? red : marketData.macro?.dxyTrend === 'falling' ? green : muted
            },
            {
              label: "Total Market Cap",
              value: formatLargeNumber(marketData.macro?.globalMcap || 0),
              sublabel: "All cryptocurrencies",
              color: blue
            },
          ].map(({ label, value, sublabel, color }) => (
            <div key={label} style={card}>
              <div style={{ ...sTitle, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              {sublabel && <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>{sublabel}</div>}
            </div>
          ))}
        </div>

        {/* Top Movers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div style={card}>
            <div style={sTitle}>🚀 TOP GAINERS 24H</div>
            {topGainers.map(([id, data]) => (
              <div key={id} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: `1px solid ${border}`
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{id.toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: muted }}>{formatPrice(data.price)}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: green }}>
                  +{data.change24h.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={sTitle}>📉 TOP LOSERS 24H</div>
            {topLosers.map(([id, data]) => (
              <div key={id} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: `1px solid ${border}`
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{id.toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: muted }}>{formatPrice(data.price)}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: red }}>
                  {data.change24h.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Signals Preview */}
        {signals.length > 0 && (
          <div style={card}>
            <div style={sTitle}>🎯 SEÑALES ACTIVAS (Top 5)</div>
            <div style={{ display: "grid", gap: 10 }}>
              {signals.slice(0, 5).map((signal, i) => {
                const ac = signal.action === 'BUY' ? green : signal.action === 'SELL' ? red : amber;
                const cc = signal.timeframes?.confluence === 'strong' ? green : signal.timeframes?.confluence === 'moderate' ? amber : signal.timeframes?.confluence === 'conflicting' ? red : muted;
                return (
                  <div key={i} style={{
                    background: bg3,
                    borderLeft: `3px solid ${ac}`,
                    borderRadius: 6,
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10
                  }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                        {signal.action === 'BUY' ? '🟢' : signal.action === 'SELL' ? '🔴' : '⚪'} {signal.asset}
                        {signal.timeframes?.confluence && (
                          <span style={{
                            fontSize: 8,
                            color: cc,
                            fontWeight: 700,
                            background: `${cc}18`,
                            padding: "2px 6px",
                            borderRadius: 3,
                            textTransform: "uppercase"
                          }}>
                            {signal.timeframes.confluence === 'strong' ? '3/3' : signal.timeframes.confluence === 'moderate' ? '2/3' : '!'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                        {signal.tradeLevels ? `R:R ${signal.tradeLevels.riskRewardRatio?.toFixed(1)} · ` : ''}{signal.reasons?.substring(0, 80)}{signal.reasons?.length > 80 ? '...' : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: amber, fontWeight: 700 }}>
                        {signal.confidence}% confianza
                      </div>
                      <div style={{ fontSize: 11, color: muted }}>
                        Score: {signal.score}/100
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setTab('signals')}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "10px",
                background: bg3,
                border: `1px solid ${border}`,
                borderRadius: 6,
                color: text,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Ver todas las señales →
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* PAPER TRADING PERFORMANCE                                            */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div style={{ ...card, marginTop: 16 }}>
          <div style={sTitle}>📊 PAPER TRADING PERFORMANCE</div>
          {(() => {
            const pm = paperMetrics;
            const closedTrades = paperHistory.filter(t => t.exit_price != null);
            const currentCapital = pm?.currentCapital || paperConfig?.initial_capital || 10000;
            const totalPnl = pm?.totalPnl || 0;
            const winRate = pm?.winRate || 0;
            const openCount = paperPositions.filter(p => p.status === 'open').length;
            const maxDD = pm?.maxDrawdown || 0;
            const profitFactor = pm?.profitFactor || 0;

            return (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
                  {[
                    { label: "P&L Total", value: `$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? green : red },
                    { label: "Win Rate", value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? green : red },
                    { label: "Capital Actual", value: `$${currentCapital.toFixed(0)}`, color: text },
                    { label: "Posiciones Abiertas", value: openCount, color: openCount > 0 ? amber : muted },
                    { label: "Max Drawdown", value: `${maxDD.toFixed(2)}%`, color: maxDD > 10 ? red : maxDD > 5 ? amber : green },
                    { label: "Profit Factor", value: profitFactor.toFixed(2), color: profitFactor >= 1.5 ? green : profitFactor >= 1 ? amber : red },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: bg3, borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Win Rate Ring */}
                {closedTrades.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: "50%",
                      background: `conic-gradient(${green} ${winRate * 3.6}deg, ${bg3} ${winRate * 3.6}deg)`,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: bg2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: text }}>
                        {winRate.toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{closedTrades.length} trades cerrados</div>
                      <div style={{ fontSize: 11, color: muted }}>
                        {pm?.winCount || 0} ganados · {pm?.lossCount || 0} perdidos
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Trades */}
                {closedTrades.length > 0 ? (
                  <div>
                    <div style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Últimos trades</div>
                    {closedTrades.slice(-5).reverse().map((t, i) => {
                      const pnl = t.pnl || ((t.exit_price - t.entry_price) * t.size * (t.direction === 'SHORT' ? -1 : 1));
                      const ago = t.closed_at ? (() => {
                        const mins = Math.floor((Date.now() - new Date(t.closed_at).getTime()) / 60000);
                        if (mins < 60) return `${mins}m`;
                        if (mins < 1440) return `${Math.floor(mins / 60)}h`;
                        return `${Math.floor(mins / 1440)}d`;
                      })() : '';
                      return (
                        <div key={i} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "6px 0", borderBottom: `1px solid ${border}`
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10, color: t.direction === 'LONG' ? green : red, fontWeight: 700 }}>
                              {t.direction === 'LONG' ? '▲' : '▼'}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{t.asset}</span>
                            {t.exit_reason && (
                              <span style={{
                                fontSize: 8, padding: "2px 5px", borderRadius: 3,
                                background: `${muted}22`, color: muted, fontWeight: 600, textTransform: "uppercase"
                              }}>
                                {t.exit_reason}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: pnl >= 0 ? green : red }}>
                              {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                            </span>
                            {ago && <span style={{ fontSize: 10, color: muted }}>{ago}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: 20, textAlign: "center", color: muted, fontSize: 12 }}>
                    No hay trades cerrados aún
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* CURVA DE EQUITY (Paper Trading) — Real-time + trade-derived        */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {(() => {
          const initialCap = paperConfig?.initial_capital || 10000;

          // Prefer real-time snapshots if available, fallback to trade-derived
          const hasRealtime = realtimeEquityCurve && realtimeEquityCurve.length >= 2;
          let equityData;
          let isRealtime = false;

          if (hasRealtime) {
            isRealtime = true;
            let peak = initialCap;
            equityData = realtimeEquityCurve.map((pt) => {
              const eq = parseFloat(pt.equity);
              if (eq > peak) peak = eq;
              const dd = peak > 0 ? ((peak - eq) / peak) * 100 : 0;
              return {
                date: new Date(pt.timestamp).toLocaleDateString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                equity: eq,
                unrealized: parseFloat(pt.unrealized || 0),
                drawdown: Math.round(dd * 100) / 100
              };
            });
          } else {
            equityData = computePaperEquityCurve(paperHistory, initialCap);
          }

          if (equityData.length < 2) return null;

          const latestEquity = equityData[equityData.length - 1]?.equity || initialCap;
          const totalReturn = ((latestEquity - initialCap) / initialCap * 100).toFixed(2);
          const returnColor = totalReturn >= 0 ? green : red;

          return (
            <div style={{ ...card, marginTop: 4 }}>
              <div style={{ ...sTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📈 CURVA DE EQUITY {isRealtime ? '(Real-time)' : '(Paper Trading)'}</span>
                <span style={{ fontSize: 11, color: returnColor, fontWeight: 600 }}>
                  {totalReturn >= 0 ? '+' : ''}{totalReturn}%
                </span>
              </div>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={green} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={border} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: muted }} axisLine={{ stroke: border }} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: muted }} axisLine={{ stroke: border }} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(1) + 'k' : v}`} />
                    <Tooltip
                      contentStyle={{ background: bg2, border: `1px solid ${border}`, borderRadius: 6, fontSize: 11, color: text }}
                      formatter={(value, name) => [
                        name === 'equity' ? `$${value.toFixed(2)}` : name === 'unrealized' ? `$${value.toFixed(2)}` : `${value.toFixed(2)}%`,
                        name === 'equity' ? 'Equity' : name === 'unrealized' ? 'Unrealized P&L' : 'Drawdown'
                      ]}
                    />
                    <ReferenceLine y={initialCap} stroke={muted} strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="equity" stroke={green} strokeWidth={2} fill="url(#equityGradient)" dot={false} activeDot={{ r: 3, fill: green }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* P&L DIARIO                                                           */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {(() => {
          const dailyData = computeDailyPnl(paperHistory);
          if (dailyData.length < 1) return null;
          return (
            <div style={{ ...card, marginTop: 4 }}>
              <div style={sTitle}>📊 P&L DIARIO</div>
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={border} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: muted }} axisLine={{ stroke: border }} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: muted }} axisLine={{ stroke: border }} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ background: bg2, border: `1px solid ${border}`, borderRadius: 6, fontSize: 11, color: text }}
                      formatter={(value, name, props) => [`$${value.toFixed(2)} (${props.payload.trades} trades)`, 'P&L']}
                    />
                    <ReferenceLine y={0} stroke={muted} strokeDasharray="3 3" />
                    <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={40}>
                      {dailyData.map((entry, index) => (
                        <Cell key={index} fill={entry.pnl >= 0 ? green : red} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* RENDIMIENTO POR ACTIVO                                               */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {(() => {
          const assetData = computeAssetPerformance(paperHistory);
          if (assetData.length < 1) return null;
          return (
            <div style={{ ...card, marginTop: 4 }}>
              <div style={sTitle}>🎯 RENDIMIENTO POR ACTIVO</div>
              <div style={{ width: '100%', height: Math.max(150, assetData.length * 36) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assetData} layout="vertical" margin={{ top: 5, right: 40, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={border} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: muted }} axisLine={{ stroke: border }} tickLine={false} />
                    <YAxis type="category" dataKey="asset" tick={{ fontSize: 10, fill: text, fontWeight: 600 }} axisLine={{ stroke: border }} tickLine={false} width={55} />
                    <Tooltip
                      contentStyle={{ background: bg2, border: `1px solid ${border}`, borderRadius: 6, fontSize: 11, color: text }}
                      formatter={(value, name) => [value, name === 'wins' ? 'Wins' : 'Losses']}
                    />
                    <Bar dataKey="wins" fill={green} stackId="a" barSize={16} />
                    <Bar dataKey="losses" fill={red} stackId="a" radius={[0, 3, 3, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {assetData.map(a => (
                  <div key={a.asset} style={{ background: bg3, borderRadius: 4, padding: "4px 8px", fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontWeight: 700, color: text }}>{a.asset}</span>
                    <span style={{ color: a.totalPnl >= 0 ? green : red, fontWeight: 600 }}>
                      {a.totalPnl >= 0 ? '+' : ''}{a.totalPnl.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* DISTRIBUCIÓN DE SEÑALES                                             */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div style={{ ...card, marginTop: 4 }}>
          <div style={sTitle}>📡 DISTRIBUCIÓN DE SEÑALES</div>
          {(() => {
            const buySignals = signals.filter(s => s.action === 'BUY');
            const sellSignals = signals.filter(s => s.action === 'SELL');
            const holdSignals = signals.filter(s => s.action === 'HOLD');
            const total = signals.length;
            const avgConf = (arr) => arr.length > 0 ? (arr.reduce((s, x) => s + (x.confidence || 0), 0) / arr.length).toFixed(0) : '—';

            const buyPct = total > 0 ? (buySignals.length / total * 100) : 0;
            const sellPct = total > 0 ? (sellSignals.length / total * 100) : 0;
            const holdPct = total > 0 ? (holdSignals.length / total * 100) : 0;

            return (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 12 }}>
                  {[
                    { label: "BUY", count: buySignals.length, conf: avgConf(buySignals), color: green },
                    { label: "SELL", count: sellSignals.length, conf: avgConf(sellSignals), color: red },
                    { label: "HOLD", count: holdSignals.length, conf: avgConf(holdSignals), color: amber },
                    { label: "TOTAL", count: total, conf: avgConf(signals), color: purple },
                  ].map(({ label, count, conf, color }) => (
                    <div key={label} style={{ background: bg3, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color }}>{count}</div>
                      <div style={{ fontSize: 10, color: muted }}>avg {conf}%</div>
                    </div>
                  ))}
                </div>

                {/* Stacked bar */}
                {total > 0 && (
                  <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: bg3 }}>
                    {buyPct > 0 && <div style={{ width: `${buyPct}%`, background: green }} />}
                    {sellPct > 0 && <div style={{ width: `${sellPct}%`, background: red }} />}
                    {holdPct > 0 && <div style={{ width: `${holdPct}%`, background: amber }} />}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ÚLTIMO BACKTEST                                                      */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div style={{ ...card, marginTop: 4 }}>
          <div style={sTitle}>🔬 ÚLTIMO BACKTEST</div>
          {(() => {
            const latest = backtestHistory.length > 0 ? backtestHistory[0] : null;
            if (!latest) {
              return (
                <div style={{ padding: 20, textAlign: "center", color: muted, fontSize: 12 }}>
                  Ejecuta un backtest desde la pestaña <span style={{ color: purple, cursor: "pointer", fontWeight: 700 }} onClick={() => { setTab('strategy'); setStrategySubTab('backtest'); }}>ESTRATEGIA → Backtest</span>
                </div>
              );
            }

            const statusColor = latest.status === 'completed' ? green : latest.status === 'running' ? amber : red;
            const dateStr = latest.completed_at || latest.created_at;
            const ago = dateStr ? (() => {
              const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
              if (mins < 60) return `hace ${mins}m`;
              if (mins < 1440) return `hace ${Math.floor(mins / 60)}h`;
              return `hace ${Math.floor(mins / 1440)}d`;
            })() : '';

            return (
              <div>
                {/* Info row */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12, fontSize: 11 }}>
                  <span style={{ fontWeight: 700, color: text }}>{latest.asset}</span>
                  <span style={{ color: muted }}>{latest.days}d · {latest.step_interval || '4h'}</span>
                  <span style={{
                    fontSize: 9, padding: "2px 6px", borderRadius: 3,
                    background: `${statusColor}22`, color: statusColor, fontWeight: 700, textTransform: "uppercase"
                  }}>
                    {latest.status}
                  </span>
                  {ago && <span style={{ color: muted }}>{ago}</span>}
                </div>

                {/* Metric cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
                  {[
                    { label: "Total Trades", value: latest.total_trades || 0, color: text },
                    { label: "Win Rate", value: `${(latest.win_rate || 0).toFixed(1)}%`, color: (latest.win_rate || 0) >= 50 ? green : red },
                    { label: "P&L", value: `$${(latest.total_pnl || 0).toFixed(2)}`, color: (latest.total_pnl || 0) >= 0 ? green : red },
                    { label: "P&L %", value: `${(latest.total_pnl_percent || 0).toFixed(2)}%`, color: (latest.total_pnl_percent || 0) >= 0 ? green : red },
                    { label: "Max DD%", value: `${(latest.max_drawdown_percent || 0).toFixed(2)}%`, color: (latest.max_drawdown_percent || 0) > 10 ? red : amber },
                    { label: "Profit Factor", value: (latest.profit_factor || 0).toFixed(2), color: (latest.profit_factor || 0) >= 1.5 ? green : (latest.profit_factor || 0) >= 1 ? amber : red },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: bg3, borderRadius: 6, padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* BACKTEST EQUITY CURVE                                                */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {(() => {
          if (!backtestEquityCurve || backtestEquityCurve.length < 2) return null;
          const chartData = backtestEquityCurve.map((point) => ({
            date: new Date(point.timestamp).toLocaleDateString('es', { month: 'short', day: 'numeric' }),
            equity: point.equity
          }));
          // Downsample if too many points
          const maxPoints = 100;
          let displayData = chartData;
          if (chartData.length > maxPoints) {
            const step = Math.ceil(chartData.length / maxPoints);
            displayData = chartData.filter((_, i) => i % step === 0 || i === chartData.length - 1);
          }
          const initialEquity = displayData[0]?.equity || 10000;
          const finalEquity = displayData[displayData.length - 1]?.equity || initialEquity;
          const returnPct = ((finalEquity - initialEquity) / initialEquity * 100).toFixed(2);
          const minEq = Math.min(...displayData.map(d => d.equity));
          const maxEq = Math.max(...displayData.map(d => d.equity));
          const lineColor = parseFloat(returnPct) >= 0 ? green : red;

          return (
            <div style={{ ...card, marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={sTitle}>📉 BACKTEST EQUITY CURVE</div>
                <div style={{ fontSize: 11, color: lineColor, fontWeight: 700 }}>
                  {parseFloat(returnPct) >= 0 ? '+' : ''}{returnPct}%
                </div>
              </div>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={displayData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={border} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: muted }} axisLine={{ stroke: border }} tickLine={false} interval={Math.floor(displayData.length / 6)} />
                    <YAxis tick={{ fontSize: 9, fill: muted }} axisLine={{ stroke: border }} tickLine={false} domain={[Math.floor(minEq * 0.98), Math.ceil(maxEq * 1.02)]} tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(1) + 'k' : v}`} />
                    <Tooltip
                      contentStyle={{ background: bg2, border: `1px solid ${border}`, borderRadius: 6, fontSize: 11, color: text }}
                      formatter={(value) => [`$${value.toFixed(2)}`, 'Equity']}
                    />
                    <ReferenceLine y={initialEquity} stroke={muted} strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="equity" stroke={lineColor} strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: lineColor }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* PRICE ACTION — TradingView Candlestick Chart                         */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div style={{ ...card, marginTop: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={sTitle}>🕯 PRICE ACTION</div>
            <select
              value={chartAsset}
              onChange={e => setChartAsset(e.target.value)}
              style={{
                padding: '4px 8px', background: bg2, color: text, border: `1px solid ${border}`,
                borderRadius: 4, fontSize: 10, fontFamily: 'monospace'
              }}
            >
              {SHARED_ASSETS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <CandlestickChart
            apiUrl={API_URL}
            asset={chartAsset}
            interval={chartInterval}
            onIntervalChange={setChartInterval}
            height={360}
          />
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ESTADO DEL SISTEMA                                                   */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div style={{ ...card, marginTop: 4 }}>
          <div style={sTitle}>🖥 ESTADO DEL SISTEMA</div>
          {(() => {
            const services = [
              { key: 'binance', label: 'Binance' },
              { key: 'database', label: 'Supabase' },
              { key: 'sse', label: 'SSE' },
              { key: 'telegram', label: 'Telegram' },
              { key: 'email', label: 'Email' },
              { key: 'featureStore', label: 'Features' },
            ];

            const dotColor = (status) => {
              if (!status || status === 'unknown') return muted;
              const s = String(status).toLowerCase();
              if (s.includes('active') || s.includes('connected') || status === true) return green;
              if (s.includes('partial') || s.includes('degraded') || s.includes('not configured')) return amber;
              return red;
            };

            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
                {services.map(({ key, label }) => {
                  const status = systemHealth ? (typeof systemHealth[key] === 'object' ? systemHealth[key]?.status : systemHealth[key]) : null;
                  const dc = dotColor(status);
                  const statusText = status ? (typeof status === 'boolean' ? (status ? 'active' : 'inactive') : String(status)) : 'checking...';
                  return (
                    <div key={key} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: bg3, borderRadius: 6, padding: "10px 14px"
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: dc,
                        boxShadow: dc === green ? `0 0 6px ${green}` : 'none',
                        flexShrink: 0
                      }} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: text }}>{label}</div>
                        <div style={{ fontSize: 9, color: muted, textTransform: "uppercase" }}>{statusText}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  const SignalsTab = () => {
    const confluenceColor = (c) => c === 'strong' ? green : c === 'moderate' ? amber : c === 'conflicting' ? red : muted;
    const confluenceLabel = (c) => c === 'strong' ? 'CONFLUENCIA FUERTE' : c === 'moderate' ? 'CONFLUENCIA MODERADA' : c === 'conflicting' ? 'CONFLICTO' : 'DEBIL';
    const actionColor = (a) => a === 'BUY' ? green : a === 'SELL' ? red : amber;
    const tfLabel = { '4h': '4H', '1h': '1H', '15m': '15M' };

    const hitColor = (rate) => rate === null ? muted : rate >= 55 ? green : rate >= 45 ? amber : red;

    return (
      <div>
        {/* ═══ SIGNAL ACCURACY PANEL ═══ */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={sTitle}>📊 SIGNAL ACCURACY</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[7, 30].map(d => (
                <button key={d} onClick={() => { setAccuracyDays(d); fetchAccuracy(d); }} style={{
                  padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  background: accuracyDays === d ? green : bg3, color: accuracyDays === d ? "#000" : muted
                }}>{d}d</button>
              ))}
            </div>
          </div>

          {!signalAccuracy || !signalAccuracy.overall || signalAccuracy.overall.total === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: muted, fontSize: 13 }}>
              Recopilando datos — metricas disponibles despues de 1 hora de operacion
            </div>
          ) : (
            <>
              {/* Row 1: Summary hit rate cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "1h Accuracy", value: signalAccuracy.overall.hitRate1h, avg: signalAccuracy.overall.avgChange1h },
                  { label: "4h Accuracy", value: signalAccuracy.overall.hitRate4h, avg: signalAccuracy.overall.avgChange4h },
                  { label: "24h Accuracy", value: signalAccuracy.overall.hitRate24h, avg: signalAccuracy.overall.avgChange24h },
                  { label: "Signals", value: signalAccuracy.overall.total, isCount: true }
                ].map((item, i) => (
                  <div key={i} style={{ background: bg3, borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: muted, marginBottom: 6, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: item.isCount ? "#fff" : hitColor(item.value) }}>
                      {item.value === null ? "—" : item.isCount ? item.value : `${item.value}%`}
                    </div>
                    {!item.isCount && item.avg !== null && (
                      <div style={{ fontSize: 10, color: muted, marginTop: 3 }}>avg move: {item.avg}%</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Row 2: By Strength table */}
              {signalAccuracy.byStrength && Object.keys(signalAccuracy.byStrength).length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>POR STRENGTH</div>
                  <div style={{ background: bg3, borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "8px 12px", fontSize: 10, fontWeight: 700, color: muted, borderBottom: "1px solid #2a2a2a" }}>
                      <div>Tipo</div><div style={{ textAlign: "center" }}>Count</div><div style={{ textAlign: "center" }}>Hit 1h</div><div style={{ textAlign: "center" }}>Hit 4h</div><div style={{ textAlign: "center" }}>Hit 24h</div>
                    </div>
                    {["STRONG BUY", "BUY", "SELL", "STRONG SELL"].filter(k => signalAccuracy.byStrength[k]).map(k => {
                      const s = signalAccuracy.byStrength[k];
                      return (
                        <div key={k} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "6px 12px", fontSize: 12, borderBottom: "1px solid #1a1a1a" }}>
                          <div style={{ fontWeight: 700, color: k.includes("BUY") ? green : red }}>{k}</div>
                          <div style={{ textAlign: "center" }}>{s.total}</div>
                          <div style={{ textAlign: "center", color: hitColor(s.hitRate1h) }}>{s.hitRate1h !== null ? `${s.hitRate1h}%` : "—"}</div>
                          <div style={{ textAlign: "center", color: hitColor(s.hitRate4h) }}>{s.hitRate4h !== null ? `${s.hitRate4h}%` : "—"}</div>
                          <div style={{ textAlign: "center", color: hitColor(s.hitRate24h) }}>{s.hitRate24h !== null ? `${s.hitRate24h}%` : "—"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Row 3: By Confluence + Trend chart */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                {/* Confluence cards */}
                {signalAccuracy.byConfluence && Object.keys(signalAccuracy.byConfluence).length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>POR CONFLUENCIA</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {["strong", "moderate", "conflicting", "weak"].filter(k => signalAccuracy.byConfluence[k]).map(k => {
                        const c = signalAccuracy.byConfluence[k];
                        return (
                          <div key={k} style={{ background: bg3, borderRadius: 6, padding: "8px 12px", borderLeft: `3px solid ${confluenceColor(k)}` }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: confluenceColor(k), marginBottom: 4 }}>{k.toUpperCase()} ({c.total})</div>
                            <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                              <span style={{ color: hitColor(c.hitRate1h) }}>1h: {c.hitRate1h !== null ? `${c.hitRate1h}%` : "—"}</span>
                              <span style={{ color: hitColor(c.hitRate4h) }}>4h: {c.hitRate4h !== null ? `${c.hitRate4h}%` : "—"}</span>
                              <span style={{ color: hitColor(c.hitRate24h) }}>24h: {c.hitRate24h !== null ? `${c.hitRate24h}%` : "—"}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Trend chart */}
                {signalAccuracy.trend && signalAccuracy.trend.length > 1 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>TENDENCIA DIARIA (1h hit rate)</div>
                    <div style={{ background: bg3, borderRadius: 8, padding: 10 }}>
                      <ResponsiveContainer width="100%" height={140}>
                        <LineChart data={signalAccuracy.trend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: muted }} tickFormatter={d => d.substring(5)} />
                          <YAxis tick={{ fontSize: 9, fill: muted }} domain={[0, 100]} unit="%" />
                          <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, fontSize: 11 }} formatter={(v) => v !== null ? [`${v}%`, 'Hit Rate 1h'] : ['—', 'Hit Rate 1h']} />
                          <ReferenceLine y={50} stroke={amber} strokeDasharray="3 3" strokeWidth={1} />
                          <Line type="monotone" dataKey="hitRate1h" stroke={green} strokeWidth={2} dot={{ fill: green, r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ═══ SIGNAL CARDS ═══ */}
        <div style={card}>
          <div style={sTitle}>🎯 TODAS LAS SEÑALES ACTIVAS</div>

          {signals.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: muted }}>
              No hay señales en este momento
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {signals.map((signal, i) => (
                <div key={i} style={{
                  background: bg3,
                  borderLeft: `4px solid ${actionColor(signal.action)}`,
                  borderRadius: 8,
                  padding: "14px 18px",
                  opacity: getSignalFreshness(signal).opacity,
                  transition: "opacity 0.3s"
                }}>
                  {/* Header: Asset + Action + Confidence */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
                        {signal.action === 'BUY' ? '🟢' : signal.action === 'SELL' ? '🔴' : '⚪'} {signal.asset}
                      </div>
                      <div style={{ fontSize: 13, color: muted }}>
                        {formatPrice(signal.price)} · {signal.change24h >= 0 ? '+' : ''}{signal.change24h?.toFixed(2) || '0.00'}% 24h
                      </div>
                    </div>
                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {/* Confluence Badge */}
                        {signal.timeframes?.confluence && (
                          <div style={{
                            fontSize: 9,
                            color: confluenceColor(signal.timeframes.confluence),
                            fontWeight: 700,
                            background: `${confluenceColor(signal.timeframes.confluence)}18`,
                            padding: "3px 8px",
                            borderRadius: 4,
                            letterSpacing: 0.5,
                            textTransform: "uppercase"
                          }}>
                            {confluenceLabel(signal.timeframes.confluence)}
                          </div>
                        )}
                        {/* Off-Hours Badge */}
                        {signal.offHours && (
                          <div style={{
                            fontSize: 9, color: amber, fontWeight: 700,
                            background: `${amber}18`, padding: "3px 8px",
                            borderRadius: 4, letterSpacing: 0.5
                          }}>
                            🌙 OFF-HOURS
                          </div>
                        )}
                        {/* Action Badge */}
                        <div style={{
                          fontSize: 11,
                          color: actionColor(signal.action),
                          fontWeight: 700,
                          background: `${actionColor(signal.action)}22`,
                          padding: "4px 12px",
                          borderRadius: 6
                        }}>
                          {signal.action}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: amber, fontWeight: 700 }}>
                        {signal.confidence}% confianza
                      </div>
                      <div style={{ fontSize: 11, color: muted }}>
                        Score: {signal.score}/100
                      </div>
                    </div>
                  </div>

                  {/* Timeframe Mini-Bar */}
                  {signal.timeframes && signal.timeframes['4h'] && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      {['4h', '1h', '15m'].map(tf => {
                        const tfData = signal.timeframes[tf];
                        if (!tfData) return null;
                        const tfActionColor = actionColor(tfData.action);
                        return (
                          <div key={tf} style={{
                            flex: 1,
                            background: bg2,
                            borderRadius: 6,
                            padding: "6px 8px",
                            borderTop: `2px solid ${tfActionColor}`
                          }}>
                            <div style={{ fontSize: 10, color: muted, fontWeight: 700, marginBottom: 2 }}>
                              {tfLabel[tf]}
                            </div>
                            <div style={{ fontSize: 11, color: tfActionColor, fontWeight: 700 }}>
                              {tfData.action}
                            </div>
                            <div style={{ fontSize: 10, color: muted }}>
                              {tfData.score}/100
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Dynamic TF Weights / Regime */}
                  {signal.timeframes?.dynamicWeights && signal.timeframes.dynamicWeights.regime !== 'static' && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{
                        fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                        background: signal.timeframes.dynamicWeights.regime === 'trending' ? `${green}18` : signal.timeframes.dynamicWeights.regime === 'ranging' ? `${amber}18` : `${muted}18`,
                        color: signal.timeframes.dynamicWeights.regime === 'trending' ? green : signal.timeframes.dynamicWeights.regime === 'ranging' ? amber : muted,
                        textTransform: "uppercase", letterSpacing: 0.5
                      }}>
                        {signal.timeframes.dynamicWeights.regime === 'trending' ? '📈 TRENDING' : signal.timeframes.dynamicWeights.regime === 'ranging' ? '📊 RANGING' : '↔ MIXED'}
                      </div>
                      <div style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>
                        ADX {signal.timeframes.dynamicWeights.adx4h}
                      </div>
                      <div style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>
                        4h:{(signal.timeframes.dynamicWeights.tf4h * 100).toFixed(0)}%
                        {' '}1h:{(signal.timeframes.dynamicWeights.tf1h * 100).toFixed(0)}%
                        {' '}15m:{(signal.timeframes.dynamicWeights.tf15m * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}

                  {/* Governor Badge */}
                  {signal.timeframes?.governorInfo?.applied && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
                      padding: "4px 8px", background: `${amber}12`, borderRadius: 4,
                      borderLeft: `2px solid ${amber}`
                    }}>
                      <span style={{ fontSize: 9, color: amber, fontWeight: 700 }}>
                        GOV {signal.timeframes.governorInfo.severity === 'strong' ? '⚠⚠' : '⚠'}
                      </span>
                      <span style={{ fontSize: 9, color: muted }}>
                        4H {signal.timeframes.governorInfo.regime} — {Math.round((1 - signal.timeframes.governorInfo.effectiveMult) * 100)}% dampened
                      </span>
                    </div>
                  )}

                  {/* Trade Levels Panel */}
                  {signal.tradeLevels && signal.action !== 'HOLD' && (
                    <div style={{
                      background: bg2,
                      borderRadius: 6,
                      padding: "10px 12px",
                      marginBottom: 10
                    }}>
                      <div style={{ fontSize: 10, color: muted, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>
                        NIVELES DE OPERACION
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 9, color: muted }}>ENTRADA</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{formatPrice(signal.tradeLevels.entry)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: red }}>STOP LOSS</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: red }}>{formatPrice(signal.tradeLevels.stopLoss)}</div>
                          <div style={{ fontSize: 9, color: muted }}>{signal.tradeLevels.stopLossPercent?.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: green }}>TP1</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: green }}>{formatPrice(signal.tradeLevels.takeProfit1)}</div>
                          <div style={{ fontSize: 9, color: muted }}>{signal.tradeLevels.takeProfit1Percent?.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: green }}>TP2</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: green }}>{formatPrice(signal.tradeLevels.takeProfit2)}</div>
                          <div style={{ fontSize: 9, color: muted }}>{signal.tradeLevels.takeProfit2Percent?.toFixed(1)}%</div>
                        </div>
                      </div>
                      {/* Trailing Stop Row */}
                      {signal.tradeLevels.trailingStop && (
                        <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 9, color: amber }}>TRAILING STOP</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: amber }}>{formatPrice(signal.tradeLevels.trailingStop)}</div>
                            <div style={{ fontSize: 9, color: muted }}>{signal.tradeLevels.trailingStopPercent?.toFixed(1)}%</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 9, color: muted }}>ACTIVA EN</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{formatPrice(signal.tradeLevels.trailingActivation)}</div>
                            <div style={{ fontSize: 9, color: muted }}>+{Math.abs(signal.tradeLevels.trailingActivationPercent || 0).toFixed(1)}% profit</div>
                          </div>
                        </div>
                      )}
                      <div style={{ marginTop: 6, display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ fontSize: 10, color: signal.tradeLevels.riskRewardOk ? green : red, fontWeight: 700 }}>
                          R:R {signal.tradeLevels.riskRewardRatio?.toFixed(2) || '—'}
                        </div>
                        {!signal.tradeLevels.riskRewardOk && (
                          <div style={{ fontSize: 9, color: red }}>
                            ⚠ R:R bajo (&lt;1.5)
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Support/Resistance Levels */}
                  {signal.supportResistanceLevels && signal.action !== 'HOLD' && (
                    <div style={{
                      background: bg2,
                      borderRadius: 6,
                      padding: "10px 12px",
                      marginBottom: 10
                    }}>
                      <div style={{ fontSize: 10, color: muted, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
                        Soporte / Resistencia
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          {(signal.supportResistanceLevels.supports || []).map((s, i) => (
                            <div key={`s${i}`} style={{ fontSize: 11, color: green, marginBottom: 2 }}>
                              S{i + 1}: {formatPrice(s.price)}
                              <span style={{ fontSize: 9, color: muted, marginLeft: 4 }}>
                                ({s.touches}x, -{s.distancePercent?.toFixed(1)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                        <div>
                          {(signal.supportResistanceLevels.resistances || []).map((r, i) => (
                            <div key={`r${i}`} style={{ fontSize: 11, color: red, marginBottom: 2 }}>
                              R{i + 1}: {formatPrice(r.price)}
                              <span style={{ fontSize: 9, color: muted, marginLeft: 4 }}>
                                ({r.touches}x, +{r.distancePercent?.toFixed(1)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Derivatives Row */}
                  {signal.derivatives && signal.derivatives.fundingRate !== undefined && (
                    <div style={{
                      display: "flex",
                      gap: 12,
                      marginBottom: 10,
                      flexWrap: "wrap"
                    }}>
                      <div style={{ fontSize: 11, color: muted }}>
                        <span style={{ fontSize: 9, letterSpacing: 0.3 }}>FUNDING </span>
                        <span style={{ color: signal.derivatives.fundingRate >= 0 ? green : red, fontWeight: 700 }}>
                          {(signal.derivatives.fundingRate * 100).toFixed(4)}%
                        </span>
                      </div>
                      {signal.derivatives.longShortRatio && (
                        <div style={{ fontSize: 11, color: muted }}>
                          <span style={{ fontSize: 9, letterSpacing: 0.3 }}>L/S </span>
                          <span style={{ color: text, fontWeight: 700 }}>
                            {signal.derivatives.longShortRatio.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {signal.derivatives.sentiment && signal.derivatives.sentiment !== 'unavailable' && (
                        <div style={{
                          fontSize: 9,
                          color: signal.derivatives.sentiment.includes('bullish') ? green : signal.derivatives.sentiment.includes('bearish') ? red : amber,
                          fontWeight: 700,
                          background: `${signal.derivatives.sentiment.includes('bullish') ? green : signal.derivatives.sentiment.includes('bearish') ? red : amber}15`,
                          padding: "2px 8px",
                          borderRadius: 4,
                          textTransform: "uppercase"
                        }}>
                          {signal.derivatives.sentiment.replace(/_/g, ' ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Macro Context */}
                  {signal.macroContext && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                      {signal.macroContext.btcDomRegime && signal.macroContext.btcDomRegime !== 'neutral' && (
                        <div style={{
                          fontSize: 9,
                          color: signal.macroContext.btcDomRegime === 'alt_season' ? green : red,
                          fontWeight: 700,
                          background: `${signal.macroContext.btcDomRegime === 'alt_season' ? green : red}15`,
                          padding: "2px 8px",
                          borderRadius: 4,
                          textTransform: "uppercase"
                        }}>
                          {signal.macroContext.btcDomRegime === 'alt_season' ? 'ALT SEASON' : 'BTC SEASON'} ({signal.macroContext.btcDominance}%)
                        </div>
                      )}
                      {signal.macroContext.dxyRegime && signal.macroContext.dxyRegime !== 'neutral' && (
                        <div style={{
                          fontSize: 9,
                          color: signal.macroContext.dxyRegime === 'risk_on' ? green : red,
                          fontWeight: 700,
                          background: `${signal.macroContext.dxyRegime === 'risk_on' ? green : red}15`,
                          padding: "2px 8px",
                          borderRadius: 4,
                          textTransform: "uppercase"
                        }}>
                          DXY {signal.macroContext.dxy} {signal.macroContext.dxyRegime === 'risk_on' ? 'RISK ON' : 'RISK OFF'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Order Book Depth */}
                  {signal.orderBook && (
                    <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ fontSize: 11, color: muted }}>
                        <span style={{ fontSize: 9, letterSpacing: 0.3 }}>BID/ASK </span>
                        <span style={{
                          color: signal.orderBook.imbalanceRatio >= 1.5 ? green : signal.orderBook.imbalanceRatio <= 0.67 ? red : text,
                          fontWeight: 700
                        }}>
                          {signal.orderBook.imbalanceRatio?.toFixed(2)}x
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: muted }}>
                        <span style={{ fontSize: 9, letterSpacing: 0.3 }}>SPREAD </span>
                        <span style={{ color: signal.orderBook.spreadPercent > 0.1 ? amber : text, fontWeight: 700 }}>
                          {signal.orderBook.spreadPercent?.toFixed(3)}%
                        </span>
                      </div>
                      {signal.orderBook.pressure && signal.orderBook.pressure !== 'unavailable' && signal.orderBook.pressure !== 'balanced' && (
                        <div style={{
                          fontSize: 9,
                          color: signal.orderBook.pressure.includes('buy') ? green : red,
                          fontWeight: 700,
                          background: `${signal.orderBook.pressure.includes('buy') ? green : red}15`,
                          padding: "2px 8px",
                          borderRadius: 4,
                          textTransform: "uppercase"
                        }}>
                          {signal.orderBook.pressure.replace(/_/g, ' ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Advanced Indicators Badges */}
                  {signal.action !== 'HOLD' && signal.indicators && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {signal.indicators.ichimoku && (
                        <div style={{
                          fontSize: 10, padding: "3px 8px", borderRadius: 4,
                          background: signal.indicators.ichimoku.signal === 'bullish' ? `${green}20` : signal.indicators.ichimoku.signal === 'bearish' ? `${red}20` : `${amber}20`,
                          color: signal.indicators.ichimoku.signal === 'bullish' ? green : signal.indicators.ichimoku.signal === 'bearish' ? red : amber,
                          fontWeight: 600
                        }}>
                          ICHIMOKU: {signal.indicators.ichimoku.priceVsCloud}
                          {signal.indicators.ichimoku.tkCross !== 'none' && ` · TK ${signal.indicators.ichimoku.tkCross}`}
                        </div>
                      )}
                      {signal.indicators.vwap && (
                        <div style={{
                          fontSize: 10, padding: "3px 8px", borderRadius: 4,
                          background: signal.indicators.vwap.signal === 'bullish' || signal.indicators.vwap.signal === 'oversold' ? `${green}20` : signal.indicators.vwap.signal === 'bearish' || signal.indicators.vwap.signal === 'overbought' ? `${red}20` : `${amber}20`,
                          color: signal.indicators.vwap.signal === 'bullish' || signal.indicators.vwap.signal === 'oversold' ? green : signal.indicators.vwap.signal === 'bearish' || signal.indicators.vwap.signal === 'overbought' ? red : amber,
                          fontWeight: 600
                        }}>
                          VWAP: {signal.indicators.vwap.distancePercent > 0 ? '+' : ''}{signal.indicators.vwap.distancePercent}%
                        </div>
                      )}
                      {signal.indicators.marketStructure && (
                        <div style={{
                          fontSize: 10, padding: "3px 8px", borderRadius: 4,
                          background: signal.indicators.marketStructure.structure === 'bullish' ? `${green}20` : signal.indicators.marketStructure.structure === 'bearish' ? `${red}20` : `${amber}20`,
                          color: signal.indicators.marketStructure.structure === 'bullish' ? green : signal.indicators.marketStructure.structure === 'bearish' ? red : amber,
                          fontWeight: 600
                        }}>
                          {signal.indicators.marketStructure.pattern !== 'unknown' && signal.indicators.marketStructure.pattern !== 'mixed' ? signal.indicators.marketStructure.pattern.replace('_', '/') : signal.indicators.marketStructure.structure}
                          {signal.indicators.marketStructure.breakOfStructure?.detected && ' · BOS'}
                          {signal.indicators.marketStructure.changeOfCharacter?.detected && ' · CHoCH'}
                        </div>
                      )}
                      {signal.indicators.fibonacci && signal.indicators.fibonacci.nearestLevel && signal.indicators.fibonacci.distanceToNearest < 3 && (
                        <div style={{
                          fontSize: 10, padding: "3px 8px", borderRadius: 4,
                          background: `${amber}20`,
                          color: amber,
                          fontWeight: 600
                        }}>
                          FIB: {signal.indicators.fibonacci.nearestLevel.label}
                          {signal.indicators.fibonacci.goldenRatio && ' ★'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reasons */}
                  <div style={{ fontSize: 12, color: text, marginBottom: 8 }}>
                    {signal.reasons}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 10, color: muted, fontFamily: "monospace" }}>
                      {new Date(signal.timestamp).toLocaleString()}
                    </div>
                    {(() => {
                      const f = getSignalFreshness(signal);
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 9, color: f.color, fontWeight: 600 }}>
                            ● {(signal.freshness || 'fresh').toUpperCase()}
                          </span>
                          <span style={{ fontSize: 9, color: muted }}>{f.label}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const PortfolioTab = () => {
    // NOTE: All useState/useEffect moved to parent level to avoid remount issues
    const showAddForm = ptShowAddForm, setShowAddForm = setPtShowAddForm;
    const showBatchUpload = ptShowBatchUpload, setShowBatchUpload = setPtShowBatchUpload;
    const showCreateWallet = ptShowCreateWallet, setShowCreateWallet = setPtShowCreateWallet;
    const uploadStatus = ptUploadStatus, setUploadStatus = setPtUploadStatus;
    const uploading = ptUploading, setUploading = setPtUploading;
    const saving = ptSaving, setSaving = setPtSaving;
    const selectedWalletFilter = ptSelectedWalletFilter, setSelectedWalletFilter = setPtSelectedWalletFilter;
    const newPosition = ptNewPosition, setNewPosition = setPtNewPosition;
    const newWallet = ptNewWallet, setNewWallet = setPtNewWallet;
    const uploadWalletId = ptUploadWalletId, setUploadWalletId = setPtUploadWalletId;

    const portfolioValue = calculatePortfolioValue();
    const { pnl, percentage } = calculatePortfolioPnL();

    // Filter positions by wallet
    const filteredPositions = selectedWalletFilter === 'all'
      ? portfolio
      : portfolio.filter(p => p.walletId === selectedWalletFilter);

    const handleCreateWallet = async () => {
      if (!newWallet.name.trim()) return;
      try {
        const response = await authFetch(`${API_URL}/api/wallets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: USER_ID,
            name: newWallet.name,
            type: newWallet.type,
            provider: newWallet.provider,
            color: newWallet.color
          })
        });
        if (response.ok) {
          await fetchWallets();
          setNewWallet({ name: '', type: 'exchange', provider: 'binance', color: '#6366f1' });
          setShowCreateWallet(false);
        } else {
          const err = await response.json();
          alert(err.error || 'Error creating wallet');
        }
      } catch (error) {
        alert('Network error: ' + error.message);
      }
    };

    const handleAdd = async () => {
      if (!newPosition.amount || !newPosition.buyPrice || !newPosition.walletId) {
        if (!newPosition.walletId) {
          alert('Primero crea una wallet para agregar posiciones');
          setShowCreateWallet(true);
        }
        return;
      }
      setSaving(true);
      try {
        // Get current positions for this wallet, then add the new one
        const res = await authFetch(`${API_URL}/api/portfolio/${USER_ID}/wallet/${newPosition.walletId}`);
        const data = res.ok ? await res.json() : { wallet: { positions: [] } };
        const existingPositions = (data.wallet?.positions || []).map(p => ({
          asset: p.asset,
          amount: p.amount,
          buyPrice: p.buy_price,
          purchaseDate: p.purchase_date,
          notes: p.notes || '',
          transactionId: p.transaction_id || ''
        }));

        // Add the new position
        existingPositions.push({
          asset: newPosition.asset,
          amount: parseFloat(newPosition.amount),
          buyPrice: parseFloat(newPosition.buyPrice),
          purchaseDate: new Date().toISOString(),
          notes: '',
          transactionId: ''
        });

        // Save all positions to wallet via JSON endpoint
        const saveRes = await authFetch(`${API_URL}/api/portfolio/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: USER_ID,
            walletId: newPosition.walletId,
            positions: existingPositions
          })
        });

        if (saveRes.ok) {
          await fetchPortfolio();
          setNewPosition(prev => ({ ...prev, amount: '', buyPrice: '' }));
          setShowAddForm(false);
        } else {
          // Fallback: add to local state if backend fails
          addToPortfolio(newPosition.asset, newPosition.amount, newPosition.buyPrice);
          setNewPosition(prev => ({ ...prev, amount: '', buyPrice: '' }));
          setShowAddForm(false);
        }
      } catch (error) {
        // Fallback: add to local state
        addToPortfolio(newPosition.asset, newPosition.amount, newPosition.buyPrice);
        setNewPosition(prev => ({ ...prev, amount: '', buyPrice: '' }));
        setShowAddForm(false);
      } finally {
        setSaving(false);
      }
    };

    const handleRemovePosition = async (positionId) => {
      try {
        const response = await authFetch(`${API_URL}/api/portfolio/${USER_ID}/${positionId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchPortfolio();
        } else {
          removeFromPortfolio(positionId);
        }
      } catch {
        removeFromPortfolio(positionId);
      }
    };

    const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!uploadWalletId) {
        setUploadStatus({ type: 'error', message: 'Selecciona una wallet primero' });
        e.target.value = '';
        return;
      }

      setUploading(true);
      setUploadStatus(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', USER_ID);
        formData.append('walletId', uploadWalletId);

        const response = await authFetch(`${API_URL}/api/portfolio/upload`, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          setUploadStatus({ type: 'success', message: result.message });
          await fetchPortfolio();
        } else {
          setUploadStatus({
            type: 'error',
            message: result.error || 'Upload failed',
            details: result.details
          });
        }
      } catch (error) {
        setUploadStatus({ type: 'error', message: 'Network error: ' + error.message });
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    };

    const downloadTemplate = () => {
      window.open(`${API_URL}/api/portfolio/template`, '_blank');
    };

    const walletProviderLabels = {
      binance: 'Binance', bybit: 'Bybit', coinbase: 'Coinbase', kraken: 'Kraken',
      okx: 'OKX', kucoin: 'KuCoin', mercadopago: 'MercadoPago', skipo: 'Skipo',
      lemon: 'Lemon', ripio: 'Ripio', metamask: 'MetaMask', trust_wallet: 'Trust Wallet',
      ledger: 'Ledger', trezor: 'Trezor', phantom: 'Phantom', exodus: 'Exodus', other: 'Otro'
    };

    const walletTypeLabels = {
      exchange: 'Exchange', wallet: 'Wallet', cold_storage: 'Cold Storage', defi: 'DeFi', other: 'Otro'
    };

    const walletColors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];

    return (
      <div>
        {/* Portfolio Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div style={card}>
            <div style={sTitle}>Valor Total</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>
              {formatLargeNumber(portfolioValue)}
            </div>
          </div>
          <div style={card}>
            <div style={sTitle}>P&L</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: pnl >= 0 ? green : red }}>
              {pnl >= 0 ? '+' : ''}{formatLargeNumber(pnl)}
            </div>
            <div style={{ fontSize: 13, color: pnl >= 0 ? green : red, marginTop: 4 }}>
              {percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%
            </div>
          </div>
          <div style={card}>
            <div style={sTitle}>Posiciones</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{portfolio.length}</div>
          </div>
          <div style={card}>
            <div style={sTitle}>Wallets</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{wallets.length}</div>
          </div>
        </div>

        {/* Wallet Chips */}
        {wallets.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <button
              onClick={() => setSelectedWalletFilter('all')}
              style={{
                padding: "6px 14px",
                background: selectedWalletFilter === 'all' ? purple : bg3,
                border: selectedWalletFilter === 'all' ? 'none' : `1px solid ${border}`,
                borderRadius: 20,
                color: text,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Todas ({portfolio.length})
            </button>
            {wallets.map(w => {
              const count = portfolio.filter(p => p.walletId === w.id).length;
              return (
                <button
                  key={w.id}
                  onClick={() => setSelectedWalletFilter(w.id)}
                  style={{
                    padding: "6px 14px",
                    background: selectedWalletFilter === w.id ? (w.color || purple) : bg3,
                    border: selectedWalletFilter === w.id ? 'none' : `1px solid ${w.color || border}`,
                    borderRadius: 20,
                    color: text,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {w.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => { setShowAddForm(!showAddForm); setShowBatchUpload(false); setShowCreateWallet(false); }}
            style={{
              padding: "10px",
              background: `linear-gradient(135deg, ${purple}, #7c3aed)`,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {showAddForm ? 'Cancelar' : 'Agregar Posicion'}
          </button>
          <button
            onClick={() => { setShowBatchUpload(!showBatchUpload); setShowAddForm(false); setShowCreateWallet(false); }}
            style={{
              padding: "10px",
              background: `linear-gradient(135deg, ${blue}, #2563eb)`,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {showBatchUpload ? 'Cancelar' : 'Subir CSV'}
          </button>
          <button
            onClick={() => { setShowCreateWallet(!showCreateWallet); setShowAddForm(false); setShowBatchUpload(false); }}
            style={{
              padding: "10px",
              background: `linear-gradient(135deg, ${green}, #00b894)`,
              border: "none",
              borderRadius: 8,
              color: "#000",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {showCreateWallet ? 'Cancelar' : 'Nueva Wallet'}
          </button>
        </div>

        {/* Create Wallet Form */}
        {showCreateWallet && (
          <div style={{ ...card, marginBottom: 16, borderColor: green }}>
            <div style={sTitle}>CREAR NUEVA WALLET</div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>NOMBRE</label>
                <input
                  type="text"
                  value={newWallet.name}
                  onChange={e => setNewWallet(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Mi Binance, Ledger Principal..."
                  style={{ width: "100%", background: bg3, border: `1px solid ${border}`, borderRadius: 6, padding: "10px", color: text, fontSize: 13 }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>TIPO</label>
                  <select
                    value={newWallet.type}
                    onChange={e => setNewWallet(prev => ({ ...prev, type: e.target.value }))}
                    style={{ width: "100%", background: bg3, border: `1px solid ${border}`, borderRadius: 6, padding: "10px", color: text, fontSize: 13 }}
                  >
                    {Object.entries(walletTypeLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>PROVEEDOR</label>
                  <select
                    value={newWallet.provider}
                    onChange={e => setNewWallet(prev => ({ ...prev, provider: e.target.value }))}
                    style={{ width: "100%", background: bg3, border: `1px solid ${border}`, borderRadius: 6, padding: "10px", color: text, fontSize: 13 }}
                  >
                    {Object.entries(walletProviderLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>COLOR</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {walletColors.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewWallet(prev => ({ ...prev, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: 6, background: c, border: newWallet.color === c ? '2px solid #fff' : '2px solid transparent', cursor: "pointer"
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreateWallet}
                style={{
                  padding: "10px",
                  background: `linear-gradient(135deg, ${green}, #00b894)`,
                  border: "none",
                  borderRadius: 6,
                  color: "#000",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Crear Wallet
              </button>
            </div>
          </div>
        )}

        {/* Batch Upload Section */}
        {showBatchUpload && (
          <div style={{ ...card, marginBottom: 16, borderColor: blue }}>
            <div style={sTitle}>IMPORTAR PORTFOLIO (CSV/EXCEL)</div>

            {/* Wallet selector for upload */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>WALLET DESTINO</label>
              {wallets.length === 0 ? (
                <div style={{ fontSize: 12, color: amber, padding: "8px 12px", background: `${amber}15`, borderRadius: 6 }}>
                  Crea una wallet primero para poder subir posiciones
                </div>
              ) : (
                <select
                  value={uploadWalletId}
                  onChange={e => setUploadWalletId(e.target.value)}
                  style={{ width: "100%", background: bg3, border: `1px solid ${border}`, borderRadius: 6, padding: "10px", color: text, fontSize: 13 }}
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({walletProviderLabels[w.provider] || w.provider})</option>
                  ))}
                </select>
              )}
            </div>

            <div style={{
              background: bg3, borderRadius: 8, padding: "16px", marginBottom: 14,
              border: `1px dashed ${border}`, textAlign: "center"
            }}>
              <div style={{ fontSize: 13, color: text, marginBottom: 12 }}>
                Sube un archivo CSV o Excel con tus posiciones
              </div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                disabled={uploading || wallets.length === 0}
                style={{ display: "block", margin: "0 auto 12px", fontSize: 12, color: text }}
              />
              {uploading && (
                <div style={{ fontSize: 12, color: amber, marginTop: 8 }}>Procesando archivo...</div>
              )}
              {uploadStatus && (
                <div style={{
                  fontSize: 12, color: uploadStatus.type === 'success' ? green : red, marginTop: 8,
                  padding: "8px 12px", background: uploadStatus.type === 'success' ? `${green}15` : `${red}15`, borderRadius: 6
                }}>
                  {uploadStatus.message}
                  {uploadStatus.details && (
                    <div style={{ marginTop: 6, fontSize: 11, whiteSpace: "pre-wrap" }}>{uploadStatus.details.join('\n')}</div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={downloadTemplate}
              style={{
                width: "100%", padding: "10px", background: bg3, border: `1px solid ${border}`,
                borderRadius: 6, color: text, fontSize: 12, fontWeight: 600, cursor: "pointer"
              }}
            >
              Descargar plantilla CSV
            </button>
            <div style={{ fontSize: 11, color: muted, marginTop: 10, lineHeight: 1.6 }}>
              Formato: Asset, Amount, Buy Price, Purchase Date, Notes<br />
              Assets: bitcoin, ethereum, solana, cardano, ripple, polkadot, dogecoin, binancecoin, avalanche-2, chainlink (o BTC, ETH, SOL, etc.)
            </div>
          </div>
        )}

        {/* Add Position Form */}
        {showAddForm && (
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={sTitle}>Nueva Posicion</div>
            <div style={{ display: "grid", gap: 12 }}>
              {/* Wallet Selector */}
              <div>
                <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>WALLET</label>
                {wallets.length === 0 ? (
                  <div style={{ fontSize: 12, color: amber, padding: "8px 12px", background: `${amber}15`, borderRadius: 6 }}>
                    Crea una wallet primero
                    <button
                      onClick={() => { setShowAddForm(false); setShowCreateWallet(true); }}
                      style={{ marginLeft: 8, padding: "4px 10px", background: green, border: "none", borderRadius: 4, color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      Crear
                    </button>
                  </div>
                ) : (
                  <select
                    value={newPosition.walletId}
                    onChange={e => setNewPosition(prev => ({ ...prev, walletId: e.target.value }))}
                    style={{ width: "100%", background: bg3, border: `1px solid ${border}`, borderRadius: 6, padding: "10px", color: text, fontSize: 13 }}
                  >
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({walletProviderLabels[w.provider] || w.provider})</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>ACTIVO</label>
                <select
                  value={newPosition.asset}
                  onChange={e => setNewPosition(prev => ({ ...prev, asset: e.target.value }))}
                  style={{ width: "100%", background: bg3, border: `1px solid ${border}`, borderRadius: 6, padding: "10px", color: text, fontSize: 13 }}
                >
                  {marketData && Object.keys(marketData.crypto || {}).map(id => (
                    <option key={id} value={id}>{id.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>CANTIDAD</label>
                  <input
                    type="number" step="0.00000001" value={newPosition.amount}
                    onChange={e => setNewPosition(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.5"
                    style={{ width: "100%", background: bg3, border: `1px solid ${border}`, borderRadius: 6, padding: "10px", color: text, fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>PRECIO COMPRA</label>
                  <input
                    type="number" step="0.01" value={newPosition.buyPrice}
                    onChange={e => setNewPosition(prev => ({ ...prev, buyPrice: e.target.value }))}
                    placeholder="65000"
                    style={{ width: "100%", background: bg3, border: `1px solid ${border}`, borderRadius: 6, padding: "10px", color: text, fontSize: 13 }}
                  />
                </div>
              </div>
              <button
                onClick={handleAdd}
                disabled={saving}
                style={{
                  padding: "10px",
                  background: saving ? bg3 : `linear-gradient(135deg, ${green}, #00b894)`,
                  border: "none", borderRadius: 6, color: "#000", fontSize: 13, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer"
                }}
              >
                {saving ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {(portfolioLoading || walletsLoading) && (
          <div style={{ textAlign: "center", padding: 20, color: muted, fontSize: 13 }}>
            Cargando portfolio...
          </div>
        )}

        {/* Positions List */}
        <div style={card}>
          <div style={sTitle}>
            MIS POSICIONES {selectedWalletFilter !== 'all' && wallets.find(w => w.id === selectedWalletFilter)
              ? `- ${wallets.find(w => w.id === selectedWalletFilter).name}`
              : ''}
          </div>
          {filteredPositions.length === 0 && !portfolioLoading ? (
            <div style={{ padding: 30, textAlign: "center", color: muted }}>
              {wallets.length === 0
                ? 'Crea una wallet primero, luego agrega posiciones.'
                : 'No tienes posiciones. Agrega una arriba o sube un archivo CSV.'}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {filteredPositions.map(position => {
                const currentPrice = marketData?.crypto?.[position.asset]?.price || 0;
                const positionValue = position.amount * currentPrice;
                const positionPnL = positionValue - (position.amount * position.buyPrice);
                const positionPnLPercent = position.buyPrice > 0 ? ((currentPrice - position.buyPrice) / position.buyPrice) * 100 : 0;

                return (
                  <div key={position.id} style={{
                    background: bg3, borderRadius: 8, padding: "14px",
                    borderLeft: position.walletColor ? `3px solid ${position.walletColor}` : 'none',
                    display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10
                  }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                        {position.asset.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 11, color: muted }}>
                        {position.amount} @ {formatPrice(position.buyPrice)}
                      </div>
                      {position.walletName && (
                        <div style={{ fontSize: 10, color: position.walletColor || purple, marginTop: 3, fontWeight: 600 }}>
                          {position.walletName}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flex: 1, minWidth: 110 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>
                        {formatLargeNumber(positionValue)}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: positionPnL >= 0 ? green : red, marginTop: 4 }}>
                        {positionPnL >= 0 ? '+' : ''}{formatLargeNumber(positionPnL)}
                      </div>
                      <div style={{ fontSize: 11, color: positionPnL >= 0 ? green : red }}>
                        {positionPnL >= 0 ? '+' : ''}{positionPnLPercent.toFixed(2)}%
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemovePosition(position.id)}
                      style={{
                        padding: "6px 12px", background: "transparent",
                        border: `1px solid ${red}`, borderRadius: 6, color: red, fontSize: 11, cursor: "pointer"
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Wallet Summary Cards */}
        {wallets.length > 0 && (
          <div style={{ ...card, marginTop: 14 }}>
            <div style={sTitle}>MIS WALLETS</div>
            <div style={{ display: "grid", gap: 10 }}>
              {wallets.map(w => {
                const walletPositions = portfolio.filter(p => p.walletId === w.id);
                let walletValue = 0;
                let walletInvested = 0;
                walletPositions.forEach(p => {
                  const cp = marketData?.crypto?.[p.asset]?.price || 0;
                  walletValue += p.amount * cp;
                  walletInvested += p.amount * p.buyPrice;
                });
                const walletPnl = walletValue - walletInvested;

                return (
                  <div key={w.id} style={{
                    background: bg3, borderRadius: 8, padding: "14px",
                    borderLeft: `3px solid ${w.color || purple}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: text }}>{w.name}</div>
                      <div style={{ fontSize: 11, color: muted }}>
                        {walletProviderLabels[w.provider] || w.provider} · {walletTypeLabels[w.type] || w.type} · {walletPositions.length} pos.
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{formatLargeNumber(walletValue)}</div>
                      <div style={{ fontSize: 12, color: walletPnl >= 0 ? green : red, fontWeight: 600 }}>
                        {walletPnl >= 0 ? '+' : ''}{formatLargeNumber(walletPnl)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const AlertsTab = () => {
    // State lifted to parent to survive re-renders (30s timer)
    const testResult = alertTestResult, setTestResult = setAlertTestResult;
    const testing = alertTesting, setTesting = setAlertTesting;
    const showFilters = alertShowFilters, setShowFilters = setAlertShowFilters;
    const filterForm = alertFilterForm, setFilterForm = setAlertFilterForm;
    const savingFilters = alertSavingFilters, setSavingFilters = setAlertSavingFilters;
    const filterSaveMsg = alertFilterSaveMsg, setFilterSaveMsg = setAlertFilterSaveMsg;

    // NOTE: useEffect for loading filters moved to parent level to avoid remount issues

    const handleSaveFilters = async () => {
      if (!filterForm) return;
      setSavingFilters(true);
      setFilterSaveMsg(null);
      try {
        const res = await authFetch(`${API_URL}/api/alert-filters/default-user`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filterForm)
        });
        if (res.ok) {
          setFilterSaveMsg({ ok: true, text: 'Filtros guardados' });
        } else {
          setFilterSaveMsg({ ok: false, text: 'Error al guardar' });
        }
      } catch (e) {
        setFilterSaveMsg({ ok: false, text: e.message });
      } finally {
        setSavingFilters(false);
        setTimeout(() => setFilterSaveMsg(null), 3000);
      }
    };

    const handleTestAlert = async () => {
      setTesting(true);
      setTestResult(null);
      try {
        const response = await authFetch(`${API_URL}/api/send-alert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: alertConfig.email,
            message: 'Test alert from SENTIX Pro - System working correctly!'
          })
        });
        const data = await response.json();
        setTestResult(data);
      } catch (error) {
        setTestResult({ success: false, message: 'Error: ' + error.message });
      } finally {
        setTesting(false);
      }
    };

    const ALL_ACTIONS = ['STRONG BUY', 'BUY', 'WEAK BUY', 'STRONG SELL', 'SELL', 'WEAK SELL'];
    const AVAILABLE_ASSETS = ['BITCOIN', 'ETHEREUM', 'BINANCECOIN', 'SOLANA', 'CARDANO', 'RIPPLE'];

    return (
      <div>
        {/* Telegram Setup - Primary alert channel */}
        <div style={{
          background: "rgba(59, 130, 246, 0.1)",
          border: `1px solid ${blue}`,
          borderRadius: 8,
          padding: "14px 18px",
          marginBottom: 16
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: blue, marginBottom: 8 }}>
            ALERTAS POR TELEGRAM (ACTIVO)
          </div>
          <div style={{ fontSize: 12, color: text, lineHeight: 1.8 }}>
            1. Busca el bot de SENTIX Pro en Telegram<br />
            2. Envia <code style={{ background: bg3, padding: "2px 6px", borderRadius: 4 }}>/start</code> para suscribirte a alertas automaticas<br />
            3. Recibiras alertas BUY/SELL cuando la confianza sea alta<br />
            4. Usa <code style={{ background: bg3, padding: "2px 6px", borderRadius: 4 }}>/señales</code> para ver señales activas<br />
            5. Usa <code style={{ background: bg3, padding: "2px 6px", borderRadius: 4 }}>/stop</code> para desactivar alertas
          </div>
        </div>

        {/* Config */}
        <div style={card}>
          <div style={sTitle}>CONFIGURACION DE ALERTAS</div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>
              EMAILS PARA ALERTAS (separar con coma)
            </label>
            <textarea
              value={alertConfig.email}
              onChange={e => setAlertConfig(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email1@ejemplo.com, email2@ejemplo.com"
              rows={2}
              style={{
                width: "100%",
                background: bg3,
                border: `1px solid ${border}`,
                borderRadius: 6,
                padding: "10px 14px",
                color: text,
                fontSize: 13,
                resize: "vertical",
                fontFamily: "inherit"
              }}
            />
            <div style={{ fontSize: 9, color: muted, marginTop: 4 }}>
              Estos emails se usan para la alerta de prueba. Configura los emails de notificacion automatica en los filtros avanzados.
            </div>
          </div>

          <button
            onClick={handleTestAlert}
            disabled={testing}
            style={{
              width: "100%",
              padding: "10px",
              background: testing ? bg3 : `linear-gradient(135deg, ${purple}, #7c3aed)`,
              border: "none",
              borderRadius: 7,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: testing ? "not-allowed" : "pointer"
            }}
          >
            {testing ? 'Enviando...' : 'ENVIAR ALERTA DE PRUEBA'}
          </button>

          {testResult && (
            <div style={{
              marginTop: 12,
              padding: "12px 14px",
              background: bg3,
              borderRadius: 6,
              fontSize: 12,
              lineHeight: 1.8
            }}>
              <div style={{ color: testResult.success ? green : red, fontWeight: 700, marginBottom: 6 }}>
                {testResult.success ? '✅ Test procesado' : '❌ Error'}
              </div>
              {testResult.delivery && (
                <div style={{ color: text, fontSize: 11 }}>
                  📧 Email: <span style={{ color: testResult.delivery.email === 'sent' ? green : amber }}>
                    {testResult.delivery.email === 'sent' ? '✅ Enviado' : testResult.delivery.email}
                  </span><br />
                  📱 Telegram: <span style={{ color: testResult.delivery.telegram === 'sent' ? green : amber }}>
                    {testResult.delivery.telegram === 'sent' ? '✅ Enviado' : testResult.delivery.telegram}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Custom Alert Filters */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowFilters(!showFilters)}>
            <div style={sTitle}>FILTROS PERSONALIZADOS</div>
            <div style={{ fontSize: 18, color: muted, transform: showFilters ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</div>
          </div>

          {showFilters && filterForm && (
            <div style={{ marginTop: 14 }}>
              {/* Master switch */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <button onClick={() => setFilterForm(p => ({ ...p, enabled: !p.enabled }))} style={{
                  width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                  background: filterForm.enabled ? green : bg3,
                  position: "relative", transition: "background 0.2s"
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 9, background: "#fff",
                    position: "absolute", top: 3, left: filterForm.enabled ? 22 : 4,
                    transition: "left 0.2s"
                  }} />
                </button>
                <span style={{ fontSize: 12, color: filterForm.enabled ? text : muted, fontWeight: 700 }}>
                  {filterForm.enabled ? 'Filtros activos' : 'Filtros desactivados (usa defaults)'}
                </span>
              </div>

              {/* Signal types */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: muted, marginBottom: 6, display: "block", fontWeight: 700 }}>TIPOS DE SEÑAL</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ALL_ACTIONS.map(act => {
                    const active = filterForm.actions.includes(act);
                    const isBuy = act.includes('BUY');
                    const clr = isBuy ? green : red;
                    return (
                      <button key={act} onClick={() => {
                        setFilterForm(p => ({
                          ...p,
                          actions: active ? p.actions.filter(a => a !== act) : [...p.actions, act]
                        }));
                      }} style={{
                        padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontWeight: 700,
                        background: active ? `${clr}20` : bg3,
                        color: active ? clr : muted,
                        border: `1px solid ${active ? clr : border}`
                      }}>
                        {act}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assets filter */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: muted, marginBottom: 6, display: "block", fontWeight: 700 }}>
                  ACTIVOS ({filterForm.assets.length === 0 ? 'todos' : filterForm.assets.length + ' seleccionados'})
                </label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {AVAILABLE_ASSETS.map(asset => {
                    const active = filterForm.assets.includes(asset);
                    return (
                      <button key={asset} onClick={() => {
                        setFilterForm(p => ({
                          ...p,
                          assets: active ? p.assets.filter(a => a !== asset) : [...p.assets, asset]
                        }));
                      }} style={{
                        padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontWeight: 700,
                        background: active ? `${blue}20` : bg3,
                        color: active ? blue : muted,
                        border: `1px solid ${active ? blue : border}`
                      }}>
                        {asset}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 9, color: muted, marginTop: 4 }}>Sin seleccion = alertas para todos los activos</div>
              </div>

              {/* Min confidence slider */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: muted, display: "block", marginBottom: 4, fontWeight: 700 }}>
                  CONFIANZA MINIMA: <span style={{ color: text }}>{filterForm.min_confidence}%</span>
                </label>
                <input type="range" min="20" max="90" step="5"
                  value={filterForm.min_confidence}
                  onChange={e => setFilterForm(p => ({ ...p, min_confidence: parseInt(e.target.value) }))}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Min score slider */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: muted, display: "block", marginBottom: 4, fontWeight: 700 }}>
                  SCORE MINIMO: <span style={{ color: text }}>{filterForm.min_score}</span>
                </label>
                <input type="range" min="10" max="60" step="5"
                  value={filterForm.min_score}
                  onChange={e => setFilterForm(p => ({ ...p, min_score: parseInt(e.target.value) }))}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Cooldown */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: muted, display: "block", marginBottom: 4, fontWeight: 700 }}>
                  COOLDOWN: <span style={{ color: text }}>{filterForm.cooldown_minutes} min</span>
                </label>
                <input type="range" min="5" max="120" step="5"
                  value={filterForm.cooldown_minutes}
                  onChange={e => setFilterForm(p => ({ ...p, cooldown_minutes: parseInt(e.target.value) }))}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Delivery channels */}
              <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: text, cursor: "pointer" }}>
                  <input type="checkbox" checked={filterForm.telegram_enabled}
                    onChange={e => setFilterForm(p => ({ ...p, telegram_enabled: e.target.checked }))} />
                  Telegram
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: text, cursor: "pointer" }}>
                  <input type="checkbox" checked={filterForm.email_enabled}
                    onChange={e => setFilterForm(p => ({ ...p, email_enabled: e.target.checked }))} />
                  Email
                </label>
              </div>

              {/* Email recipients for notifications */}
              {filterForm.email_enabled && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, color: muted, display: "block", marginBottom: 6, fontWeight: 700 }}>
                    EMAILS DE NOTIFICACION (separar con coma)
                  </label>
                  <textarea
                    value={filterForm.alert_emails || ''}
                    onChange={e => setFilterForm(p => ({ ...p, alert_emails: e.target.value }))}
                    placeholder="email1@ejemplo.com, email2@ejemplo.com"
                    rows={2}
                    style={{
                      width: "100%",
                      background: bg3,
                      border: `1px solid ${border}`,
                      borderRadius: 6,
                      padding: "8px 12px",
                      color: text,
                      fontSize: 12,
                      resize: "vertical",
                      fontFamily: "inherit"
                    }}
                  />
                  <div style={{ fontSize: 9, color: muted, marginTop: 4 }}>
                    Deja vacio para usar el email por defecto. Soporta multiples emails separados por coma.
                  </div>
                </div>
              )}

              {/* Save button */}
              <button onClick={handleSaveFilters} disabled={savingFilters} style={{
                width: "100%", padding: "10px", border: "none", borderRadius: 7, cursor: savingFilters ? "not-allowed" : "pointer",
                background: savingFilters ? bg3 : `linear-gradient(135deg, ${blue}, #3b82f6)`,
                color: "#fff", fontSize: 12, fontWeight: 700
              }}>
                {savingFilters ? 'Guardando...' : 'GUARDAR FILTROS'}
              </button>

              {filterSaveMsg && (
                <div style={{ marginTop: 8, fontSize: 11, color: filterSaveMsg.ok ? green : red, textAlign: "center" }}>
                  {filterSaveMsg.ok ? '✅' : '❌'} {filterSaveMsg.text}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alert History */}
        <div style={card}>
          <div style={sTitle}>HISTORIAL DE ALERTAS</div>
          {alerts.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: muted }}>
              No hay alertas aun. Las alertas se generan automaticamente cuando hay señales de alta confianza.
            </div>
          ) : (
            <div style={{ maxHeight: 500, overflowY: "auto" }}>
              {alerts.map((alert, i) => (
                <div key={alert.id || i} style={{
                  background: bg3,
                  borderLeft: `3px solid ${alert.action === 'BUY' ? green : alert.action === 'SELL' ? red : amber}`,
                  borderRadius: 6,
                  padding: "12px 14px",
                  marginBottom: 10
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {alert.action === 'BUY' ? '🟢' : alert.action === 'SELL' ? '🔴' : '⚪'} {alert.asset}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: alert.action === 'BUY' ? green : alert.action === 'SELL' ? red : amber,
                      fontWeight: 700,
                      background: `${alert.action === 'BUY' ? green : alert.action === 'SELL' ? red : amber}22`,
                      padding: "3px 8px",
                      borderRadius: 4
                    }}>
                      {alert.action}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>
                    Score: {alert.score}/100 | Confianza: {alert.confidence}% | Precio: {formatPrice(alert.price)}
                  </div>
                  <div style={{ fontSize: 11, color: text }}>
                    {alert.reasons}
                  </div>
                  <div style={{ fontSize: 10, color: muted, fontFamily: "monospace", marginTop: 6 }}>
                    {new Date(alert.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── EXECUTION TAB ───────────────────────────────────────────────────────
  const ExecutionTab = () => {
    const subTab = execSubTab;
    const setSubTab = setExecSubTab;
    const executionColors = { bg, bg2, bg3, border, text, muted, green, red, accent: purple };

    // Aliases for paper state (used by moved Paper content)
    const configForm = paperConfigForm, setConfigForm = setPaperConfigForm;
    const closingTrade = paperClosingTrade, setClosingTrade = setPaperClosingTrade;
    const historyPage = paperHistoryPage, setHistoryPage = setPaperHistoryPage;
    const historyTotal = paperHistoryTotal;

    // Derived values for status banner
    const isEnabled = paperConfig?.is_enabled;
    const capital = parseFloat(paperConfig?.current_capital || 10000);
    const initialCap = parseFloat(paperConfig?.initial_capital || 10000);
    const capitalPnl = capital - initialCap;
    const capitalPnlPct = initialCap > 0 ? ((capitalPnl / initialCap) * 100) : 0;

    // Handlers (moved from PaperTradingTab)
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

    const handleToggleEnabled = async () => {
      const newVal = !paperConfig?.is_enabled;
      try {
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

    const SUB_TABS = [
      { k: 'dashboard', label: '📊 Dashboard', desc: 'Métricas y analytics' },
      { k: 'positions', label: '📈 Posiciones', desc: 'Monitor + correlación' },
      { k: 'history', label: '📋 Historial', desc: 'Trades cerrados' },
      { k: 'risk', label: '⚠️ Riesgo', desc: 'Dashboard de riesgo' },
      ...(execManualOrdersEnabled ? [{ k: 'orders', label: '📝 Órdenes', desc: 'Crear y gestionar' }] : []),
      { k: 'audit', label: '🔍 Auditoría', desc: 'Historial de eventos' }
    ];

    return (
      <div style={{ fontFamily: 'monospace' }}>
        {/* Feedback toast */}
        {execFeedback && (
          <div style={{
            padding: '10px 16px',
            marginBottom: 12,
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'monospace',
            background: execFeedback.type === 'success' ? `${green}22` : `${red}22`,
            border: `1px solid ${execFeedback.type === 'success' ? green : red}`,
            color: execFeedback.type === 'success' ? green : red,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{execFeedback.type === 'success' ? '✓' : '✗'} {execFeedback.message}</span>
            <button onClick={() => setExecFeedback(null)} style={{
              background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 14
            }}>×</button>
          </div>
        )}
        {/* Header with Kill Switch + Mode Toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <ExecutionModeToggle
              mode={execMode}
              onModeChange={async (val) => {
                setExecMode(val);
                try {
                  await authFetch(`${API_URL}/api/paper/config/${USER_ID}`, {
                    method: 'POST',
                    body: JSON.stringify({ execution_mode: val })
                  });
                  await loadExecutionData();
                } catch (e) { console.error('Mode change failed:', e); }
              }}
              autoExecute={execAutoExecute}
              onAutoExecuteChange={async (val) => {
                setExecAutoExecute(val);
                try {
                  await authFetch(`${API_URL}/api/paper/config/${USER_ID}`, {
                    method: 'POST',
                    body: JSON.stringify({ auto_execute: val })
                  });
                  await loadExecutionData();
                } catch (e) { console.error('Auto-execute change failed:', e); }
              }}
              colors={executionColors}
            />
            {/* Manual orders toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: muted, fontSize: 12 }}>Órdenes manuales:</span>
              <button
                onClick={() => {
                  const next = !execManualOrdersEnabled;
                  setExecManualOrdersEnabled(next);
                  if (next && execSubTab !== 'orders') setExecSubTab('orders');
                  if (!next && execSubTab === 'orders') setExecSubTab('dashboard');
                }}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none',
                  background: execManualOrdersEnabled ? green : 'rgba(107,114,128,0.3)',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s'
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: execManualOrdersEnabled ? 23 : 3,
                  transition: 'left 0.2s'
                }} />
              </button>
              <span style={{ color: execManualOrdersEnabled ? green : muted, fontSize: 11, fontWeight: 600 }}>
                {execManualOrdersEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
          <KillSwitchButton
            active={execKillSwitchActive}
            onActivate={(reason) => handleKillSwitch(true, reason)}
            onDeactivate={() => handleKillSwitch(false)}
            colors={executionColors}
          />
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {SUB_TABS.map(({ k, label, desc }) => (
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

        {/* ═══ DASHBOARD SUB-TAB (no live guard — always visible) ═══ */}
        {subTab === 'dashboard' && (
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

            {/* Advanced Performance Analytics */}
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
                    {/* P&L Por Asset */}
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

                    {/* By Hour + By Day */}
                    <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12, marginBottom: 16 }}>
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

                    {/* P&L Distribution */}
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

                    {/* Exit Reason + Direction */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
                                    <div><span style={{ color: muted }}>Win Rate: </span><span style={{ color: hitColor(d.winRate), fontWeight: 700 }}>{d.winRate}%</span></div>
                                    <div><span style={{ color: muted }}>P&L: </span><span style={{ color: d.totalPnl >= 0 ? green : red, fontWeight: 700 }}>${d.totalPnl}</span></div>
                                    <div><span style={{ color: muted }}>W/L: </span><span style={{ fontWeight: 600 }}>{d.wins}/{d.trades - d.wins}</span></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
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

            {/* Detailed Statistics */}
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
          </div>
        )}

        {/* ═══ POSITIONS SUB-TAB (with live guard) ═══ */}
        {subTab === 'positions' && execMode !== 'live' && (
          <div>
            <PositionMonitor
              positions={paperPositions}
              heatMap={execRiskDashboard?.heatMap}
              colors={executionColors}
            />
            {/* Position Correlation */}
            {correlationData && correlationData.pairs && correlationData.pairs.length > 0 && (
              <div style={{ ...card, padding: "16px 20px", marginTop: 14 }}>
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
                          <td style={{ padding: "4px 8px", fontSize: 11 }}>{pair.assetA} ↔ {pair.assetB}</td>
                          <td style={{ padding: "4px 8px", fontWeight: 700, color: corrColor }}>{pair.correlation > 0 ? '+' : ''}{pair.correlation}</td>
                          <td style={{ padding: "4px 8px" }}>
                            <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: `${corrColor}20`, color: corrColor, fontWeight: 600 }}>
                              {pair.level.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                {correlationData.warnings && correlationData.warnings.length > 0 && (
                  <div style={{ fontSize: 10, color: amber, marginTop: 6 }}>
                    {correlationData.warnings.map((w, i) => (
                      <div key={i} style={{ marginBottom: 2 }}>⚠ {w}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ HISTORY SUB-TAB (no live guard — always visible) ═══ */}
        {subTab === 'history' && (() => {
          // Client-side pagination from full paperHistory (fetched with limit=200)
          const totalTrades = paperHistory.length;
          const paginatedTrades = paperHistory.slice(historyPage * PAPER_HISTORY_PAGE_SIZE, (historyPage + 1) * PAPER_HISTORY_PAGE_SIZE);
          return (
          <div style={{ ...card, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={sTitle}>HISTORIAL DE TRADES ({totalTrades})</div>
            </div>

            {totalTrades === 0 ? (
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
                      {paginatedTrades.map((trade, i) => {
                        const pnl = parseFloat(trade.realized_pnl || 0);
                        const pnlPct = parseFloat(trade.realized_pnl_percent || 0);
                        const isWin = pnl > 0;
                        return (
                          <tr key={trade.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                            <td style={{ padding: "6px 8px", fontWeight: 600 }}>{trade.asset}</td>
                            <td style={{ padding: "6px 8px", color: trade.direction === 'LONG' ? green : red }}>{trade.direction === 'LONG' ? '▲ L' : '▼ S'}</td>
                            <td style={{ padding: "6px 8px" }}>${Number(trade.entry_price).toLocaleString()}</td>
                            <td style={{ padding: "6px 8px" }}>${Number(trade.exit_price).toLocaleString()}</td>
                            <td style={{ padding: "6px 8px", color: isWin ? green : red, fontWeight: 700 }}>{isWin ? '+' : ''}${pnl.toFixed(2)}</td>
                            <td style={{ padding: "6px 8px", color: isWin ? green : red }}>{isWin ? '+' : ''}{pnlPct.toFixed(2)}%</td>
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
                {totalTrades > PAPER_HISTORY_PAGE_SIZE && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" }}>
                    <button onClick={() => setHistoryPage(p => Math.max(0, p - 1))} disabled={historyPage === 0}
                      style={{ padding: "4px 12px", background: bg3, border: `1px solid ${border}`, borderRadius: 4, color: historyPage === 0 ? muted : text, fontFamily: "monospace", fontSize: 10, cursor: historyPage === 0 ? "default" : "pointer" }}>
                      ← Prev
                    </button>
                    <span style={{ fontSize: 10, color: muted, fontFamily: "monospace" }}>
                      {historyPage + 1} / {Math.ceil(totalTrades / PAPER_HISTORY_PAGE_SIZE)}
                    </span>
                    <button onClick={() => setHistoryPage(p => p + 1)} disabled={(historyPage + 1) * PAPER_HISTORY_PAGE_SIZE >= totalTrades}
                      style={{ padding: "4px 12px", background: bg3, border: `1px solid ${border}`, borderRadius: 4, color: (historyPage + 1) * PAPER_HISTORY_PAGE_SIZE >= totalTrades ? muted : text, fontFamily: "monospace", fontSize: 10, cursor: (historyPage + 1) * PAPER_HISTORY_PAGE_SIZE >= totalTrades ? "default" : "pointer" }}>
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          );
        })()}

        {/* ═══ ORDERS SUB-TAB ═══ */}
        {subTab === 'orders' && execManualOrdersEnabled && (
          <div>
            <OrderEntryForm
              onSubmit={handleCreateOrder}
              colors={executionColors}
            />
            <div style={{ marginTop: 16 }}>
              <div style={{ color: text, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                Libro de Órdenes
              </div>
              <OrderBook
                orders={execOrders}
                onCancel={handleCancelOrder}
                onSubmit={handleSubmitOrder}
                colors={executionColors}
              />
            </div>
          </div>
        )}

        {/* Live mode: exchange not connected yet */}
        {execMode === 'live' && (subTab === 'positions' || subTab === 'risk' || subTab === 'audit' || subTab === 'orders') && (
          <div style={{
            ...card,
            textAlign: 'center',
            padding: '48px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{ fontSize: 40, opacity: 0.4 }}>🔗</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: text }}>Modo LIVE — Exchange no conectado</div>
            <div style={{ fontSize: 11, color: muted, maxWidth: 400, lineHeight: 1.6 }}>
              La integración con Bybit aún no está activa. Cuando se conecte, aquí verás posiciones reales,
              órdenes ejecutadas en el exchange y métricas de riesgo en tiempo real.
            </div>
            <button
              onClick={() => {
                setExecMode('paper');
                authFetch(`${API_URL}/api/paper/config/${USER_ID}`, {
                  method: 'POST',
                  body: JSON.stringify({ execution_mode: 'paper' })
                }).then(() => loadExecutionData()).catch(() => {});
              }}
              style={{
                marginTop: 8,
                padding: '8px 20px',
                background: `${purple}22`,
                border: `1px solid ${purple}44`,
                borderRadius: 6,
                color: purple,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              📝 Volver a Paper Trading
            </button>
          </div>
        )}

        {/* Risk sub-tab (paper mode) */}
        {subTab === 'risk' && execMode !== 'live' && (
          <RiskDashboard
            dashboard={execRiskDashboard}
            colors={executionColors}
          />
        )}

        {/* Audit sub-tab (paper mode) */}
        {subTab === 'audit' && execMode !== 'live' && (
          <ExecutionAuditLog
            logs={execAuditLog}
            colors={executionColors}
          />
        )}

        {(execLoading || paperLoading) && (
          <div style={{ textAlign: 'center', padding: 10, fontSize: 10, color: muted, fontFamily: 'monospace' }}>
            Actualizando datos...
          </div>
        )}
      </div>
    );
  };

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
  // ─── APM / MONITOR TAB ──────────────────────────────────────────────────────
  const APMTab = () => {
    const m = apmData;
    const h = systemHealth;

    const fmtBytes = (b) => {
      if (!b || b === 0) return '0 B';
      if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
      if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
      return (b / 1024).toFixed(0) + ' KB';
    };

    const fmtUptime = (s) => {
      if (!s) return '--';
      const d = Math.floor(s / 86400);
      const hrs = Math.floor((s % 86400) / 3600);
      const min = Math.floor((s % 3600) / 60);
      return d > 0 ? `${d}d ${hrs}h ${min}m` : hrs > 0 ? `${hrs}h ${min}m` : `${min}m`;
    };

    const pill = (label, status) => {
      const c = status === 'ok' || status === 'active' || status === 'healthy' ? green
        : status === 'degraded' || status === 'stale' ? amber
        : status === 'disabled' || status === 'down' || status === 'unavailable' ? red : muted;
      return (
        <span style={{
          display: "inline-block", padding: "2px 8px", borderRadius: 4,
          background: `${c}22`, color: c, fontSize: 10, fontFamily: "monospace", fontWeight: 600
        }}>{label}</span>
      );
    };

    const metricCard = (label, value, sub, color = text) => (
      <div style={{
        background: bg3, borderRadius: 8, padding: "12px 16px", flex: "1 1 0",
        minWidth: 120, border: `1px solid ${border}`
      }}>
        <div style={{ fontSize: 9, color: muted, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "monospace" }}>{value}</div>
        {sub && <div style={{ fontSize: 9, color: muted, fontFamily: "monospace", marginTop: 2 }}>{sub}</div>}
      </div>
    );

    const counters = m?.counters || {};
    const histograms = m?.histograms || {};
    const gauges = m?.gauges || {};
    const caches = m?.caches || {};
    const workers = m?.workers || {};
    const httpLatency = histograms['http.latency'] || {};
    const totalReqs = counters['http.requests'] || 0;
    const totalErrors = counters['http.errors'] || 0;
    const errorRate = totalReqs > 0 ? ((totalErrors / totalReqs) * 100).toFixed(2) : '0.00';

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header */}
        <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: text, fontFamily: "monospace" }}>
              SYSTEM MONITOR
            </div>
            <div style={{ fontSize: 10, color: muted, fontFamily: "monospace", marginTop: 4 }}>
              Métricas en tiempo real · Auto-refresh 15s
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {pill(h?.status === 'healthy' ? 'HEALTHY' : h?.status?.toUpperCase() || 'OFFLINE', h?.status === 'healthy' ? 'ok' : h?.status || 'down')}
            {m && <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>
              {new Date(m.collectedAt).toLocaleTimeString()}
            </span>}
          </div>
        </div>

        {!m ? (
          <div style={{ ...card, textAlign: "center", padding: 40, color: muted, fontFamily: "monospace", fontSize: 12 }}>
            Esperando conexión con el backend...
          </div>
        ) : (
          <>
            {/* Row 1: System Status */}
            <div style={card}>
              <div style={sTitle}>ESTADO DEL SISTEMA</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {metricCard("Uptime", fmtUptime(m.uptimeSeconds || gauges['process.uptime'] || h?.uptime))}
                {metricCard("Database", h?.checks?.database?.status === 'ok' ? 'OK' : 'DOWN', h?.checks?.database?.latencyMs ? `${h.checks.database.latencyMs}ms` : null,
                  h?.checks?.database?.status === 'ok' ? green : red)}
                {metricCard("Market Data", h?.checks?.marketData?.status === 'ok' ? 'FRESH' : h?.checks?.marketData?.status || '--',
                  h?.checks?.marketData?.ageSeconds ? `${h.checks.marketData.ageSeconds}s ago` : null,
                  h?.checks?.marketData?.status === 'ok' ? green : amber)}
                {metricCard("SSE Clients", gauges['sse.clients'] ?? h?.checks?.sse?.clients ?? 0)}
                {metricCard("Telegram", h?.checks?.telegram === 'active' ? 'ON' : 'OFF', null,
                  h?.checks?.telegram === 'active' ? green : muted)}
              </div>
            </div>

            {/* Row 2: HTTP Performance */}
            <div style={card}>
              <div style={sTitle}>HTTP PERFORMANCE</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {metricCard("Requests", totalReqs.toLocaleString())}
                {metricCard("Errors", totalErrors.toLocaleString(), null, totalErrors > 0 ? red : green)}
                {metricCard("Error Rate", `${errorRate}%`, null, parseFloat(errorRate) > 5 ? red : parseFloat(errorRate) > 1 ? amber : green)}
                {metricCard("p50", httpLatency.p50 != null ? `${httpLatency.p50}ms` : '--', 'median')}
                {metricCard("p95", httpLatency.p95 != null ? `${httpLatency.p95}ms` : '--', 'slow', httpLatency.p95 > 1000 ? red : httpLatency.p95 > 500 ? amber : text)}
                {metricCard("p99", httpLatency.p99 != null ? `${httpLatency.p99}ms` : '--', 'worst', httpLatency.p99 > 2000 ? red : httpLatency.p99 > 1000 ? amber : text)}
              </div>
            </div>

            {/* Row 3: Application Metrics */}
            <div style={card}>
              <div style={sTitle}>APLICACIÓN</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {metricCard("SSE Broadcasts", (counters['sse.broadcasts'] || 0).toLocaleString())}
                {metricCard("Signals", (counters['signals.generated'] || 0).toLocaleString())}
                {metricCard("Alerts Sent", (counters['alerts.telegram'] || 0).toLocaleString(), 'telegram')}
                {metricCard("Backtests", (counters['backtests.completed'] || 0).toLocaleString())}
              </div>
            </div>

            {/* Row 4: Caches */}
            {Object.keys(caches).length > 0 && (
              <div style={card}>
                <div style={sTitle}>CACHES</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {Object.entries(caches).map(([name, c]) => {
                    const hitRate = c.hitRate != null ? (c.hitRate * 100).toFixed(1) : '0.0';
                    return (
                      <div key={name} style={{
                        background: bg3, borderRadius: 8, padding: "12px 16px", flex: "1 1 0",
                        minWidth: 180, border: `1px solid ${border}`
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: purple, fontFamily: "monospace", marginBottom: 8, textTransform: "uppercase" }}>
                          {name}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, color: muted, fontFamily: "monospace" }}>Size</span>
                          <span style={{ fontSize: 10, color: text, fontFamily: "monospace", fontWeight: 600 }}>{c.size || 0} / {c.maxSize || '?'}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, color: muted, fontFamily: "monospace" }}>Hit Rate</span>
                          <span style={{ fontSize: 10, color: parseFloat(hitRate) > 80 ? green : parseFloat(hitRate) > 50 ? amber : red, fontFamily: "monospace", fontWeight: 600 }}>{hitRate}%</span>
                        </div>
                        <div style={{
                          height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)", overflow: "hidden"
                        }}>
                          <div style={{
                            height: "100%", width: `${Math.min(100, parseFloat(hitRate))}%`, borderRadius: 2,
                            background: parseFloat(hitRate) > 80 ? green : parseFloat(hitRate) > 50 ? amber : red
                          }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                          <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>Hits: {c.hits || 0}</span>
                          <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>Miss: {c.misses || 0}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Row 5: Workers */}
            {Object.keys(workers).length > 0 && (
              <div style={card}>
                <div style={sTitle}>WORKERS</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {Object.entries(workers).map(([name, w]) => {
                    const wc = w.counters || {};
                    const wh = w.histograms || {};
                    return (
                      <div key={name} style={{
                        background: bg3, borderRadius: 8, padding: "12px 16px", flex: "1 1 0",
                        minWidth: 200, border: `1px solid ${border}`
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: purple, fontFamily: "monospace", marginBottom: 8, textTransform: "uppercase" }}>
                          {name}
                        </div>
                        {Object.entries(wc).filter(([k]) => k.includes('success') || k.includes('error')).map(([k, v]) => (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>{k.split('.').pop()}</span>
                            <span style={{ fontSize: 9, color: k.includes('error') ? red : green, fontFamily: "monospace", fontWeight: 600 }}>{v}</span>
                          </div>
                        ))}
                        {Object.entries(wh).filter(([k]) => k.includes('latency')).slice(0, 2).map(([k, v]) => (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>{k.split('.').pop()} p95</span>
                            <span style={{ fontSize: 9, color: text, fontFamily: "monospace", fontWeight: 600 }}>{v.p95 || '--'}ms</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Row 6: Memory */}
            <div style={card}>
              <div style={sTitle}>MEMORIA DEL PROCESO</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {metricCard("RSS", fmtBytes(gauges['process.memory.rss']), 'total allocated')}
                {metricCard("Heap Used", fmtBytes(gauges['process.memory.heapUsed']), 'active objects')}
                {metricCard("Heap Total", fmtBytes(gauges['process.memory.heapTotal']), 'reserved')}
                {metricCard("External", fmtBytes(gauges['process.memory.external']), 'C++ objects')}
              </div>
            </div>

            {/* Raw counters */}
            <div style={card}>
              <div style={sTitle}>TODOS LOS CONTADORES</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                {Object.entries(counters).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <div key={k} style={{
                    display: "flex", justifyContent: "space-between", padding: "6px 10px",
                    background: bg3, borderRadius: 4, border: `1px solid ${border}`
                  }}>
                    <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>{k}</span>
                    <span style={{ fontSize: 10, color: text, fontFamily: "monospace", fontWeight: 600 }}>{v.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
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
        {tab === "dashboard" && DashboardTab()}
        {tab === "signals" && SignalsTab()}
        {tab === "portfolio" && PortfolioTab()}
        {tab === "alerts" && AlertsTab()}
        {tab === "execution" && ExecutionTab()}
        {tab === "strategy" && StrategyTab()}
        {/* Paper tab removed — content consolidated into Execution tab */}
        {tab === "apm" && APMTab()}
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

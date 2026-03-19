'use client'

import { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { useRouter } from 'next/navigation';
import { useSSE } from './hooks/useSSE';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import { authFetch } from './lib/api';
// Lazy-loaded tabs (code splitting)
const DashboardTab = lazy(() => import('./components/tabs/DashboardTab'));
const SignalsTab = lazy(() => import('./components/tabs/SignalsTab'));
const AlertsTab = lazy(() => import('./components/tabs/AlertsTab'));
const APMTab = lazy(() => import('./components/tabs/APMTab'));
const PortfolioTab = lazy(() => import('./components/tabs/PortfolioTab'));
const ExecutionTab = lazy(() => import('./components/tabs/ExecutionTab'));
const StrategyTab = lazy(() => import('./components/tabs/StrategyTab'));
const GuideTab = lazy(() => import('./components/tabs/GuideTab'));
const ReportsTab = lazy(() => import('./components/tabs/ReportsTab'));

// Custom hooks
import { useBacktest } from './hooks/useBacktest';
import { useOptimization } from './hooks/useOptimization';

import { colors } from './lib/theme';

// ═══════════════════════════════════════════════════════════════════════════════
// SENTIX PRO - FRONTEND COMPLETO
// Dashboard, Senales, Portfolio, Alertas - Version Full
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
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();
  const USER_ID = authUserId || 'default-user';

  // Ref to always have the latest USER_ID in callbacks without re-creating them
  const userIdRef = useRef(USER_ID);
  userIdRef.current = USER_ID;

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
  const [paperConfirmFullReset, setPaperConfirmFullReset] = useState(false);

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

  // ─── FETCH EXECUTION MODE ON MOUNT (so Dashboard knows if we're in Bybit mode) ──
  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${API_URL}/api/execution/mode`);
        if (res.ok) {
          const d = await res.json();
          const mode = d.mode === 'bybit' ? 'live' : (d.mode || 'paper');
          setExecMode(mode);
        }
      } catch (_) {}
    })();
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
        authFetch(`${API_URL}/api/paper/config/${userIdRef.current}`),
        authFetch(`${API_URL}/api/positions/${userIdRef.current}`),
        authFetch(`${API_URL}/api/paper/performance/${userIdRef.current}`),
        authFetch(`${API_URL}/api/paper/history/${userIdRef.current}?status=closed&limit=200&offset=0`),
        authFetch(`${API_URL}/api/paper/equity/${userIdRef.current}?days=7`),
        authFetch(`${API_URL}/api/paper/performance-advanced/${userIdRef.current}?days=${advancedPerfDays}`),
      ]);
      if (cfgRes.status === 'fulfilled' && cfgRes.value.ok) {
        const d = await cfgRes.value.json();
        const cfg = d.config || d;
        setPaperConfig(cfg);
        setPaperConfigForm(prev => prev ? { ...prev, current_capital: cfg.current_capital, daily_pnl: cfg.daily_pnl } : cfg);
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
        setAdvancedPerf(d.total !== undefined ? d : null);
      }
    } catch (error) {
      console.error('Error fetching dashboard paper data:', error);
    } finally {
      dashboardPaperFetching.current = false;
    }
  }, [API_URL, advancedPerfDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBacktestHistory = useCallback(async () => {
    try {
      const response = await authFetch(`${API_URL}/api/backtest/history/${userIdRef.current}`);
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
      const response = await authFetch(`${API_URL}/api/wallets/${userIdRef.current}`);
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
      const response = await authFetch(`${API_URL}/api/portfolio/${userIdRef.current}`);
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
    // Wait for auth to resolve before fetching user-scoped data
    if (authEnabled && authLoading) return;

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
  }, [authEnabled, authLoading, fetchMarketData, fetchSignals, fetchAlerts, fetchDashboardPaper, fetchBacktestHistory, fetchSystemHealth, fetchMetrics, fetchAccuracy, sseConnected]);

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
          const corrRes = await authFetch(`${API_URL}/api/paper/correlation/${userIdRef.current}`);
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
      const res = await authFetch(`${API_URL}/api/paper/config/${userIdRef.current}`);
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
        authFetch(`${API_URL}/api/orders/${userIdRef.current}?limit=50`),
        authFetch(`${API_URL}/api/risk/${userIdRef.current}/dashboard`),
        authFetch(`${API_URL}/api/execution-log/${userIdRef.current}?limit=50`),
        authFetch(`${API_URL}/api/risk/${userIdRef.current}/kill-switch`)
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
          <div>Verificando autenticacion...</div>
        </div>
      </div>
    );
  }

  const handleCreateOrder = async (orderSpec) => {
    try {
      const res = await authFetch(`${API_URL}/api/orders/${userIdRef.current}`, {
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
      const res = await authFetch(`${API_URL}/api/orders/${userIdRef.current}/${orderId}/cancel`, { method: 'POST' });
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
      const res = await authFetch(`${API_URL}/api/orders/${userIdRef.current}/${orderId}/submit`, { method: 'POST' });
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
        res = await authFetch(`${API_URL}/api/risk/${userIdRef.current}/kill-switch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason || 'Manual activation' })
        });
      } else {
        res = await authFetch(`${API_URL}/api/risk/${userIdRef.current}/kill-switch`, { method: 'DELETE' });
      }
      if (res.ok) {
        const d = await res.json().catch(() => ({}));
        showFeedback('success', activate
          ? `Kill switch activado — ${d.cancelledOrders || 0} ordenes canceladas, ${d.closedPositions || 0} posiciones cerradas`
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
      {/* Background effects */}
      <div style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(168,85,247,0.08), transparent 70%)",
        zIndex: 0
      }} />
      <div style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(168,85,247,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.02) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
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
          borderBottom: `1px solid rgba(168,85,247,0.12)`,
          flexWrap: "wrap",
          gap: 16
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img
              src="/sentix-icon.svg"
              alt="Sentix Pro"
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                boxShadow: `0 0 20px rgba(168,85,247,0.3)`
              }}
            />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.02em" }}>
                SENTIX <span style={{ fontSize: 12, color: purple, fontWeight: 500 }}>PRO</span>
              </div>
              <div style={{ fontSize: 10, color: muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {t('main.subtitle')}
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
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
              style={{
                padding: '4px 10px',
                background: 'rgba(168,85,247,0.1)',
                border: '1px solid rgba(168,85,247,0.25)',
                borderRadius: 6,
                color: '#a855f7',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.05em',
                fontFamily: 'monospace',
              }}
              title={lang === 'es' ? 'Switch to English' : 'Cambiar a Espanol'}
            >
              {lang === 'es' ? '🌐 EN' : '🌐 ES'}
            </button>
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
              📖 {t('main.help')}
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
                {t('main.signOut')}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { k: "dashboard", label: `📊 ${t('tab.dashboard')}`, desc: t('tab.dashboard.desc') },
            { k: "signals", label: `🎯 ${t('tab.signals')}`, desc: t('tab.signals.desc') },
            { k: "execution", label: `⚡ ${t('tab.execution')}`, desc: t('tab.execution.desc') },
            { k: "strategy", label: `⚙ ${t('tab.strategy')}`, desc: t('tab.strategy.desc') },
            { k: "alerts", label: `🔔 ${t('tab.alerts')}`, desc: t('tab.alerts.desc') },
            { k: "portfolio", label: `💼 ${t('tab.portfolio')}`, desc: t('tab.portfolio.desc') },
            { k: "reports", label: `📄 ${t('tab.reports')}`, desc: t('tab.reports.desc') }
          ].map(({ k, label, desc }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                flex: "1 1 auto",
                minWidth: 140,
                padding: "12px 18px",
                background: tab === k ? `linear-gradient(135deg, ${purple}, #7c3aed)` : "rgba(17,17,24,0.6)",
                backdropFilter: "blur(8px)",
                border: tab === k ? `1px solid rgba(168,85,247,0.4)` : `1px solid rgba(168,85,247,0.08)`,
                borderRadius: 10,
                color: tab === k ? "#fff" : muted,
                fontFamily: "monospace",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "center",
                boxShadow: tab === k ? "0 4px 20px rgba(168,85,247,0.25)" : "none",
              }}
            >
              <div>{label}</div>
              <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>{desc}</div>
            </button>
          ))}
        </div>

        {/* Tab Content — lazy-loaded with Suspense for code splitting */}
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300, color: colors.muted, fontFamily: 'monospace', fontSize: 12 }}>{t('main.loading')}</div>}>
        {tab === "dashboard" && <DashboardTab marketData={marketData} signals={signals} paperMetrics={paperMetrics} paperHistory={paperHistory} paperPositions={paperPositions} paperConfig={paperConfig} realtimeEquityCurve={realtimeEquityCurve} backtestHistory={backtestHistory} backtestEquityCurve={backtestEquityCurve} systemHealth={systemHealth} sseConnected={sseConnected} lastUpdate={lastUpdate} setTab={setTab} setStrategySubTab={setStrategySubTab} apiUrl={API_URL} execMode={execMode} authFetch={authFetch} userId={userIdRef.current} />}
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
        {tab === "strategy" && <StrategyTab
          strategySubTab={strategySubTab} setStrategySubTab={setStrategySubTab}
          bt={bt} opt={opt}
          paperConfig={paperConfig} setPaperConfig={setPaperConfig}
          paperConfigForm={paperConfigForm} setPaperConfigForm={setPaperConfigForm}
          paperSavingConfig={paperSavingConfig} setPaperSavingConfig={setPaperSavingConfig}
          paperShowConfig={paperShowConfig} setPaperShowConfig={setPaperShowConfig}
          paperConfirmReset={paperConfirmReset} setPaperConfirmReset={setPaperConfirmReset}
          paperConfirmFullReset={paperConfirmFullReset} setPaperConfirmFullReset={setPaperConfirmFullReset}
          fetchDashboardPaper={fetchDashboardPaper}
          showAdvancedPerf={showAdvancedPerf} setShowAdvancedPerf={setShowAdvancedPerf}
          advancedPerfDays={advancedPerfDays} setAdvancedPerfDays={setAdvancedPerfDays}
          advancedPerf={advancedPerf}
          authFetch={authFetch} apiUrl={API_URL} userId={USER_ID}
        />}
        {/* Paper tab removed — content consolidated into Execution tab */}
        {tab === "reports" && <ReportsTab
          paperMetrics={paperMetrics} paperHistory={paperHistory} paperPositions={paperPositions} paperConfig={paperConfig}
          signalAccuracy={signalAccuracy} signals={signals} advancedPerf={advancedPerf}
          correlationData={correlationData} backtestHistory={backtestHistory}
          authFetch={authFetch} apiUrl={API_URL} userId={USER_ID}
        />}
        {tab === "apm" && <APMTab apmData={apmData} systemHealth={systemHealth} />}
        {tab === "guide" && <GuideTab />}
        </Suspense>

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
          ⚠ Herramienta de analisis. No constituye asesoramiento financiero.
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

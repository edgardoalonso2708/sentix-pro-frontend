'use client';
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { colors, card, sTitle } from '../../lib/theme';
import { useLanguage } from '../../contexts/LanguageContext';

import OrderEntryForm from '../execution/OrderEntryForm';
import OrderBook from '../execution/OrderBook';
import PositionMonitor from '../execution/PositionMonitor';
import RiskDashboard from '../execution/RiskDashboard';
import KillSwitchButton from '../execution/KillSwitchButton';
import ExecutionModeToggle from '../execution/ExecutionModeToggle';
import ExecutionAuditLog from '../execution/ExecutionAuditLog';

const { bg, bg2, bg3, border, text, muted, green, red, amber, purple } = colors;
const PAPER_HISTORY_PAGE_SIZE = 10;

export default function ExecutionTab({
  execSubTab, setExecSubTab,
  execOrders, execRiskDashboard, execAuditLog,
  execKillSwitchActive, execMode, execAutoExecute,
  execManualOrdersEnabled, execFeedback, execLoading,
  paperConfig, paperPositions, paperHistory, paperMetrics,
  paperConfigForm, setPaperConfigForm,
  paperClosingTrade, setPaperClosingTrade,
  paperHistoryPage, setPaperHistoryPage,
  paperHistoryTotal, paperLoading,
  correlationData, showAdvancedPerf, setShowAdvancedPerf,
  advancedPerfDays, setAdvancedPerfDays, advancedPerf,
  setExecMode, setExecAutoExecute, setExecManualOrdersEnabled,
  setExecFeedback, setPaperConfig,
  handleKillSwitch, handleCreateOrder, handleCancelOrder, handleSubmitOrder,
  fetchDashboardPaper, loadExecutionData,
  authFetch, apiUrl, userId,
  marketData
}) {
    const { t } = useLanguage();
    const subTab = execSubTab;
    const setSubTab = setExecSubTab;
    const executionColors = { bg, bg2, bg3, border, text, muted, green, red, accent: purple };

    // Bybit connection status (fetched once on mount)
    const [bybitStatus, setBybitStatus] = useState({ bybitConfigured: false, testnet: true, healthy: false });
    const [switchingMode, setSwitchingMode] = useState(false);

    // Bybit-specific data (separate from paper data)
    const [bybitPositions, setBybitPositions] = useState([]);
    const [bybitHistory, setBybitHistory] = useState([]);
    const [bybitBalance, setBybitBalance] = useState(null);
    const [bybitEquity, setBybitEquity] = useState(0);
    const [bybitLoading, setBybitLoading] = useState(false);

    useEffect(() => {
      (async () => {
        try {
          const res = await authFetch(`${apiUrl}/api/execution/mode`);
          if (res.ok) {
            const d = await res.json();
            setBybitStatus({ bybitConfigured: d.bybitConfigured, testnet: d.testnet, healthy: d.bybitConfigured });
            if (d.mode && d.mode !== execMode) setExecMode(d.mode === 'bybit' ? 'live' : d.mode);
          }
        } catch (_) {}
      })();
    }, []);

    // Fetch Bybit data when in live mode
    const loadBybitData = async () => {
      if (!bybitStatus.bybitConfigured) return;
      setBybitLoading(true);
      try {
        const [posRes, histRes] = await Promise.allSettled([
          authFetch(`${apiUrl}/api/bybit/positions`),
          authFetch(`${apiUrl}/api/bybit/history?limit=50`),
        ]);
        if (posRes.status === 'fulfilled' && posRes.value.ok) {
          const d = await posRes.value.json();
          setBybitPositions(d.positions || []);
          setBybitBalance(d.balance || null);
          setBybitEquity(d.equity || 0);
        }
        if (histRes.status === 'fulfilled' && histRes.value.ok) {
          const d = await histRes.value.json();
          setBybitHistory(d.trades || []);
        }
      } catch (err) {
        console.error('Bybit data load error:', err);
      } finally {
        setBybitLoading(false);
      }
    };

    // Reload Bybit data when switching to live mode
    useEffect(() => {
      if ((execMode === 'live' || execMode === 'perp') && bybitStatus.bybitConfigured) {
        loadBybitData();
      }
    }, [execMode, bybitStatus.bybitConfigured]);

    // Select data source based on mode
    const isLiveMode = (execMode === 'live' || execMode === 'perp') && bybitStatus.bybitConfigured;
    const activePositions = isLiveMode ? bybitPositions : paperPositions;
    const activeHistory = isLiveMode ? bybitHistory : paperHistory;
    const activeHistoryTotal = isLiveMode ? bybitHistory.length : paperHistoryTotal;
    const activeLoading = isLiveMode ? bybitLoading : paperLoading;

    // Aliases for paper state
    const configForm = paperConfigForm, setConfigForm = setPaperConfigForm;
    const closingTrade = paperClosingTrade, setClosingTrade = setPaperClosingTrade;
    const historyPage = paperHistoryPage, setHistoryPage = setPaperHistoryPage;
    const historyTotal = isLiveMode ? bybitHistory.length : paperHistoryTotal;

    // Derived values for status banner
    const isEnabled = paperConfig?.is_enabled;
    const capital = isLiveMode
      ? parseFloat(bybitBalance?.total || 0)
      : parseFloat(paperConfig?.current_capital || 10000);
    const initialCap = isLiveMode
      ? parseFloat(bybitBalance?.total || 0) // Bybit doesn't track initial capital
      : parseFloat(paperConfig?.initial_capital || 10000);
    const capitalPnl = isLiveMode ? 0 : capital - initialCap;
    const capitalPnlPct = isLiveMode ? 0 : (initialCap > 0 ? ((capitalPnl / initialCap) * 100) : 0);

    // Handlers
    const handleCloseTrade = async (tradeId) => {
      setClosingTrade(tradeId);
      try {
        const res = await authFetch(`${apiUrl}/api/paper/close/${tradeId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId })
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
        const res = await authFetch(`${apiUrl}/api/paper/config/${userId}`, {
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
      { k: 'dashboard', label: `\u{1F4CA} ${t('exec.dashboard')}`, desc: t('exec.dashboardDesc') },
      { k: 'positions', label: `\u{1F4C8} ${t('exec.positions')}`, desc: t('exec.positionsDesc') },
      { k: 'history', label: `\u{1F4CB} ${t('exec.history')}`, desc: t('exec.historyDesc') },
      { k: 'risk', label: `\⚠️ ${t('exec.risk')}`, desc: t('exec.riskDesc') },
      { k: 'orders', label: `\u{1F4DD} ${t('exec.orders')}`, desc: t('exec.ordersDesc') },
      { k: 'audit', label: `\u{1F50D} ${t('exec.audit')}`, desc: t('exec.auditDesc') }
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
            <span>{execFeedback.type === 'success' ? '\✓' : '\✗'} {execFeedback.message}</span>
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
                setSwitchingMode(true);
                try {
                  // Map frontend mode names to backend adapter names
                  const backendMode = (val === 'live' || val === 'perp') ? 'bybit' : 'paper';
                  const res = await authFetch(`${apiUrl}/api/execution/mode`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: backendMode })
                  });
                  if (res.ok) {
                    setExecMode(val);
                    // Also persist in paper_config for UI state
                    await authFetch(`${apiUrl}/api/paper/config/${userId}`, {
                      method: 'POST',
                      body: JSON.stringify({ execution_mode: val })
                    });
                    await loadExecutionData();
                  } else {
                    const err = await res.json().catch(() => ({}));
                    console.error('Mode switch rejected:', err.error);
                    setExecFeedback?.({ type: 'error', message: err.error || 'Error al cambiar modo' });
                  }
                } catch (e) {
                  console.error('Mode change failed:', e);
                  setExecFeedback?.({ type: 'error', message: 'Error de conexion al cambiar modo' });
                } finally {
                  setSwitchingMode(false);
                }
              }}
              autoExecute={execAutoExecute}
              onAutoExecuteChange={async (val) => {
                setExecAutoExecute(val);
                try {
                  await authFetch(`${apiUrl}/api/paper/config/${userId}`, {
                    method: 'POST',
                    body: JSON.stringify({ auto_execute: val })
                  });
                  await loadExecutionData();
                } catch (e) { console.error('Auto-execute change failed:', e); }
              }}
              bybitStatus={bybitStatus}
              switching={switchingMode}
              colors={executionColors}
            />
            {/* Manual orders toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: muted, fontSize: 12 }}>{t('exec.manualOrders')}:</span>
              <button
                onClick={() => {
                  const next = !execManualOrdersEnabled;
                  setExecManualOrdersEnabled(next);
                  if (next && execSubTab !== 'orders') setExecSubTab('orders');
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

        {/* DASHBOARD SUB-TAB */}
        {subTab === 'dashboard' && (
          <div>
            {/* Status Banner — mode-aware */}
            <div style={{
              background: isLiveMode
                ? "rgba(255, 168, 0, 0.08)"
                : (isEnabled ? "rgba(0, 212, 170, 0.08)" : "rgba(239, 68, 68, 0.08)"),
              border: `1px solid ${isLiveMode ? amber : (isEnabled ? green : red)}`,
              borderRadius: 8, padding: "14px 18px", marginBottom: 16,
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: isLiveMode ? amber : (isEnabled ? green : red),
                  boxShadow: `0 0 8px ${isLiveMode ? amber : (isEnabled ? green : red)}`,
                  animation: (isLiveMode || isEnabled) ? "pulse 2s infinite" : "none"
                }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isLiveMode ? amber : (isEnabled ? green : red) }}>
                    {isLiveMode
                      ? `BYBIT ${bybitStatus.testnet ? 'TESTNET' : 'LIVE'} ACTIVO`
                      : (isEnabled ? t('exec.paperActive') : t('exec.paperDisabled'))}
                  </div>
                  <div style={{ fontSize: 10, color: muted, fontFamily: "monospace" }}>
                    {isLiveMode ? (
                      <>Balance: ${capital.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT · Available: ${parseFloat(bybitBalance?.available || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</>
                    ) : (
                      <>Capital: ${capital.toLocaleString(undefined, { minimumFractionDigits: 2 })} · P&L: <span style={{ color: capitalPnl >= 0 ? green : red }}>
                        {capitalPnl >= 0 ? '+' : ''}${capitalPnl.toFixed(2)} ({capitalPnlPct.toFixed(1)}%)
                      </span></>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={handleToggleEnabled} style={{
                padding: "6px 16px", background: isEnabled ? "rgba(239,68,68,0.2)" : "rgba(0,212,170,0.2)",
                border: `1px solid ${isEnabled ? red : green}`, borderRadius: 6,
                color: isEnabled ? red : green, fontFamily: "monospace", fontSize: 11,
                fontWeight: 700, cursor: "pointer"
              }}>
                {isEnabled ? `\⏸ ${t('exec.pause')}` : `\▶ ${t('exec.activate')}`}
              </button>
            </div>

            {/* Performance Cards — mode-aware */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
              {(isLiveMode ? [
                { label: 'BALANCE', value: `$${capital.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: green },
                { label: 'AVAILABLE', value: `$${parseFloat(bybitBalance?.available || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: text },
                { label: 'EQUITY', value: `$${(bybitEquity > 0 ? bybitEquity : capital).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: text },
                { label: 'ÓRDENES', value: `${activeHistory.length}`, color: text },
                { label: 'TRADES', value: `${paperMetrics?.totalTrades || 0}`, sub: `${paperMetrics?.winCount || 0}W / ${paperMetrics?.lossCount || 0}L`, color: text },
                { label: 'POSICIONES', value: `${activePositions.length}`, color: text },
              ] : [
                { label: t('common.pnlTotal'), value: `$${(paperMetrics?.totalPnl || 0).toFixed(2)}`, color: (paperMetrics?.totalPnl || 0) >= 0 ? green : red },
                { label: t('common.winRate'), value: `${paperMetrics?.winRate || 0}%`, color: (paperMetrics?.winRate || 0) >= 50 ? green : (paperMetrics?.winRate || 0) > 0 ? amber : muted },
                { label: t('common.trades'), value: `${paperMetrics?.totalTrades || 0}`, sub: `${paperMetrics?.winCount || 0}W / ${paperMetrics?.lossCount || 0}L`, color: text },
                { label: t('common.capital'), value: `$${capital.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: capital >= initialCap ? green : red },
                { label: t('common.maxDrawdown'), value: `$${(paperMetrics?.maxDrawdown || 0).toFixed(2)}`, color: red },
                { label: t('common.profitFactor'), value: paperMetrics?.profitFactor === Infinity ? '\∞' : `${(paperMetrics?.profitFactor || 0).toFixed(2)}`, color: (paperMetrics?.profitFactor || 0) >= 1.5 ? green : (paperMetrics?.profitFactor || 0) >= 1 ? amber : red },
              ]).map((stat, i) => (
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
                <div style={sTitle}>{'\u{1F4CA}'} {t('exec.advancedAnalytics')} {showAdvancedPerf ? '\▾' : '\▸'}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {[30, 90, 0].map(d => (
                    <button key={d} onClick={(e) => { e.stopPropagation(); setAdvancedPerfDays(d); }} style={{
                      padding: "3px 10px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700,
                      background: advancedPerfDays === d ? green : bg3, color: advancedPerfDays === d ? "#000" : muted
                    }}>{d === 0 ? t('exec.all') : `${d}d`}</button>
                  ))}
                </div>
              </div>

              {showAdvancedPerf && (() => {
                if (!advancedPerf || advancedPerf.total < 5) {
                  return <div style={{ padding: 20, textAlign: "center", color: muted, fontSize: 12 }}>
                    {t('exec.needTrades')} ({advancedPerf?.total || 0} {t('exec.current')})
                  </div>;
                }
                const hitColor = (rate) => rate >= 55 ? green : rate >= 45 ? amber : red;
                return (
                  <div style={{ marginTop: 14 }}>
                    {/* P&L Por Asset */}
                    {advancedPerf.byAsset && advancedPerf.byAsset.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>{t('exec.pnlByAsset')}</div>
                        <div style={{ background: bg3, borderRadius: 8, padding: 10 }}>
                          <ResponsiveContainer width="100%" height={Math.max(120, advancedPerf.byAsset.length * 32)}>
                            <BarChart data={advancedPerf.byAsset} layout="vertical" margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 9, fill: muted }} />
                              <YAxis type="category" dataKey="asset" tick={{ fontSize: 10, fill: "#e5e7eb" }} width={55} />
                              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, fontSize: 11 }}
                                formatter={(v, name, props) => {
                                  const d = props.payload;
                                  return [`$${v} | WR: ${d.winRate}% | ${d.trades} ${t('exec.trades')} | avg: $${d.avgPnl}`, 'P&L'];
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
                          <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>{t('exec.winRateByHour')}</div>
                          <div style={{ background: bg3, borderRadius: 8, padding: 10 }}>
                            <ResponsiveContainer width="100%" height={140}>
                              <BarChart data={advancedPerf.byHour}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                <XAxis dataKey="hour" tick={{ fontSize: 8, fill: muted }} />
                                <YAxis tick={{ fontSize: 8, fill: muted }} domain={[0, 100]} unit="%" />
                                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, fontSize: 10 }}
                                  formatter={(v, name, props) => {
                                    const d = props.payload;
                                    return d.trades > 0 ? [`${v}% (${d.trades} ${t('exec.trades')}, $${d.totalPnl})`, 'Win Rate'] : [t('exec.noTrades'), ''];
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
                          <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>{t('exec.winRateByDay')}</div>
                          <div style={{ background: bg3, borderRadius: 8, padding: 10 }}>
                            <ResponsiveContainer width="100%" height={140}>
                              <BarChart data={advancedPerf.byDayOfWeek}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                <XAxis dataKey="label" tick={{ fontSize: 9, fill: muted }} />
                                <YAxis tick={{ fontSize: 8, fill: muted }} domain={[0, 100]} unit="%" />
                                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, fontSize: 10 }}
                                  formatter={(v, name, props) => {
                                    const d = props.payload;
                                    return d.trades > 0 ? [`${v}% (${d.trades} ${t('exec.trades')}, $${d.totalPnl})`, 'Win Rate'] : [t('exec.noTrades'), ''];
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
                        <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>{t('exec.pnlDistribution')}</div>
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
                          <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>{t('exec.byCloseReason')}</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {advancedPerf.byExitReason.map(r => {
                              const reasonColor = r.reason === 'stop_loss' ? red : r.reason.includes('take_profit') ? green : r.reason === 'trailing_stop' ? amber : muted;
                              return (
                                <div key={r.reason} style={{ background: bg3, borderRadius: 6, padding: "8px 12px", borderLeft: `3px solid ${reasonColor}` }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: reasonColor }}>{r.reason.replace(/_/g, ' ').toUpperCase()}</span>
                                    <span style={{ fontSize: 10, color: muted }}>{r.count} {t('exec.trades')}</span>
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
                          <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>{t('exec.byDirection')}</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {["LONG", "SHORT"].map(dir => {
                              const d = advancedPerf.byDirection[dir];
                              if (!d || d.trades === 0) return null;
                              const dirColor = dir === "LONG" ? green : red;
                              return (
                                <div key={dir} style={{ background: bg3, borderRadius: 6, padding: "10px 14px", borderLeft: `3px solid ${dirColor}` }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: dirColor }}>{dir === "LONG" ? "\▲ LONG" : "\▼ SHORT"}</span>
                                    <span style={{ fontSize: 11, color: muted }}>{d.trades} {t('exec.trades')}</span>
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
                              <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 8 }}>{t('exec.monthlyPnl')}</div>
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
                <div style={sTitle}>{t('exec.detailedStats')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  {[
                    { label: t('exec.avgGain'), value: `+$${Math.abs(parseFloat(paperMetrics.avgProfit) || 0).toFixed(2)}`, color: green },
                    { label: t('exec.avgLoss'), value: `-$${Math.abs(parseFloat(paperMetrics.avgLoss) || 0).toFixed(2)}`, color: red },
                    { label: t('exec.bestTrade'), value: paperMetrics.bestTrade ? `${paperMetrics.bestTrade.asset} ${parseFloat(paperMetrics.bestTrade.pnl) >= 0 ? '+' : ''}$${parseFloat(paperMetrics.bestTrade.pnl).toFixed(2)}` : '-', color: parseFloat(paperMetrics.bestTrade?.pnl) >= 0 ? green : red },
                    { label: t('exec.worstTrade'), value: paperMetrics.worstTrade ? `${paperMetrics.worstTrade.asset} $${parseFloat(paperMetrics.worstTrade.pnl).toFixed(2)}` : '-', color: red },
                    { label: t('exec.avgTime'), value: `${(paperMetrics.avgHoldingTimeHours || 0).toFixed(1)}h`, color: text },
                    { label: t('exec.currentStreak'), value: `${paperMetrics.currentStreak || 0} ${paperMetrics.streakType === 'win' ? t('exec.victories') : paperMetrics.streakType === 'loss' ? t('exec.defeats') : '-'}`, color: paperMetrics.streakType === 'win' ? green : paperMetrics.streakType === 'loss' ? red : muted },
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

        {/* POSITIONS SUB-TAB (with live guard) */}
        {subTab === 'positions' && (execMode !== 'live' || bybitStatus?.bybitConfigured) && (
          <div>
            <PositionMonitor
              positions={activePositions}
              heatMap={execRiskDashboard?.heatMap}
              colors={executionColors}
              onClose={async (position) => {
                // Close position: create a reverse order (BUY→SELL, SELL→BUY)
                const closeSide = (position.side || position.action || 'BUY') === 'BUY' ? 'SELL' : 'BUY';
                const result = await handleCreateOrder({
                  asset: position.asset,
                  side: closeSide,
                  orderType: 'MARKET',
                  quantity: parseFloat(position.quantity),
                  source: 'manual',
                  parentTradeId: position.trade_id || position.id
                });
                if (result?.success) {
                  // Also close the paper_trade if it exists
                  if (position.trade_id || position.id) {
                    try {
                      await authFetch(`${apiUrl}/api/paper/close/${position.trade_id || position.id}`, { method: 'POST' });
                    } catch (e) { console.error('Paper trade close failed:', e); }
                  }
                  loadExecutionData();
                }
                return result;
              }}
            />
            {/* Position Correlation */}
            {correlationData && correlationData.pairs && correlationData.pairs.length > 0 && (
              <div style={{ ...card, padding: "16px 20px", marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={sTitle}>{t('exec.positionCorrelation')}</div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 4,
                    background: correlationData.riskLevel === 'high' ? `${red}20` : correlationData.riskLevel === 'medium' ? `${amber}20` : `${green}20`,
                    color: correlationData.riskLevel === 'high' ? red : correlationData.riskLevel === 'medium' ? amber : green,
                    textTransform: "uppercase"
                  }}>
                    {t('exec.riskLabel')}: {correlationData.riskLevel}
                  </div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 11, marginBottom: 10 }}>
                  <thead>
                    <tr>
                      {[t('exec.thPair'), t('exec.thCorrelation'), t('exec.thLevel')].map((h, i) => (
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
                          <td style={{ padding: "4px 8px", fontSize: 11 }}>{pair.assetA} \↔ {pair.assetB}</td>
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
                    <span>{t('exec.effectiveDiversification')}</span>
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
                      <div key={i} style={{ marginBottom: 2 }}>{'\⚠'} {w}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* HISTORY SUB-TAB */}
        {subTab === 'history' && (() => {
          const totalTrades = activeHistory.length;
          const paginatedTrades = activeHistory.slice(historyPage * PAPER_HISTORY_PAGE_SIZE, (historyPage + 1) * PAPER_HISTORY_PAGE_SIZE);
          return (
          <div style={{ ...card, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={sTitle}>{t('exec.tradeHistory')} ({totalTrades})</div>
            </div>

            {totalTrades === 0 ? (
              <div style={{ textAlign: "center", padding: 20, color: muted, fontSize: 12 }}>
                {isLiveMode ? 'No hay ordenes ejecutadas en Bybit.' : t('exec.noClosedTrades')}
              </div>
            ) : isLiveMode ? (
              /* ── Bybit History Table ── */
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 11 }}>
                    <thead>
                      <tr>
                        {['Simbolo', 'Dir', 'Tipo', 'Precio', 'Qty', 'Valor', 'Fee', 'Fecha/Hora', 'Status'].map((h, i) => (
                          <th key={i} style={{
                            padding: "6px 8px", textAlign: "left", fontSize: 9, color: muted,
                            textTransform: "uppercase", letterSpacing: "0.08em",
                            borderBottom: `1px solid ${border}`, fontWeight: 700
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTrades.map((order, i) => {
                        const isBuy = (order.side || '').toUpperCase() === 'BUY';
                        const execTime = order.updated_at || order.created_at || order.updatedTime || order.createdTime;
                        const avgPrice = Number(order.avg_price || order.avgPrice || order.price || 0);
                        const filledQty = Number(order.filled_quantity || order.cumExecQty || order.quantity || order.qty || 0);
                        const execValue = Number(order.cumExecValue || (avgPrice * filledQty) || 0);
                        const execFee = Number(order.cumExecFee || order.fee || 0);
                        const orderType = order.order_type || order.orderType || '';
                        const orderStatus = order.status || order.orderStatus || '';
                        const displayStatus = orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1).toLowerCase();
                        return (
                          <tr key={order.id || order.orderId || i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                            <td style={{ padding: "6px 8px", fontWeight: 600 }}>{order.symbol}</td>
                            <td style={{ padding: "6px 8px", color: isBuy ? green : red }}>{isBuy ? '\▲ BUY' : '\▼ SELL'}</td>
                            <td style={{ padding: "6px 8px", color: muted }}>{orderType}</td>
                            <td style={{ padding: "6px 8px" }}>${avgPrice.toLocaleString()}</td>
                            <td style={{ padding: "6px 8px" }}>{filledQty}</td>
                            <td style={{ padding: "6px 8px" }}>${execValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            <td style={{ padding: "6px 8px", color: muted }}>${execFee.toFixed(4)}</td>
                            <td style={{ padding: "6px 8px", color: muted, whiteSpace: "nowrap" }}>
                              {execTime ? new Date(execTime).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }) : '\u2014'}
                              {' '}
                              <span style={{ opacity: 0.7 }}>{execTime ? new Date(execTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              <span style={{
                                padding: "2px 6px", borderRadius: 4, fontSize: 9,
                                background: orderStatus === 'filled' ? "rgba(0,212,170,0.15)" :
                                  orderStatus === 'cancelled' ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
                                color: orderStatus === 'filled' ? green :
                                  orderStatus === 'cancelled' ? red : muted
                              }}>
                                {displayStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              /* ── Paper History Table ── */
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 11 }}>
                    <thead>
                      <tr>
                        {[t('exec.thAsset'), t('exec.thDir'), t('exec.thEntry'), t('exec.thExit'), t('exec.thPnl'), t('exec.thPct'), t('exec.thDate'), t('exec.thDuration'), t('exec.thReason')].map((h, i) => (
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
                            <td style={{ padding: "6px 8px", color: trade.direction === 'LONG' ? green : red }}>{trade.direction === 'LONG' ? '\▲ L' : '\▼ S'}</td>
                            <td style={{ padding: "6px 8px" }}>${Number(trade.entry_price).toLocaleString()}</td>
                            <td style={{ padding: "6px 8px" }}>${Number(trade.exit_price).toLocaleString()}</td>
                            <td style={{ padding: "6px 8px", color: isWin ? green : red, fontWeight: 700 }}>{isWin ? '+' : ''}${pnl.toFixed(2)}</td>
                            <td style={{ padding: "6px 8px", color: isWin ? green : red }}>{isWin ? '+' : ''}{pnlPct.toFixed(2)}%</td>
                            <td style={{ padding: "6px 8px", color: muted, whiteSpace: "nowrap" }}>
                              {trade.entry_at ? new Date(trade.entry_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }) : '\u2014'}
                              {' '}
                              <span style={{ opacity: 0.7 }}>{trade.entry_at ? new Date(trade.entry_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
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
                {totalTrades > PAPER_HISTORY_PAGE_SIZE && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" }}>
                    <button onClick={() => setHistoryPage(p => Math.max(0, p - 1))} disabled={historyPage === 0}
                      style={{ padding: "4px 12px", background: bg3, border: `1px solid ${border}`, borderRadius: 4, color: historyPage === 0 ? muted : text, fontFamily: "monospace", fontSize: 10, cursor: historyPage === 0 ? "default" : "pointer" }}>
                      \← {t('exec.prev')}
                    </button>
                    <span style={{ fontSize: 10, color: muted, fontFamily: "monospace" }}>
                      {historyPage + 1} / {Math.ceil(totalTrades / PAPER_HISTORY_PAGE_SIZE)}
                    </span>
                    <button onClick={() => setHistoryPage(p => p + 1)} disabled={(historyPage + 1) * PAPER_HISTORY_PAGE_SIZE >= totalTrades}
                      style={{ padding: "4px 12px", background: bg3, border: `1px solid ${border}`, borderRadius: 4, color: (historyPage + 1) * PAPER_HISTORY_PAGE_SIZE >= totalTrades ? muted : text, fontFamily: "monospace", fontSize: 10, cursor: (historyPage + 1) * PAPER_HISTORY_PAGE_SIZE >= totalTrades ? "default" : "pointer" }}>
                      {t('exec.next')} \→
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          );
        })()}

        {/* ORDERS SUB-TAB */}
        {subTab === 'orders' && (
          <div>
            {execManualOrdersEnabled && (
              <OrderEntryForm
                onSubmit={handleCreateOrder}
                marketData={marketData}
                colors={executionColors}
              />
            )}
            <div style={{ marginTop: execManualOrdersEnabled ? 16 : 0 }}>
              <div style={{ color: text, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                {t('exec.orderBook')}
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

        {/* Live/Perp mode: exchange not connected — only show if Bybit NOT configured */}
        {(execMode === 'live' || execMode === 'perp') && !bybitStatus?.bybitConfigured && (subTab === 'positions' || subTab === 'risk' || subTab === 'audit' || subTab === 'orders') && (
          <div style={{
            ...card,
            textAlign: 'center',
            padding: '48px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{ fontSize: 40, opacity: 0.4 }}>{execMode === 'perp' ? '\u{26A1}' : '\u{1F517}'}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: text }}>
              {execMode === 'perp' ? t('exec.perpMode') : t('exec.liveMode')}
            </div>
            <div style={{ fontSize: 11, color: muted, maxWidth: 400, lineHeight: 1.6 }}>
              {execMode === 'perp' ? t('exec.perpDesc') : t('exec.liveDesc')}
            </div>
            <button
              onClick={async () => {
                setExecMode('paper');
                try {
                  await authFetch(`${apiUrl}/api/execution/mode`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: 'paper' })
                  });
                  await authFetch(`${apiUrl}/api/paper/config/${userId}`, {
                    method: 'POST',
                    body: JSON.stringify({ execution_mode: 'paper' })
                  });
                  await loadExecutionData();
                } catch (_) {}
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
              {'\u{1F4DD}'} {t('exec.backToPaper')}
            </button>
          </div>
        )}

        {/* Risk sub-tab */}
        {subTab === 'risk' && (execMode === 'paper' || bybitStatus?.bybitConfigured) && (
          <RiskDashboard
            dashboard={execRiskDashboard}
            colors={executionColors}
          />
        )}

        {/* Audit sub-tab */}
        {subTab === 'audit' && (execMode === 'paper' || bybitStatus?.bybitConfigured) && (
          <ExecutionAuditLog
            logs={execAuditLog}
            colors={executionColors}
          />
        )}

        {(execLoading || activeLoading) && (
          <div style={{ textAlign: 'center', padding: 10, fontSize: 10, color: muted, fontFamily: 'monospace' }}>
            {t('exec.updatingData')}
          </div>
        )}
      </div>
    );
}

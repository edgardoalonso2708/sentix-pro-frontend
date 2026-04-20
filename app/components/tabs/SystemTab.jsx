'use client';
import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../../lib/api';
import { colors, card, sTitle } from '../../lib/theme';
import { formatPrice } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

const { bg, bg2, bg3, border, text, muted, green, red, amber, blue, purple } = colors;

export default function SystemTab({
  alertConfig, setAlertConfig, alerts,
  alertTestResult, setAlertTestResult,
  alertTesting, setAlertTesting,
  alertShowFilters, setAlertShowFilters,
  alertFilterForm, setAlertFilterForm,
  alertSavingFilters, setAlertSavingFilters,
  alertFilterSaveMsg, setAlertFilterSaveMsg,
  gateDiagnostics,
  apiUrl,
}) {
  const { t } = useLanguage();
  const [subTab, setSubTab] = useState('live');
  const [mainnetData, setMainnetData] = useState(null);
  const [mainnetLoading, setMainnetLoading] = useState(false);
  const [liveData, setLiveData] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [perfData, setPerfData] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [syncingCapital, setSyncingCapital] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const fetchMainnetReadiness = useCallback(async () => {
    setMainnetLoading(true);
    try {
      const res = await authFetch(`${apiUrl}/api/health/mainnet-readiness`);
      if (res.ok) {
        const data = await res.json();
        setMainnetData(data);
      }
    } catch (e) {
      console.error('Failed to fetch mainnet readiness:', e);
    } finally {
      setMainnetLoading(false);
    }
  }, [apiUrl]);

  const fetchLiveHealth = useCallback(async () => {
    setLiveLoading(true);
    try {
      const res = await authFetch(`${apiUrl}/api/health/live`);
      if (res.ok) {
        const data = await res.json();
        setLiveData(data);
        // Chain perf-rolling fetch using the userId returned by /api/health/live
        if (data?.user_id) {
          setPerfLoading(true);
          try {
            const pres = await authFetch(`${apiUrl}/api/health/performance-rolling/${data.user_id}`);
            if (pres.ok) {
              const pdata = await pres.json();
              setPerfData(pdata);
            }
          } catch (pe) {
            console.error('Failed to fetch performance rolling:', pe);
          } finally {
            setPerfLoading(false);
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch live health:', e);
    } finally {
      setLiveLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchMainnetReadiness();
    const interval = setInterval(fetchMainnetReadiness, 300000);
    return () => clearInterval(interval);
  }, [fetchMainnetReadiness]);

  useEffect(() => {
    fetchLiveHealth();
    const interval = setInterval(fetchLiveHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchLiveHealth]);

  const handleSyncCapital = async () => {
    if (!liveData?.user_id) return;
    const cap = liveData.operational?.capital_sync || {};
    const newVal = cap.bybit_total_equity;
    const oldVal = cap.internal_capital;
    const delta = newVal - oldVal;
    const confirmMsg = `Sync internal capital to Bybit total equity?\n\n`
      + `Current DB:    $${oldVal?.toFixed(2)}\n`
      + `Bybit total:   $${newVal?.toFixed(2)}\n`
      + `Delta:         ${delta >= 0 ? '+' : ''}$${delta?.toFixed(2)}\n\n`
      + `This will UPDATE paper_config.current_capital and insert an equity\n`
      + `snapshot. Position sizing for new trades will use the new baseline.\n\n`
      + `Continue?`;
    if (!confirm(confirmMsg)) return;
    setSyncingCapital(true);
    setSyncResult(null);
    try {
      const res = await authFetch(`${apiUrl}/api/paper/capital-sync/${liveData.user_id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult({ ok: true, ...data });
        // Refresh live health immediately to show the new state
        fetchLiveHealth();
      } else {
        setSyncResult({ ok: false, error: data.error || 'Sync failed' });
      }
    } catch (e) {
      setSyncResult({ ok: false, error: e.message });
    } finally {
      setSyncingCapital(false);
      setTimeout(() => setSyncResult(null), 8000);
    }
  };

  // Calculate system health score from available data
  const calcHealthScore = () => {
    if (!mainnetData) return null;
    const criteria = mainnetData.criteria || [];
    const passCount = criteria.filter(c => c.pass).length;
    const total = criteria.length || 1;
    return Math.round((passCount / total) * 100);
  };

  const healthScore = calcHealthScore();
  const scoreColor = healthScore === null ? muted : healthScore >= 80 ? green : healthScore >= 40 ? amber : red;

  // ─── SUB-TAB: NOTIFICATIONS (original alerts config) ───────────────────
  const testResult = alertTestResult, setTestResult = setAlertTestResult;
  const testing = alertTesting, setTesting = setAlertTesting;
  const showFilters = alertShowFilters, setShowFilters = setAlertShowFilters;
  const filterForm = alertFilterForm, setFilterForm = setAlertFilterForm;
  const savingFilters = alertSavingFilters, setSavingFilters = setAlertSavingFilters;
  const filterSaveMsg = alertFilterSaveMsg, setFilterSaveMsg = setAlertFilterSaveMsg;

  const ALL_ACTIONS = ['STRONG BUY', 'BUY', 'WEAK BUY', 'STRONG SELL', 'SELL', 'WEAK SELL'];
  const AVAILABLE_ASSETS = ['BITCOIN', 'ETHEREUM', 'BINANCECOIN', 'SOLANA', 'CARDANO', 'RIPPLE'];

  const handleSaveFilters = async () => {
    if (!filterForm) return;
    setSavingFilters(true);
    setFilterSaveMsg(null);
    try {
      const res = await authFetch(`${apiUrl}/api/alert-filters/default-user`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filterForm)
      });
      if (res.ok) {
        setFilterSaveMsg({ ok: true, text: t('alert.filtersSaved') });
      } else {
        setFilterSaveMsg({ ok: false, text: t('alert.errorSaving') });
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
      const response = await authFetch(`${apiUrl}/api/send-alert`, {
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

  return (
    <div>
      {/* Sub-tab navigation */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[
          { k: 'live', label: 'LIVE HEALTH' },
          { k: 'health', label: 'LEGACY READINESS' },
          { k: 'notifications', label: t('alert.config') || 'NOTIFICATIONS' },
        ].map(({ k, label }) => (
          <button key={k} onClick={() => setSubTab(k)} style={{
            flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: subTab === k ? `linear-gradient(135deg, ${purple}, #7c3aed)` : bg3,
            color: subTab === k ? "#fff" : muted,
            fontSize: 11, fontWeight: 700, fontFamily: "monospace",
            transition: "all 0.2s"
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* LIVE HEALTH SUB-TAB (operational + rolling performance)           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {subTab === 'live' && (() => {
        const fmtAge = (ms) => {
          if (ms == null) return '—';
          const s = Math.floor(ms / 1000);
          if (s < 60) return `${s}s`;
          if (s < 3600) return `${Math.floor(s / 60)}m`;
          if (s < 86400) return `${Math.floor(s / 3600)}h`;
          return `${Math.floor(s / 86400)}d`;
        };
        const fmtPct = (n, d = 2) => (n == null || !Number.isFinite(n)) ? '—' : `${n.toFixed(d)}%`;
        const fmtNum = (n, d = 2) => (n == null || !Number.isFinite(n)) ? '—' : n.toFixed(d);
        const fmtUsd = (n) => (n == null || !Number.isFinite(n)) ? '—' : `$${n.toFixed(2)}`;

        const op = liveData?.operational || {};
        const sigAge = op.last_signal?.age_ms;
        const sigColor = sigAge == null ? muted : sigAge < 7200000 ? green : sigAge < 14400000 ? amber : red;

        const bybit1h = op.bybit?.last_1h || { total: 0, errors: 0, error_rate: 0 };
        const bybitErrPct = bybit1h.total > 0 ? bybit1h.error_rate * 100 : 0;
        const bybitColor = bybit1h.total === 0 ? muted : bybitErrPct < 1 ? green : bybitErrPct < 5 ? amber : red;

        const reconAge = op.reconciler?.age_ms;
        const reconIssues = op.reconciler?.issues_count ?? 0;
        const reconColor = reconAge == null ? muted
          : (reconAge < 5400000 && reconIssues === 0) ? green
          : (reconAge < 7200000 && reconIssues <= 1) ? amber : red;

        const cap = op.capital_sync || {};
        const capPct = cap.delta_pct;
        const capColor = cap.skipped ? muted
          : capPct == null ? muted
          : Math.abs(capPct) < 0.5 ? green
          : Math.abs(capPct) < 2 ? amber : red;

        const pf = perfData?.profit_factor || {};
        const pfDelta = pf.delta;
        const pfColor = pf.last_20 == null ? muted
          : pf.last_20 >= 1.5 ? green
          : pf.last_20 >= 1.0 ? amber : red;

        const hr = perfData?.hit_rate_last_30;
        const hrColor = hr == null ? muted : hr >= 55 ? green : hr >= 45 ? amber : red;

        const rMul = perfData?.r_multiple_avg_last_20;
        const rMulColor = rMul == null ? muted : rMul >= 0.3 ? green : rMul >= 0 ? amber : red;

        const slip = perfData?.slippage || {};
        const slipColor = slip.avg_bps == null ? muted
          : slip.avg_bps < 10 ? green
          : slip.avg_bps < 30 ? amber : red;

        const dd = perfData?.drawdown_from_peak || {};
        const ddColor = dd.pct == null ? muted
          : dd.pct < 5 ? green
          : dd.pct < 10 ? amber : red;

        const cell = (label, value, color, sub) => (
          <div style={{ background: bg3, padding: "12px 14px", borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: muted, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color }}>{value}</div>
            {sub && <div style={{ fontSize: 9, color: muted, fontFamily: "monospace", marginTop: 4 }}>{sub}</div>}
          </div>
        );

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* OPERATIONAL */}
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={sTitle}>OPERATIONAL HEALTH</div>
                {liveData?.evaluated_at && (
                  <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>
                    {new Date(liveData.evaluated_at).toLocaleTimeString()}
                  </span>
                )}
              </div>
              {liveLoading && !liveData ? (
                <div style={{ textAlign: "center", padding: 30, color: muted, fontSize: 12 }}>Loading...</div>
              ) : liveData ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  {cell('LAST SIGNAL', fmtAge(sigAge) + (sigAge != null ? ' ago' : ''), sigColor,
                    op.last_signal?.at ? new Date(op.last_signal.at).toLocaleString() : null)}
                  {cell('BYBIT (LAST 1H)', `${fmtPct(bybitErrPct, 1)} err`, bybitColor,
                    `${bybit1h.total} req · ${bybit1h.avg_latency_ms ?? '—'}ms avg`)}
                  {cell('RECONCILER', fmtAge(reconAge) + (reconAge != null ? ' ago' : ''), reconColor,
                    `${reconIssues} issues · ${op.reconciler?.reconciled_count ?? 0} fixed`)}
                  {cell('CAPITAL SYNC',
                    cap.skipped ? 'PAPER MODE' : (capPct != null ? `${capPct >= 0 ? '+' : ''}${fmtPct(capPct, 2)}` : '—'),
                    capColor,
                    cap.skipped ? cap.reason : (cap.bybit_total_equity != null ? `Bybit ${fmtUsd(cap.bybit_total_equity)} · DB ${fmtUsd(cap.internal_capital)}` : null))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 30, color: muted, fontSize: 12 }}>
                  Could not load live health data
                </div>
              )}
              {/* Bybit secondary windows */}
              {liveData && (
                <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: 10, color: muted, fontFamily: "monospace", flexWrap: "wrap" }}>
                  <span>Bybit 5m: {op.bybit?.last_5m?.total || 0} req, {fmtPct((op.bybit?.last_5m?.error_rate || 0) * 100, 1)} err</span>
                  <span>Bybit 24h: {op.bybit?.last_24h?.total || 0} req, {fmtPct((op.bybit?.last_24h?.error_rate || 0) * 100, 1)} err</span>
                  <span>Phantom proxy: {op.phantom_proxy?.rejected_orders_24h || 0} rejected/24h, {op.phantom_proxy?.last_reconciler_issues || 0} last-recon</span>
                  {cap.bybit_usdt_cash != null && (
                    <span>Capital: USDT {fmtUsd(cap.bybit_usdt_cash)} + {cap.bybit_positions_count || 0} pos {fmtUsd(cap.bybit_position_value || 0)}</span>
                  )}
                  <span>Mode: {liveData.execution_mode || '—'}</span>
                </div>
              )}
              {/* Capital sync action — only shown in bybit mode and when there's drift */}
              {liveData && !cap.skipped && (
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <button
                    onClick={handleSyncCapital}
                    disabled={syncingCapital || cap.bybit_total_equity == null}
                    style={{
                      padding: "8px 14px", borderRadius: 6, border: "none",
                      cursor: syncingCapital ? "not-allowed" : "pointer",
                      background: syncingCapital ? bg3 : `linear-gradient(135deg, ${blue}, #3b82f6)`,
                      color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "monospace"
                    }}
                    title="Re-anchor internal current_capital to Bybit total equity (use after deposits/withdrawals)"
                  >
                    {syncingCapital ? 'SYNCING...' : 'SYNC CAPITAL FROM BYBIT'}
                  </button>
                  {syncResult && (
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: syncResult.ok ? green : red }}>
                      {syncResult.ok
                        ? `\u2713 ${syncResult.classified_as}: ${fmtUsd(syncResult.previous_capital)} \u2192 ${fmtUsd(syncResult.new_capital)} (${syncResult.delta_usd >= 0 ? '+' : ''}${fmtUsd(syncResult.delta_usd)})${syncResult.drawdown_warning ? ' \u26A0 peak preserved' : ''}`
                        : `\u2717 ${syncResult.error}`}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* PERFORMANCE ROLLING */}
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={sTitle}>PERFORMANCE ROLLING</div>
                {perfData?.evaluated_at && (
                  <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>
                    {perfData.total_closed_trades || 0} closed trades
                  </span>
                )}
              </div>
              {perfLoading && !perfData ? (
                <div style={{ textAlign: "center", padding: 30, color: muted, fontSize: 12 }}>Loading...</div>
              ) : perfData ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  {cell('PROFIT FACTOR (20)', fmtNum(pf.last_20), pfColor,
                    pf.all_window != null
                      ? `vs all ${fmtNum(pf.all_window)}${pfDelta != null ? ` (${pfDelta >= 0 ? '+' : ''}${fmtNum(pfDelta)})` : ''}`
                      : null)}
                  {cell('HIT RATE (30)', fmtPct(hr, 1), hrColor, null)}
                  {cell('R-MULTIPLE AVG (20)', fmtNum(rMul), rMulColor,
                    rMul != null ? (rMul >= 0 ? 'positive expectancy' : 'negative expectancy') : null)}
                  {cell('SLIPPAGE (LAST 10)',
                    slip.avg_bps != null ? `${fmtNum(slip.avg_bps, 1)} bps` : '—',
                    slipColor,
                    slip.avg_bps != null ? `n=${slip.sample_size}` : (slip.note || null))}
                  {cell('DRAWDOWN FROM PEAK', fmtPct(dd.pct, 2), ddColor,
                    dd.peak_equity != null ? `peak ${fmtUsd(dd.peak_equity)} → now ${fmtUsd(dd.current_equity)}` : null)}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 30, color: muted, fontSize: 12 }}>
                  Could not load performance data
                </div>
              )}
            </div>

            {/* SIGNAL PIPELINE — reused from legacy panel since it's still useful while live */}
            {gateDiagnostics && gateDiagnostics.total != null && (() => {
              const g = gateDiagnostics;
              const passRate = parseFloat(g.passRate) || 0;
              const passColor = passRate >= 20 ? green : passRate >= 5 ? amber : red;
              const total = g.total || 0;
              const executed = g.executed || 0;
              const bottleneck = g.bottleneck;
              return (
                <div style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={sTitle}>SIGNAL PIPELINE (LAST CYCLE)</div>
                    {g.timestamp && <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>
                      {new Date(g.timestamp).toLocaleTimeString()}
                    </span>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                    {cell('SIGNALS IN', total, text, null)}
                    {cell('TRADES OUT', executed, green, null)}
                    {cell('PASS RATE', g.passRate || '—', passColor, null)}
                    {cell('BOTTLENECK',
                      (bottleneck?.gate === 'none' ? 'NONE' : (bottleneck?.gate || '--').toUpperCase().replace(/_/g, ' ')),
                      bottleneck?.gate === 'none' ? green : red,
                      bottleneck?.count > 0 ? `${bottleneck.count} blocked` : null)}
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEALTH SUB-TAB                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {subTab === 'health' && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* SYSTEM HEALTH SCORE */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={sTitle}>TRADING SYSTEM HEALTH</div>
              {mainnetData?.evaluatedAt && (
                <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>
                  {new Date(mainnetData.evaluatedAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            {mainnetLoading && !mainnetData ? (
              <div style={{ textAlign: "center", padding: 30, color: muted, fontSize: 12 }}>Loading...</div>
            ) : mainnetData ? (
              <>
                {/* Score circle + verdict */}
                <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 20 }}>
                  <div style={{
                    width: 90, height: 90, borderRadius: "50%",
                    border: `4px solid ${mainnetData.verdict === 'GO' ? green : red}`,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    background: `${mainnetData.verdict === 'GO' ? green : red}10`,
                    flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: mainnetData.verdict === 'GO' ? green : red, fontFamily: "monospace" }}>
                      {mainnetData.score}
                    </div>
                    <div style={{ fontSize: 8, color: muted, fontWeight: 600 }}>CRITERIA</div>
                  </div>
                  <div>
                    <div style={{
                      fontSize: 20, fontWeight: 900, fontFamily: "monospace",
                      color: mainnetData.verdict === 'GO' ? green : red,
                      marginBottom: 4
                    }}>
                      {mainnetData.verdict === 'GO' ? 'READY FOR MAINNET' : 'NOT READY'}
                    </div>
                    <div style={{ fontSize: 11, color: muted, lineHeight: 1.6 }}>
                      {mainnetData.verdict === 'GO'
                        ? 'All criteria met. System is validated for live trading with minimal capital.'
                        : 'One or more criteria are not met. Continue monitoring in paper trading.'}
                    </div>
                  </div>
                </div>

                {/* Criteria checklist */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(mainnetData.criteria || []).map((c, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", borderRadius: 6,
                      background: c.pass ? `${green}08` : `${red}08`,
                      border: `1px solid ${c.pass ? green : red}22`,
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: c.pass ? `${green}22` : `${red}22`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, flexShrink: 0,
                      }}>
                        {c.pass ? '\u2713' : '\u2717'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: text, fontFamily: "monospace" }}>
                          {c.label}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: c.pass ? green : red, fontFamily: "monospace", minWidth: 70, textAlign: "right" }}>
                        {c.current}
                      </div>
                      <div style={{ fontSize: 9, color: muted, fontFamily: "monospace", minWidth: 60, textAlign: "right" }}>
                        {c.target}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: 30, color: muted, fontSize: 12 }}>
                Could not load system health data
              </div>
            )}
          </div>

          {/* SIGNAL PIPELINE (gate diagnostics) */}
          {gateDiagnostics && gateDiagnostics.total != null && (() => {
            const g = gateDiagnostics;
            const passRate = parseFloat(g.passRate) || 0;
            const passColor = passRate >= 20 ? green : passRate >= 5 ? amber : red;

            const gates = [
              { key: 'hold', label: 'HOLD (score too low)', count: g.hold || 0 },
              { key: 'strength_blocked', label: 'Strength blocked', count: g.strength_blocked || 0 },
              { key: 'missing_levels', label: 'No trade levels', count: g.missing_levels || 0 },
              { key: 'invalid_levels', label: 'Invalid SL/TP', count: g.invalid_levels || 0 },
              { key: 'low_rr', label: 'Low risk/reward', count: g.low_rr || 0 },
              { key: 'low_confluence', label: 'Low confluence', count: g.low_confluence || 0 },
              { key: 'position_size', label: 'Position too small', count: g.position_size || 0 },
              { key: 'risk_rejected', label: 'Risk engine rejected', count: g.risk_rejected || 0 },
              { key: 'order_create_fail', label: 'Order create fail', count: g.order_create_fail || 0 },
              { key: 'submit_fail', label: 'Submit fail', count: g.submit_fail || 0 },
            ].filter(x => x.count > 0).sort((a, b) => b.count - a.count);

            const total = g.total || 0;
            const executed = g.executed || 0;
            const bottleneck = g.bottleneck;

            return (
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={sTitle}>SIGNAL PIPELINE</div>
                  {g.timestamp && <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>
                    Last cycle: {new Date(g.timestamp).toLocaleTimeString()}
                  </span>}
                </div>

                {/* Summary metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                  <div style={{ background: bg3, borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: muted, marginBottom: 4, fontWeight: 600 }}>SIGNALS IN</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: text, fontFamily: "monospace" }}>{total}</div>
                  </div>
                  <div style={{ background: bg3, borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: muted, marginBottom: 4, fontWeight: 600 }}>TRADES OUT</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: green, fontFamily: "monospace" }}>{executed}</div>
                  </div>
                  <div style={{ background: bg3, borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: muted, marginBottom: 4, fontWeight: 600 }}>PASS RATE</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: passColor, fontFamily: "monospace" }}>{g.passRate}</div>
                  </div>
                  <div style={{ background: bg3, borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: muted, marginBottom: 4, fontWeight: 600 }}>BOTTLENECK</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: bottleneck?.gate === 'none' ? green : red, fontFamily: "monospace", marginTop: 4 }}>
                      {bottleneck?.gate === 'none' ? 'NONE' : (bottleneck?.gate || '--').toUpperCase().replace(/_/g, ' ')}
                    </div>
                    {bottleneck?.count > 0 && <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>{bottleneck.count} blocked</div>}
                  </div>
                </div>

                {/* Gate breakdown bars */}
                {gates.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: muted, fontFamily: "monospace", fontWeight: 600, marginBottom: 8, textTransform: "uppercase" }}>
                      Rejection breakdown
                    </div>
                    {gates.map(gate => {
                      const pct = total > 0 ? (gate.count / total) * 100 : 0;
                      return (
                        <div key={gate.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 130, fontSize: 10, color: muted, fontFamily: "monospace", textAlign: "right", flexShrink: 0 }}>
                            {gate.label}
                          </div>
                          <div style={{ flex: 1, height: 14, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                            <div style={{
                              height: "100%",
                              width: `${Math.min(100, pct)}%`,
                              background: gate.key === (bottleneck?.gate) ? `${red}cc` : `${amber}88`,
                              borderRadius: 4,
                              transition: "width 0.3s ease",
                              minWidth: pct > 0 ? 2 : 0,
                            }} />
                          </div>
                          <div style={{ width: 50, fontSize: 11, fontWeight: 700, color: text, fontFamily: "monospace", textAlign: "right" }}>
                            {gate.count}
                          </div>
                          <div style={{ width: 40, fontSize: 9, color: muted, fontFamily: "monospace" }}>
                            {pct.toFixed(0)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {gates.length === 0 && total > 0 && (
                  <div style={{ textAlign: "center", padding: 16, color: green, fontSize: 12, fontFamily: "monospace" }}>
                    All signals passed through the pipeline
                  </div>
                )}
              </div>
            );
          })()}

          {/* Quick summary stats */}
          {mainnetData?.summary && (
            <div style={card}>
              <div style={sTitle}>TRADING SUMMARY</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                {[
                  { label: 'Total Trades', value: mainnetData.summary.totalTrades, color: text },
                  { label: 'Win Rate', value: mainnetData.summary.winRate, color: parseFloat(mainnetData.summary.winRate) >= 50 ? green : red },
                  { label: 'Profit Factor', value: mainnetData.summary.profitFactor, color: parseFloat(mainnetData.summary.profitFactor) >= 1.0 ? green : red },
                  { label: 'Max Drawdown', value: mainnetData.summary.maxDrawdown, color: parseFloat(mainnetData.summary.maxDrawdown) < 10 ? green : red },
                  { label: 'Hit Rate 4h', value: mainnetData.summary.hitRate4h, color: mainnetData.summary.hitRate4h !== 'N/A' && parseFloat(mainnetData.summary.hitRate4h) >= 52 ? green : amber },
                  { label: 'Days Tracked', value: mainnetData.summary.daysSinceFirst, color: mainnetData.summary.daysSinceFirst >= 14 ? green : muted },
                ].map((stat, i) => (
                  <div key={i} style={{ background: bg3, padding: "10px 14px", borderRadius: 6, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{stat.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* NOTIFICATIONS SUB-TAB (original alerts config)                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {subTab === 'notifications' && (
        <div>
          {/* Telegram Setup */}
          <div style={{
            background: "rgba(59, 130, 246, 0.1)",
            border: `1px solid ${blue}`,
            borderRadius: 8,
            padding: "14px 18px",
            marginBottom: 16
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: blue, marginBottom: 8 }}>
              {t('alert.telegram')} ({t('alert.telegramActive')})
            </div>
            <div style={{ fontSize: 12, color: text, lineHeight: 1.8 }}>
              {t('alert.step1')}<br />
              {t('alert.step2')} <code style={{ background: bg3, padding: "2px 6px", borderRadius: 4 }}>/start</code><br />
              {t('alert.step3')}<br />
              {t('alert.step4')} <code style={{ background: bg3, padding: "2px 6px", borderRadius: 4 }}>/senales</code><br />
              {t('alert.step5')} <code style={{ background: bg3, padding: "2px 6px", borderRadius: 4 }}>/stop</code>
            </div>
          </div>

          {/* Email Config */}
          <div style={card}>
            <div style={sTitle}>{t('alert.config')}</div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: muted, display: "block", marginBottom: 6 }}>
                {t('alert.emailLabel')}
              </label>
              <textarea
                value={alertConfig.email}
                onChange={e => setAlertConfig(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email1@ejemplo.com, email2@ejemplo.com"
                rows={2}
                style={{
                  width: "100%", background: bg3, border: `1px solid ${border}`,
                  borderRadius: 6, padding: "10px 14px", color: text, fontSize: 13,
                  resize: "vertical", fontFamily: "inherit"
                }}
              />
              <div style={{ fontSize: 9, color: muted, marginTop: 4 }}>
                {t('alert.emailDescription')}
              </div>
            </div>

            <button onClick={handleTestAlert} disabled={testing} style={{
              width: "100%", padding: "10px",
              background: testing ? bg3 : `linear-gradient(135deg, ${purple}, #7c3aed)`,
              border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 700,
              cursor: testing ? "not-allowed" : "pointer"
            }}>
              {testing ? t('alert.sending') : t('alert.sendTest')}
            </button>

            {testResult && (
              <div style={{ marginTop: 12, padding: "12px 14px", background: bg3, borderRadius: 6, fontSize: 12, lineHeight: 1.8 }}>
                <div style={{ color: testResult.success ? green : red, fontWeight: 700, marginBottom: 6 }}>
                  {testResult.success ? t('alert.testProcessed') : t('alert.error')}
                </div>
                {testResult.delivery && (
                  <div style={{ color: text, fontSize: 11 }}>
                    Email: <span style={{ color: testResult.delivery.email === 'sent' ? green : amber }}>
                      {testResult.delivery.email === 'sent' ? t('alert.sent') : testResult.delivery.email}
                    </span><br />
                    Telegram: <span style={{ color: testResult.delivery.telegram === 'sent' ? green : amber }}>
                      {testResult.delivery.telegram === 'sent' ? t('alert.sent') : testResult.delivery.telegram}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Custom Alert Filters */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowFilters(!showFilters)}>
              <div style={sTitle}>{t('alert.customFilters')}</div>
              <div style={{ fontSize: 18, color: muted, transform: showFilters ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>{'\u25BC'}</div>
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
                    {filterForm.enabled ? t('alert.filtersActive') : t('alert.filtersDisabled')}
                  </span>
                </div>

                {/* Signal types */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 10, color: muted, marginBottom: 6, display: "block", fontWeight: 700 }}>{t('alert.signalTypes')}</label>
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
                    {t('alert.assets')} ({filterForm.assets.length === 0 ? t('alert.all') : filterForm.assets.length + ' ' + t('alert.selected')})
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
                  <div style={{ fontSize: 9, color: muted, marginTop: 4 }}>{t('alert.noSelectionAll')}</div>
                </div>

                {/* Min confidence */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 10, color: muted, display: "block", marginBottom: 4, fontWeight: 700 }}>
                    {t('alert.minConfidence')}: <span style={{ color: text }}>{filterForm.min_confidence}%</span>
                  </label>
                  <input type="range" min="20" max="90" step="5"
                    value={filterForm.min_confidence}
                    onChange={e => setFilterForm(p => ({ ...p, min_confidence: parseInt(e.target.value) }))}
                    style={{ width: "100%" }}
                  />
                </div>

                {/* Min score */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 10, color: muted, display: "block", marginBottom: 4, fontWeight: 700 }}>
                    {t('alert.minScore')}: <span style={{ color: text }}>{filterForm.min_score}</span>
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

                {/* Email recipients */}
                {filterForm.email_enabled && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 10, color: muted, display: "block", marginBottom: 6, fontWeight: 700 }}>
                      {t('alert.notificationEmails')}
                    </label>
                    <textarea
                      value={filterForm.alert_emails || ''}
                      onChange={e => setFilterForm(p => ({ ...p, alert_emails: e.target.value }))}
                      placeholder="email1@ejemplo.com, email2@ejemplo.com"
                      rows={2}
                      style={{
                        width: "100%", background: bg3, border: `1px solid ${border}`,
                        borderRadius: 6, padding: "8px 12px", color: text, fontSize: 12,
                        resize: "vertical", fontFamily: "inherit"
                      }}
                    />
                    <div style={{ fontSize: 9, color: muted, marginTop: 4 }}>
                      {t('alert.notificationEmailsDescription')}
                    </div>
                  </div>
                )}

                {/* Save */}
                <button onClick={handleSaveFilters} disabled={savingFilters} style={{
                  width: "100%", padding: "10px", border: "none", borderRadius: 7,
                  cursor: savingFilters ? "not-allowed" : "pointer",
                  background: savingFilters ? bg3 : `linear-gradient(135deg, ${blue}, #3b82f6)`,
                  color: "#fff", fontSize: 12, fontWeight: 700
                }}>
                  {savingFilters ? t('alert.saving') : t('alert.saveFilters')}
                </button>

                {filterSaveMsg && (
                  <div style={{ marginTop: 8, fontSize: 11, color: filterSaveMsg.ok ? green : red, textAlign: "center" }}>
                    {filterSaveMsg.ok ? '\u2705' : '\u274C'} {filterSaveMsg.text}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Alert History */}
          <div style={card}>
            <div style={sTitle}>{t('alert.history')}</div>
            {alerts.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: muted }}>
                {t('alert.noAlerts')}
              </div>
            ) : (
              <div style={{ maxHeight: 500, overflowY: "auto" }}>
                {alerts.map((alert, i) => (
                  <div key={alert.id || i} style={{
                    background: bg3,
                    borderLeft: `3px solid ${alert.action === 'BUY' ? green : alert.action === 'SELL' ? red : amber}`,
                    borderRadius: 6, padding: "12px 14px", marginBottom: 10
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>
                        {alert.action === 'BUY' ? '\uD83D\uDFE2' : alert.action === 'SELL' ? '\uD83D\uDD34' : '\u26AA'} {alert.asset}
                      </div>
                      <div style={{
                        fontSize: 10, fontWeight: 700,
                        color: alert.action === 'BUY' ? green : alert.action === 'SELL' ? red : amber,
                        background: `${alert.action === 'BUY' ? green : alert.action === 'SELL' ? red : amber}22`,
                        padding: "3px 8px", borderRadius: 4
                      }}>
                        {alert.action}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>
                      Score: {alert.score}/100 | {t('alert.confidence')}: {alert.confidence}% | {t('alert.price')}: {formatPrice(alert.price)}
                    </div>
                    <div style={{ fontSize: 11, color: text }}>{alert.reasons}</div>
                    <div style={{ fontSize: 10, color: muted, fontFamily: "monospace", marginTop: 6 }}>
                      {new Date(alert.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

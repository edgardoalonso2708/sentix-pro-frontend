'use client';
import { useState, useCallback, useRef } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie
} from 'recharts';
import { colors, card, sTitle } from '../../lib/theme';
import { formatPrice, formatLargeNumber, computePaperEquityCurve, computeDailyPnl, computeAssetPerformance } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

const { bg, bg2, bg3, border, text, muted, green, red, amber, blue, purple } = colors;

const REPORT_TYPE_KEYS = [
  { k: 'performance', labelKey: 'rep.performance', descKey: 'rep.performanceDesc', icon: '📈' },
  { k: 'trades', labelKey: 'rep.trades', descKey: 'rep.tradesDesc', icon: '📋' },
  { k: 'signals', labelKey: 'rep.signals', descKey: 'rep.signalsDesc', icon: '🎯' },
  { k: 'risk', labelKey: 'rep.risk', descKey: 'rep.riskDesc', icon: '🛡' },
];

export default function ReportsTab({
  paperMetrics, paperHistory, paperPositions, paperConfig,
  signalAccuracy, signals, advancedPerf,
  correlationData, backtestHistory,
  authFetch, apiUrl, userId,
}) {
  const { t } = useLanguage();
  const [reportType, setReportType] = useState('performance');
  const [reportDays, setReportDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const printRef = useRef(null);

  const reportTypes = REPORT_TYPE_KEYS.map(r => ({
    k: r.k,
    label: `${r.icon} ${t(r.labelKey)}`,
    desc: t(r.descKey),
  }));

  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [perfRes, advRes, corrRes] = await Promise.allSettled([
        authFetch(`${apiUrl}/api/paper/performance/${userId}`),
        authFetch(`${apiUrl}/api/paper/performance-advanced/${userId}?days=${reportDays}`),
        authFetch(`${apiUrl}/api/paper/correlation/${userId}`),
      ]);
      const perf = perfRes.status === 'fulfilled' && perfRes.value.ok ? await perfRes.value.json() : null;
      const adv = advRes.status === 'fulfilled' && advRes.value.ok ? await advRes.value.json() : null;
      const corr = corrRes.status === 'fulfilled' && corrRes.value.ok ? await corrRes.value.json() : null;
      setReportData({ perf, adv, corr });
    } catch (e) {
      console.error('Report data fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [authFetch, apiUrl, userId, reportDays]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>SENTIX PRO - ${t('rep.reportOf')}</title>
      <style>
        body { font-family: 'Courier New', monospace; background: #fff; color: #111; padding: 24px; font-size: 12px; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 14px 18px; margin-bottom: 14px; }
        .title { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin-bottom: 10px; }
        .metric { display: inline-block; min-width: 140px; margin: 4px 8px 4px 0; }
        .metric-value { font-size: 18px; font-weight: 800; }
        .metric-label { font-size: 9px; color: #888; }
        .green { color: #059669; } .red { color: #dc2626; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #f3f4f6; padding: 6px 8px; text-align: left; font-weight: 700; }
        td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
        h1 { font-size: 16px; margin-bottom: 4px; }
        h2 { font-size: 13px; color: #666; margin-bottom: 16px; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>`);
    win.document.write(`<h1>SENTIX PRO — ${t('rep.reportOf')} ${reportTypes.find(r => r.k === reportType)?.label.replace(/^[^ ]+ /, '')}</h1>`);
    win.document.write(`<h2>${t('rep.period')}: ${reportDays} ${t('rep.days')} · ${t('rep.generated')}: ${new Date().toLocaleString()}</h2>`);
    win.document.write(printContent.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  };

  const handleEmail = async () => {
    try {
      const res = await authFetch(`${apiUrl}/api/send-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `SENTIX PRO — ${t('rep.reportOf')} ${reportTypes.find(r => r.k === reportType)?.label.replace(/^[^ ]+ /, '')}`,
          type: 'report',
          reportType,
          days: reportDays,
          userId,
        }),
      });
      if (res.ok) alert(t('rep.reportSent'));
      else alert(t('rep.sendError'));
    } catch {
      alert(t('rep.connectionError'));
    }
  };

  // Derived data
  const equityCurve = computePaperEquityCurve(paperHistory, paperConfig?.initial_capital || 10000);
  const dailyPnl = computeDailyPnl(paperHistory);
  const assetPerf = computeAssetPerformance(paperHistory);
  const adv = reportData?.adv || advancedPerf;
  const perf = reportData?.perf || paperMetrics;
  const corr = reportData?.corr || correlationData;

  return (
    <div style={{ fontFamily: 'monospace' }}>
      {/* Header */}
      <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={sTitle}>📄 {t('rep.title')}</div>
          <div style={{ fontSize: 10, color: muted }}>{t('rep.detailedAnalysis')}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handlePrint} style={actionBtnStyle(blue)}>🖨 {t('rep.print')}</button>
          <button onClick={handleEmail} style={actionBtnStyle(purple)}>📧 {t('rep.email')}</button>
          <button onClick={loadReportData} disabled={loading} style={actionBtnStyle(green)}>
            {loading ? '⏳...' : `🔄 ${t('rep.refresh')}`}
          </button>
        </div>
      </div>

      {/* Report type selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {reportTypes.map(({ k, label, desc }) => (
          <button key={k} onClick={() => setReportType(k)} style={{
            flex: '1 1 auto', padding: '8px 12px', textAlign: 'center',
            background: reportType === k ? `${purple}20` : bg2,
            border: reportType === k ? `1px solid ${purple}` : `1px solid ${border}`,
            borderRadius: 6, color: reportType === k ? purple : muted,
            fontFamily: 'monospace', fontSize: 10, fontWeight: reportType === k ? 700 : 500,
            cursor: 'pointer',
          }}>
            {label}
            <div style={{ fontSize: 8, opacity: 0.7, marginTop: 1 }}>{desc}</div>
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[7, 14, 30, 60, 90].map(d => (
          <button key={d} onClick={() => setReportDays(d)} style={{
            padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
            background: reportDays === d ? green : bg3,
            color: reportDays === d ? '#000' : muted,
          }}>{d}d</button>
        ))}
      </div>

      {/* Report content (printable) */}
      <div ref={printRef}>
        {reportType === 'performance' && <PerformanceReport t={t} perf={perf} equityCurve={equityCurve} dailyPnl={dailyPnl} paperConfig={paperConfig} paperPositions={paperPositions} reportDays={reportDays} />}
        {reportType === 'trades' && <TradesReport t={t} adv={adv} assetPerf={assetPerf} paperHistory={paperHistory} reportDays={reportDays} />}
        {reportType === 'signals' && <SignalsReport t={t} signalAccuracy={signalAccuracy} signals={signals} reportDays={reportDays} />}
        {reportType === 'risk' && <RiskReport t={t} perf={perf} corr={corr} equityCurve={equityCurve} paperPositions={paperPositions} reportDays={reportDays} />}
      </div>
    </div>
  );
}

// ─── Action button style helper ─────────────────────────────────────────────
function actionBtnStyle(color) {
  return {
    padding: '6px 14px', borderRadius: 6, border: `1px solid ${color}`,
    background: `${color}15`, color, fontSize: 10, fontWeight: 700,
    fontFamily: 'monospace', cursor: 'pointer',
  };
}

// ─── Metric Card ────────────────────────────────────────────────────────────
function MetricCard({ label, value, color: clr = text, sub }) {
  return (
    <div style={{ background: bg3, borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: clr }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT: Performance
// ═══════════════════════════════════════════════════════════════════════════════
function PerformanceReport({ t, perf, equityCurve, dailyPnl, paperConfig, paperPositions, reportDays }) {
  if (!perf) return <NoData t={t} />;

  const totalPnl = perf.totalPnl || 0;
  const initialCap = paperConfig?.initial_capital || 10000;
  const returnPct = initialCap > 0 ? ((totalPnl / initialCap) * 100).toFixed(2) : '0';
  const openPnl = (paperPositions || []).reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);

  return (
    <div>
      {/* KPI Row */}
      <div style={{ ...card }}>
        <div style={sTitle}>{t('rep.perfSummary')} — {reportDays} {t('rep.days')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          <MetricCard label={t('common.pnlTotal')} value={`$${totalPnl.toFixed(2)}`} color={totalPnl >= 0 ? green : red} />
          <MetricCard label={t('rep.return')} value={`${returnPct}%`} color={parseFloat(returnPct) >= 0 ? green : red} />
          <MetricCard label={t('common.winRate')} value={`${(perf.winRate || 0).toFixed(1)}%`} color={(perf.winRate || 0) >= 50 ? green : red} />
          <MetricCard label={t('common.trades')} value={perf.totalTrades || 0} />
          <MetricCard label={t('rep.profitFactor')} value={(perf.profitFactor || 0).toFixed(2)} color={(perf.profitFactor || 0) >= 1 ? green : red} />
          <MetricCard label={t('rep.maxDrawdown')} value={`$${Math.abs(perf.maxDrawdown || 0).toFixed(2)}`} color={red} />
          <MetricCard label={t('rep.openPnl')} value={`$${openPnl.toFixed(2)}`} color={openPnl >= 0 ? green : red} />
          <MetricCard label={t('rep.currentStreak')} value={`${perf.currentStreak || 0} ${perf.streakType || ''}`} color={perf.streakType === 'win' ? green : red} />
        </div>
      </div>

      {/* Equity Curve */}
      {equityCurve.length > 1 && (
        <div style={card}>
          <div style={sTitle}>{t('rep.equityCurve')}</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={equityCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: muted }} />
              <YAxis tick={{ fontSize: 9, fill: muted }} />
              <Tooltip contentStyle={{ background: bg2, border: `1px solid ${border}`, borderRadius: 6, fontSize: 11 }} />
              <Area type="monotone" dataKey="equity" stroke={green} fill={`${green}20`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Daily P&L */}
      {dailyPnl.length > 0 && (
        <div style={card}>
          <div style={sTitle}>{t('rep.dailyPnl')}</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyPnl}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: muted }} />
              <YAxis tick={{ fontSize: 9, fill: muted }} />
              <Tooltip contentStyle={{ background: bg2, border: `1px solid ${border}`, borderRadius: 6, fontSize: 11 }} />
              <ReferenceLine y={0} stroke={muted} strokeDasharray="3 3" />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {dailyPnl.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? green : red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Best / Worst trades */}
      <div style={{ ...card }}>
        <div style={sTitle}>{t('rep.bestWorstTrades')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: `${green}10`, borderRadius: 8, padding: 12, borderLeft: `3px solid ${green}` }}>
            <div style={{ fontSize: 9, color: muted, marginBottom: 4 }}>{t('rep.bestTrade')}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: green }}>+${(perf.bestTrade?.pnl || 0).toFixed(2)}</div>
            <div style={{ fontSize: 10, color: muted }}>{perf.bestTrade?.asset || '—'}</div>
          </div>
          <div style={{ background: `${red}10`, borderRadius: 8, padding: 12, borderLeft: `3px solid ${red}` }}>
            <div style={{ fontSize: 9, color: muted, marginBottom: 4 }}>{t('rep.worstTrade')}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: red }}>${(perf.worstTrade?.pnl || 0).toFixed(2)}</div>
            <div style={{ fontSize: 10, color: muted }}>{perf.worstTrade?.asset || '—'}</div>
          </div>
        </div>
      </div>

      {/* Win/Loss stats */}
      <div style={card}>
        <div style={sTitle}>{t('rep.gainLossStats')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          <MetricCard label={t('common.won')} value={perf.winCount || 0} color={green} />
          <MetricCard label={t('common.lost')} value={perf.lossCount || 0} color={red} />
          <MetricCard label={t('rep.avgGain')} value={`$${(perf.avgProfit || 0).toFixed(2)}`} color={green} />
          <MetricCard label={t('rep.avgLoss')} value={`$${(perf.avgLoss || 0).toFixed(2)}`} color={red} />
          <MetricCard label={t('rep.avgHolding')} value={`${(perf.avgHoldingTimeHours || 0).toFixed(1)}h`} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT: Trades Analysis
// ═══════════════════════════════════════════════════════════════════════════════
function TradesReport({ t, adv, assetPerf, paperHistory, reportDays }) {
  if (!paperHistory || paperHistory.length === 0) return <NoData t={t} />;

  return (
    <div>
      {/* By Asset */}
      {assetPerf.length > 0 && (
        <div style={card}>
          <div style={sTitle}>{t('rep.assetPerformance')} — {reportDays} {t('rep.days')}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {[t('rep.thAsset'), t('rep.thTrades'), t('rep.thWins'), t('rep.thLosses'), t('rep.thWinRate'), t('rep.thPnlTotal')].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assetPerf.map((a, i) => {
                const wr = (a.wins + a.losses) > 0 ? ((a.wins / (a.wins + a.losses)) * 100).toFixed(1) : '0';
                return (
                  <tr key={a.asset} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={tdStyle}><span style={{ fontWeight: 700 }}>{a.asset}</span></td>
                    <td style={tdStyle}>{a.wins + a.losses}</td>
                    <td style={{ ...tdStyle, color: green }}>{a.wins}</td>
                    <td style={{ ...tdStyle, color: red }}>{a.losses}</td>
                    <td style={{ ...tdStyle, color: parseFloat(wr) >= 50 ? green : red }}>{wr}%</td>
                    <td style={{ ...tdStyle, color: a.totalPnl >= 0 ? green : red, fontWeight: 700 }}>${a.totalPnl.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* By Direction */}
      {adv?.byDirection && (
        <div style={card}>
          <div style={sTitle}>{t('rep.byDirection')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {['LONG', 'SHORT'].map(dir => {
              const d = adv.byDirection[dir];
              if (!d || d.trades === 0) return <div key={dir} style={{ background: bg3, borderRadius: 8, padding: 14, textAlign: 'center', color: muted, fontSize: 11 }}>{dir}: {t('rep.noTrades')}</div>;
              return (
                <div key={dir} style={{ background: bg3, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: dir === 'LONG' ? green : red, marginBottom: 8 }}>{dir}</div>
                  <div style={{ fontSize: 11, lineHeight: 2 }}>
                    {t('common.trades')}: <span style={{ fontWeight: 700 }}>{d.trades}</span> · {t('common.winRate')}: <span style={{ color: d.winRate >= 50 ? green : red, fontWeight: 700 }}>{d.winRate?.toFixed(1)}%</span>
                    <br />P&L: <span style={{ color: d.totalPnl >= 0 ? green : red, fontWeight: 700 }}>${d.totalPnl?.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* By Exit Reason */}
      {adv?.byExitReason && adv.byExitReason.length > 0 && (
        <div style={card}>
          <div style={sTitle}>{t('rep.byExitReason')}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {[t('rep.thReason'), t('rep.thTrades'), t('rep.thWinRate'), t('rep.thAvgPnl'), t('rep.thAvgPnlPct')].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adv.byExitReason.map((r, i) => (
                <tr key={r.reason} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={tdStyle}>{formatExitReason(r.reason)}</td>
                  <td style={tdStyle}>{r.count}</td>
                  <td style={{ ...tdStyle, color: r.winRate >= 50 ? green : red }}>{r.winRate?.toFixed(1)}%</td>
                  <td style={{ ...tdStyle, color: r.avgPnl >= 0 ? green : red }}>${r.avgPnl?.toFixed(2)}</td>
                  <td style={{ ...tdStyle, color: r.avgPnlPct >= 0 ? green : red }}>{r.avgPnlPct?.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* By Hour */}
      {adv?.byHour && adv.byHour.length > 0 && (
        <div style={card}>
          <div style={sTitle}>{t('rep.hourlyPerformance')}</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={adv.byHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: muted }} />
              <YAxis tick={{ fontSize: 9, fill: muted }} />
              <Tooltip contentStyle={{ background: bg2, border: `1px solid ${border}`, borderRadius: 6, fontSize: 11 }} />
              <ReferenceLine y={0} stroke={muted} strokeDasharray="3 3" />
              <Bar dataKey="totalPnl" radius={[3, 3, 0, 0]}>
                {adv.byHour.map((d, i) => <Cell key={i} fill={d.totalPnl >= 0 ? green : red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By Day of Week */}
      {adv?.byDayOfWeek && adv.byDayOfWeek.length > 0 && (
        <div style={card}>
          <div style={sTitle}>{t('rep.weekdayPerformance')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 }}>
            {adv.byDayOfWeek.map(d => (
              <div key={d.label} style={{ background: bg3, borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{d.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: d.totalPnl >= 0 ? green : red }}>${d.totalPnl?.toFixed(0)}</div>
                <div style={{ fontSize: 9, color: muted }}>{d.trades} trades · {d.winRate?.toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Month */}
      {adv?.tradesByMonth && adv.tradesByMonth.length > 0 && (
        <div style={card}>
          <div style={sTitle}>{t('rep.monthlyPerformance')}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {[t('rep.thMonth'), t('rep.thTrades'), t('rep.thWinRate'), t('rep.thPnl')].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adv.tradesByMonth.map((m, i) => (
                <tr key={m.month} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={tdStyle}>{m.month}</td>
                  <td style={tdStyle}>{m.trades}</td>
                  <td style={{ ...tdStyle, color: m.winRate >= 50 ? green : red }}>{m.winRate?.toFixed(1)}%</td>
                  <td style={{ ...tdStyle, color: m.totalPnl >= 0 ? green : red, fontWeight: 700 }}>${m.totalPnl?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Trades Table */}
      <div style={card}>
        <div style={sTitle}>{t('rep.last20Trades')}</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, minWidth: 600 }}>
            <thead>
              <tr>
                {[t('rep.thAsset'), t('rep.thDir'), t('rep.thEntry'), t('rep.thExit'), t('rep.thPnl'), t('rep.thPnlPct'), t('rep.thDuration'), t('rep.thReason')].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(paperHistory || [])
                .filter(t => t.exit_at && t.realized_pnl != null)
                .sort((a, b) => new Date(b.exit_at) - new Date(a.exit_at))
                .slice(0, 20)
                .map((t, i) => {
                  const pnl = parseFloat(t.realized_pnl);
                  const dur = t.entry_at && t.exit_at ? ((new Date(t.exit_at) - new Date(t.entry_at)) / 3600000).toFixed(1) : '—';
                  return (
                    <tr key={t.id || i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={tdStyle}>{t.asset}</td>
                      <td style={{ ...tdStyle, color: t.direction === 'LONG' ? green : red }}>{t.direction}</td>
                      <td style={tdStyle}>{formatPrice(t.entry_price)}</td>
                      <td style={tdStyle}>{formatPrice(t.exit_price)}</td>
                      <td style={{ ...tdStyle, color: pnl >= 0 ? green : red, fontWeight: 700 }}>${pnl.toFixed(2)}</td>
                      <td style={{ ...tdStyle, color: pnl >= 0 ? green : red }}>{(t.realized_pnl_percent || 0).toFixed(2)}%</td>
                      <td style={tdStyle}>{dur}h</td>
                      <td style={tdStyle}>{formatExitReason(t.exit_reason)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT: Signals
// ═══════════════════════════════════════════════════════════════════════════════
function SignalsReport({ t, signalAccuracy, signals, reportDays }) {
  const overall = signalAccuracy?.overall;

  return (
    <div>
      {/* Overall Signal Accuracy */}
      <div style={card}>
        <div style={sTitle}>{t('rep.signalAccuracy')} — {reportDays} {t('rep.days')}</div>
        {!overall || overall.total === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: muted, fontSize: 12 }}>
            {t('rep.noAccuracyData')}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <MetricCard label="1h Accuracy" value={overall.hitRate1h != null ? `${overall.hitRate1h}%` : '—'} color={hitColor(overall.hitRate1h)} sub={overall.avgChange1h != null ? `avg: ${overall.avgChange1h}%` : undefined} />
            <MetricCard label="4h Accuracy" value={overall.hitRate4h != null ? `${overall.hitRate4h}%` : '—'} color={hitColor(overall.hitRate4h)} sub={overall.avgChange4h != null ? `avg: ${overall.avgChange4h}%` : undefined} />
            <MetricCard label="24h Accuracy" value={overall.hitRate24h != null ? `${overall.hitRate24h}%` : '—'} color={hitColor(overall.hitRate24h)} sub={overall.avgChange24h != null ? `avg: ${overall.avgChange24h}%` : undefined} />
            <MetricCard label={t('rep.totalSignals')} value={overall.total} />
          </div>
        )}
      </div>

      {/* Per-asset accuracy */}
      {signalAccuracy?.byAsset && Object.keys(signalAccuracy.byAsset).length > 0 && (
        <div style={card}>
          <div style={sTitle}>{t('rep.accuracyByAsset')}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {[t('rep.thAsset'), t('rep.thSignals'), t('rep.th1hHit'), t('rep.th4hHit'), t('rep.th24hHit')].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(signalAccuracy.byAsset).map(([asset, data], i) => (
                <tr key={asset} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={tdStyle}>{asset}</td>
                  <td style={tdStyle}>{data.total}</td>
                  <td style={{ ...tdStyle, color: hitColor(data.hitRate1h) }}>{data.hitRate1h != null ? `${data.hitRate1h}%` : '—'}</td>
                  <td style={{ ...tdStyle, color: hitColor(data.hitRate4h) }}>{data.hitRate4h != null ? `${data.hitRate4h}%` : '—'}</td>
                  <td style={{ ...tdStyle, color: hitColor(data.hitRate24h) }}>{data.hitRate24h != null ? `${data.hitRate24h}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Active signals summary */}
      {signals && signals.length > 0 && (
        <div style={card}>
          <div style={sTitle}>{t('rep.activeSignals')} ({signals.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
            {signals.slice(0, 12).map((s, i) => (
              <div key={i} style={{ background: bg3, borderRadius: 6, padding: '8px 12px', borderLeft: `3px solid ${s.action === 'BUY' ? green : s.action === 'SELL' ? red : amber}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 11 }}>{s.asset}</span>
                  <span style={{ fontSize: 10, color: s.action === 'BUY' ? green : s.action === 'SELL' ? red : amber, fontWeight: 700 }}>{s.action}</span>
                </div>
                <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>
                  {t('rep.conf')}: {s.confidence}% · R:R {s.rr_ratio?.toFixed(1) || '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT: Risk
// ═══════════════════════════════════════════════════════════════════════════════
function RiskReport({ t, perf, corr, equityCurve, paperPositions, reportDays }) {
  return (
    <div>
      {/* Drawdown */}
      <div style={card}>
        <div style={sTitle}>{t('rep.drawdownAnalysis')} — {reportDays} {t('rep.days')}</div>
        {equityCurve.length > 1 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 14 }}>
              <MetricCard label={t('rep.maxDrawdown')} value={`${Math.max(...equityCurve.map(d => d.drawdown)).toFixed(2)}%`} color={red} />
              <MetricCard label={t('rep.drawdownCurrent')} value={`${(equityCurve[equityCurve.length - 1]?.drawdown || 0).toFixed(2)}%`} color={amber} />
              <MetricCard label={t('rep.equityCurrent')} value={`$${(equityCurve[equityCurve.length - 1]?.equity || 0).toFixed(0)}`} />
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: muted }} />
                <YAxis tick={{ fontSize: 9, fill: muted }} />
                <Tooltip contentStyle={{ background: bg2, border: `1px solid ${border}`, borderRadius: 6, fontSize: 11 }} />
                <Area type="monotone" dataKey="drawdown" stroke={red} fill={`${red}20`} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </>
        ) : <div style={{ padding: 20, textAlign: 'center', color: muted, fontSize: 12 }}>{t('rep.noEquityData')}</div>}
      </div>

      {/* Correlation */}
      <div style={card}>
        <div style={sTitle}>{t('rep.posCorrelation')}</div>
        {corr && corr.pairs && corr.pairs.length > 0 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
              <MetricCard label={t('rep.riskLevel')} value={corr.riskLevel || '—'} color={corr.riskLevel === 'LOW' ? green : corr.riskLevel === 'MEDIUM' ? amber : red} />
              <MetricCard label={t('rep.diversification')} value={`${((corr.effectiveDiversification || 0) * 100).toFixed(0)}%`} color={(corr.effectiveDiversification || 0) >= 0.5 ? green : red} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  {[t('rep.thPair'), t('rep.thCorrelation'), t('rep.thLevel')].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corr.pairs.map((p, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={tdStyle}>{p.assetA} / {p.assetB}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{p.correlation?.toFixed(3)}</td>
                    <td style={{ ...tdStyle, color: p.level === 'LOW' ? green : p.level === 'MEDIUM' ? amber : red }}>{p.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {corr.warnings && corr.warnings.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {corr.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 10, color: amber, padding: '4px 0' }}>⚠ {w}</div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: muted, fontSize: 12 }}>
            {t('rep.noCorrelationData')}
          </div>
        )}
      </div>

      {/* Open Positions Exposure */}
      {paperPositions && paperPositions.length > 0 && (
        <div style={card}>
          <div style={sTitle}>{t('rep.currentExposure')} ({paperPositions.length} {t('rep.positions')})</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {[t('rep.thAsset'), t('rep.thDirection'), t('rep.thEntry'), t('rep.thCurrent'), t('rep.thPnl'), t('rep.thPnlPct')].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paperPositions.map((p, i) => {
                const pnl = p.unrealized_pnl || 0;
                return (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={tdStyle}>{p.asset}</td>
                    <td style={{ ...tdStyle, color: p.direction === 'LONG' ? green : red }}>{p.direction}</td>
                    <td style={tdStyle}>{formatPrice(p.entry_price)}</td>
                    <td style={tdStyle}>{formatPrice(p.current_price)}</td>
                    <td style={{ ...tdStyle, color: pnl >= 0 ? green : red, fontWeight: 700 }}>${pnl.toFixed(2)}</td>
                    <td style={{ ...tdStyle, color: pnl >= 0 ? green : red }}>{(p.unrealized_pnl_pct || 0).toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function NoData({ t }) {
  return (
    <div style={{ ...card, padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: muted }}>{t('rep.noData')}</div>
      <div style={{ fontSize: 11, color: muted, marginTop: 6 }}>{t('rep.runPaper')}</div>
    </div>
  );
}

function hitColor(rate) {
  return rate === null || rate === undefined ? muted : rate >= 55 ? green : rate >= 45 ? amber : red;
}

function formatExitReason(reason) {
  if (!reason) return '—';
  return reason
    .replace('stop_loss', 'Stop Loss')
    .replace('take_profit', 'Take Profit')
    .replace('trailing_stop', 'Trailing Stop')
    .replace('manual', 'Manual')
    .replace(/_/g, ' ');
}

const thStyle = {
  background: `${purple}20`, color: purple, fontWeight: 700,
  padding: '7px 10px', textAlign: 'left', fontSize: 9,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  borderBottom: `1px solid ${border}`,
};

const tdStyle = {
  padding: '6px 10px', borderBottom: `1px solid ${border}`, fontSize: 11,
};

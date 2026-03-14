'use client';
import { useState, useCallback, useRef } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie
} from 'recharts';
import { colors, card, sTitle } from '../../lib/theme';
import { formatPrice, formatLargeNumber, computePaperEquityCurve, computeDailyPnl, computeAssetPerformance } from '../../lib/utils';

const { bg, bg2, bg3, border, text, muted, green, red, amber, blue, purple } = colors;

const REPORT_TYPES = [
  { k: 'performance', label: '📈 Rendimiento', desc: 'P&L, equity, métricas clave' },
  { k: 'trades', label: '📋 Trades', desc: 'Análisis por asset, hora, dirección' },
  { k: 'signals', label: '🎯 Señales', desc: 'Precisión y efectividad' },
  { k: 'risk', label: '🛡 Riesgo', desc: 'Drawdown, correlación, exposición' },
];

export default function ReportsTab({
  paperMetrics, paperHistory, paperPositions, paperConfig,
  signalAccuracy, signals, advancedPerf,
  correlationData, backtestHistory,
  authFetch, apiUrl, userId,
}) {
  const [reportType, setReportType] = useState('performance');
  const [reportDays, setReportDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const printRef = useRef(null);

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
    win.document.write(`<!DOCTYPE html><html><head><title>SENTIX PRO - Reporte</title>
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
    win.document.write(`<h1>SENTIX PRO — Reporte de ${REPORT_TYPES.find(r => r.k === reportType)?.label.replace(/^[^ ]+ /, '')}</h1>`);
    win.document.write(`<h2>Período: ${reportDays} días · Generado: ${new Date().toLocaleString('es')}</h2>`);
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
          subject: `SENTIX PRO — Reporte ${REPORT_TYPES.find(r => r.k === reportType)?.label.replace(/^[^ ]+ /, '')}`,
          type: 'report',
          reportType,
          days: reportDays,
          userId,
        }),
      });
      if (res.ok) alert('Reporte enviado por correo');
      else alert('Error al enviar reporte');
    } catch {
      alert('Error de conexión');
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
          <div style={sTitle}>📄 REPORTES</div>
          <div style={{ fontSize: 10, color: muted }}>Análisis detallado con opción de imprimir o enviar por email</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handlePrint} style={actionBtnStyle(blue)}>🖨 Imprimir</button>
          <button onClick={handleEmail} style={actionBtnStyle(purple)}>📧 Email</button>
          <button onClick={loadReportData} disabled={loading} style={actionBtnStyle(green)}>
            {loading ? '⏳...' : '🔄 Actualizar'}
          </button>
        </div>
      </div>

      {/* Report type selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {REPORT_TYPES.map(({ k, label, desc }) => (
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
        {reportType === 'performance' && <PerformanceReport perf={perf} equityCurve={equityCurve} dailyPnl={dailyPnl} paperConfig={paperConfig} paperPositions={paperPositions} reportDays={reportDays} />}
        {reportType === 'trades' && <TradesReport adv={adv} assetPerf={assetPerf} paperHistory={paperHistory} reportDays={reportDays} />}
        {reportType === 'signals' && <SignalsReport signalAccuracy={signalAccuracy} signals={signals} reportDays={reportDays} />}
        {reportType === 'risk' && <RiskReport perf={perf} corr={corr} equityCurve={equityCurve} paperPositions={paperPositions} reportDays={reportDays} />}
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
function PerformanceReport({ perf, equityCurve, dailyPnl, paperConfig, paperPositions, reportDays }) {
  if (!perf) return <NoData />;

  const totalPnl = perf.totalPnl || 0;
  const initialCap = paperConfig?.initial_capital || 10000;
  const returnPct = initialCap > 0 ? ((totalPnl / initialCap) * 100).toFixed(2) : '0';
  const openPnl = (paperPositions || []).reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);

  return (
    <div>
      {/* KPI Row */}
      <div style={{ ...card }}>
        <div style={sTitle}>RESUMEN DE RENDIMIENTO — {reportDays} DÍAS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          <MetricCard label="P&L Total" value={`$${totalPnl.toFixed(2)}`} color={totalPnl >= 0 ? green : red} />
          <MetricCard label="Retorno" value={`${returnPct}%`} color={parseFloat(returnPct) >= 0 ? green : red} />
          <MetricCard label="Win Rate" value={`${(perf.winRate || 0).toFixed(1)}%`} color={(perf.winRate || 0) >= 50 ? green : red} />
          <MetricCard label="Trades" value={perf.totalTrades || 0} />
          <MetricCard label="Profit Factor" value={(perf.profitFactor || 0).toFixed(2)} color={(perf.profitFactor || 0) >= 1 ? green : red} />
          <MetricCard label="Max Drawdown" value={`$${Math.abs(perf.maxDrawdown || 0).toFixed(2)}`} color={red} />
          <MetricCard label="P&L Abierto" value={`$${openPnl.toFixed(2)}`} color={openPnl >= 0 ? green : red} />
          <MetricCard label="Racha Actual" value={`${perf.currentStreak || 0} ${perf.streakType || ''}`} color={perf.streakType === 'win' ? green : red} />
        </div>
      </div>

      {/* Equity Curve */}
      {equityCurve.length > 1 && (
        <div style={card}>
          <div style={sTitle}>CURVA DE EQUITY</div>
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
          <div style={sTitle}>P&L DIARIO</div>
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
        <div style={sTitle}>MEJORES Y PEORES TRADES</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: `${green}10`, borderRadius: 8, padding: 12, borderLeft: `3px solid ${green}` }}>
            <div style={{ fontSize: 9, color: muted, marginBottom: 4 }}>MEJOR TRADE</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: green }}>+${(perf.bestTrade?.pnl || 0).toFixed(2)}</div>
            <div style={{ fontSize: 10, color: muted }}>{perf.bestTrade?.asset || '—'}</div>
          </div>
          <div style={{ background: `${red}10`, borderRadius: 8, padding: 12, borderLeft: `3px solid ${red}` }}>
            <div style={{ fontSize: 9, color: muted, marginBottom: 4 }}>PEOR TRADE</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: red }}>${(perf.worstTrade?.pnl || 0).toFixed(2)}</div>
            <div style={{ fontSize: 10, color: muted }}>{perf.worstTrade?.asset || '—'}</div>
          </div>
        </div>
      </div>

      {/* Win/Loss stats */}
      <div style={card}>
        <div style={sTitle}>ESTADÍSTICAS DE GANANCIA/PÉRDIDA</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          <MetricCard label="Ganados" value={perf.winCount || 0} color={green} />
          <MetricCard label="Perdidos" value={perf.lossCount || 0} color={red} />
          <MetricCard label="Avg Ganancia" value={`$${(perf.avgProfit || 0).toFixed(2)}`} color={green} />
          <MetricCard label="Avg Pérdida" value={`$${(perf.avgLoss || 0).toFixed(2)}`} color={red} />
          <MetricCard label="Avg Holding" value={`${(perf.avgHoldingTimeHours || 0).toFixed(1)}h`} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT: Trades Analysis
// ═══════════════════════════════════════════════════════════════════════════════
function TradesReport({ adv, assetPerf, paperHistory, reportDays }) {
  if (!paperHistory || paperHistory.length === 0) return <NoData />;

  return (
    <div>
      {/* By Asset */}
      {assetPerf.length > 0 && (
        <div style={card}>
          <div style={sTitle}>RENDIMIENTO POR ASSET — {reportDays} DÍAS</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {['Asset', 'Trades', 'Wins', 'Losses', 'Win Rate', 'P&L Total'].map(h => (
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
          <div style={sTitle}>POR DIRECCIÓN</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {['LONG', 'SHORT'].map(dir => {
              const d = adv.byDirection[dir];
              if (!d || d.trades === 0) return <div key={dir} style={{ background: bg3, borderRadius: 8, padding: 14, textAlign: 'center', color: muted, fontSize: 11 }}>{dir}: Sin trades</div>;
              return (
                <div key={dir} style={{ background: bg3, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: dir === 'LONG' ? green : red, marginBottom: 8 }}>{dir}</div>
                  <div style={{ fontSize: 11, lineHeight: 2 }}>
                    Trades: <span style={{ fontWeight: 700 }}>{d.trades}</span> · Win Rate: <span style={{ color: d.winRate >= 50 ? green : red, fontWeight: 700 }}>{d.winRate?.toFixed(1)}%</span>
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
          <div style={sTitle}>POR RAZÓN DE SALIDA</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {['Razón', 'Trades', 'Win Rate', 'Avg P&L', 'Avg P&L %'].map(h => (
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
          <div style={sTitle}>RENDIMIENTO POR HORA (UTC)</div>
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
          <div style={sTitle}>RENDIMIENTO POR DÍA DE SEMANA</div>
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
          <div style={sTitle}>RENDIMIENTO MENSUAL</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {['Mes', 'Trades', 'Win Rate', 'P&L'].map(h => (
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
        <div style={sTitle}>ÚLTIMOS 20 TRADES</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, minWidth: 600 }}>
            <thead>
              <tr>
                {['Asset', 'Dir', 'Entrada', 'Salida', 'P&L', 'P&L %', 'Duración', 'Razón'].map(h => (
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
function SignalsReport({ signalAccuracy, signals, reportDays }) {
  const overall = signalAccuracy?.overall;

  return (
    <div>
      {/* Overall Signal Accuracy */}
      <div style={card}>
        <div style={sTitle}>PRECISIÓN DE SEÑALES — {reportDays} DÍAS</div>
        {!overall || overall.total === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: muted, fontSize: 12 }}>
            Sin datos de precisión suficientes. Se requiere al menos 1 hora de operación.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <MetricCard label="1h Accuracy" value={overall.hitRate1h != null ? `${overall.hitRate1h}%` : '—'} color={hitColor(overall.hitRate1h)} sub={overall.avgChange1h != null ? `avg: ${overall.avgChange1h}%` : undefined} />
            <MetricCard label="4h Accuracy" value={overall.hitRate4h != null ? `${overall.hitRate4h}%` : '—'} color={hitColor(overall.hitRate4h)} sub={overall.avgChange4h != null ? `avg: ${overall.avgChange4h}%` : undefined} />
            <MetricCard label="24h Accuracy" value={overall.hitRate24h != null ? `${overall.hitRate24h}%` : '—'} color={hitColor(overall.hitRate24h)} sub={overall.avgChange24h != null ? `avg: ${overall.avgChange24h}%` : undefined} />
            <MetricCard label="Total Señales" value={overall.total} />
          </div>
        )}
      </div>

      {/* Per-asset accuracy */}
      {signalAccuracy?.byAsset && Object.keys(signalAccuracy.byAsset).length > 0 && (
        <div style={card}>
          <div style={sTitle}>PRECISIÓN POR ASSET</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {['Asset', 'Señales', '1h Hit', '4h Hit', '24h Hit'].map(h => (
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
          <div style={sTitle}>SEÑALES ACTIVAS ACTUALES ({signals.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
            {signals.slice(0, 12).map((s, i) => (
              <div key={i} style={{ background: bg3, borderRadius: 6, padding: '8px 12px', borderLeft: `3px solid ${s.action === 'BUY' ? green : s.action === 'SELL' ? red : amber}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 11 }}>{s.asset}</span>
                  <span style={{ fontSize: 10, color: s.action === 'BUY' ? green : s.action === 'SELL' ? red : amber, fontWeight: 700 }}>{s.action}</span>
                </div>
                <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>
                  Conf: {s.confidence}% · R:R {s.rr_ratio?.toFixed(1) || '—'}
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
function RiskReport({ perf, corr, equityCurve, paperPositions, reportDays }) {
  return (
    <div>
      {/* Drawdown */}
      <div style={card}>
        <div style={sTitle}>ANÁLISIS DE DRAWDOWN — {reportDays} DÍAS</div>
        {equityCurve.length > 1 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 14 }}>
              <MetricCard label="Max Drawdown" value={`${Math.max(...equityCurve.map(d => d.drawdown)).toFixed(2)}%`} color={red} />
              <MetricCard label="Drawdown Actual" value={`${(equityCurve[equityCurve.length - 1]?.drawdown || 0).toFixed(2)}%`} color={amber} />
              <MetricCard label="Equity Actual" value={`$${(equityCurve[equityCurve.length - 1]?.equity || 0).toFixed(0)}`} />
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
        ) : <div style={{ padding: 20, textAlign: 'center', color: muted, fontSize: 12 }}>Sin datos de equity suficientes</div>}
      </div>

      {/* Correlation */}
      <div style={card}>
        <div style={sTitle}>CORRELACIÓN DE POSICIONES</div>
        {corr && corr.pairs && corr.pairs.length > 0 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
              <MetricCard label="Nivel de Riesgo" value={corr.riskLevel || '—'} color={corr.riskLevel === 'LOW' ? green : corr.riskLevel === 'MEDIUM' ? amber : red} />
              <MetricCard label="Diversificación" value={`${((corr.effectiveDiversification || 0) * 100).toFixed(0)}%`} color={(corr.effectiveDiversification || 0) >= 0.5 ? green : red} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  {['Par', 'Correlación', 'Nivel'].map(h => (
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
            Sin datos de correlación. Se requieren 2+ posiciones abiertas.
          </div>
        )}
      </div>

      {/* Open Positions Exposure */}
      {paperPositions && paperPositions.length > 0 && (
        <div style={card}>
          <div style={sTitle}>EXPOSICIÓN ACTUAL ({paperPositions.length} POSICIONES)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {['Asset', 'Dirección', 'Entrada', 'Actual', 'P&L', 'P&L %'].map(h => (
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
function NoData() {
  return (
    <div style={{ ...card, padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: muted }}>Sin datos suficientes para generar este reporte.</div>
      <div style={{ fontSize: 11, color: muted, marginTop: 6 }}>Ejecuta trades en Paper Trading para comenzar a acumular datos.</div>
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

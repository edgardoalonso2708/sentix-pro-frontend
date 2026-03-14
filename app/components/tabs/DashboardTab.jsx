'use client';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { colors, card, sTitle } from '../../lib/theme';
import { formatPrice, formatLargeNumber, computePaperEquityCurve, computeDailyPnl, computeAssetPerformance } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

const { bg, bg2, bg3, border, text, muted, green, red, amber, blue, purple } = colors;

export default function DashboardTab({
  marketData, signals, paperMetrics, paperHistory, paperPositions, paperConfig,
  realtimeEquityCurve, backtestHistory, backtestEquityCurve,
  systemHealth, sseConnected, lastUpdate,
  setTab, setStrategySubTab, apiUrl,
}) {
    const { t } = useLanguage();

    if (!marketData || !marketData.crypto) {
      return <div style={{ padding: 40, textAlign: 'center', color: muted }}>{t('dash.loadingMarket')}</div>;
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
              {t('dash.live')} - {sseConnected ? t('dash.sseRealtime') : t('dash.polling')}
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
              {lastUpdate && ` \· ${lastUpdate.toLocaleTimeString()}`}
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
              value: marketData.macro?.dxy || '\—',
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
            <div style={sTitle}>{t('dash.topGainers')}</div>
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
            <div style={sTitle}>{t('dash.topLosers')}</div>
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
            <div style={sTitle}>{t('dash.activeSignals')} (Top 5)</div>
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
                        {signal.action === 'BUY' ? '\u{1F7E2}' : signal.action === 'SELL' ? '\u{1F534}' : '\⚪'} {signal.asset}
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
                        {signal.tradeLevels ? `R:R ${signal.tradeLevels.riskRewardRatio?.toFixed(1)} \· ` : ''}{signal.reasons?.substring(0, 80)}{signal.reasons?.length > 80 ? '...' : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: amber, fontWeight: 700 }}>
                        {signal.confidence}% {t('dash.confidence')}
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
              {t('dash.viewAllSignals')} →
            </button>
          </div>
        )}

        {/* PAPER TRADING PERFORMANCE */}
        <div style={{ ...card, marginTop: 16 }}>
          <div style={sTitle}>{t('dash.paperPerformance')}</div>
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
                    { label: t('common.pnlTotal'), value: `$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? green : red },
                    { label: t('common.winRate'), value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? green : red },
                    { label: t('common.capital'), value: `$${currentCapital.toFixed(0)}`, color: text },
                    { label: t('dash.openPositions'), value: openCount, color: openCount > 0 ? amber : muted },
                    { label: t('common.maxDrawdown'), value: `${maxDD.toFixed(2)}%`, color: maxDD > 10 ? red : maxDD > 5 ? amber : green },
                    { label: t('common.profitFactor'), value: profitFactor.toFixed(2), color: profitFactor >= 1.5 ? green : profitFactor >= 1 ? amber : red },
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
                      <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{closedTrades.length} {t('dash.closedTrades')}</div>
                      <div style={{ fontSize: 11, color: muted }}>
                        {pm?.winCount || 0} {t('dash.won')} \· {pm?.lossCount || 0} {t('dash.lost')}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Trades */}
                {closedTrades.length > 0 ? (
                  <div>
                    <div style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{t('dash.lastTrades')}</div>
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
                              {t.direction === 'LONG' ? '\▲' : '\▼'}
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
                    {t('dash.noClosedTrades')}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* CURVA DE EQUITY (Paper Trading) */}
        {(() => {
          const initialCap = paperConfig?.initial_capital || 10000;
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
                <span>{t('dash.equityCurve')} {isRealtime ? '(Real-time)' : '(Paper Trading)'}</span>
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

        {/* P&L DIARIO */}
        {(() => {
          const dailyData = computeDailyPnl(paperHistory);
          if (dailyData.length < 1) return null;
          return (
            <div style={{ ...card, marginTop: 4 }}>
              <div style={sTitle}>{t('dash.dailyPnl')}</div>
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

        {/* RENDIMIENTO POR ACTIVO */}
        {(() => {
          const assetData = computeAssetPerformance(paperHistory);
          if (assetData.length < 1) return null;
          return (
            <div style={{ ...card, marginTop: 4 }}>
              <div style={sTitle}>{t('dash.assetPerformance')}</div>
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

        {/* DISTRIBUCION DE SENALES */}
        <div style={{ ...card, marginTop: 4 }}>
          <div style={sTitle}>{t('dash.signalDistribution')}</div>
          {(() => {
            const buySignals = signals.filter(s => s.action === 'BUY');
            const sellSignals = signals.filter(s => s.action === 'SELL');
            const holdSignals = signals.filter(s => s.action === 'HOLD');
            const total = signals.length;
            const avgConf = (arr) => arr.length > 0 ? (arr.reduce((s, x) => s + (x.confidence || 0), 0) / arr.length).toFixed(0) : '\—';

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

        {/* ULTIMO BACKTEST */}
        <div style={{ ...card, marginTop: 4 }}>
          <div style={sTitle}>{t('dash.lastBacktest')}</div>
          {(() => {
            const latest = backtestHistory.length > 0 ? backtestHistory[0] : null;
            if (!latest) {
              return (
                <div style={{ padding: 20, textAlign: "center", color: muted, fontSize: 12 }}>
                  {t('dash.runBacktest')} <span style={{ color: purple, cursor: "pointer", fontWeight: 700 }} onClick={() => { setTab('strategy'); setStrategySubTab('backtest'); }}>ESTRATEGIA \→ Backtest</span>
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12, fontSize: 11 }}>
                  <span style={{ fontWeight: 700, color: text }}>{latest.asset}</span>
                  <span style={{ color: muted }}>{latest.days}d \· {latest.step_interval || '4h'}</span>
                  <span style={{
                    fontSize: 9, padding: "2px 6px", borderRadius: 3,
                    background: `${statusColor}22`, color: statusColor, fontWeight: 700, textTransform: "uppercase"
                  }}>
                    {latest.status}
                  </span>
                  {ago && <span style={{ color: muted }}>{ago}</span>}
                </div>

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

        {/* BACKTEST EQUITY CURVE */}
        {(() => {
          if (!backtestEquityCurve || backtestEquityCurve.length < 2) return null;
          const chartData = backtestEquityCurve.map((point) => ({
            date: new Date(point.timestamp).toLocaleDateString('es', { month: 'short', day: 'numeric' }),
            equity: point.equity
          }));
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
                <div style={sTitle}>{t('dash.backtestEquity')}</div>
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

        {/* ESTADO DEL SISTEMA */}
        <div style={{ ...card, marginTop: 4 }}>
          <div style={sTitle}>{t('dash.systemStatus')}</div>
          {(() => {
            const checks = systemHealth?.checks || {};
            const services = [
              { key: 'marketData', label: 'Binance' },
              { key: 'database', label: 'Supabase' },
              { key: 'sse', label: 'SSE' },
              { key: 'telegram', label: 'Telegram' },
              { key: 'email', label: 'Email' },
              { key: 'caches', label: 'Caches' },
            ];

            const dotColor = (status) => {
              if (!status || status === 'unknown') return muted;
              const s = String(status).toLowerCase();
              if (s.includes('ok') || s.includes('active') || s.includes('connected') || status === true) return green;
              if (s.includes('partial') || s.includes('degraded') || s.includes('stale') || s.includes('not configured')) return amber;
              return red;
            };

            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
                {services.map(({ key, label }) => {
                  const raw = checks[key];
                  const status = systemHealth ? (typeof raw === 'object' ? raw?.status : raw) : null;
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
}

'use client';
import { useState, useEffect } from 'react';
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
  execMode, authFetch: authFetchProp, userId,
}) {
    const { t } = useLanguage();
    const [bybitOverview, setBybitOverview] = useState(null);
    const [onChainData, setOnChainData] = useState(null);
    const [mlStatus, setMlStatus] = useState(null);
    const [orderFlowData, setOrderFlowData] = useState(null);
    const [rotationData, setRotationData] = useState(null);
    const [regimeData, setRegimeData] = useState(null);
    const [mainnetReadiness, setMainnetReadiness] = useState(null);
    const isLiveMode = execMode === 'live' || execMode === 'perp';

    // Fetch Bybit overview when in live mode
    useEffect(() => {
      if (!isLiveMode || !authFetchProp || !apiUrl) return;
      (async () => {
        try {
          const res = await authFetchProp(`${apiUrl}/api/bybit/overview`);
          if (res.ok) setBybitOverview(await res.json());
        } catch (_) {}
      })();
    }, [isLiveMode, apiUrl, authFetchProp]);

    // Fetch on-chain metrics (BTC mempool, hash rate, exchange flows)
    useEffect(() => {
      if (!authFetchProp || !apiUrl) return;
      const fetchOnChain = async () => {
        try {
          const res = await authFetchProp(`${apiUrl}/api/onchain`);
          if (res.ok) setOnChainData(await res.json());
        } catch (_) {}
      };
      fetchOnChain();
      const iv = setInterval(fetchOnChain, 5 * 60 * 1000);
      return () => clearInterval(iv);
    }, [apiUrl, authFetchProp]);

    // Fetch ML ensemble status, order flow, and rotation data
    useEffect(() => {
      if (!authFetchProp || !apiUrl) return;
      const fetchAll = async () => {
        try {
          const [mlRes, ofRes, rotRes, regRes] = await Promise.allSettled([
            authFetchProp(`${apiUrl}/api/ml/status`),
            authFetchProp(`${apiUrl}/api/orderflow`),
            authFetchProp(`${apiUrl}/api/rotation`),
            authFetchProp(`${apiUrl}/api/regime`),
          ]);
          if (mlRes.status === 'fulfilled' && mlRes.value.ok) {
            setMlStatus(await mlRes.value.json());
          } else if (mlRes.status === 'rejected') {
            console.warn('[SENTIX] ML fetch failed:', mlRes.reason);
          } else if (mlRes.status === 'fulfilled' && !mlRes.value.ok) {
            console.warn('[SENTIX] ML fetch HTTP', mlRes.value.status, mlRes.value.statusText);
          }
          if (ofRes.status === 'fulfilled' && ofRes.value.ok) {
            setOrderFlowData(await ofRes.value.json());
          } else if (ofRes.status === 'rejected') {
            console.warn('[SENTIX] OrderFlow fetch failed:', ofRes.reason);
          }
          if (rotRes.status === 'fulfilled' && rotRes.value.ok) {
            setRotationData(await rotRes.value.json());
          } else if (rotRes.status === 'rejected') {
            console.warn('[SENTIX] Rotation fetch failed:', rotRes.reason);
          }
          if (regRes.status === 'fulfilled' && regRes.value.ok) {
            setRegimeData(await regRes.value.json());
          }
        } catch (err) {
          console.warn('[SENTIX] Dashboard fetch error:', err.message);
        }
      };
      fetchAll();
      const iv = setInterval(fetchAll, 60 * 1000);
      return () => clearInterval(iv);
    }, [apiUrl, authFetchProp]);

    // Fetch mainnet readiness gate
    useEffect(() => {
      if (!authFetchProp || !apiUrl || !userId) return;
      const fetchReadiness = async () => {
        try {
          const res = await authFetchProp(`${apiUrl}/api/paper/mainnet-readiness/${userId}`);
          if (res.ok) setMainnetReadiness(await res.json());
        } catch (_) {}
      };
      fetchReadiness();
      const iv = setInterval(fetchReadiness, 5 * 60 * 1000);
      return () => clearInterval(iv);
    }, [apiUrl, authFetchProp, userId]);

    if (!marketData || !marketData.crypto) {
      return <div style={{ padding: 40, textAlign: 'center', color: muted }}>{t('dash.loadingMarket')}</div>;
    }

    const cryptoWithChange = Object.entries(marketData.crypto)
      .filter(([, d]) => d.change24h !== 0 && Number.isFinite(d.change24h));

    const topGainers = [...cryptoWithChange]
      .filter(([, d]) => d.change24h > 0)
      .sort((a, b) => b[1].change24h - a[1].change24h)
      .slice(0, 3);

    const topLosers = [...cryptoWithChange]
      .filter(([, d]) => d.change24h < 0)
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

        {/* Market Regime Banner */}
        {(() => {
          const btcRegime = regimeData?.btc?.regime;
          const regimeConf = regimeData?.btc?.confidence;
          const fg = marketData.macro?.fearGreed || 50;
          const bearishGateActive = btcRegime === 'trending_down' && fg < 20;

          const regimeConfig = {
            trending_up:      { label: 'TRENDING UP',      icon: '\u2197', color: green,  bg: `${green}12`, border: green },
            trending_down:    { label: 'TRENDING DOWN',    icon: '\u2198', color: red,    bg: `${red}12`,   border: red },
            volatile:         { label: 'VOLATILE',         icon: '\u26A1', color: amber,  bg: `${amber}12`, border: amber },
            ranging:          { label: 'RANGING',          icon: '\u2194', color: blue,   bg: `${blue}12`,  border: blue },
            reversal_top:     { label: 'REVERSAL TOP',     icon: '\u21BA', color: red,    bg: `${red}12`,   border: red },
            reversal_bottom:  { label: 'REVERSAL BOTTOM',  icon: '\u21BB', color: green,  bg: `${green}12`, border: green },
          };
          const rc = regimeConfig[btcRegime] || { label: btcRegime?.toUpperCase() || 'LOADING', icon: '\u2022', color: muted, bg: `${muted}12`, border: muted };

          if (!btcRegime) return null;
          return (
            <div style={{
              background: rc.bg, border: `1px solid ${rc.border}33`, borderRadius: 8,
              padding: "10px 16px", marginBottom: 12,
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>{rc.icon}</span>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: rc.color, letterSpacing: "0.05em" }}>
                    MARKET REGIME: {rc.label}
                  </span>
                  {regimeConf != null && (
                    <span style={{ fontSize: 10, color: muted, marginLeft: 8, fontFamily: "monospace" }}>
                      {regimeConf}% conf
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {bearishGateActive && (
                  <div style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 4,
                    background: `${red}20`, color: red, border: `1px solid ${red}44`,
                    display: "flex", alignItems: "center", gap: 4
                  }}>
                    <span style={{ fontSize: 12 }}>{'\u26D4'}</span>
                    BEARISH GATE ACTIVE
                  </div>
                )}
                {btcRegime === 'trending_down' && (
                  <div style={{
                    fontSize: 9, color: muted, fontFamily: "monospace",
                    padding: "3px 8px", background: `${muted}10`, borderRadius: 4
                  }}>
                    Stops tightened -30% &middot; Only STRONG BUY allowed
                  </div>
                )}
              </div>
            </div>
          );
        })()}

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
              label: "Vol 24h Global",
              value: formatLargeNumber(marketData.macro?.globalVolume || 0),
              sublabel: (() => {
                const vc = marketData.macro?.volumeChange24h;
                if (vc == null || vc === 0) return 'Global crypto volume';
                return `${vc > 0 ? '+' : ''}${vc}% vs anterior`;
              })(),
              color: (() => {
                const vc = marketData.macro?.volumeChange24h;
                if (vc == null || vc === 0) return muted;
                return vc > 5 ? green : vc < -5 ? red : amber;
              })()
            },
          ].map(({ label, value, sublabel, color }) => (
            <div key={label} style={card}>
              <div style={{ ...sTitle, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              {sublabel && <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>{sublabel}</div>}
            </div>
          ))}
        </div>

        {/* On-Chain Metrics */}
        {onChainData && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
            {[
              onChainData.mempool != null && {
                label: "BTC Mempool",
                value: onChainData.mempool >= 1000 ? `${(onChainData.mempool / 1000).toFixed(1)}K` : String(onChainData.mempool || 0),
                sublabel: onChainData.mempoolTrend === 'spike' ? 'Congestion' : onChainData.mempoolTrend === 'declining' ? 'Clearing' : 'Normal',
                color: onChainData.mempoolTrend === 'spike' ? red : onChainData.mempoolTrend === 'declining' ? green : muted
              },
              onChainData.hashRate != null && {
                label: "Hash Rate",
                value: onChainData.hashRate >= 1e9 ? `${(onChainData.hashRate / 1e9).toFixed(0)} EH/s` : `${(onChainData.hashRate / 1e6).toFixed(0)} TH/s`,
                sublabel: onChainData.hashTrend === 'declining' ? 'Declining (bearish)' : onChainData.hashTrend === 'rising' ? 'Rising (bullish)' : 'Stable',
                color: onChainData.hashTrend === 'declining' ? red : onChainData.hashTrend === 'rising' ? green : muted
              },
              onChainData.exchangeNetflow != null && {
                label: "Exchange Netflow",
                value: onChainData.exchangeNetflow > 0
                  ? `+${onChainData.exchangeNetflow.toFixed(1)} BTC`
                  : `${onChainData.exchangeNetflow.toFixed(1)} BTC`,
                sublabel: onChainData.exchangeNetflow > 0 ? 'Inflows (sell pressure)' : 'Outflows (accumulation)',
                color: onChainData.exchangeNetflow > 0 ? red : green
              },
            ].filter(Boolean).map(({ label, value, sublabel, color }) => (
              <div key={label} style={card}>
                <div style={{ ...sTitle, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
                {sublabel && <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>{sublabel}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Top Movers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div style={card}>
            <div style={sTitle}>{t('dash.topGainers')}</div>
            {topGainers.length === 0 && <div style={{ fontSize: 12, color: muted, padding: '8px 0' }}>No gainers data</div>}
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
            {topLosers.length === 0 && <div style={{ fontSize: 12, color: muted, padding: '8px 0' }}>No losers data</div>}
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

        {/* TRADING PERFORMANCE — mode-aware */}
        <div style={{ ...card, marginTop: 16 }}>
          <div style={sTitle}>
            {isLiveMode ? `BYBIT ${bybitOverview?.testnet ? 'TESTNET' : 'LIVE'} PERFORMANCE` : t('dash.paperPerformance')}
          </div>
          {(() => {
            const pm = paperMetrics;
            const closedTrades = Array.isArray(paperHistory) ? paperHistory.filter(t => t.exit_price != null) : [];
            const currentCapital = isLiveMode
              ? parseFloat(bybitOverview?.balance?.total || 0)
              : (pm?.currentCapital || paperConfig?.initial_capital || 10000);
            const totalPnl = pm?.totalPnl || 0;
            const winRate = pm?.winRate || 0;
            const openCount = isLiveMode
              ? (bybitOverview?.positions_count || 0)
              : (Array.isArray(paperPositions) ? paperPositions.filter(p => p.status === 'open').length : 0);
            const maxDD = pm?.maxDrawdown || 0;
            const profitFactor = pm?.profitFactor || 0;

            return (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
                  {(isLiveMode ? [
                    { label: 'BALANCE', value: `$${currentCapital.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: green },
                    { label: 'AVAILABLE', value: `$${parseFloat(bybitOverview?.balance?.available || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: text },
                    { label: 'EQUITY', value: `$${parseFloat(bybitOverview?.total_equity || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: text },
                    { label: t('dash.openPositions'), value: openCount, color: openCount > 0 ? amber : muted },
                    { label: 'POS VALUE', value: `$${parseFloat(bybitOverview?.total_position_value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: text },
                  ] : [
                    { label: t('common.pnlTotal'), value: `$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? green : red },
                    { label: t('common.winRate'), value: `${winRate.toFixed(1)}%`, color: winRate >= 50 ? green : red },
                    { label: t('common.capital'), value: `$${currentCapital.toFixed(0)}`, color: text },
                    { label: t('dash.openPositions'), value: openCount, color: openCount > 0 ? amber : muted },
                    { label: t('common.maxDrawdown'), value: `${maxDD.toFixed(2)}%`, color: maxDD > 10 ? red : maxDD > 5 ? amber : green },
                    { label: t('common.profitFactor'), value: profitFactor.toFixed(2), color: profitFactor >= 1.5 ? green : profitFactor >= 1 ? amber : red },
                  ]).map(({ label, value, color }) => (
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

                {/* Win Rate by Regime */}
                {closedTrades.length >= 3 && (() => {
                  const regimeStats = {};
                  for (const tr of closedTrades) {
                    const regime = tr.entry_regime || 'unknown';
                    if (!regimeStats[regime]) regimeStats[regime] = { wins: 0, losses: 0 };
                    const pnl = parseFloat(tr.realized_pnl) || ((parseFloat(tr.exit_price) - parseFloat(tr.entry_price)) * parseFloat(tr.quantity || tr.size || 0) * (tr.direction === 'SHORT' ? -1 : 1)) || 0;
                    if (pnl >= 0) regimeStats[regime].wins++; else regimeStats[regime].losses++;
                  }
                  const entries = Object.entries(regimeStats).filter(([, s]) => s.wins + s.losses >= 2);
                  if (entries.length === 0) return null;
                  return (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>WIN RATE BY REGIME</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {entries.map(([regime, s]) => {
                          const total = s.wins + s.losses;
                          const wr = ((s.wins / total) * 100);
                          const wrColor = wr >= 50 ? green : wr >= 35 ? amber : red;
                          return (
                            <div key={regime} style={{
                              background: bg3, borderRadius: 6, padding: "6px 10px",
                              borderLeft: `3px solid ${wrColor}`, minWidth: 100
                            }}>
                              <div style={{ fontSize: 9, color: muted, textTransform: "uppercase", marginBottom: 2 }}>{regime.replace('_', ' ')}</div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: wrColor }}>{wr.toFixed(0)}%</div>
                              <div style={{ fontSize: 9, color: muted }}>{s.wins}W / {s.losses}L ({total})</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Recent Trades */}
                {closedTrades.length > 0 ? (
                  <div>
                    <div style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{t('dash.lastTrades')}</div>
                    {closedTrades.slice(-5).reverse().map((t, i) => {
                      const pnl = parseFloat(t.realized_pnl) || ((parseFloat(t.exit_price) - parseFloat(t.entry_price)) * parseFloat(t.quantity || t.size || 0) * (t.direction === 'SHORT' ? -1 : 1)) || 0;
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

        {/* MAINNET READINESS GATE */}
        {mainnetReadiness && (
          <div style={{ ...card, marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={sTitle}>MAINNET READINESS</div>
              <div style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "4px 12px",
                borderRadius: 6,
                background: mainnetReadiness.ready ? "rgba(0,212,170,0.15)" : "rgba(239,68,68,0.15)",
                color: mainnetReadiness.ready ? green : red,
                border: `1px solid ${mainnetReadiness.ready ? green : red}`,
              }}>
                {mainnetReadiness.ready ? 'READY' : 'NOT READY'}
              </div>
            </div>

            {/* Progress bar: trades toward 50 */}
            {(() => {
              const tradeCount = mainnetReadiness.metrics?.trades || 0;
              const target = 50;
              const pct = Math.min(100, Math.round((tradeCount / target) * 100));
              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: muted }}>Trades completados</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: tradeCount >= target ? green : text }}>{tradeCount} / {target}</span>
                  </div>
                  <div style={{ height: 6, background: bg3, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${pct}%`,
                      borderRadius: 3,
                      background: tradeCount >= target ? green : purple,
                      transition: "width 0.5s ease"
                    }} />
                  </div>
                </div>
              );
            })()}

            {/* Criteria checklist */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                {
                  label: "Win Rate",
                  value: mainnetReadiness.metrics?.winRate != null ? `${mainnetReadiness.metrics.winRate.toFixed(1)}%` : "—",
                  target: "≥ 45%",
                  passed: mainnetReadiness.criteria?.winRate
                },
                {
                  label: "Profit Factor",
                  value: mainnetReadiness.metrics?.profitFactor != null ? mainnetReadiness.metrics.profitFactor.toFixed(2) : "—",
                  target: "≥ 1.30",
                  passed: mainnetReadiness.criteria?.profitFactor
                },
                {
                  label: "Max Drawdown",
                  value: mainnetReadiness.metrics?.maxDrawdown != null ? `${mainnetReadiness.metrics.maxDrawdown.toFixed(1)}%` : "—",
                  target: "≤ 10%",
                  passed: mainnetReadiness.criteria?.maxDrawdown
                },
              ].map(({ label, value, target, passed }) => (
                <div key={label} style={{
                  background: bg3,
                  borderRadius: 8,
                  padding: "12px 14px",
                  textAlign: "center",
                  borderLeft: `3px solid ${passed ? green : passed === false ? red : muted}`
                }}>
                  <div style={{ fontSize: 9, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: passed ? green : passed === false ? red : muted }}>{value}</div>
                  <div style={{ fontSize: 9, color: muted, marginTop: 4 }}>{target}</div>
                </div>
              ))}
            </div>

            {/* Net P&L if available */}
            {mainnetReadiness.metrics?.netPnl != null && mainnetReadiness.metrics.trades >= 50 && (
              <div style={{ marginTop: 10, textAlign: "center", fontSize: 11, color: muted }}>
                Net P&L (50 trades): <span style={{ fontWeight: 700, color: mainnetReadiness.metrics.netPnl >= 0 ? green : red }}>
                  ${mainnetReadiness.metrics.netPnl.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* CURVA DE EQUITY */}
        {(() => {
          const configCap = paperConfig?.current_capital || paperConfig?.initial_capital || 10000;

          // Only use realtime snapshots if they have recent data (within last 3 days)
          const now = Date.now();
          const recentCutoff = now - 3 * 24 * 60 * 60 * 1000;
          const recentSnapshots = (realtimeEquityCurve || []).filter(pt =>
            new Date(pt.timestamp).getTime() > recentCutoff
          );
          const hasRealtime = recentSnapshots.length >= 2;

          let equityData;
          let isRealtime = false;

          if (hasRealtime) {
            isRealtime = true;
            equityData = recentSnapshots.map((pt) => {
              const eq = parseFloat(pt.equity);
              return {
                date: new Date(pt.timestamp).toLocaleDateString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                equity: eq,
                unrealized: parseFloat(pt.unrealized || 0),
                drawdown: 0
              };
            });
            let peak = equityData[0]?.equity || configCap;
            for (const pt of equityData) {
              if (pt.equity > peak) peak = pt.equity;
              pt.drawdown = peak > 0 ? Math.round(((peak - pt.equity) / peak) * 10000) / 100 : 0;
            }
          } else {
            // Compute equity curve from closed trades (works for both paper and Bybit)
            equityData = computePaperEquityCurve(paperHistory, configCap);
          }

          if (equityData.length < 2) return null;

          const initialCap = equityData[0]?.equity || configCap;
          const latestEquity = equityData[equityData.length - 1]?.equity || initialCap;
          const totalReturn = ((latestEquity - initialCap) / initialCap * 100).toFixed(2);
          const returnColor = totalReturn >= 0 ? green : red;

          return (
            <div style={{ ...card, marginTop: 4 }}>
              <div style={{ ...sTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('dash.equityCurve')} {isRealtime ? '(Real-time)' : '(Trade History)'}</span>
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

        {/* ML ENSEMBLE + ORDER FLOW + ROTATION */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 16 }}>
          {/* ML Ensemble Status */}
          <div style={card}>
            <div style={sTitle}>ML ENSEMBLE</div>
            {mlStatus ? (
              <div style={{ fontSize: 11, color: text }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${border}` }}>
                  <span style={{ color: muted }}>Model</span>
                  <span style={{ color: mlStatus.modelTrained ? green : amber, fontWeight: 700 }}>
                    {mlStatus.modelTrained ? 'TRAINED' : 'PENDING'}
                  </span>
                </div>
                {mlStatus.stats && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${border}` }}>
                      <span style={{ color: muted }}>Accuracy</span>
                      <span style={{ color: mlStatus.stats.trainAccuracy > 60 ? green : amber, fontWeight: 700 }}>
                        {mlStatus.stats.trainAccuracy}%
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${border}` }}>
                      <span style={{ color: muted }}>Samples</span>
                      <span>{mlStatus.stats.samples}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ color: muted }}>Trees</span>
                      <span>{mlStatus.stats.nEstimators}</span>
                    </div>
                  </>
                )}
                {!mlStatus.stats && (
                  <div style={{ fontSize: 10, color: muted, marginTop: 6 }}>
                    Needs {'>'}50 signal outcomes to train
                  </div>
                )}
                <div style={{ fontSize: 9, color: muted, marginTop: 6 }}>
                  Blend: {(mlStatus.config?.blendWeight * 100) || 30}% ML / {100 - ((mlStatus.config?.blendWeight * 100) || 30)}% Traditional
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: muted }}>Loading...</div>
            )}
          </div>

          {/* Order Flow */}
          <div style={card}>
            <div style={sTitle}>ORDER FLOW (L2)</div>
            {orderFlowData && Object.keys(orderFlowData).length > 0 ? (
              <div style={{ fontSize: 11 }}>
                {Object.entries(orderFlowData).slice(0, 3).map(([asset, ind]) => (
                  <div key={asset} style={{ padding: "6px 0", borderBottom: `1px solid ${border}` }}>
                    <div style={{ fontWeight: 700, color: text, marginBottom: 4 }}>{asset.toUpperCase()}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 10 }}>
                      <div>
                        <span style={{ color: muted }}>Imbalance: </span>
                        <span style={{ color: ind.bidAskImbalance > 0.1 ? green : ind.bidAskImbalance < -0.1 ? red : muted, fontWeight: 700 }}>
                          {ind.bidAskImbalance > 0 ? '+' : ''}{ind.bidAskImbalance?.toFixed(3)}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: muted }}>Spread: </span>
                        <span style={{ color: ind.spreadBps > 15 ? amber : muted }}>
                          {ind.spreadBps?.toFixed(1)} bps
                        </span>
                      </div>
                      <div>
                        <span style={{ color: muted }}>Lg Bids: </span>
                        <span style={{ color: green }}>{ind.largeBids || 0}</span>
                      </div>
                      <div>
                        <span style={{ color: muted }}>Lg Asks: </span>
                        <span style={{ color: red }}>{ind.largeAsks || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: muted }}>Connecting to Bybit L2...</div>
            )}
          </div>

          {/* Asset Rotation */}
          <div style={card}>
            <div style={sTitle}>ROTATION RANKING</div>
            {rotationData && Array.isArray(rotationData.rankings) ? (
              <div style={{ fontSize: 11 }}>
                {rotationData.rankings.slice(0, 6).map((r, i) => {
                  const topN = rotationData.config?.topN || 5;
                  const inTop = i < topN;
                  return (
                    <div key={r.asset} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "5px 0", borderBottom: `1px solid ${border}`
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, width: 18, height: 18,
                          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                          background: inTop ? green : bg3, color: inTop ? '#000' : muted
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ fontWeight: 700, color: text }}>{r.asset?.toUpperCase()}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: r.score > 0.01 ? green : r.score < -0.01 ? red : muted }}>
                          {r.score > 0 ? '+' : ''}{r.score?.toFixed(2)}
                        </div>
                        <div style={{ fontSize: 9, color: r.change24h > 0 ? green : r.change24h < 0 ? red : muted }}>
                          24h: {r.change24h > 0 ? '+' : ''}{r.change24h?.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ fontSize: 9, color: muted, marginTop: 6 }}>
                  Top {rotationData.config?.topN || 5} assets in rotation
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: muted }}>Loading rotation data...</div>
            )}
          </div>
        </div>

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

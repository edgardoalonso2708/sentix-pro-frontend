'use client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { colors, card, sTitle } from '../../lib/theme';
import { formatPrice, getSignalFreshness } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

const { bg, bg2, bg3, border, text, muted, green, red, amber, blue, purple } = colors;

export default function SignalsTab({
  signals, signalAccuracy, accuracyDays,
  setAccuracyDays, fetchAccuracy,
}) {
    const { t } = useLanguage();
    const confluenceColor = (c) => c === 'strong' ? green : c === 'moderate' ? amber : c === 'conflicting' ? red : muted;
    const confluenceLabel = (c) => c === 'strong' ? t('sig.strongConfluence') : c === 'moderate' ? t('sig.moderateConfluence') : c === 'conflicting' ? t('sig.conflict') : t('sig.weak');
    const actionColor = (a) => a === 'BUY' ? green : a === 'SELL' ? red : amber;
    const tfLabel = { '4h': '4H', '1h': '1H', '15m': '15M' };

    const hitColor = (rate) => rate === null ? muted : rate >= 55 ? green : rate >= 45 ? amber : red;

    return (
      <div>
        {/* SIGNAL ACCURACY PANEL */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={sTitle}>{t('sig.accuracy')}</div>
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
              {t('sig.gathering')}
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
                      <div style={{ fontSize: 10, color: muted, marginTop: 3 }}>{t('sig.avgMove')}: {item.avg}%</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Row 2: By Strength table */}
              {signalAccuracy.byStrength && Object.keys(signalAccuracy.byStrength).length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>{t('sig.byStrength')}</div>
                  <div style={{ background: bg3, borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "8px 12px", fontSize: 10, fontWeight: 700, color: muted, borderBottom: "1px solid #2a2a2a" }}>
                      <div>{t('sig.type')}</div><div style={{ textAlign: "center" }}>{t('sig.count')}</div><div style={{ textAlign: "center" }}>Hit 1h</div><div style={{ textAlign: "center" }}>Hit 4h</div><div style={{ textAlign: "center" }}>Hit 24h</div>
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
                    <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>{t('sig.byConfluence')}</div>
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
                    <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8 }}>{t('sig.dailyTrend')}</div>
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

        {/* ACCURACY FEEDBACK LOOP */}
        {signalAccuracy?.byStrength && Object.keys(signalAccuracy.byStrength).length > 0 && (
          <div style={{ ...card, marginTop: 12 }}>
            <div style={sTitle}>AUTO-TUNING FEEDBACK</div>
            <div style={{ fontSize: 10, color: muted, marginBottom: 12, fontFamily: "monospace" }}>
              El sistema ajusta automaticamente los umbrales segun la precision por tier
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              {["STRONG BUY", "BUY", "SELL", "STRONG SELL"].filter(k => signalAccuracy.byStrength[k]).map(k => {
                const s = signalAccuracy.byStrength[k];
                const rate = s.hitRate24h;
                const total = s.total || 0;
                const minForAdj = 20;
                const floor = 40;
                const ceiling = 65;
                let status, statusColor, statusLabel;
                if (total < minForAdj) {
                  status = 'waiting';
                  statusColor = muted;
                  statusLabel = `${total}/${minForAdj} signals`;
                } else if (rate !== null && rate < floor) {
                  status = 'tightening';
                  statusColor = red;
                  statusLabel = 'Tightening thresholds';
                } else if (rate !== null && rate > ceiling) {
                  status = 'relaxing';
                  statusColor = green;
                  statusLabel = 'Relaxing thresholds';
                } else {
                  status = 'optimal';
                  statusColor = amber;
                  statusLabel = 'Optimal range';
                }
                return (
                  <div key={k} style={{
                    background: bg3, borderRadius: 8, padding: "12px 14px",
                    borderLeft: `3px solid ${k.includes("BUY") ? green : red}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: k.includes("BUY") ? green : red }}>{k}</span>
                      <span style={{
                        fontSize: 8, padding: '2px 6px', borderRadius: 3,
                        background: `${statusColor}20`, color: statusColor,
                        fontWeight: 700, textTransform: 'uppercase'
                      }}>
                        {status === 'tightening' ? '\u25B2' : status === 'relaxing' ? '\u25BC' : '\u25CF'} {statusLabel}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative' }}>
                        {/* Floor/Ceiling markers */}
                        <div style={{ position: 'absolute', left: `${floor}%`, top: 0, bottom: 0, width: 1, background: `${red}60` }} />
                        <div style={{ position: 'absolute', left: `${ceiling}%`, top: 0, bottom: 0, width: 1, background: `${green}60` }} />
                        {rate !== null && (
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, rate)}%`,
                            borderRadius: 3,
                            background: rate < floor ? red : rate > ceiling ? green : amber,
                            transition: 'width 0.3s ease'
                          }} />
                        )}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: rate !== null ? (rate < floor ? red : rate > ceiling ? green : amber) : muted, minWidth: 36 }}>
                        {rate !== null ? `${rate}%` : '\u2014'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SIGNAL CARDS */}
        <div style={card}>
          <div style={sTitle}>{t('sig.allActive')}</div>

          {signals.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: muted }}>
              No hay senales en este momento
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
                        {signal.action === 'BUY' ? '\u{1F7E2}' : signal.action === 'SELL' ? '\u{1F534}' : '\u26AA'} {signal.asset}
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
                            OFF-HOURS
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
                        {signal.timeframes.dynamicWeights.regime === 'trending' ? 'TRENDING' : signal.timeframes.dynamicWeights.regime === 'ranging' ? 'RANGING' : 'MIXED'}
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
                        GOV {signal.timeframes.governorInfo.severity === 'strong' ? '\u26A0\u26A0' : '\u26A0'}
                      </span>
                      <span style={{ fontSize: 9, color: muted }}>
                        4H {signal.timeframes.governorInfo.regime} — {Math.round((1 - signal.timeframes.governorInfo.effectiveMult) * 100)}% dampened
                      </span>
                    </div>
                  )}

                  {/* BTC Correlation Badge */}
                  {signal.btcCorrelation && signal.asset !== 'BITCOIN' && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                      padding: '4px 8px', borderRadius: 4,
                      background: signal.btcCorrelation.tier === 'high' ? `${red}10` : signal.btcCorrelation.tier === 'medium' ? `${amber}10` : `${muted}08`,
                      borderLeft: `2px solid ${signal.btcCorrelation.tier === 'high' ? red : signal.btcCorrelation.tier === 'medium' ? amber : muted}`
                    }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: signal.btcCorrelation.tier === 'high' ? red : signal.btcCorrelation.tier === 'medium' ? amber : muted }}>
                        BTC CORR
                      </span>
                      <span style={{ fontSize: 10, color: text, fontWeight: 600, fontFamily: 'monospace' }}>
                        {signal.btcCorrelation.coefficient != null
                          ? signal.btcCorrelation.coefficient.toFixed(2)
                          : signal.btcCorrelation.tier}
                      </span>
                      <span style={{ fontSize: 9, color: muted }}>
                        {signal.btcCorrelation.tier === 'high' ? 'alta' : signal.btcCorrelation.tier === 'medium' ? 'media' : 'baja'}
                        {signal.btcCorrelation.source === 'dynamic' ? ' (live)' : ''}
                      </span>
                    </div>
                  )}

                  {/* Phase 2 Gates */}
                  {(signal.timeframes?.btcHardGate || signal.timeframes?.volumeGate) && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      {signal.timeframes?.btcHardGate && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: `${red}20`, color: red }}>
                          BTC GATE ACTIVO
                        </span>
                      )}
                      {signal.timeframes?.volumeGate && signal.timeframes.volumeGate !== 'none' && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                          background: signal.timeframes.volumeGate === 'hold' ? `${red}20` : signal.timeframes.volumeGate === 'boost' ? `${green}20` : `${amber}20`,
                          color: signal.timeframes.volumeGate === 'hold' ? red : signal.timeframes.volumeGate === 'boost' ? green : amber
                        }}>
                          VOL {signal.timeframes.volumeGate.toUpperCase()}
                        </span>
                      )}
                      {signal.timeframes?.interactionBonus !== 0 && signal.timeframes?.interactionBonus && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                          background: signal.timeframes.interactionBonus > 0 ? `${green}20` : `${red}20`,
                          color: signal.timeframes.interactionBonus > 0 ? green : red
                        }}>
                          INTERACT {signal.timeframes.interactionBonus > 0 ? '+' : ''}{signal.timeframes.interactionBonus}
                        </span>
                      )}
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
                        {t('sig.operationLevels')}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 9, color: muted }}>{t('sig.entry')}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{formatPrice(signal.tradeLevels.entry)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: red }}>{t('sig.stopLoss')}</div>
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
                            <div style={{ fontSize: 9, color: amber }}>{t('sig.trailingStop')}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: amber }}>{formatPrice(signal.tradeLevels.trailingStop)}</div>
                            <div style={{ fontSize: 9, color: muted }}>{signal.tradeLevels.trailingStopPercent?.toFixed(1)}%</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 9, color: muted }}>{t('sig.activateAt')}</div>
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
                            R:R bajo (&lt;1.5)
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
                        {t('sig.support')} / {t('sig.resistance')}
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
                      {signal.macroContext.lowLiquidity && (
                        <div style={{
                          fontSize: 9,
                          color: red,
                          fontWeight: 700,
                          background: `${red}15`,
                          padding: "2px 8px",
                          borderRadius: 4,
                          textTransform: "uppercase",
                          animation: "pulse 2s infinite"
                        }}>
                          ⚠ LOW LIQUIDITY ({signal.macroContext.volumeChange24h > 0 ? '+' : ''}{signal.macroContext.volumeChange24h?.toFixed(0) || ''}% vol)
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

                  {/* Liquidity Composite Score Gauge */}
                  {signal.liquidityScore && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 9, color: muted, letterSpacing: 0.5, fontWeight: 700 }}>LIQUIDITY</span>
                        <span style={{
                          fontSize: 11, fontWeight: 800,
                          color: signal.liquidityScore.score >= 20 ? green : signal.liquidityScore.score <= -20 ? red : amber
                        }}>
                          {signal.liquidityScore.score > 0 ? '+' : ''}{signal.liquidityScore.score}
                        </span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                          background: signal.liquidityScore.signal?.includes('bullish') ? `${green}15` : signal.liquidityScore.signal?.includes('bearish') ? `${red}15` : `${amber}15`,
                          color: signal.liquidityScore.signal?.includes('bullish') ? green : signal.liquidityScore.signal?.includes('bearish') ? red : amber,
                          textTransform: "uppercase", letterSpacing: 0.3
                        }}>
                          {signal.liquidityScore.label}
                        </span>
                      </div>
                      {/* Gauge bar: -100 to +100 */}
                      <div style={{ position: "relative", height: 6, borderRadius: 3, background: bg2, overflow: "hidden" }}>
                        {/* Center marker */}
                        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: `${muted}40`, zIndex: 2 }} />
                        {/* Fill bar */}
                        <div style={{
                          position: "absolute", top: 0, bottom: 0, borderRadius: 3,
                          left: signal.liquidityScore.score >= 0 ? "50%" : `${50 + (signal.liquidityScore.score / 2)}%`,
                          width: `${Math.abs(signal.liquidityScore.score) / 2}%`,
                          background: signal.liquidityScore.score >= 20 ? green : signal.liquidityScore.score <= -20 ? red : amber,
                          opacity: 0.85,
                          transition: "all 0.3s ease"
                        }} />
                      </div>
                      {/* Component breakdown (compact row) */}
                      {signal.liquidityScore.components && (
                        <div style={{ display: "flex", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
                          {[
                            { key: 'cmf', label: 'CMF' },
                            { key: 'mfi', label: 'MFI' },
                            { key: 'obv', label: 'OBV' },
                            { key: 'volumeZScore', label: 'Vol-Z' },
                            { key: 'volumeProfile', label: 'V.Prof' }
                          ].map(({ key, label }) => {
                            const val = signal.liquidityScore.components[key] || 0;
                            return (
                              <div key={key} style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>
                                <span style={{ color: `${muted}90`, marginRight: 2 }}>{label}</span>
                                <span style={{ color: val > 0 ? green : val < 0 ? red : muted, fontWeight: 700 }}>
                                  {val > 0 ? '+' : ''}{val}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Advanced Indicators Badges */}
                  {signal.action !== 'HOLD' && signal.indicators && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {signal.indicators.ichimoku && (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <div style={{
                            fontSize: 10, padding: "3px 8px", borderRadius: 4,
                            background: signal.indicators.ichimoku.signal === 'bullish' ? `${green}20` : signal.indicators.ichimoku.signal === 'bearish' ? `${red}20` : `${amber}20`,
                            color: signal.indicators.ichimoku.signal === 'bullish' ? green : signal.indicators.ichimoku.signal === 'bearish' ? red : amber,
                            fontWeight: 600
                          }}>
                            ICHIMOKU: {signal.indicators.ichimoku.priceVsCloud}
                            {signal.indicators.ichimoku.tkCross !== 'none' && ` · TK ${signal.indicators.ichimoku.tkCross}`}
                          </div>
                          {signal.indicators.ichimoku.cloudMomentum && signal.indicators.ichimoku.cloudMomentum !== 'stale' && (
                            <div style={{
                              fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 700,
                              background: signal.indicators.ichimoku.cloudMomentum === 'confirming' ? `${green}20` : `${red}20`,
                              color: signal.indicators.ichimoku.cloudMomentum === 'confirming' ? green : red,
                              letterSpacing: 0.3
                            }}>
                              {signal.indicators.ichimoku.cloudMomentum === 'confirming' ? 'CLOUD ✓' : 'CLOUD ✗'}
                            </div>
                          )}
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
                          {signal.indicators.fibonacci.goldenRatio && ' \u2605'}
                        </div>
                      )}
                      {signal.indicators.cmf != null && (
                        <div style={{
                          fontSize: 10, padding: "3px 8px", borderRadius: 4,
                          background: signal.indicators.cmfSignal?.includes('accumulation') ? `${green}20` : signal.indicators.cmfSignal?.includes('distribution') ? `${red}20` : `${muted}20`,
                          color: signal.indicators.cmfSignal?.includes('accumulation') ? green : signal.indicators.cmfSignal?.includes('distribution') ? red : muted,
                          fontWeight: 600
                        }}>
                          CMF: {signal.indicators.cmf > 0 ? '+' : ''}{signal.indicators.cmf}
                        </div>
                      )}
                      {signal.indicators.mfi != null && (
                        <div style={{
                          fontSize: 10, padding: "3px 8px", borderRadius: 4,
                          background: signal.indicators.mfi <= 20 ? `${green}20` : signal.indicators.mfi >= 80 ? `${red}20` : signal.indicators.mfi <= 30 ? `${green}15` : signal.indicators.mfi >= 70 ? `${red}15` : `${muted}20`,
                          color: signal.indicators.mfi <= 20 ? green : signal.indicators.mfi >= 80 ? red : signal.indicators.mfi <= 30 ? green : signal.indicators.mfi >= 70 ? red : muted,
                          fontWeight: 600
                        }}>
                          MFI: {signal.indicators.mfi}
                          {signal.indicators.mfi >= 80 && ' OB'}
                          {signal.indicators.mfi <= 20 && ' OS'}
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
                            \u25CF {(signal.freshness || 'fresh').toUpperCase()}
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
}

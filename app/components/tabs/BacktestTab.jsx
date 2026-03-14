'use client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { authFetch } from '../../lib/api';
import { colors, card, sTitle } from '../../lib/theme';
import { SHARED_ASSETS, SHARED_DAY_OPTIONS } from '../../lib/constants';
import { formatPrice } from '../../lib/utils';
import CandlestickChart from '../charts/CandlestickChart';

const { bg, bg2, bg3, border, text, muted, green, red, amber, blue, purple } = colors;

export default function BacktestTab({
  config, setConfig, running, result, setResult, history, error, progress,
  tradesPage, setTradesPage, selected, setSelected, deleting,
  strategyOverrides, setStrategyOverrides, inherited, setInherited,
  run, loadHistoricResult, loadHistory, deleteSelected, inheritFromPaperConfig,
  apiUrl, userId, paperConfigForm,
}) {
    // All state and actions received as props from useBacktest hook
    const BT_TRADES_PER_PAGE = 15;

    const ASSETS = SHARED_ASSETS;


    const inputStyle = {
      background: "#1a1a1a", border: `1px solid ${border}`, borderRadius: 6,
      color: text, padding: "8px 10px", fontFamily: "monospace", fontSize: 11, width: "100%"
    };
    const labelStyle = { fontSize: 10, color: muted, fontFamily: "monospace", marginBottom: 4, display: "block" };

    // Equity curve renderer (CSS bars)
    const EquityCurve = ({ curve, initial }) => {
      if (!curve || curve.length < 2) return null;
      const values = curve.map(p => p.equity);
      const maxVal = Math.max(...values);
      const minVal = Math.min(...values);
      const range = maxVal - minVal || 1;
      const step = Math.max(1, Math.floor(curve.length / 80)); // max 80 bars
      const sampled = curve.filter((_, i) => i % step === 0 || i === curve.length - 1);

      return (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: text, marginBottom: 8, fontFamily: "monospace" }}>
            EQUITY CURVE
          </div>
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 1, height: 120,
            background: "#0a0a0a", borderRadius: 6, padding: "8px 4px", border: `1px solid ${border}`
          }}>
            {sampled.map((point, i) => {
              const pct = (point.equity - minVal) / range;
              const color = point.equity >= initial ? green : red;
              return (
                <div
                  key={i}
                  title={`$${point.equity.toFixed(0)} (${new Date(point.timestamp).toLocaleDateString()})`}
                  style={{
                    flex: 1, minWidth: 2, maxWidth: 8,
                    height: `${Math.max(4, pct * 100)}%`,
                    background: color, borderRadius: "2px 2px 0 0", opacity: 0.8
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: muted, fontFamily: "monospace", marginTop: 4 }}>
            <span>${minVal.toFixed(0)}</span>
            <span>Inicio: ${initial.toFixed(0)}</span>
            <span>${maxVal.toFixed(0)}</span>
          </div>
        </div>
      );
    };

    return (
      <div>
        {/* Strategy Overrides Banner */}
        {Object.keys(strategyOverrides).length > 0 && (
          <div style={{
            padding: '10px 16px', background: `${purple}15`, border: `1px solid ${purple}50`,
            borderRadius: 8, marginBottom: 12, fontSize: 11, fontFamily: 'monospace',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <strong style={{ color: purple }}>Strategy Overrides:</strong>{' '}
              {Object.entries(strategyOverrides).map(([k, v]) => `${k}=${v}`).join(', ')}
            </div>
            <button
              onClick={() => setStrategyOverrides({})}
              style={{
                fontSize: 10, color: red, background: 'none', border: `1px solid ${red}40`,
                borderRadius: 4, padding: '2px 8px', cursor: 'pointer'
              }}
            >
              Limpiar
            </button>
          </div>
        )}

        {/* Inherited Config Badge */}
        {inherited && Object.keys(strategyOverrides).length === 0 && (
          <div style={{
            padding: '8px 16px', background: `${green}10`, border: `1px solid ${green}30`,
            borderRadius: 8, marginBottom: 12, fontSize: 10, color: green, fontFamily: 'monospace'
          }}>
            Config heredada de Estrategia (risk, confluencia, R:R, strength)
          </div>
        )}

        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${bg2}, #1a0a2a)`,
          border: `1px solid ${border}`, borderRadius: 10,
          padding: "16px 20px", marginBottom: 16, display: "flex",
          justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: text, fontFamily: "monospace" }}>
              🔬 BACKTESTING ENGINE
            </div>
            <div style={{ fontSize: 10, color: muted, fontFamily: "monospace", marginTop: 4 }}>
              Valida la estrategia con datos hist&oacute;ricos de Binance &middot; 10/13 factores t&eacute;cnicos
            </div>
          </div>
          {history.length > 0 && (
            <div style={{ fontSize: 10, color: muted, fontFamily: "monospace" }}>
              {history.length} backtest{history.length > 1 ? 's' : ''} ejecutado{history.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Config Form */}
        <div style={{
          background: bg2, border: `1px solid ${border}`, borderRadius: 10,
          padding: 20, marginBottom: 16
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: purple, fontFamily: "monospace", marginBottom: 16 }}>
            CONFIGURACI&Oacute;N DEL BACKTEST
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            {/* Asset */}
            <div>
              <label style={labelStyle}>Asset</label>
              <select
                value={config.asset}
                onChange={e => setConfig({ ...config, asset: e.target.value })}
                style={inputStyle}
                disabled={running}
              >
                {ASSETS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>

            {/* Days */}
            <div>
              <label style={labelStyle}>Per&iacute;odo (d&iacute;as)</label>
              <select
                value={config.days}
                onChange={e => setConfig({ ...config, days: Number(e.target.value) })}
                style={inputStyle}
                disabled={running}
              >
                {SHARED_DAY_OPTIONS.map(d => <option key={d} value={d}>{d} dias</option>)}
              </select>
            </div>

            {/* Step Interval */}
            <div>
              <label style={labelStyle}>Intervalo de step</label>
              <select
                value={config.stepInterval}
                onChange={e => setConfig({ ...config, stepInterval: e.target.value })}
                style={inputStyle}
                disabled={running}
              >
                <option value="4h">4 horas</option>
                <option value="1h">1 hora</option>
              </select>
            </div>

            {/* Capital */}
            <div>
              <label style={labelStyle}>Capital inicial ($)</label>
              <input
                type="number"
                value={config.capital}
                onChange={e => setConfig({ ...config, capital: Number(e.target.value) })}
                style={inputStyle}
                disabled={running}
                min={100}
              />
            </div>

            {/* Risk per trade */}
            <div>
              <label style={labelStyle}>Riesgo por trade (%)</label>
              <input
                type="number"
                value={(config.riskPerTrade * 100).toFixed(1)}
                onChange={e => setConfig({ ...config, riskPerTrade: Number(e.target.value) / 100 })}
                style={inputStyle}
                disabled={running}
                min={0.5}
                max={10}
                step={0.5}
              />
            </div>

            {/* Min confluence */}
            <div>
              <label style={labelStyle}>Confluencia m&iacute;nima</label>
              <select
                value={config.minConfluence}
                onChange={e => setConfig({ ...config, minConfluence: Number(e.target.value) })}
                style={inputStyle}
                disabled={running}
              >
                <option value={1}>1 timeframe</option>
                <option value={2}>2 timeframes</option>
                <option value={3}>3 timeframes</option>
              </select>
            </div>

            {/* Min R:R */}
            <div>
              <label style={labelStyle}>R:R m&iacute;nimo</label>
              <input
                type="number"
                value={config.minRR}
                onChange={e => setConfig({ ...config, minRR: Number(e.target.value) })}
                style={inputStyle}
                disabled={running}
                min={1.0}
                max={5.0}
                step={0.5}
              />
            </div>

            {/* Cooldown */}
            <div>
              <label style={labelStyle}>Cooldown (barras)</label>
              <input
                type="number"
                value={config.cooldownBars}
                onChange={e => setConfig({ ...config, cooldownBars: Number(e.target.value) })}
                style={inputStyle}
                disabled={running}
                min={1}
                max={24}
              />
            </div>
          </div>

          {/* Strength filter */}
          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>Strength filter</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {['STRONG BUY', 'STRONG SELL', 'BUY', 'SELL'].map(s => (
                <label key={s} style={{ fontSize: 10, color: text, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={config.allowedStrength.includes(s)}
                    disabled={running}
                    onChange={e => {
                      const updated = e.target.checked
                        ? [...config.allowedStrength, s]
                        : config.allowedStrength.filter(x => x !== s);
                      setConfig({ ...config, allowedStrength: updated });
                    }}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>

          {/* Kelly Criterion & Volatility Targeting */}
          <div style={{ marginTop: 14, background: "rgba(168,85,247,0.05)", border: `1px solid ${border}`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: purple, marginBottom: 10, fontFamily: "monospace" }}>
              POSITION SIZING AVANZADO
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Kelly Criterion */}
              <div>
                <label style={{ fontSize: 10, color: text, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={config.kellySizing.kelly.enabled}
                    disabled={running}
                    onChange={e => setConfig(prev => ({
                      ...prev,
                      kellySizing: { ...prev.kellySizing, kelly: { ...prev.kellySizing.kelly, enabled: e.target.checked } }
                    }))}
                  />
                  Kelly Criterion
                </label>
                {config.kellySizing.kelly.enabled && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 8, color: muted, display: "block" }}>Fracci{"o"}n</label>
                      <input type="number" min={0.1} max={1.0} step={0.1}
                        value={config.kellySizing.kelly.fraction}
                        onChange={e => setConfig(prev => ({
                          ...prev,
                          kellySizing: { ...prev.kellySizing, kelly: { ...prev.kellySizing.kelly, fraction: Number(e.target.value) } }
                        }))}
                        style={{ ...inputStyle, width: 60 }}
                        disabled={running}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 8, color: muted, display: "block" }}>Min trades</label>
                      <input type="number" min={5} max={200}
                        value={config.kellySizing.kelly.minTrades}
                        onChange={e => setConfig(prev => ({
                          ...prev,
                          kellySizing: { ...prev.kellySizing, kelly: { ...prev.kellySizing.kelly, minTrades: Number(e.target.value) } }
                        }))}
                        style={{ ...inputStyle, width: 60 }}
                        disabled={running}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Volatility Targeting */}
              <div>
                <label style={{ fontSize: 10, color: text, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={config.kellySizing.volatilityTargeting.enabled}
                    disabled={running}
                    onChange={e => setConfig(prev => ({
                      ...prev,
                      kellySizing: { ...prev.kellySizing, volatilityTargeting: { ...prev.kellySizing.volatilityTargeting, enabled: e.target.checked } }
                    }))}
                  />
                  Vol Targeting
                </label>
                {config.kellySizing.volatilityTargeting.enabled && (
                  <div>
                    <label style={{ fontSize: 8, color: muted, display: "block" }}>Target ATR%</label>
                    <input type="number" min={0.5} max={10.0} step={0.5}
                      value={config.kellySizing.volatilityTargeting.targetATRPercent}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        kellySizing: { ...prev.kellySizing, volatilityTargeting: { ...prev.kellySizing.volatilityTargeting, targetATRPercent: Number(e.target.value) } }
                      }))}
                      style={{ ...inputStyle, width: 70 }}
                      disabled={running}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Run button */}
          <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={run}
              disabled={running || config.allowedStrength.length === 0}
              style={{
                padding: "12px 28px",
                background: running ? muted : `linear-gradient(135deg, ${purple}, #7c3aed)`,
                border: "none", borderRadius: 8, color: "#fff",
                fontFamily: "monospace", fontSize: 12, fontWeight: 700,
                cursor: running ? "not-allowed" : "pointer", letterSpacing: "0.02em"
              }}
            >
              {running ? `PROCESANDO... ${progress}%` : "EJECUTAR BACKTEST"}
            </button>

            {running && (
              <div style={{ flex: 1, height: 6, background: "#1a1a1a", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  width: `${progress}%`, height: "100%",
                  background: `linear-gradient(90deg, ${purple}, ${green})`,
                  borderRadius: 3, transition: "width 0.5s ease"
                }} />
              </div>
            )}
          </div>

          {/* Nota de limitaciones */}
          <div style={{
            marginTop: 12, padding: "8px 12px", background: "rgba(168, 85, 247, 0.08)",
            borderRadius: 6, border: "1px solid rgba(168, 85, 247, 0.2)",
            fontSize: 9, color: muted, fontFamily: "monospace", lineHeight: 1.6
          }}>
            Backtest basado en 10/13 factores (EMA, RSI, MACD, BB, ADX, divergencias, volumen, S/R, momentum, squeeze).
            Excluye: derivatives funding rate, BTC dominance, DXY macro (sin datos hist&oacute;ricos).
            Slippage simulado: 0.1% por trade.
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.1)", border: `1px solid ${red}`, borderRadius: 8,
            padding: 14, marginBottom: 16, fontSize: 11, color: red, fontFamily: "monospace"
          }}>
            Error: {error}
          </div>
        )}

        {/* Results */}
        {result && result.status === 'completed' && result.metrics && (
          <div>
            {/* Summary Cards */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 10, marginBottom: 16
            }}>
              {[
                {
                  label: "P&L TOTAL",
                  value: `$${Number(result.total_pnl || 0).toFixed(2)}`,
                  sub: `${Number(result.total_pnl_percent || 0).toFixed(2)}%`,
                  color: Number(result.total_pnl) >= 0 ? green : red
                },
                {
                  label: "WIN RATE",
                  value: `${Number(result.win_rate || 0).toFixed(1)}%`,
                  sub: `${result.win_count}W / ${result.loss_count}L`,
                  color: Number(result.win_rate) >= 50 ? green : red
                },
                {
                  label: "TRADES",
                  value: result.total_trades || 0,
                  sub: `${result.days} dias`,
                  color: purple
                },
                {
                  label: "MAX DRAWDOWN",
                  value: `${Number(result.max_drawdown_percent || 0).toFixed(2)}%`,
                  sub: `$${Number(result.max_drawdown || 0).toFixed(2)}`,
                  color: red
                },
                {
                  label: "PROFIT FACTOR",
                  value: Number(result.profit_factor || 0).toFixed(2),
                  sub: result.profit_factor >= 1.5 ? "Bueno" : result.profit_factor >= 1 ? "Aceptable" : "Pobre",
                  color: Number(result.profit_factor) >= 1.5 ? green : Number(result.profit_factor) >= 1 ? "#f59e0b" : red
                },
                {
                  label: "SHARPE RATIO",
                  value: Number(result.sharpe_ratio || 0).toFixed(2),
                  sub: result.sharpe_ratio >= 1 ? "Bueno" : "Bajo",
                  color: Number(result.sharpe_ratio) >= 1 ? green : "#f59e0b"
                }
              ].map((card, i) => (
                <div key={i} style={{
                  background: bg2, border: `1px solid ${border}`, borderRadius: 8,
                  padding: "14px 16px", textAlign: "center"
                }}>
                  <div style={{ fontSize: 9, color: muted, fontFamily: "monospace", marginBottom: 6 }}>{card.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: card.color, fontFamily: "monospace" }}>{card.value}</div>
                  <div style={{ fontSize: 10, color: muted, fontFamily: "monospace", marginTop: 4 }}>{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Equity Curve */}
            {result.equity_curve && (
              <div style={{
                background: bg2, border: `1px solid ${border}`, borderRadius: 10,
                padding: 16, marginBottom: 16
              }}>
                <EquityCurve curve={result.equity_curve} initial={Number(result.initial_capital)} />
              </div>
            )}

            {/* Buy & Hold Benchmark */}
            {result.benchmark && result.benchmark.buyAndHold && (() => {
              const bh = result.benchmark.buyAndHold;
              const comp = result.benchmark.comparison;
              const stratReturn = Number(result.total_pnl_percent || 0);
              const stratDD = Number(result.max_drawdown_percent || 0);
              const stratSharpe = Number(result.sharpe_ratio || 0);
              const alpha = comp.returnDiff;
              const beatsMarket = alpha > 0;

              // Merge equity curves for chart
              const stratCurve = result.equity_curve || [];
              const bhCurve = bh.equityCurve || [];
              const chartData = [];
              const initialCap = Number(result.initial_capital || 10000);

              if (stratCurve.length > 0 && bhCurve.length > 0) {
                const step = Math.max(1, Math.floor(stratCurve.length / 60));
                for (let i = 0; i < stratCurve.length; i += step) {
                  const s = stratCurve[i];
                  // Find closest B&H point by timestamp
                  const bhPoint = bhCurve.reduce((best, p) =>
                    Math.abs(p.timestamp - s.timestamp) < Math.abs(best.timestamp - s.timestamp) ? p : best
                  , bhCurve[0]);
                  chartData.push({
                    date: new Date(s.timestamp).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
                    strategy: Math.round(s.equity * 100) / 100,
                    buyHold: Math.round(bhPoint.equity * 100) / 100
                  });
                }
                // Always include last point
                const lastS = stratCurve[stratCurve.length - 1];
                const lastBH = bhCurve[bhCurve.length - 1];
                if (chartData.length === 0 || chartData[chartData.length - 1].date !== new Date(lastS.timestamp).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })) {
                  chartData.push({
                    date: new Date(lastS.timestamp).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
                    strategy: Math.round(lastS.equity * 100) / 100,
                    buyHold: Math.round(lastBH.equity * 100) / 100
                  });
                }
              }

              return (
                <div style={{
                  background: bg2, border: `1px solid ${border}`, borderRadius: 10,
                  padding: 16, marginBottom: 16
                }}>
                  {/* Header with Alpha badge */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: purple, fontFamily: "monospace" }}>
                        STRATEGY vs BUY & HOLD
                      </span>
                      <span style={{
                        fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 700, fontFamily: "monospace",
                        background: beatsMarket ? `${green}18` : `${red}18`,
                        color: beatsMarket ? green : red,
                        border: `1px solid ${beatsMarket ? green : red}40`
                      }}>
                        {beatsMarket ? `+${alpha.toFixed(2)}% ALPHA` : `${alpha.toFixed(2)}% vs MARKET`}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 22, fontWeight: 800, fontFamily: "monospace",
                      color: beatsMarket ? green : red
                    }}>
                      {beatsMarket ? "BEATS MARKET" : "UNDERPERFORMS"}
                    </span>
                  </div>

                  {/* Head-to-Head Comparison Table */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 100px 100px 80px",
                    gap: 0, marginBottom: 16, fontSize: 11, fontFamily: "monospace"
                  }}>
                    {/* Header row */}
                    <div style={{ padding: "8px 10px", color: muted, fontWeight: 600, fontSize: 9, borderBottom: `1px solid ${border}` }}>METRIC</div>
                    <div style={{ padding: "8px 10px", color: purple, fontWeight: 700, fontSize: 9, textAlign: "center", borderBottom: `1px solid ${border}` }}>STRATEGY</div>
                    <div style={{ padding: "8px 10px", color: amber, fontWeight: 700, fontSize: 9, textAlign: "center", borderBottom: `1px solid ${border}` }}>BUY & HOLD</div>
                    <div style={{ padding: "8px 10px", color: muted, fontWeight: 600, fontSize: 9, textAlign: "center", borderBottom: `1px solid ${border}` }}>DIFF</div>

                    {/* Return row */}
                    {[
                      {
                        label: "Return",
                        strat: `${stratReturn.toFixed(2)}%`,
                        bh: `${bh.totalReturn.toFixed(2)}%`,
                        diff: comp.returnDiff,
                        suffix: "%",
                        higherIsBetter: true
                      },
                      {
                        label: "Max Drawdown",
                        strat: `${stratDD.toFixed(2)}%`,
                        bh: `${bh.maxDrawdown.toFixed(2)}%`,
                        diff: comp.drawdownDiff,
                        suffix: "%",
                        higherIsBetter: false
                      },
                      {
                        label: "Sharpe Ratio",
                        strat: stratSharpe.toFixed(2),
                        bh: bh.sharpeRatio.toFixed(2),
                        diff: comp.sharpeDiff,
                        suffix: "",
                        higherIsBetter: true
                      },
                      {
                        label: "Ann. Return",
                        strat: result.metrics?.annualizedReturn != null ? `${result.metrics.annualizedReturn}%` : "—",
                        bh: `${bh.annualizedReturn.toFixed(2)}%`,
                        diff: result.metrics?.annualizedReturn != null
                          ? Math.round((result.metrics.annualizedReturn - bh.annualizedReturn) * 100) / 100
                          : null,
                        suffix: "%",
                        higherIsBetter: true
                      }
                    ].map((row, i) => {
                      const diffPositive = row.diff > 0;
                      const stratWins = row.higherIsBetter ? diffPositive : !diffPositive;
                      return [
                        <div key={`l${i}`} style={{ padding: "8px 10px", color: text, borderBottom: `1px solid ${border}`, background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                          {row.label}
                        </div>,
                        <div key={`s${i}`} style={{
                          padding: "8px 10px", textAlign: "center", fontWeight: 700, borderBottom: `1px solid ${border}`,
                          background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                          color: stratWins ? green : (row.diff === 0 ? text : red)
                        }}>
                          {row.strat}
                        </div>,
                        <div key={`b${i}`} style={{
                          padding: "8px 10px", textAlign: "center", fontWeight: 700, borderBottom: `1px solid ${border}`,
                          background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                          color: !stratWins ? green : (row.diff === 0 ? text : red)
                        }}>
                          {row.bh}
                        </div>,
                        <div key={`d${i}`} style={{
                          padding: "8px 10px", textAlign: "center", fontWeight: 700, borderBottom: `1px solid ${border}`,
                          background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                          color: row.diff == null ? muted : (stratWins ? green : red)
                        }}>
                          {row.diff == null ? "—" : `${row.diff > 0 ? "+" : ""}${row.diff.toFixed(2)}${row.suffix}`}
                        </div>
                      ];
                    })}
                  </div>

                  {/* Dual Equity Curve Chart */}
                  {chartData.length > 2 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: text, marginBottom: 8, fontFamily: "monospace" }}>
                        EQUITY CURVE COMPARISON
                      </div>
                      <div style={{ height: 200, background: "#0a0a0a", borderRadius: 8, padding: "8px 0", border: `1px solid ${border}` }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 9, fill: muted }}
                              interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
                            />
                            <YAxis
                              tick={{ fontSize: 9, fill: muted }}
                              tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
                              width={55}
                            />
                            <Tooltip
                              contentStyle={{
                                background: "#1a1a1a", border: `1px solid ${border}`,
                                borderRadius: 6, fontSize: 10, fontFamily: "monospace"
                              }}
                              formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name === 'strategy' ? 'Strategy' : 'Buy & Hold']}
                            />
                            <ReferenceLine y={initialCap} stroke={muted} strokeDasharray="3 3" label={{ value: "Inicio", fill: muted, fontSize: 9 }} />
                            <Line type="monotone" dataKey="strategy" stroke={purple} strokeWidth={2} dot={false} name="strategy" />
                            <Line type="monotone" dataKey="buyHold" stroke={amber} strokeWidth={2} dot={false} name="buyHold" strokeDasharray="5 3" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontFamily: "monospace" }}>
                          <div style={{ width: 16, height: 3, background: purple, borderRadius: 2 }} />
                          <span style={{ color: text }}>Strategy</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontFamily: "monospace" }}>
                          <div style={{ width: 16, height: 3, background: amber, borderRadius: 2, borderTop: "1px dashed transparent" }} />
                          <span style={{ color: text }}>Buy & Hold</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Additional Metrics */}
            {result.metrics && (
              <div style={{
                background: bg2, border: `1px solid ${border}`, borderRadius: 10,
                padding: 16, marginBottom: 16
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: purple, fontFamily: "monospace", marginBottom: 12 }}>
                  DETALLES ADICIONALES
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                  {[
                    { l: "Profit promedio", v: `$${Number(result.metrics.avgProfit || 0).toFixed(2)}` },
                    { l: "Loss promedio", v: `$${Number(result.metrics.avgLoss || 0).toFixed(2)}` },
                    { l: "Mejor trade", v: `$${Number(result.metrics.bestTrade || 0).toFixed(2)}` },
                    { l: "Peor trade", v: `$${Number(result.metrics.worstTrade || 0).toFixed(2)}` },
                    { l: "Max wins consecutivos", v: result.metrics.maxConsecutiveWins || 0 },
                    { l: "Max losses consecutivos", v: result.metrics.maxConsecutiveLosses || 0 },
                    { l: "Avg holding (horas)", v: Number(result.avg_holding_hours || 0).toFixed(1) },
                    { l: "Trades/mes", v: Number(result.metrics.tradesPerMonth || 0).toFixed(1) }
                  ].map((item, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between",
                      fontSize: 10, fontFamily: "monospace", padding: "4px 0",
                      borderBottom: `1px solid ${border}`
                    }}>
                      <span style={{ color: muted }}>{item.l}</span>
                      <span style={{ color: text, fontWeight: 600 }}>{item.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Statistical Significance */}
            {result.significance && result.significance.assessment && (() => {
              const sig = result.significance;
              const a = sig.assessment;
              const badgeColor = a.stars >= 3 ? green : a.stars >= 2 ? green : a.stars >= 1 ? amber : red;
              const badgeIcon = a.stars >= 2 ? "\✅" : a.stars >= 1 ? "\⚠️" : "\❌";
              const starsStr = "\★".repeat(a.stars) + "\☆".repeat(3 - a.stars);

              const pValueColor = (p) => {
                if (p == null) return muted;
                if (p < 0.001) return green;
                if (p < 0.01) return green;
                if (p < 0.05) return amber;
                return red;
              };
              const pValueStars = (p) => {
                if (p == null) return "";
                if (p < 0.001) return " \★\★\★";
                if (p < 0.01) return " \★\★";
                if (p < 0.05) return " \★";
                return "";
              };

              return (
                <div style={{
                  background: bg2, border: `1px solid ${border}`, borderRadius: 10,
                  padding: 16, marginBottom: 16
                }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: purple, fontFamily: "monospace" }}>
                        {badgeIcon} SIGNIFICANCIA ESTADISTICA
                      </span>
                      <span style={{
                        fontSize: 9, padding: "2px 6px", borderRadius: 4,
                        background: `${badgeColor}22`, color: badgeColor, fontWeight: 600
                      }}>
                        {a.label} {starsStr}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 18, fontWeight: 700, color: badgeColor, fontFamily: "monospace"
                    }}>
                      {a.confidence}%
                    </span>
                  </div>

                  {/* P-values Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 14 }}>
                    {[
                      {
                        label: "P&L (t-test)",
                        pValue: sig.pnlTest?.pValue,
                        stat: sig.pnlTest ? `t=${sig.pnlTest.tStatistic}` : null
                      },
                      {
                        label: "Win Rate (binomial)",
                        pValue: sig.winRateTest?.pValue,
                        stat: sig.winRateTest ? `z=${sig.winRateTest.zStatistic}` : null
                      },
                      {
                        label: "Sharpe (bootstrap)",
                        pValue: sig.sharpeTest?.pValue,
                        stat: sig.sharpeTest ? `${sig.sharpeTest.countBelow}/${sig.sharpeTest.total}` : null
                      },
                      {
                        label: "Profit Factor (bootstrap)",
                        pValue: sig.profitFactorTest?.pValue,
                        stat: sig.profitFactorTest ? `${sig.profitFactorTest.countBelow}/${sig.profitFactorTest.total}` : null
                      }
                    ].map((item, i) => (
                      <div key={i} style={{
                        background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "8px 10px",
                        border: `1px solid ${border}`
                      }}>
                        <div style={{ fontSize: 9, color: muted, marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: pValueColor(item.pValue), fontFamily: "monospace" }}>
                          {item.pValue != null ? `p=${item.pValue.toFixed(4)}` : "N/A"}
                          <span style={{ fontSize: 10 }}>{pValueStars(item.pValue)}</span>
                        </div>
                        {item.stat && (
                          <div style={{ fontSize: 9, color: muted, marginTop: 2 }}>{item.stat}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 95% Confidence Intervals */}
                  {sig.confidenceIntervals?.ci95 && (
                    <div style={{ marginBottom: a.warnings?.length > 0 ? 10 : 0 }}>
                      <div style={{ fontSize: 10, color: muted, marginBottom: 6, fontWeight: 600 }}>
                        INTERVALOS DE CONFIANZA 95%
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 4 }}>
                        {[
                          { label: "Return %", metric: "returnPct", suffix: "%", goodIfPositive: true },
                          { label: "Max Drawdown %", metric: "maxDrawdownPct", suffix: "%", goodIfPositive: false },
                          { label: "Sharpe Ratio", metric: "sharpe", suffix: "", goodIfPositive: true },
                          { label: "Win Rate %", metric: "winRate", suffix: "%", goodIfPositive: true }
                        ].map((row, i) => {
                          const ci = sig.confidenceIntervals.ci95[row.metric];
                          if (!ci) return null;
                          return (
                            <div key={i} style={{
                              display: "grid", gridTemplateColumns: "110px 1fr 1fr 1fr",
                              fontSize: 10, fontFamily: "monospace", gap: 4,
                              padding: "4px 6px", borderRadius: 4,
                              background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"
                            }}>
                              <span style={{ color: muted }}>{row.label}</span>
                              <span style={{ color: red, textAlign: "center" }}>
                                {ci.lower != null ? `${ci.lower}${row.suffix}` : "-"}
                              </span>
                              <span style={{ color: text, textAlign: "center", fontWeight: 600 }}>
                                {ci.median != null ? `${ci.median}${row.suffix}` : "-"}
                              </span>
                              <span style={{ color: green, textAlign: "center" }}>
                                {ci.upper != null ? `${ci.upper}${row.suffix}` : "-"}
                              </span>
                            </div>
                          );
                        })}
                        <div style={{
                          display: "grid", gridTemplateColumns: "110px 1fr 1fr 1fr",
                          fontSize: 8, color: muted, padding: "2px 6px", gap: 4
                        }}>
                          <span></span>
                          <span style={{ textAlign: "center" }}>P2.5 (lower)</span>
                          <span style={{ textAlign: "center" }}>P50 (median)</span>
                          <span style={{ textAlign: "center" }}>P97.5 (upper)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {a.warnings && a.warnings.length > 0 && (
                    <div style={{ fontSize: 9, color: amber, fontStyle: "italic" }}>
                      {a.warnings.map((w, i) => <div key={i}>\⚠ {w}</div>)}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Monte Carlo Simulation */}
            {result.monte_carlo && !result.monte_carlo.skipped && (() => {
              const mc = result.monte_carlo;
              return (
                <div style={{
                  background: bg2, border: `1px solid ${border}`, borderRadius: 10,
                  padding: 16, marginBottom: 16
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: purple, fontFamily: "monospace" }}>
                      🎲 MONTE CARLO SIMULATION
                    </span>
                    <span style={{ fontSize: 9, color: muted }}>
                      {mc.simulations?.toLocaleString()} paths · {mc.tradeCount} trades
                    </span>
                  </div>

                  {/* Summary Cards */}
                  {mc.summary && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginBottom: 14 }}>
                      {[
                        { label: "Profit Probability", value: `${mc.summary.profitProbability}%`, color: mc.summary.profitProbability >= 50 ? green : red },
                        { label: "Median Return", value: `${mc.summary.medianReturn}%`, color: mc.summary.medianReturn >= 0 ? green : red },
                        { label: "Median Drawdown", value: `${mc.summary.medianDrawdown}%`, color: amber },
                        { label: "Worst Case (5th)", value: `${mc.summary.worstCase5}%`, color: red },
                        { label: "Best Case (95th)", value: `${mc.summary.bestCase95}%`, color: green },
                        { label: "Median Sharpe", value: mc.summary.medianSharpe, color: mc.summary.medianSharpe >= 1 ? green : amber }
                      ].map((card, ci) => (
                        <div key={ci} style={{
                          background: bg3, borderRadius: 8, padding: "10px 12px", textAlign: "center"
                        }}>
                          <div style={{ fontSize: 8, color: muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            {card.label}
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: card.color }}>
                            {card.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Percentile Distribution Table */}
                  {mc.percentiles && (
                    <div style={{ background: bg3, borderRadius: 8, padding: 12, marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: text, marginBottom: 8, fontFamily: "monospace" }}>
                        PERCENTILE DISTRIBUTION
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "50px repeat(5, 1fr)", gap: 3, fontSize: 9, fontFamily: "monospace" }}>
                        <div style={{ color: muted, fontWeight: 600 }}>%ile</div>
                        <div style={{ color: muted, fontWeight: 600 }}>Return</div>
                        <div style={{ color: muted, fontWeight: 600 }}>MaxDD</div>
                        <div style={{ color: muted, fontWeight: 600 }}>Sharpe</div>
                        <div style={{ color: muted, fontWeight: 600 }}>WinRate</div>
                        <div style={{ color: muted, fontWeight: 600 }}>Equity</div>
                        {[5, 25, 50, 75, 95].map(p => {
                          const row = mc.percentiles[`p${p}`];
                          if (!row) return null;
                          return [
                            <div key={`l${p}`} style={{ color: amber, fontWeight: 700 }}>P{p}</div>,
                            <div key={`r${p}`} style={{ color: row.returnPct >= 0 ? green : red }}>{row.returnPct}%</div>,
                            <div key={`d${p}`} style={{ color: red }}>{row.maxDrawdownPct}%</div>,
                            <div key={`s${p}`} style={{ color: text }}>{row.sharpe}</div>,
                            <div key={`w${p}`} style={{ color: text }}>{row.winRate}%</div>,
                            <div key={`e${p}`} style={{ color: text }}>${Number(row.finalEquity).toLocaleString()}</div>
                          ];
                        })}
                      </div>
                    </div>
                  )}

                  {/* Drawdown Probability */}
                  {mc.riskOfRuin && (
                    <div style={{ background: bg3, borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: text, marginBottom: 8, fontFamily: "monospace" }}>
                        DRAWDOWN PROBABILITY
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        {Object.entries(mc.riskOfRuin).map(([key, prob]) => {
                          const threshold = key.replace('dd', '').replace('pct', '');
                          return (
                            <div key={key} style={{ textAlign: "center" }}>
                              <div style={{ fontSize: 8, color: muted, marginBottom: 2 }}>&gt;{threshold}% DD</div>
                              <div style={{
                                fontSize: 15, fontWeight: 700,
                                color: prob > 50 ? red : prob > 25 ? amber : green
                              }}>
                                {prob}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Kelly Criterion & Volatility Targeting Results */}
            {result.kelly_sizing && (result.kelly_sizing.kellyEnabled || result.kelly_sizing.volTargetingEnabled) && (() => {
              const ks = result.kelly_sizing;
              return (
                <div style={{
                  background: bg2, border: `1px solid ${border}`, borderRadius: 10,
                  padding: 16, marginBottom: 16
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: purple, fontFamily: "monospace" }}>
                      {"⚖️"} KELLY CRITERION & VOL TARGETING
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                    {ks.kellyEnabled && [
                      {
                        label: "Avg Kelly Fraction",
                        value: ks.avgKellyFraction != null ? `${(ks.avgKellyFraction * 100).toFixed(2)}%` : "N/A",
                        color: ks.avgKellyFraction != null ? green : muted
                      },
                      {
                        label: "Kelly Range",
                        value: ks.minKellyFraction != null
                          ? `${(ks.minKellyFraction * 100).toFixed(1)}-${(ks.maxKellyFraction * 100).toFixed(1)}%`
                          : "N/A",
                        color: text
                      },
                      {
                        label: "Trades w/ Kelly",
                        value: `${ks.tradesWithKelly}/${ks.tradesWithKelly + ks.tradesWithoutKelly}`,
                        color: ks.tradesWithKelly > 0 ? green : muted
                      }
                    ].map((item, i) => (
                      <div key={`k${i}`} style={{
                        background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "8px 10px",
                        border: `1px solid ${border}`
                      }}>
                        <div style={{ fontSize: 9, color: muted, marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: item.color, fontFamily: "monospace" }}>
                          {item.value}
                        </div>
                      </div>
                    ))}

                    {ks.volTargetingEnabled && [
                      {
                        label: "Avg Vol Scale",
                        value: ks.avgVolScale != null ? `${ks.avgVolScale}x` : "N/A",
                        color: ks.avgVolScale != null ? (ks.avgVolScale > 1 ? green : ks.avgVolScale < 0.8 ? amber : text) : muted
                      },
                      {
                        label: "Trades w/ Vol Scale",
                        value: `${ks.tradesWithVolScale}/${ks.tradesWithKelly + ks.tradesWithoutKelly}`,
                        color: ks.tradesWithVolScale > 0 ? green : muted
                      }
                    ].map((item, i) => (
                      <div key={`v${i}`} style={{
                        background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "8px 10px",
                        border: `1px solid ${border}`
                      }}>
                        <div style={{ fontSize: 9, color: muted, marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: item.color, fontFamily: "monospace" }}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {ks.tradesWithoutKelly > 0 && ks.kellyEnabled && (
                    <div style={{ fontSize: 9, color: muted, marginTop: 8, fontStyle: "italic" }}>
                      {"ℹ️"} {ks.tradesWithoutKelly} trades usaron risk fijo (antes de acumular {ks.kellyConfig?.kelly?.minTrades || 20} trades m{"i"}nimos para Kelly)
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Trade List */}
            {result.trades && result.trades.length > 0 && (
              <div style={{
                background: bg2, border: `1px solid ${border}`, borderRadius: 10,
                padding: 16, marginBottom: 16
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginBottom: 12
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: purple, fontFamily: "monospace" }}>
                    TRADES ({result.trades.length})
                  </div>
                  {result.trades.length > BT_TRADES_PER_PAGE && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setTradesPage(Math.max(0, tradesPage - 1))}
                        disabled={tradesPage === 0}
                        style={{
                          padding: "4px 10px", background: bg2, border: `1px solid ${border}`,
                          borderRadius: 4, color: text, fontFamily: "monospace", fontSize: 10,
                          cursor: tradesPage === 0 ? "not-allowed" : "pointer", opacity: tradesPage === 0 ? 0.4 : 1
                        }}
                      >
                        &lt;
                      </button>
                      <span style={{ fontSize: 10, color: muted, fontFamily: "monospace", padding: "4px 0" }}>
                        {tradesPage + 1}/{Math.ceil(result.trades.length / BT_TRADES_PER_PAGE)}
                      </span>
                      <button
                        onClick={() => setTradesPage(Math.min(Math.ceil(result.trades.length / BT_TRADES_PER_PAGE) - 1, tradesPage + 1))}
                        disabled={tradesPage >= Math.ceil(result.trades.length / BT_TRADES_PER_PAGE) - 1}
                        style={{
                          padding: "4px 10px", background: bg2, border: `1px solid ${border}`,
                          borderRadius: 4, color: text, fontFamily: "monospace", fontSize: 10,
                          cursor: tradesPage >= Math.ceil(result.trades.length / BT_TRADES_PER_PAGE) - 1 ? "not-allowed" : "pointer",
                          opacity: tradesPage >= Math.ceil(result.trades.length / BT_TRADES_PER_PAGE) - 1 ? 0.4 : 1
                        }}
                      >
                        &gt;
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 10 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${border}` }}>
                        {["#", "Direccion", "Entry", "Exit", "P&L", "P&L %", "Razon", "Barras"].map(h => (
                          <th key={h} style={{ padding: "6px 8px", textAlign: "left", color: muted, fontWeight: 600, fontSize: 9 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades
                        .slice(tradesPage * BT_TRADES_PER_PAGE, (tradesPage + 1) * BT_TRADES_PER_PAGE)
                        .map((trade, i) => {
                          const pnl = Number(trade.pnl || 0);
                          const pnlPct = Number(trade.pnlPercent || 0);
                          const isWin = pnl >= 0;
                          const exitReasonLabels = {
                            stop_loss: "SL", take_profit_1: "TP1", take_profit_2: "TP2",
                            trailing_stop: "Trail", forced: "Forzado"
                          };
                          return (
                            <tr key={i} style={{
                              borderBottom: `1px solid ${border}`,
                              background: isWin ? "rgba(0, 212, 170, 0.03)" : "rgba(239, 68, 68, 0.03)"
                            }}>
                              <td style={{ padding: "6px 8px", color: muted }}>
                                {tradesPage * BT_TRADES_PER_PAGE + i + 1}
                              </td>
                              <td style={{
                                padding: "6px 8px", fontWeight: 700,
                                color: trade.direction === 'LONG' ? green : red
                              }}>
                                {trade.direction === 'LONG' ? "\▲ LONG" : "\▼ SHORT"}
                              </td>
                              <td style={{ padding: "6px 8px", color: text }}>
                                ${Number(trade.entryPrice || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: "6px 8px", color: text }}>
                                ${Number(trade.exitPrice || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: "6px 8px", fontWeight: 700, color: isWin ? green : red }}>
                                {isWin ? "+" : ""}{pnl.toFixed(2)}
                              </td>
                              <td style={{ padding: "6px 8px", color: isWin ? green : red }}>
                                {isWin ? "+" : ""}{pnlPct.toFixed(2)}%
                              </td>
                              <td style={{ padding: "6px 8px" }}>
                                <span style={{
                                  padding: "2px 6px", borderRadius: 4, fontSize: 9,
                                  background: trade.exitReason === 'stop_loss' ? "rgba(239,68,68,0.15)" :
                                    trade.exitReason === 'trailing_stop' ? "rgba(245,158,11,0.15)" :
                                    "rgba(0,212,170,0.15)",
                                  color: trade.exitReason === 'stop_loss' ? red :
                                    trade.exitReason === 'trailing_stop' ? "#f59e0b" : green
                                }}>
                                  {exitReasonLabels[trade.exitReason] || trade.exitReason || "?"}
                                </span>
                              </td>
                              <td style={{ padding: "6px 8px", color: muted }}>
                                {trade.holdingBars || "-"}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Candlestick chart with trade markers */}
        {result && result.trades && result.trades.length > 0 && (
          <div style={{ background: bg2, border: `1px solid ${border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: blue, fontFamily: 'monospace', marginBottom: 10 }}>
              PRICE ACTION — {(config.asset || 'bitcoin').toUpperCase()}
            </div>
            <CandlestickChart
              apiUrl={apiUrl}
              asset={config.asset || 'bitcoin'}
              interval={config.step_interval || '1h'}
              limit={Math.min((config.days || 30) * 24, 1000)}
              height={350}
              showControls={false}
              markers={result.trades.flatMap(t => {
                const pnl = Number(t.pnl || 0);
                const isWin = pnl >= 0;
                const markers = [];
                if (t.entryTimestamp) {
                  markers.push({
                    time: Math.floor(t.entryTimestamp / 1000),
                    position: t.direction === 'LONG' ? 'belowBar' : 'aboveBar',
                    color: t.direction === 'LONG' ? green : red,
                    shape: t.direction === 'LONG' ? 'arrowUp' : 'arrowDown',
                    text: `${t.direction} $${Number(t.entryPrice).toFixed(0)}`,
                  });
                }
                if (t.exitTimestamp) {
                  markers.push({
                    time: Math.floor(t.exitTimestamp / 1000),
                    position: 'aboveBar',
                    color: isWin ? green : red,
                    shape: 'circle',
                    text: `${isWin ? '+' : ''}${pnl.toFixed(0)}`,
                  });
                }
                return markers;
              })}
            />
          </div>
        )}

        {/* Backtest History */}
        {history.length > 0 && (
          <div style={{
            background: bg2, border: `1px solid ${border}`, borderRadius: 10,
            padding: 16
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: purple, fontFamily: "monospace" }}>
                HISTORIAL DE BACKTESTS
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {selected.size > 0 && (
                  <button
                    onClick={async () => {
                      if (!confirm(`Eliminar ${selected.size} backtest(s)?`)) return;
                      setDeleting(true);
                      try {
                        const idsToDelete = [...selected];
                        // Try DELETE first, fallback to POST /api/backtest/delete
                        let res = await authFetch(`${apiUrl}/api/backtest`, {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ids: idsToDelete })
                        });
                        if (!res.ok && res.status === 404) {
                          res = await authFetch(`${apiUrl}/api/backtest/delete`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ids: idsToDelete })
                          });
                        }
                        // Always remove from UI regardless of backend response
                        const deletedIds = new Set(idsToDelete);
                        setHistory(prev => prev.filter(b => !deletedIds.has(b.id)));
                        setSelected(new Set());
                        if (result && deletedIds.has(result.id)) setResult(null);
                      } catch (e) { console.error('Delete failed', e); loadHistory(); }
                      setDeleting(false);
                    }}
                    disabled={deleting}
                    style={{
                      background: "rgba(239, 68, 68, 0.15)", border: `1px solid ${red}`,
                      borderRadius: 6, padding: "4px 12px", cursor: "pointer",
                      fontSize: 10, fontFamily: "monospace", color: red, fontWeight: 600
                    }}
                  >
                    {deleting ? "Eliminando..." : `Eliminar (${selected.size})`}
                  </button>
                )}
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      if (selected.size === history.length) {
                        setSelected(new Set());
                      } else {
                        setSelected(new Set(history.map(b => b.id)));
                      }
                    }}
                    style={{
                      background: "transparent", border: `1px solid ${border}`,
                      borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                      fontSize: 9, fontFamily: "monospace", color: muted
                    }}
                  >
                    {selected.size === history.length ? "Deseleccionar" : "Seleccionar todo"}
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {history.map((entry, i) => {
                const pnl = Number(entry.total_pnl || 0);
                const isViewing = result && result.id === entry.id;
                const isChecked = selected.has(entry.id);
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 14px", borderRadius: 6,
                      background: isViewing ? "rgba(168, 85, 247, 0.1)" : isChecked ? "rgba(168, 85, 247, 0.05)" : "#0a0a0a",
                      border: `1px solid ${isViewing ? purple : isChecked ? "rgba(168, 85, 247, 0.3)" : border}`,
                      cursor: entry.status === 'completed' ? "pointer" : "default",
                      opacity: entry.status === 'failed' ? 0.6 : 1
                    }}
                  >
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelected(prev => {
                            const next = new Set(prev);
                            if (next.has(entry.id)) next.delete(entry.id);
                            else next.add(entry.id);
                            return next;
                          });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ accentColor: purple, cursor: "pointer" }}
                      />
                      <span
                        onClick={() => entry.status === 'completed' && loadHistoricResult(entry.id)}
                        style={{ display: "flex", gap: 16, alignItems: "center", flex: 1 }}
                      >
                        <span style={{ fontSize: 10, color: text, fontFamily: "monospace", fontWeight: 600, textTransform: "uppercase" }}>
                          {entry.asset}
                        </span>
                        <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>
                          {entry.days}d &middot; {entry.step_interval}
                        </span>
                        <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>
                          {entry.total_trades || 0} trades
                        </span>
                      </span>
                    </div>
                    <div
                      onClick={() => entry.status === 'completed' && loadHistoricResult(entry.id)}
                      style={{ display: "flex", gap: 16, alignItems: "center" }}
                    >
                      {entry.status === 'completed' ? (
                        <>
                          <span style={{
                            fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                            color: pnl >= 0 ? green : red
                          }}>
                            {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} ({Number(entry.total_pnl_percent || 0).toFixed(1)}%)
                          </span>
                          <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>
                            WR: {Number(entry.win_rate || 0).toFixed(0)}%
                          </span>
                        </>
                      ) : entry.status === 'running' ? (
                        <span style={{ fontSize: 10, color: "#f59e0b", fontFamily: "monospace" }}>
                          Ejecutando... {entry.progress || 0}%
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: red, fontFamily: "monospace" }}>
                          {entry.error_message === 'Timed out' ? 'Timeout' : 'Error'}
                        </span>
                      )}
                      <span style={{ fontSize: 9, color: muted, fontFamily: "monospace" }}>
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
}

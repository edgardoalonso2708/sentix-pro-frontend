'use client';
import { authFetch } from '../../lib/api';
import { colors, card, sTitle } from '../../lib/theme';
import { SHARED_ASSETS, SHARED_DAY_OPTIONS } from '../../lib/constants';

const { bg, bg2, bg3, border, text, muted, green, red, amber, blue, purple } = colors;

export default function OptimizeTab({
  optParams, optConfig, setOptConfig, optPhase, setOptPhase,
  optRunning, optResult, setOptResult, optError, optProgress, optHistory,
  optApplying, showSignalParams, setShowSignalParams,
  autoTuneHistory, autoTuneConfig, autoTuneRunning,
  autoTuneExpanded, setAutoTuneExpanded, autoTunePending,
  loadOptParams, loadOptHistory, loadAutoTuneData,
  runOptimize, applyResult,
  apiUrl,
  // Cross-tab callbacks
  onVerifyWithBacktest,
}) {
    // All state and actions received as props from useOptimization hook

    const OPT_ASSETS = SHARED_ASSETS;

    const selectedParam = optParams.find(p => p.key === optConfig.paramName);

    // Phase definitions for guided optimization
    const PHASES = [
      { id: 0, label: 'TODOS', icon: '📋', desc: 'Todos los parametros', color: muted,
        keys: null }, // null = show all
      { id: 1, label: 'FASE 1: RIESGO', icon: '🛡️', desc: 'Stop loss, trailing, thresholds — los mas impactantes', color: '#ef4444',
        keys: ['riskPerTrade', 'atrStopMult', 'atrTrailingMult', 'buyThreshold', 'sellThreshold', 'confidenceCap'] },
      { id: 2, label: 'FASE 2: PESOS', icon: '⚖️', desc: 'Peso de cada indicador en el score final', color: '#f59e0b',
        keys: ['trendScoreStrong', 'derivativesScore', 'ichimokuScore', 'vwapScore', 'fibScore', 'marketStructureScore', 'orderBookScore'] },
      { id: 3, label: 'FASE 3: AJUSTE FINO', icon: '🔧', desc: 'Governor, confluence, timeframes — refinamiento', color: purple,
        keys: ['adxStrongThreshold', 'adxStrongMultiplier', 'adxWeakMultiplier', 'rsiOversold', 'rsiOverbought',
               'strongConfluenceMult', 'conflictingMult', 'governorMultMild', 'governorMultStrong',
               'governorStrongThreshold', 'governorRangingDampen', 'dynamicTFWeightsEnabled',
               'tfTrending4hWeight', 'tfRanging15mWeight', 'srClusterThreshold', 'srSwingLookback'] }
    ];

    const activePhase = PHASES[optPhase];
    const filteredParams = activePhase.keys
      ? optParams.filter(p => activePhase.keys.includes(p.key))
      : optParams;

    return (
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>⚡ Optimizador de Estrategia</h2>
        <p style={{ color: muted, fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
          Optimiza un parametro a la vez contra datos historicos.
          {optConfig.days >= 30
            ? ' Walk-forward 70/30 detecta sobreajuste.'
            : ' ⚠️ Usa 90+ dias para validacion walk-forward.'}
        </p>

        {/* Phase Selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {PHASES.map(ph => (
            <button key={ph.id} onClick={() => { setOptPhase(ph.id); setOptConfig(c => ({ ...c, paramName: '' })); }}
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                border: optPhase === ph.id ? `2px solid ${ph.color}` : `1px solid ${border}`,
                background: optPhase === ph.id ? `${ph.color}20` : bg2,
                color: optPhase === ph.id ? ph.color : muted, cursor: 'pointer'
              }}>
              {ph.icon} {ph.label}
            </button>
          ))}
        </div>

        {/* Phase Description */}
        {optPhase > 0 && (
          <div style={{ padding: 12, background: `${activePhase.color}10`, border: `1px solid ${activePhase.color}40`,
            borderRadius: 8, marginBottom: 16, fontSize: 12, color: activePhase.color }}>
            <strong>{activePhase.icon} {activePhase.label}:</strong> {activePhase.desc}
            {optPhase === 1 && <span style={{ display: 'block', marginTop: 4, color: muted, fontSize: 11 }}>
              💡 Empieza aqui. Estos parametros definen cuanto arriesgas y cuando entras/sales. Optimiza cada uno con 90 dias de datos.
            </span>}
            {optPhase === 2 && <span style={{ display: 'block', marginTop: 4, color: muted, fontSize: 11 }}>
              💡 Una vez tengas buenos parametros de riesgo, ajusta que indicadores pesan mas en la decision de compra/venta.
            </span>}
            {optPhase === 3 && <span style={{ display: 'block', marginTop: 4, color: muted, fontSize: 11 }}>
              💡 Ultimo paso. Ajusta el governor del 4H, confluence multipliers y pesos de timeframe. Cambios sutiles.
            </span>}
          </div>
        )}

        {/* Config Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
          {/* Asset */}
          <div>
            <label style={{ fontSize: 10, color: muted, fontWeight: 700, display: 'block', marginBottom: 4 }}>ASSET</label>
            <select
              value={optConfig.asset}
              onChange={e => setOptConfig({ ...optConfig, asset: e.target.value })}
              disabled={optRunning}
              style={{ width: '100%', padding: '8px 10px', background: bg2, color: text, border: `1px solid ${border}`, borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }}
            >
              {OPT_ASSETS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          {/* Days */}
          <div>
            <label style={{ fontSize: 10, color: muted, fontWeight: 700, display: 'block', marginBottom: 4 }}>DIAS HISTORICOS</label>
            <select
              value={optConfig.days}
              onChange={e => setOptConfig({ ...optConfig, days: Number(e.target.value) })}
              disabled={optRunning}
              style={{ width: '100%', padding: '8px 10px', background: bg2, color: text, border: `1px solid ${border}`, borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }}
            >
              {SHARED_DAY_OPTIONS.map(d => <option key={d} value={d}>{d} dias{d >= 90 ? ' ✓' : ''}</option>)}
            </select>
          </div>

          {/* Validation Mode */}
          <div>
            <label style={{ fontSize: 10, color: muted, fontWeight: 700, display: 'block', marginBottom: 4 }}>VALIDACION</label>
            <select
              value={optConfig.validationMode || 'auto'}
              onChange={e => setOptConfig({ ...optConfig, validationMode: e.target.value })}
              disabled={optRunning}
              style={{ width: '100%', padding: '8px 10px', background: bg2, color: text, border: `1px solid ${border}`, borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }}
            >
              <option value="auto">Auto (Rolling WF)</option>
              <option value="anchored">Anchored Expanding</option>
              <option value="rolling">Rolling WF</option>
              <option value="single">Single Split 70/30</option>
            </select>
          </div>

          {/* Parameter to optimize */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: 10, color: muted, fontWeight: 700, display: 'block', marginBottom: 4 }}>
              PARAMETRO A OPTIMIZAR {optPhase > 0 && <span style={{ color: activePhase.color }}>({filteredParams.length} disponibles)</span>}
            </label>
            <select
              value={optConfig.paramName}
              onChange={e => setOptConfig({ ...optConfig, paramName: e.target.value })}
              disabled={optRunning}
              style={{ width: '100%', padding: '8px 10px', background: bg2, color: text, border: `1px solid ${border}`, borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }}
            >
              <option value="">— Selecciona un parametro —</option>
              {filteredParams.map(p => (
                <option key={p.key} value={p.key}>{p.label} (default: {p.defaultValue})</option>
              ))}
            </select>
            {selectedParam && (
              <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>
                {selectedParam.description} · Rango: {selectedParam.min} → {selectedParam.max} (step {selectedParam.step}) · {selectedParam.testValues} valores a probar
              </div>
            )}
          </div>
        </div>

        {/* Run Button */}
        <button
          onClick={runOptimize}
          disabled={optRunning || !optConfig.paramName}
          style={{
            width: '100%', padding: '14px 24px', borderRadius: 8, border: 'none',
            background: optRunning ? bg2 : `linear-gradient(135deg, ${purple}, #7c3aed)`,
            color: '#fff', fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
            cursor: optRunning ? 'wait' : 'pointer', marginBottom: 16
          }}
        >
          {optRunning ? `⏳ ${optProgress.message || 'Optimizando...'}` : '⚡ EJECUTAR OPTIMIZACION'}
        </button>

        {/* Progress Bar */}
        {optRunning && optProgress.total > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: muted, marginBottom: 4 }}>
              <span>{optProgress.message}</span>
              <span>{optProgress.current}/{optProgress.total}</span>
            </div>
            <div style={{ height: 6, background: bg2, borderRadius: 3 }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: `linear-gradient(90deg, ${purple}, #7c3aed)`,
                width: `${(optProgress.current / optProgress.total) * 100}%`,
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        )}

        {/* Error */}
        {optError && (
          <div style={{ padding: 12, background: '#dc262620', border: '1px solid #dc2626', borderRadius: 8, color: '#ef4444', fontSize: 12, marginBottom: 16 }}>
            ❌ {optError}
          </div>
        )}

        {/* Results Table */}
        {optResult && (
          <div style={{ marginBottom: 24 }}>
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div style={{ background: bg2, borderRadius: 8, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>MEJOR VALOR</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: green }}>{optResult.bestValue}</div>
              </div>
              <div style={{ background: bg2, borderRadius: 8, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>MEJOR SHARPE</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: optResult.bestSharpe > 0 ? green : red }}>
                  {optResult.bestSharpe?.toFixed(2)}
                </div>
              </div>
              <div style={{ background: bg2, borderRadius: 8, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>DEFAULT</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {optResult.defaultValue} → {optResult.defaultSharpe?.toFixed(2)}
                </div>
              </div>
              <div style={{ background: bg2, borderRadius: 8, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>MEJORA</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: (optResult.improvement || 0) > 0 ? green : (optResult.improvement || 0) < 0 ? red : text }}>
                  {(optResult.improvement || 0) > 0 ? '+' : ''}{optResult.improvement?.toFixed(2) || 'N/A'}
                </div>
              </div>
            </div>

            {/* Walk-Forward Validation Cards */}
            {optResult.validation?.enabled && (
              <div>
                {/* Mode badge */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                    background: optResult.validation.mode === 'anchored_expanding' ? `${blue}20` : optResult.validation.mode === 'rolling' ? `${purple}20` : `${muted}20`,
                    color: optResult.validation.mode === 'anchored_expanding' ? blue : optResult.validation.mode === 'rolling' ? purple : muted,
                    textTransform: 'uppercase', letterSpacing: 0.5
                  }}>
                    {optResult.validation.mode === 'anchored_expanding' ? 'ANCHORED EXPANDING' : optResult.validation.mode === 'rolling' ? 'ROLLING WF' : 'SINGLE SPLIT'}
                  </span>
                  {optResult.validation.numFolds && (
                    <span style={{ fontSize: 10, color: muted }}>{optResult.validation.numFolds} folds</span>
                  )}
                  {optResult.validation.parameterStability && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                      background: optResult.validation.parameterStability.consistent ? `${green}15` : `${amber}15`,
                      color: optResult.validation.parameterStability.consistent ? green : amber
                    }}>
                      Estabilidad: {optResult.validation.parameterStability.stabilityScore?.toFixed(0)}%
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: bg2, borderRadius: 8, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>OOS SHARPE</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: (optResult.validation.bestOosSharpe || 0) > 0 ? green : red }}>
                      {optResult.validation.bestOosSharpe != null ? optResult.validation.bestOosSharpe.toFixed(2) : (optResult.validation.bestCompositeScore != null ? optResult.validation.bestCompositeScore.toFixed(2) : 'N/A')}
                    </div>
                  </div>
                  <div style={{ background: bg2, borderRadius: 8, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>DEGRADACION</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: (optResult.validation.avgDegradation || 0) > 0.5 ? red : (optResult.validation.avgDegradation || 0) > 0.3 ? '#f59e0b' : green }}>
                      {optResult.validation.avgDegradation != null ? `${(optResult.validation.avgDegradation * 100).toFixed(0)}%` : 'N/A'}
                    </div>
                  </div>
                  <div style={{ background: bg2, borderRadius: 8, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>RANK CORR.</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: (optResult.validation.rankCorrelation || 0) > 0.5 ? green : (optResult.validation.rankCorrelation || 0) > 0.2 ? '#f59e0b' : red }}>
                      {optResult.validation.rankCorrelation != null ? optResult.validation.rankCorrelation.toFixed(2) : 'N/A'}
                    </div>
                  </div>
                  <div style={{ background: bg2, borderRadius: 8, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>
                      {optResult.validation.mode === 'anchored_expanding' ? 'FOLDS' : 'SPLIT'}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {optResult.validation.numFolds
                        ? `${optResult.validation.numFolds}x ${optResult.validation.testDaysPerFold || optResult.validation.testDays}d`
                        : `${optResult.validation.trainDays}d / ${optResult.validation.testDays}d`}
                    </div>
                    <div style={{ fontSize: 9, color: muted }}>
                      {optResult.validation.numFolds ? 'folds x test' : 'train / test'}
                    </div>
                  </div>
                </div>

                {/* Data Efficiency (anchored only) */}
                {optResult.validation.dataEfficiency && (
                  <div style={{
                    padding: 10, marginBottom: 12, borderRadius: 6,
                    background: optResult.validation.dataEfficiency.trend === 'improving' ? `${green}10` : optResult.validation.dataEfficiency.trend === 'degrading' ? `${red}10` : `${muted}10`,
                    border: `1px solid ${optResult.validation.dataEfficiency.trend === 'improving' ? green : optResult.validation.dataEfficiency.trend === 'degrading' ? red : muted}30`,
                    fontSize: 11
                  }}>
                    <span style={{ fontWeight: 700, color: optResult.validation.dataEfficiency.trend === 'improving' ? green : optResult.validation.dataEfficiency.trend === 'degrading' ? red : muted }}>
                      Data Efficiency: {optResult.validation.dataEfficiency.trend.toUpperCase()}
                    </span>
                    <span style={{ color: muted, marginLeft: 8 }}>
                      {optResult.validation.dataEfficiency.interpretation}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Overfit Warning */}
            {optResult.validation?.overfitWarning && (
              <div style={{
                padding: 12, background: '#f59e0b20', border: '1px solid #f59e0b',
                borderRadius: 8, fontSize: 12, marginBottom: 16, color: '#f59e0b'
              }}>
                <strong>Alerta de Sobreajuste:</strong> {optResult.validation.details}
                {' '}(degradacion: {(optResult.validation.avgDegradation * 100).toFixed(0)}%,
                rank corr: {optResult.validation.rankCorrelation?.toFixed(2)})
              </div>
            )}

            {/* Results Grid */}
            <div style={{ background: bg2, borderRadius: 8, padding: 16, overflowX: 'auto' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📊 Resultados por Valor ({optResult.paramLabel})</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    <th style={{ textAlign: 'left', padding: '8px 6px', color: muted, fontSize: 10 }}>VALOR</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', color: muted, fontSize: 10 }}>{optResult.validation?.enabled ? 'IS SHARPE' : 'SHARPE'}</th>
                    {optResult.validation?.enabled && (
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: muted, fontSize: 10 }}>OOS SHARPE</th>
                    )}
                    <th style={{ textAlign: 'right', padding: '8px 6px', color: muted, fontSize: 10 }}>P.FACTOR</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', color: muted, fontSize: 10 }}>WIN%</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', color: muted, fontSize: 10 }}>TRADES</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', color: muted, fontSize: 10 }}>PnL%</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', color: muted, fontSize: 10 }}>DRAWDOWN</th>
                    {optResult.validation?.enabled && (
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: muted, fontSize: 10 }}>DEGRAD.</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(optResult.results || []).map((r, i) => {
                    const isBest = i === 0;
                    const isDefault = r.value === optResult.defaultValue;
                    return (
                      <tr key={i} style={{
                        borderBottom: `1px solid ${border}22`,
                        background: isBest ? `${green}15` : isDefault ? `${purple}15` : 'transparent'
                      }}>
                        <td style={{ padding: '8px 6px', fontWeight: isBest || isDefault ? 700 : 400 }}>
                          {r.value}
                          {isBest && <span style={{ color: green, fontSize: 9, marginLeft: 4 }}>★ BEST</span>}
                          {isDefault && <span style={{ color: purple, fontSize: 9, marginLeft: 4 }}>● DEFAULT</span>}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 6px', color: r.sharpe > 0 ? green : red }}>
                          {r.sharpe?.toFixed(2)}
                        </td>
                        {optResult.validation?.enabled && (
                          <td style={{ textAlign: 'right', padding: '8px 6px', color: (r.outOfSample?.sharpe || 0) > 0 ? green : red }}>
                            {r.outOfSample?.sharpe != null ? r.outOfSample.sharpe.toFixed(2) : 'N/A'}
                          </td>
                        )}
                        <td style={{ textAlign: 'right', padding: '8px 6px', color: r.profitFactor >= 1 ? green : red }}>
                          {r.profitFactor?.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 6px' }}>{r.winRate}%</td>
                        <td style={{ textAlign: 'right', padding: '8px 6px' }}>{r.totalTrades}</td>
                        <td style={{ textAlign: 'right', padding: '8px 6px', color: r.totalPnlPercent >= 0 ? green : red }}>
                          {r.totalPnlPercent >= 0 ? '+' : ''}{r.totalPnlPercent?.toFixed(1)}%
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 6px', color: red }}>
                          {r.maxDrawdownPercent?.toFixed(1)}%
                        </td>
                        {optResult.validation?.enabled && (() => {
                          const deg = r.inSample?.sharpe > 0 && r.outOfSample?.sharpe != null
                            ? ((1 - r.outOfSample.sharpe / r.inSample.sharpe) * 100)
                            : null;
                          return (
                            <td style={{ textAlign: 'right', padding: '8px 6px', color: deg != null ? (deg > 50 ? red : deg > 30 ? '#f59e0b' : green) : muted }}>
                              {deg != null ? `${deg.toFixed(0)}%` : 'N/A'}
                            </td>
                          );
                        })()}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: 10, color: muted, marginTop: 8, textAlign: 'right' }}>
              {optResult.validation?.enabled
                ? `🔬 Walk-forward ${optResult.validation.trainDays}d/${optResult.validation.testDays}d · Rankeado por ${optResult.validation.rankedBy} · `
                : ''}
              ⏱ {optResult.duration?.toFixed(1)}s · {optResult.asset?.toUpperCase()} · {optResult.days} dias
            </div>

            {/* Action Buttons: Apply + Verify */}
            {optResult.bestValue !== undefined && (
              <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                {!optResult.validation?.overfitWarning && (
                  <button
                    onClick={async () => {
                      const result = await applyResult();
                      if (result) alert(result.success ? result.message : `Error: ${result.message}`);
                    }}
                    disabled={optApplying}
                    style={{
                      padding: '10px 20px', background: green, color: '#000',
                      borderRadius: 8, fontWeight: 700, fontSize: 12,
                      border: 'none', cursor: 'pointer', opacity: optApplying ? 0.5 : 1
                    }}
                  >
                    {optApplying ? 'Aplicando...' : `Aplicar ${optResult.paramLabel || optConfig.paramName} = ${optResult.bestValue}`}
                  </button>
                )}
                <button
                  onClick={() => onVerifyWithBacktest && onVerifyWithBacktest({
                    asset: optConfig.asset,
                    days: optConfig.days,
                    paramKey: optResult.paramKey || optConfig.paramName,
                    bestValue: optResult.bestValue,
                  })}
                  style={{
                    padding: '10px 20px', background: purple, color: '#fff',
                    borderRadius: 8, fontWeight: 700, fontSize: 12,
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  Verificar con Backtest
                </button>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {optHistory.length > 0 && (
          <div style={{ background: bg2, borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📜 Historial de Optimizaciones</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {optHistory.slice(0, 10).map((h, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', background: bg, borderRadius: 6, fontSize: 11
                }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>{h.paramName}</span>
                    <span style={{ color: muted, marginLeft: 8 }}>{h.asset?.toUpperCase()} · {h.days}d</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    {h.status === 'completed' ? (
                      <>
                        <span style={{ color: green }}>Best: {h.bestValue} (Sharpe {h.bestSharpe?.toFixed(2)})</span>
                        {h.validationEnabled && h.bestOosSharpe != null && (
                          <span style={{ color: h.bestOosSharpe > 0 ? green : red, fontSize: 10 }}>
                            OOS: {h.bestOosSharpe.toFixed(2)}
                          </span>
                        )}
                        {h.overfitWarning && (
                          <span style={{ color: '#f59e0b', fontSize: 10, fontWeight: 700 }}>OVERFIT</span>
                        )}
                        {h.improvement !== null && (
                          <span style={{ color: h.improvement > 0 ? green : h.improvement < 0 ? red : muted, fontSize: 10 }}>
                            {h.improvement > 0 ? '+' : ''}{h.improvement?.toFixed(2)} vs default
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: h.status === 'error' ? red : amber }}>{h.status}</span>
                    )}
                    <span style={{ color: muted, fontSize: 9 }}>{h.duration ? `${h.duration.toFixed(0)}s` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── AUTO-PARAMETER TUNING PANEL ──────────────────────────────── */}
        <div style={{ background: bg2, borderRadius: 8, padding: 16, marginTop: 16, border: `1px solid ${border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: autoTuneExpanded ? 12 : 0 }}
            onClick={() => setAutoTuneExpanded(!autoTuneExpanded)}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
              🤖 Auto-Parameter Tuning {autoTuneConfig?.source === 'saved' && <span style={{ color: green, fontSize: 10, marginLeft: 8 }}>ACTIVO</span>}
            </h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {autoTuneRunning && <span style={{ color: amber, fontSize: 11, fontWeight: 700 }}>⏳ Ejecutando...</span>}
              <span style={{ color: muted, fontSize: 14 }}>{autoTuneExpanded ? '▼' : '▶'}</span>
            </div>
          </div>

          {autoTuneExpanded && (
            <div>
              <p style={{ color: muted, fontSize: 11, marginBottom: 12, lineHeight: 1.5 }}>
                Re-optimiza los 10 parametros mas impactantes cada 24h usando walk-forward validation + safety guards.
                {autoTuneConfig?.config && Object.keys(autoTuneConfig.config).length > 0 && ' Config activa auto-tuneada.'}
                {autoTuneConfig?.approvalMode === 'telegram' ? ' 📱 Aprobacion por Telegram.' : ' 🧠 AI review habilitado.'}
              </p>

              {/* ─── PENDING APPROVAL BANNER ────────────────────────── */}
              {autoTunePending.length > 0 && autoTunePending.map(proposal => {
                const remaining = Math.max(0, proposal.remainingMs);
                const hoursLeft = Math.floor(remaining / 3600000);
                const minsLeft = Math.floor((remaining % 3600000) / 60000);
                const aiDecision = proposal.context?.aiReview?.decision;
                const aiReasoning = proposal.context?.aiReview?.reasoning;

                return (
                  <div key={proposal.runId} style={{
                    background: `${amber}15`, border: `1px solid ${amber}50`, borderRadius: 8,
                    padding: 14, marginBottom: 12
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: amber }}>
                        ⏳ PROPUESTA PENDIENTE DE APROBACION
                      </span>
                      <span style={{ fontSize: 10, color: muted }}>
                        Expira en {hoursLeft}h {minsLeft}m
                      </span>
                    </div>

                    <div style={{ fontSize: 11, color: text, marginBottom: 8 }}>
                      <span style={{ color: muted }}>Regimen:</span> {proposal.context?.marketRegime || 'unknown'}
                      {aiDecision && <> | <span style={{ color: muted }}>AI:</span> <span style={{
                        color: aiDecision === 'APPLY' ? green : aiDecision === 'BLEND' ? amber : red
                      }}>{aiDecision}</span></>}
                    </div>

                    {/* Proposed changes table */}
                    <div style={{ background: bg2, borderRadius: 6, padding: 8, marginBottom: 8 }}>
                      {proposal.accepted?.map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0',
                          borderBottom: i < proposal.accepted.length - 1 ? `1px solid ${border}` : 'none' }}>
                          <span style={{ fontFamily: 'monospace', color: text }}>{p.paramName}</span>
                          <span>
                            <span style={{ color: muted }}>{p.currentValue}</span>
                            <span style={{ color: muted }}> → </span>
                            <span style={{ color: green, fontWeight: 700 }}>{p.proposedValue}</span>
                            <span style={{ color: green, fontSize: 10, marginLeft: 4 }}>+{p.improvementPct}%</span>
                          </span>
                        </div>
                      ))}
                    </div>

                    {aiReasoning && (
                      <p style={{ fontSize: 10, color: muted, fontStyle: 'italic', marginBottom: 8, lineHeight: 1.4 }}>
                        {aiReasoning.substring(0, 200)}
                      </p>
                    )}

                    {/* Approval buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={async () => {
                        try {
                          await authFetch(`${apiUrl}/api/autotune/approve`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ runId: proposal.runId, decision: 'apply' })
                          });
                          loadAutoTuneData();
                        } catch (e) { console.error(e); }
                      }} style={{
                        flex: 1, padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: green, color: '#fff', fontWeight: 700, fontSize: 12
                      }}>✅ Aplicar</button>

                      <button onClick={async () => {
                        try {
                          await authFetch(`${apiUrl}/api/autotune/approve`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ runId: proposal.runId, decision: 'blend' })
                          });
                          loadAutoTuneData();
                        } catch (e) { console.error(e); }
                      }} style={{
                        flex: 1, padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: amber, color: '#000', fontWeight: 700, fontSize: 12
                      }}>🔀 Blend 50/50</button>

                      <button onClick={async () => {
                        try {
                          await authFetch(`${apiUrl}/api/autotune/approve`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ runId: proposal.runId, decision: 'reject' })
                          });
                          loadAutoTuneData();
                        } catch (e) { console.error(e); }
                      }} style={{
                        flex: 1, padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: red, color: '#fff', fontWeight: 700, fontSize: 12
                      }}>❌ Rechazar</button>
                    </div>
                  </div>
                );
              })}

              {/* Status Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 12 }}>
                {/* Config Source */}
                <div style={{ background: bg, padding: 12, borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>CONFIG FUENTE</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: autoTuneConfig?.source === 'saved' ? green : muted }}>
                    {autoTuneConfig?.source === 'saved' ? '🤖 Auto-Tuned' : '📦 Default'}
                  </div>
                </div>

                {/* Last Run */}
                <div style={{ background: bg, padding: 12, borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>ULTIMO RUN</div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>
                    {autoTuneHistory.length > 0
                      ? new Date(autoTuneHistory[0].started_at).toLocaleDateString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Nunca'}
                  </div>
                </div>

                {/* Last Result */}
                <div style={{ background: bg, padding: 12, borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>RESULTADO</div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>
                    {autoTuneHistory.length > 0
                      ? (() => {
                          const last = autoTuneHistory[0];
                          const applied = last.params_applied ? Object.keys(last.params_applied).length : 0;
                          if (last.status === 'failed') return <span style={{ color: red }}>❌ Error</span>;
                          if (last.status === 'pending_approval') return <span style={{ color: amber }}>⏳ Pendiente</span>;
                          if (last.status === 'rejected') return <span style={{ color: red }}>❌ Rechazado</span>;
                          if (last.status === 'reverted') return <span style={{ color: red }}>⚠️ Revertido</span>;
                          if (applied > 0) return <span style={{ color: green }}>✅ {applied} params</span>;
                          return <span style={{ color: muted }}>— Sin cambios</span>;
                        })()
                      : <span style={{ color: muted }}>—</span>}
                  </div>
                </div>

                {/* AI Review */}
                <div style={{ background: bg, padding: 12, borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>AI REVIEW</div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>
                    {autoTuneHistory.length > 0 && autoTuneHistory[0].ai_review
                      ? (() => {
                          const d = autoTuneHistory[0].ai_review.decision;
                          const clr = d === 'APPLY' ? green : d === 'BLEND' ? amber : red;
                          return <span style={{ color: clr }}>🧠 {d}</span>;
                        })()
                      : <span style={{ color: muted }}>N/A</span>}
                  </div>
                </div>

                {/* Approval Mode */}
                <div style={{ background: bg, padding: 12, borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: muted, marginBottom: 4 }}>APROBACION</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: autoTuneConfig?.approvalMode === 'telegram' ? purple : green }}>
                    {autoTuneConfig?.approvalMode === 'telegram' ? '📱 Telegram' : '⚡ Auto'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  onClick={async () => {
                    setAutoTuneRunning(true);
                    try {
                      await authFetch(`${apiUrl}/api/autotune/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ asset: 'bitcoin' }) });
                      // Poll for completion
                      const poll = setInterval(async () => {
                        try {
                          const r = await authFetch(`${apiUrl}/api/autotune/config`);
                          if (r.ok) {
                            const d = await r.json();
                            if (!d.isRunning) {
                              clearInterval(poll);
                              setAutoTuneRunning(false);
                              loadAutoTuneData();
                            }
                          }
                        } catch (_) {}
                      }, 15000);
                    } catch (e) { setAutoTuneRunning(false); console.error(e); }
                  }}
                  disabled={autoTuneRunning}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none',
                    background: autoTuneRunning ? bg : `linear-gradient(135deg, ${purple}, #7c3aed)`,
                    color: '#fff', cursor: autoTuneRunning ? 'wait' : 'pointer', flex: 1
                  }}>
                  {autoTuneRunning ? '⏳ Ejecutando Auto-Tune...' : '🚀 Ejecutar Ahora'}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('¿Resetear a parametros por defecto?')) return;
                    await authFetch(`${apiUrl}/api/autotune/reset`, { method: 'POST' });
                    loadAutoTuneData();
                  }}
                  disabled={autoTuneRunning || autoTuneConfig?.source !== 'saved'}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    border: `1px solid ${border}`, background: bg, color: muted, cursor: 'pointer'
                  }}>
                  🔄 Reset Defaults
                </button>
              </div>

              {/* Run History Table */}
              {autoTuneHistory.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>📋 Historial de Auto-Tune</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {autoTuneHistory.slice(0, 5).map((run, i) => {
                      const applied = run.params_applied ? Object.keys(run.params_applied) : [];
                      const aiDecision = run.ai_review?.decision;
                      const statusColor = run.status === 'completed' ? (applied.length > 0 ? green : muted) : run.status === 'failed' ? red : amber;
                      return (
                        <div key={run.id || i} style={{
                          padding: '10px 12px', background: bg, borderRadius: 6, fontSize: 11,
                          borderLeft: `3px solid ${statusColor}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span>
                              <span style={{ fontWeight: 700 }}>{run.trigger === 'manual' ? '🖐️' : '⏰'} {run.asset?.toUpperCase()}</span>
                              <span style={{ color: muted, marginLeft: 8 }}>{run.lookback_days}d · {run.market_regime || '?'}</span>
                            </span>
                            <span style={{ color: muted, fontSize: 9 }}>
                              {new Date(run.started_at).toLocaleDateString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {applied.length > 0 ? (
                              applied.map(p => (
                                <span key={p} style={{ background: `${green}20`, color: green, padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>
                                  {p}: {run.params_applied[p]}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: muted, fontSize: 10 }}>
                                {run.status === 'failed' ? `Error: ${run.error_message?.substring(0, 60)}` : 'Sin cambios aplicados'}
                              </span>
                            )}
                            {aiDecision && (
                              <span style={{
                                background: aiDecision === 'APPLY' ? `${green}20` : aiDecision === 'BLEND' ? `${amber}20` : `${red}20`,
                                color: aiDecision === 'APPLY' ? green : aiDecision === 'BLEND' ? amber : red,
                                padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700
                              }}>
                                🧠 {aiDecision}
                              </span>
                            )}
                          </div>
                          {run.ai_review?.reasoning && (
                            <div style={{ color: muted, fontSize: 9, marginTop: 4, fontStyle: 'italic', lineHeight: 1.4 }}>
                              {run.ai_review.reasoning.substring(0, 150)}{run.ai_review.reasoning.length > 150 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {autoTuneHistory.length === 0 && (
                <div style={{ textAlign: 'center', padding: 16, color: muted, fontSize: 11 }}>
                  🤖 Auto-tune se ejecuta diariamente a las 3:00 AM o manualmente. Primer run generara historial.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
}

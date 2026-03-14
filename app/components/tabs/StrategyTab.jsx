'use client';
import { colors, card, sTitle } from '../../lib/theme';
import BacktestTab from './BacktestTab';
import OptimizeTab from './OptimizeTab';

const { bg, bg2, bg3, border, text, muted, green, red, amber, purple } = colors;

export default function StrategyTab({
  strategySubTab, setStrategySubTab,
  bt, opt,
  paperConfig, setPaperConfig,
  paperConfigForm, setPaperConfigForm,
  paperSavingConfig, setPaperSavingConfig,
  paperShowConfig, setPaperShowConfig,
  paperConfirmReset, setPaperConfirmReset,
  fetchDashboardPaper,
  showAdvancedPerf, setShowAdvancedPerf,
  advancedPerfDays, setAdvancedPerfDays,
  advancedPerf,
  authFetch, apiUrl, userId,
}) {
    const subTab = strategySubTab;
    const setSubTab = setStrategySubTab;

    const STRATEGY_SUB_TABS = [
      { k: 'config', label: '\⚙ Configuraci\ón', desc: 'Par\ámetros de trading' },
      { k: 'backtest', label: '\u{1F52C} Backtest', desc: 'Validar estrategia' },
      { k: 'optimize', label: '\⚡ Optimizar', desc: 'Ajustar par\ámetros' }
    ];

    return (
      <div style={{ fontFamily: 'monospace' }}>
        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {STRATEGY_SUB_TABS.map(({ k, label, desc }) => (
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

        {/* Config sub-tab */}
        {subTab === 'config' && <StrategyConfigContent
          paperConfig={paperConfig} setPaperConfig={setPaperConfig}
          paperConfigForm={paperConfigForm} setPaperConfigForm={setPaperConfigForm}
          paperSavingConfig={paperSavingConfig} setPaperSavingConfig={setPaperSavingConfig}
          paperShowConfig={paperShowConfig} setPaperShowConfig={setPaperShowConfig}
          paperConfirmReset={paperConfirmReset} setPaperConfirmReset={setPaperConfirmReset}
          fetchDashboardPaper={fetchDashboardPaper}
          showAdvancedPerf={showAdvancedPerf} setShowAdvancedPerf={setShowAdvancedPerf}
          advancedPerfDays={advancedPerfDays} setAdvancedPerfDays={setAdvancedPerfDays}
          advancedPerf={advancedPerf}
          opt={opt}
          authFetch={authFetch} apiUrl={apiUrl} userId={userId}
        />}

        {/* Backtest sub-tab */}
        {subTab === 'backtest' && <BacktestTab {...bt} apiUrl={apiUrl} userId={userId} paperConfigForm={paperConfigForm} />}

        {/* Optimize sub-tab */}
        {subTab === 'optimize' && <OptimizeTab {...opt} apiUrl={apiUrl} onVerifyWithBacktest={({ asset, days, paramKey, bestValue }) => {
          bt.setConfig(prev => ({ ...prev, asset, days }));
          bt.setStrategyOverrides(prev => ({ ...prev, [paramKey]: bestValue }));
          setStrategySubTab('backtest');
        }} />}
      </div>
    );
}

function StrategyConfigContent({
  paperConfig, setPaperConfig,
  paperConfigForm, setPaperConfigForm,
  paperSavingConfig, setPaperSavingConfig,
  paperShowConfig, setPaperShowConfig,
  paperConfirmReset, setPaperConfirmReset,
  fetchDashboardPaper,
  showAdvancedPerf, setShowAdvancedPerf,
  advancedPerfDays, setAdvancedPerfDays,
  advancedPerf,
  opt,
  authFetch, apiUrl, userId,
}) {
    const configForm = paperConfigForm, setConfigForm = setPaperConfigForm;
    const savingConfig = paperSavingConfig, setSavingConfig = setPaperSavingConfig;

    const inputStyle = {
      width: '100%', padding: '8px 12px', background: bg3,
      border: `1px solid ${border}`, borderRadius: 6,
      color: text, fontFamily: 'monospace', fontSize: 12
    };

    const handleSaveStrategy = async () => {
      if (!configForm) return;
      setSavingConfig(true);
      try {
        const res = await authFetch(`${apiUrl}/api/paper/config/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            risk_per_trade: parseFloat(configForm.risk_per_trade),
            max_daily_loss_percent: parseFloat(configForm.max_daily_loss_percent),
            max_position_percent: parseFloat(configForm.max_position_percent),
            max_open_positions: parseInt(configForm.max_open_positions),
            cooldown_minutes: parseInt(configForm.cooldown_minutes),
            max_holding_hours: parseInt(configForm.max_holding_hours),
            partial_close_ratio: parseFloat(configForm.partial_close_ratio),
            move_sl_to_breakeven_after_tp1: configForm.move_sl_to_breakeven_after_tp1,
            atr_stop_mult: parseFloat(configForm.atr_stop_mult),
            atr_tp2_mult: parseFloat(configForm.atr_tp2_mult),
            atr_trailing_mult: parseFloat(configForm.atr_trailing_mult),
            atr_trailing_activation: parseFloat(configForm.atr_trailing_activation),
            min_confluence: parseInt(configForm.min_confluence),
            min_rr_ratio: parseFloat(configForm.min_rr_ratio),
            allowed_strength: configForm.allowed_strength,
            max_portfolio_correlation: parseFloat(configForm.max_portfolio_correlation),
            max_sector_exposure_pct: parseFloat(configForm.max_sector_exposure_pct),
            max_same_direction_crypto: parseInt(configForm.max_same_direction_crypto)
          })
        });
        if (res.ok) {
          const d = await res.json();
          setPaperConfig(d.config);
          setConfigForm(d.config);
        }
      } catch (err) {
        console.error('Save strategy error:', err);
      } finally {
        setSavingConfig(false);
      }
    };

    if (!configForm) return (
      <div style={{ ...card, padding: 20, textAlign: "center" }}>
        <div style={{ color: muted, fontSize: 12 }}>Cargando configuraci\ón...</div>
      </div>
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={sTitle}>{'\⚙'} ESTRATEGIA DE TRADING</div>
          <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>
            Par\ámetros que definen tu estrategia. Aplican tanto a Paper Trading como a trading real.
          </div>
        </div>

        {/* GESTI\ÓN DE RIESGO */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={sTitle}>{'\u{1F4B0}'} GESTI\ÓN DE RIESGO</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Riesgo por Trade (%)</label>
              <input type="number" step="0.5" min="0.1" max="10" value={(configForm.risk_per_trade || 0.01) * 100}
                onChange={e => setConfigForm(prev => ({ ...prev, risk_per_trade: parseFloat(e.target.value) / 100 }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>% del capital arriesgado por operaci\ón</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>P\érdida Diaria M\áx (%)</label>
              <input type="number" step="1" min="1" max="20" value={(configForm.max_daily_loss_percent || 0.05) * 100}
                onChange={e => setConfigForm(prev => ({ ...prev, max_daily_loss_percent: parseFloat(e.target.value) / 100 }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Detiene trading al alcanzar esta p\érdida diaria</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>M\áx Posici\ón (%)</label>
              <input type="number" step="5" min="5" max="50" value={(configForm.max_position_percent || 0.30) * 100}
                onChange={e => setConfigForm(prev => ({ ...prev, max_position_percent: parseFloat(e.target.value) / 100 }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>M\áx % del capital por posici\ón</div>
            </div>
          </div>
        </div>

        {/* POSICIONES */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={sTitle}>{'\u{1F4CA}'} GESTI\ÓN DE POSICIONES</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>M\áx Posiciones Abiertas</label>
              <input type="number" min="1" max="10" value={configForm.max_open_positions || 3}
                onChange={e => setConfigForm(prev => ({ ...prev, max_open_positions: e.target.value }))}
                style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Cooldown entre Trades (min)</label>
              <input type="number" min="5" max="1440" value={configForm.cooldown_minutes || 30}
                onChange={e => setConfigForm(prev => ({ ...prev, cooldown_minutes: e.target.value }))}
                style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>M\áx Holding (horas)</label>
              <input type="number" min="0" max="720" value={configForm.max_holding_hours || 168}
                onChange={e => setConfigForm(prev => ({ ...prev, max_holding_hours: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>0 = sin l\ímite</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Cierre Parcial en TP1 (%)</label>
              <input type="number" step="5" min="25" max="75" value={(configForm.partial_close_ratio || 0.5) * 100}
                onChange={e => setConfigForm(prev => ({ ...prev, partial_close_ratio: parseFloat(e.target.value) / 100 }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>% de posici\ón cerrada al TP1</div>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 10, color: muted, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={configForm.move_sl_to_breakeven_after_tp1 !== false}
                onChange={e => setConfigForm(prev => ({ ...prev, move_sl_to_breakeven_after_tp1: e.target.checked }))} />
              Mover SL a breakeven despu\és de TP1
            </label>
          </div>
        </div>

        {/* STOP LOSS & TAKE PROFIT (ATR) */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={sTitle}>{'\u{1F3AF}'} STOP LOSS & TAKE PROFIT (ATR)</div>
          <div style={{ fontSize: 9, color: muted, marginTop: 4, marginBottom: 12, lineHeight: 1.5 }}>
            Multiplicadores del ATR (Average True Range). Mayor valor = m\ás espacio para volatilidad. Crypto recomendado: SL \≥ 2.0, Trailing Activation \≥ 2.0
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Stop Loss (\× ATR)</label>
              <input type="number" step="0.1" min="0.5" max="5.0" value={configForm.atr_stop_mult || 2.5}
                onChange={e => setConfigForm(prev => ({ ...prev, atr_stop_mult: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Distancia SL desde soporte. Recomendado: 2.5</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Take Profit 2 (\× ATR)</label>
              <input type="number" step="0.1" min="0.5" max="5.0" value={configForm.atr_tp2_mult || 2.0}
                onChange={e => setConfigForm(prev => ({ ...prev, atr_tp2_mult: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Distancia TP2 desde resistencia</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Trailing Stop (\× ATR)</label>
              <input type="number" step="0.1" min="0.5" max="5.0" value={configForm.atr_trailing_mult || 2.5}
                onChange={e => setConfigForm(prev => ({ ...prev, atr_trailing_mult: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Distancia del trailing stop</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Trailing Activaci\ón (\× ATR)</label>
              <input type="number" step="0.1" min="0.5" max="5.0" value={configForm.atr_trailing_activation || 2.0}
                onChange={e => setConfigForm(prev => ({ ...prev, atr_trailing_activation: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Profit m\ínimo para activar trailing. Recomendado: 2.0</div>
            </div>
          </div>
        </div>

        {/* FILTROS DE SE\ÑALES */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={sTitle}>{'\u{1F4E1}'} FILTROS DE SE\ÑALES</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Confluencia M\ínima</label>
              <input type="number" min="1" max="5" value={configForm.min_confluence || 3}
                onChange={e => setConfigForm(prev => ({ ...prev, min_confluence: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Timeframes alineados requeridos (2-5)</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>R:R M\ínimo</label>
              <input type="number" step="0.1" min="0.5" max="5.0" value={configForm.min_rr_ratio || 1.5}
                onChange={e => setConfigForm(prev => ({ ...prev, min_rr_ratio: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Risk:Reward m\ínimo aceptable</div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 10, color: muted, marginBottom: 6, display: "block", fontWeight: 700 }}>SE\ÑALES ACEPTADAS</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {['STRONG BUY', 'BUY', 'WEAK BUY', 'STRONG SELL', 'SELL', 'WEAK SELL'].map(str => {
                const isActive = (configForm.allowed_strength || []).includes(str);
                const isBuy = str.includes('BUY');
                const clr = isBuy ? green : red;
                return (
                  <button key={str} onClick={() => {
                    setConfigForm(prev => {
                      const current = prev.allowed_strength || [];
                      return { ...prev, allowed_strength: isActive ? current.filter(s => s !== str) : [...current, str] };
                    });
                  }} style={{
                    padding: "4px 10px", borderRadius: 4, fontSize: 10, fontFamily: "monospace", fontWeight: 700,
                    cursor: "pointer", border: `1px solid ${isActive ? clr : border}`,
                    background: isActive ? `${clr}22` : "transparent",
                    color: isActive ? clr : muted
                  }}>{str}</button>
                );
              })}
            </div>
            <div style={{ fontSize: 9, color: muted, marginTop: 4 }}>
              Solo STRONG = conservador \· Incluir BUY/SELL = recomendado \· WEAK = agresivo
            </div>
          </div>
        </div>

        {/* L\ÍMITES DE PORTFOLIO */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={sTitle}>{'\u{1F6E1}'} L\ÍMITES DE PORTFOLIO</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Correlaci\ón M\áx Portfolio</label>
              <input type="number" step="0.05" min="0.3" max="1.0" value={configForm.max_portfolio_correlation || 0.70}
                onChange={e => setConfigForm(prev => ({ ...prev, max_portfolio_correlation: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>Bloquea trades si correlaci\ón promedio excede</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Exposici\ón Sector M\áx (%)</label>
              <input type="number" step="5" min="30" max="100" value={(configForm.max_sector_exposure_pct || 0.60) * 100}
                onChange={e => setConfigForm(prev => ({ ...prev, max_sector_exposure_pct: parseFloat(e.target.value) / 100 }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>M\áx % capital en mismo sector</div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>M\áx Misma Direcci\ón Crypto</label>
              <input type="number" min="1" max="10" value={configForm.max_same_direction_crypto || 3}
                onChange={e => setConfigForm(prev => ({ ...prev, max_same_direction_crypto: e.target.value }))}
                style={inputStyle} />
              <div style={{ fontSize: 8, color: muted, marginTop: 2 }}>M\áx posiciones LONG o SHORT simult\áneas</div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <button onClick={handleSaveStrategy} disabled={savingConfig}
            style={{
              padding: "10px 28px", background: `linear-gradient(135deg, ${purple}, #7c3aed)`,
              border: "none", borderRadius: 6, color: "#fff",
              fontFamily: "monospace", fontSize: 13, fontWeight: 700, cursor: "pointer",
              opacity: savingConfig ? 0.6 : 1, width: "100%"
            }}>
            {savingConfig ? 'Guardando...' : '\u{1F4BE} GUARDAR ESTRATEGIA'}
          </button>
        </div>

        {/* Paper Account Settings */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            onClick={() => setPaperShowConfig(!paperShowConfig)}>
            <div style={sTitle}>{'\u{1F4B0}'} CUENTA PAPER</div>
            <span style={{ color: muted, fontSize: 12 }}>{paperShowConfig ? '\▲' : '\▼'}</span>
          </div>

          {paperShowConfig && paperConfigForm && (() => {
            const innerInputStyle = {
              width: '100%', padding: '8px 12px', background: bg3,
              border: `1px solid ${border}`, borderRadius: 6,
              color: text, fontFamily: 'monospace', fontSize: 12
            };
            const handleSaveConfig = async () => {
              setPaperSavingConfig(true);
              try {
                const res = await authFetch(`${apiUrl}/api/paper/config/${userId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    is_enabled: paperConfigForm.is_enabled,
                    initial_capital: parseFloat(paperConfigForm.initial_capital)
                  })
                });
                if (res.ok) {
                  const d = await res.json();
                  setPaperConfig(d.config);
                  setPaperConfigForm(d.config);
                }
              } catch (err) {
                console.error('Save config error:', err);
              } finally {
                setPaperSavingConfig(false);
              }
            };
            const handleReset = async () => {
              try {
                const res = await authFetch(`${apiUrl}/api/paper/reset/${userId}`, { method: 'POST' });
                if (res.ok) {
                  setPaperConfirmReset(false);
                  await fetchDashboardPaper();
                }
              } catch (err) {
                console.error('Reset error:', err);
              }
            };
            return (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Capital Inicial ($)</label>
                    <input type="number" value={paperConfigForm.initial_capital || 10000}
                      onChange={e => setPaperConfigForm(prev => ({ ...prev, initial_capital: e.target.value }))}
                      style={innerInputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: muted, marginBottom: 4, display: "block" }}>Trading Habilitado</label>
                    <label style={{ fontSize: 10, color: muted, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginTop: 4 }}>
                      <input type="checkbox" checked={paperConfigForm.is_enabled !== false}
                        onChange={e => setPaperConfigForm(prev => ({ ...prev, is_enabled: e.target.checked }))} />
                      {paperConfigForm.is_enabled !== false ? 'Activo' : 'Pausado'}
                    </label>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                  <button onClick={handleSaveConfig} disabled={paperSavingConfig}
                    style={{
                      padding: "8px 20px", background: `linear-gradient(135deg, ${purple}, #7c3aed)`,
                      border: "none", borderRadius: 6, color: "#fff",
                      fontFamily: "monospace", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      opacity: paperSavingConfig ? 0.6 : 1
                    }}>
                    {paperSavingConfig ? 'Guardando...' : '\u{1F4BE} GUARDAR'}
                  </button>
                  {!paperConfirmReset ? (
                    <button onClick={() => setPaperConfirmReset(true)}
                      style={{
                        padding: "8px 20px", background: "rgba(239,68,68,0.1)",
                        border: `1px solid ${red}`, borderRadius: 6,
                        color: red, fontFamily: "monospace", fontSize: 12, fontWeight: 700, cursor: "pointer"
                      }}>
                      {'\u{1F504}'} RESET CUENTA
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: red }}>\¿Seguro? Cierra todos los trades y resetea capital.</span>
                      <button onClick={handleReset} style={{
                        padding: "6px 14px", background: red, border: "none", borderRadius: 4,
                        color: "#fff", fontFamily: "monospace", fontSize: 11, fontWeight: 700, cursor: "pointer"
                      }}>S\Í</button>
                      <button onClick={() => setPaperConfirmReset(false)} style={{
                        padding: "6px 14px", background: bg3, border: `1px solid ${border}`, borderRadius: 4,
                        color: muted, fontFamily: "monospace", fontSize: 11, cursor: "pointer"
                      }}>NO</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Signal Generation Parameters */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div
            onClick={() => opt.setShowSignalParams(!opt.showSignalParams)}
            style={{ ...sTitle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: opt.showSignalParams ? 12 : 0 }}
          >
            <span>
              {'\u{1F9E0}'} PARAMETROS DE GENERACION DE SENALES
              {opt.autoTuneConfig?.source === 'saved' && (
                <span style={{ color: green, fontSize: 9, marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>AUTO-TUNED</span>
              )}
            </span>
            <span style={{ fontSize: 12 }}>{opt.showSignalParams ? '\▼' : '\▶'}</span>
          </div>
          {opt.showSignalParams && (
            <div>
              <div style={{ fontSize: 10, color: muted, marginBottom: 12 }}>
                Estos parametros controlan la generacion de senales. Se modifican desde el tab Optimizar o Auto-Tune.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                {opt.optParams.map(p => {
                  const currentVal = opt.autoTuneConfig?.config?.[p.key] ?? p.defaultValue;
                  const isModified = currentVal !== p.defaultValue;
                  return (
                    <div key={p.key} style={{
                      background: bg3, borderRadius: 6, padding: '8px 10px',
                      border: isModified ? `1px solid ${green}30` : `1px solid ${border}`
                    }}>
                      <div style={{ fontSize: 9, color: muted, marginBottom: 2 }}>{p.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: isModified ? green : text }}>
                        {currentVal}
                        {isModified && (
                          <span style={{ fontSize: 9, color: muted, marginLeft: 4, fontWeight: 400 }}>(def: {p.defaultValue})</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {opt.optParams.length === 0 && (
                <div style={{ fontSize: 11, color: muted, textAlign: 'center', padding: 20 }}>
                  Cargando parametros...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
}

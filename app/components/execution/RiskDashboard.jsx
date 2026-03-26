'use client';
import { useState, useEffect } from 'react';

function GaugeBar({ value, max, label, color, bgColor, muted, text }) {
  const pct = max > 0 ? Math.min((Math.abs(value) / max) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: muted, fontSize: 11 }}>{label}</span>
        <span style={{ color: text, fontSize: 11, fontWeight: 600 }}>
          {value.toFixed(1)}% / {max.toFixed(1)}%
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: bgColor, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 3,
          background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : color,
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, subValue, color, bg, border, muted }) {
  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 8,
      padding: 12,
      textAlign: 'center'
    }}>
      <div style={{ color: muted, fontSize: 10, marginBottom: 4 }}>{label}</div>
      <div style={{ color: color || '#f9fafb', fontSize: 18, fontWeight: 700 }}>{value}</div>
      {subValue && <div style={{ color: muted, fontSize: 10, marginTop: 2 }}>{subValue}</div>}
    </div>
  );
}

export default function RiskDashboard({ dashboard, colors, apiUrl, authFetch, userId }) {
  const bg = colors?.bg3 || '#1a1a1a';
  const bg2 = colors?.bg2 || '#111111';
  const border = colors?.border || 'rgba(255,255,255,0.08)';
  const text = colors?.text || '#f9fafb';
  const muted = colors?.muted || '#6b7280';
  const green = colors?.green || '#00d4aa';
  const red = colors?.red || '#ef4444';
  const accent = colors?.accent || '#a855f7';
  const amber = '#f59e0b';
  const bgBar = 'rgba(255,255,255,0.06)';

  // Portfolio VaR
  const [varData, setVarData] = useState(null);
  const [varLoading, setVarLoading] = useState(false);
  useEffect(() => {
    if (!apiUrl || !authFetch || !userId) return;
    const fetchVaR = async () => {
      setVarLoading(true);
      try {
        const res = await authFetch(`${apiUrl}/api/risk/${userId}/var`);
        if (res.ok) setVarData(await res.json());
      } catch (_) {}
      setVarLoading(false);
    };
    fetchVaR();
    const iv = setInterval(fetchVaR, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [apiUrl, userId]);

  if (!dashboard) {
    return (
      <div style={{ color: muted, fontSize: 13, textAlign: 'center', padding: 24 }}>
        Cargando datos de riesgo...
      </div>
    );
  }

  if (dashboard.error) {
    return (
      <div style={{ color: red, fontSize: 13, textAlign: 'center', padding: 24 }}>
        Error: {dashboard.error}
      </div>
    );
  }

  const capitalColor = dashboard.capitalChange >= 0 ? green : red;
  const capitalPct = dashboard.capitalChangePct || 0;
  const drawdown = dashboard.drawdown || {};
  const dailyPnl = dashboard.dailyPnl || {};

  return (
    <div>
      {/* Capital summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <div style={{
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 8,
          padding: 12,
          textAlign: 'center'
        }}>
          <div style={{ color: muted, fontSize: 10, marginBottom: 4 }}>Capital Actual</div>
          <div style={{ color: capitalColor, fontSize: 18, fontWeight: 700 }}>
            ${(dashboard.currentCapital || 0).toLocaleString()}
          </div>
          <div style={{ color: muted, fontSize: 10, marginTop: 2 }}>
            {capitalPct >= 0 ? '+' : ''}{capitalPct.toFixed(2)}%
          </div>
          {dashboard.allocatedCapital != null && (
            <div style={{ marginTop: 6, borderTop: `1px solid ${border}`, paddingTop: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 2 }}>
                <span style={{ color: muted }}>Asignado</span>
                <span style={{ color: amber, fontWeight: 600 }}>${(dashboard.allocatedCapital || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                <span style={{ color: muted }}>Disponible</span>
                <span style={{ color: (dashboard.availableCapital || 0) > 0 ? green : red, fontWeight: 600 }}>
                  ${(dashboard.availableCapital || 0).toLocaleString()}
                </span>
              </div>
              {/* Mini bar: allocated portion */}
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginTop: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${dashboard.currentCapital > 0 ? Math.min(100, (dashboard.allocatedCapital / dashboard.currentCapital) * 100) : 0}%`,
                  borderRadius: 2,
                  background: amber,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
        </div>
        <StatCard
          label="P&L Diario"
          value={`$${(dailyPnl.amount || 0).toFixed(2)}`}
          subValue={`Limite: $${(dailyPnl.limit || 0).toFixed(2)}`}
          color={dailyPnl.amount >= 0 ? green : red}
          bg={bg} border={border} muted={muted}
        />
        <StatCard
          label="Drawdown"
          value={`${((drawdown.current || 0) * 100).toFixed(1)}%`}
          subValue={`Peak: $${(drawdown.peakEquity || 0).toLocaleString()}`}
          color={drawdown.triggered ? red : green}
          bg={bg} border={border} muted={muted}
        />
        <StatCard
          label="Ordenes Pendientes"
          value={dashboard.pendingOrders || 0}
          subValue={`Max pos: ${dashboard.maxOpenPositions || '-'}`}
          color={accent}
          bg={bg} border={border} muted={muted}
        />
      </div>

      {/* Gauges */}
      <div style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16
      }}>
        <div style={{ color: text, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          Indicadores de Riesgo
        </div>

        <GaugeBar
          label="Drawdown vs Limite"
          value={(drawdown.current || 0) * 100}
          max={(drawdown.threshold || 0.15) * 100}
          color={green}
          bgColor={bgBar}
          muted={muted}
          text={text}
        />

        <GaugeBar
          label="Perdida Diaria vs Limite"
          value={dailyPnl.usagePct || 0}
          max={100}
          color="#3b82f6"
          bgColor={bgBar}
          muted={muted}
          text={text}
        />

        <GaugeBar
          label="Riesgo por Trade"
          value={(dashboard.riskPerTrade || 0.01) * 100}
          max={(dashboard.maxPositionPercent || 0.30) * 100}
          color={accent}
          bgColor={bgBar}
          muted={muted}
          text={text}
        />
      </div>

      {/* Configuration summary */}
      <div style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: 16
      }}>
        <div style={{ color: text, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          Configuracion Activa
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
          {[
            ['Modo', dashboard.executionMode === 'paper' ? '📄 Paper' : '🔴 Live'],
            ['Auto-ejecutar', dashboard.autoExecute ? '✅ Si' : '❌ No'],
            ['Max Drawdown', `${((drawdown.threshold || 0.15) * 100).toFixed(0)}%`],
            ['Max Perdida Diaria', `${(dailyPnl.limitPct || 5).toFixed(0)}%`],
            ['Max Posicion', `${((dashboard.maxPositionPercent || 0.30) * 100).toFixed(0)}%`],
            ['Max Posiciones', dashboard.maxOpenPositions || 3],
            ['Riesgo/Trade', `${((dashboard.riskPerTrade || 0.01) * 100).toFixed(1)}%`],
            ['Kill Switch', dashboard.killSwitch?.active ? '🔴 Activo' : '🟢 Inactivo']
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${border}` }}>
              <span style={{ color: muted }}>{label}</span>
              <span style={{ color: text, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Liquidation Proximity (perpetuals) */}
      {dashboard.positions && dashboard.positions.some(p => p.liquidationPrice) && (
        <div style={{
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 8,
          padding: 16,
          marginTop: 16
        }}>
          <div style={{ color: text, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            Liquidacion (Perpetuales)
          </div>
          {dashboard.positions.filter(p => p.liquidationPrice).map((pos, i) => {
            const liqPrice = parseFloat(pos.liquidationPrice);
            const currentPrice = parseFloat(pos.currentPrice || pos.markPrice || 0);
            const distancePct = currentPrice > 0
              ? Math.abs((currentPrice - liqPrice) / currentPrice) * 100
              : 0;
            const isClose = distancePct < 10;
            const isCritical = distancePct < 5;
            const barColor = isCritical ? red : isClose ? '#f59e0b' : green;

            return (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: text, fontSize: 12, fontWeight: 600 }}>
                    {pos.asset || pos.symbol} ({pos.leverage || '?'}x)
                  </span>
                  <span style={{ color: barColor, fontSize: 12, fontWeight: 700 }}>
                    {distancePct.toFixed(1)}% de liq
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: muted, fontSize: 10 }}>
                    Actual: ${currentPrice.toLocaleString()}
                  </span>
                  <span style={{ color: isCritical ? red : muted, fontSize: 10, fontWeight: isCritical ? 700 : 400 }}>
                    Liq: ${liqPrice.toLocaleString()}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, Math.max(5, 100 - distancePct * 2))}%`,
                    borderRadius: 3,
                    background: barColor,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                {isCritical && (
                  <div style={{ color: red, fontSize: 10, fontWeight: 700, marginTop: 4 }}>
                    PELIGRO: Posicion cerca de liquidacion
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Portfolio Value at Risk */}
      {varData && varData.portfolioValue > 0 && (
        <div style={{
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 8,
          padding: 16,
          marginTop: 16
        }}>
          <div style={{ color: text, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            Value at Risk (VaR)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
            <StatCard
              label="VaR 95%"
              value={`$${Math.abs(varData.var95 || 0).toFixed(2)}`}
              subValue={`${(Math.abs(varData.varPct || 0) * 100).toFixed(2)}% del portfolio`}
              color={amber}
              bg={bg} border={border} muted={muted}
            />
            <StatCard
              label="VaR 99%"
              value={`$${Math.abs(varData.var99 || 0).toFixed(2)}`}
              subValue="Escenario extremo"
              color={red}
              bg={bg} border={border} muted={muted}
            />
            <StatCard
              label="CVaR 95%"
              value={`$${Math.abs(varData.cvar95 || 0).toFixed(2)}`}
              subValue="Perdida esperada en cola"
              color={red}
              bg={bg} border={border} muted={muted}
            />
            <StatCard
              label="Peor Dia"
              value={`${((varData.worstDayPct || 0) * 100).toFixed(2)}%`}
              subValue={`Portfolio: $${(varData.portfolioValue || 0).toLocaleString()}`}
              color={red}
              bg={bg} border={border} muted={muted}
            />
          </div>

          {/* Per-position VaR contributions */}
          {Array.isArray(varData.contributions) && varData.contributions.length > 0 && (
            <div>
              <div style={{ color: muted, fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
                Contribucion por Posicion
              </div>
              {varData.contributions.map((c, i) => {
                const pct = varData.portfolioValue > 0 ? (Math.abs(c.var95 || 0) / varData.portfolioValue) * 100 : 0;
                return (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: i < varData.contributions.length - 1 ? `1px solid ${border}` : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: text, fontSize: 12, fontWeight: 600 }}>{c.asset}</span>
                      <span style={{
                        fontSize: 9, padding: '1px 5px', borderRadius: 3,
                        background: c.direction === 'LONG' ? `${green}20` : `${red}20`,
                        color: c.direction === 'LONG' ? green : red,
                        fontWeight: 700
                      }}>
                        {c.direction}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: muted, fontSize: 9 }}>VaR 95%</div>
                        <div style={{ color: amber, fontSize: 11, fontWeight: 600 }}>
                          ${Math.abs(c.var95 || 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={{ width: 60 }}>
                        <div style={{ height: 4, borderRadius: 2, background: bgBar, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, pct * 10)}%`,
                            borderRadius: 2,
                            background: pct > 5 ? red : pct > 2 ? amber : accent
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {varLoading && !varData && (
        <div style={{ color: muted, fontSize: 11, textAlign: 'center', padding: 12, marginTop: 16 }}>
          Calculando Value at Risk...
        </div>
      )}

      {/* Funding Rate & Carry Cost (perpetuals) */}
      {dashboard.positions && dashboard.positions.some(p => p.fundingRate != null) && (
        <div style={{
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 8,
          padding: 16,
          marginTop: 16
        }}>
          <div style={{ color: text, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            Funding Rate & Carry Cost
          </div>
          {dashboard.positions.filter(p => p.fundingRate != null).map((pos, i) => {
            const rate = parseFloat(pos.fundingRate || 0);
            const annualized = parseFloat(pos.annualizedCost || rate * 3 * 365 * 100);
            const dailyCost = parseFloat(pos.carryCost?.dailyCost || 0);
            const isExpensive = Math.abs(rate) > 0.001;
            const rateColor = isExpensive ? red : Math.abs(rate) > 0.0005 ? '#f59e0b' : green;

            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0',
                borderBottom: i < dashboard.positions.filter(p => p.fundingRate != null).length - 1 ? `1px solid ${border}` : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: text, fontSize: 12, fontWeight: 600 }}>
                    {pos.asset || pos.symbol}
                  </span>
                  {isExpensive && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                      background: `${red}20`, color: red
                    }}>
                      ALTO
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 11 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: muted, fontSize: 9 }}>Rate/8h</div>
                    <div style={{ color: rateColor, fontWeight: 700 }}>
                      {(rate * 100).toFixed(4)}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: muted, fontSize: 9 }}>Anualizado</div>
                    <div style={{ color: rateColor, fontWeight: 600 }}>
                      {annualized.toFixed(1)}%
                    </div>
                  </div>
                  {dailyCost !== 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: muted, fontSize: 9 }}>Costo/dia</div>
                      <div style={{ color: dailyCost > 0 ? red : green, fontWeight: 600 }}>
                        ${Math.abs(dailyCost).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

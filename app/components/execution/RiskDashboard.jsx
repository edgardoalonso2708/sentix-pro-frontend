'use client';

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

export default function RiskDashboard({ dashboard, colors }) {
  const bg = colors?.bg3 || '#1a1a1a';
  const bg2 = colors?.bg2 || '#111111';
  const border = colors?.border || 'rgba(255,255,255,0.08)';
  const text = colors?.text || '#f9fafb';
  const muted = colors?.muted || '#6b7280';
  const green = colors?.green || '#00d4aa';
  const red = colors?.red || '#ef4444';
  const accent = colors?.accent || '#a855f7';
  const bgBar = 'rgba(255,255,255,0.06)';

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
        <StatCard
          label="Capital Actual"
          value={`$${(dashboard.currentCapital || 0).toLocaleString()}`}
          subValue={`${capitalPct >= 0 ? '+' : ''}${capitalPct.toFixed(2)}%`}
          color={capitalColor}
          bg={bg} border={border} muted={muted}
        />
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
    </div>
  );
}

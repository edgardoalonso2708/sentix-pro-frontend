'use client';

const HEAT_COLORS = {
  cool: '#3b82f6',
  warm: '#f59e0b',
  hot: '#ef4444'
};

const HEAT_LABELS = {
  cool: 'Normal',
  warm: 'Atencion',
  hot: 'Critico'
};

function formatPnl(value) {
  const n = parseFloat(value || 0);
  const sign = n >= 0 ? '+' : '';
  return `${sign}$${n.toFixed(2)}`;
}

function formatPct(value) {
  const n = parseFloat(value || 0);
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function PositionCard({ position, colors }) {
  const bg = colors?.bg3 || '#1a1a1a';
  const border = colors?.border || 'rgba(255,255,255,0.08)';
  const text = colors?.text || '#f9fafb';
  const muted = colors?.muted || '#6b7280';
  const green = colors?.green || '#00d4aa';
  const red = colors?.red || '#ef4444';

  const pnl = parseFloat(position.unrealized_pnl || 0);
  const pnlPct = parseFloat(position.pnl_percent || 0);
  const pnlColor = pnl >= 0 ? green : red;
  const heat = position.heat_level || 'cool';
  const heatColor = HEAT_COLORS[heat] || HEAT_COLORS.cool;

  const side = position.action || position.side || 'BUY';
  const sideColor = side === 'BUY' ? green : red;
  const isUntracked = position.source === 'bybit-untracked';

  const sourceBadge = position.source === 'paper' ? { label: 'PAPER', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' }
    : position.source === 'bybit-tracked' ? { label: 'BYBIT', color: '#f59e0b', bg: 'rgba(255,168,0,0.15)' }
    : position.source === 'bybit-untracked' ? { label: 'HOLDING', color: muted, bg: 'rgba(128,128,128,0.15)' }
    : null;

  const trailingActive = position.trailing_stop_pct && parseFloat(position.trailing_stop_pct) > 0;
  const hasSL = position.stop_loss && parseFloat(position.stop_loss) > 0;
  const hasTP = (position.take_profit_1 && parseFloat(position.take_profit_1) > 0) ||
                (position.take_profit && parseFloat(position.take_profit) > 0);

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 8,
      padding: 16,
      borderLeft: `3px solid ${isUntracked ? muted : heatColor}`,
      opacity: isUntracked ? 0.6 : 1
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>
            {position.asset?.charAt(0).toUpperCase() + position.asset?.slice(1)}
          </span>
          <span style={{
            color: sideColor,
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 3,
            background: `${sideColor}15`
          }}>
            {side}
          </span>
          {!isUntracked && (
            <span style={{
              color: heatColor,
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 3,
              background: `${heatColor}15`
            }}>
              {HEAT_LABELS[heat]}
            </span>
          )}
          {sourceBadge && (
            <span style={{
              color: sourceBadge.color,
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 3,
              background: sourceBadge.bg
            }}>
              {sourceBadge.label}
            </span>
          )}
        </div>
        <span style={{ color: pnlColor, fontWeight: 700, fontSize: 14 }}>
          {formatPnl(pnl)}
        </span>
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ color: muted, fontSize: 10 }}>Entrada</div>
          <div style={{ color: text, fontSize: 12, fontWeight: 600 }}>
            {parseFloat(position.entry_price || 0) > 0 ? `$${parseFloat(position.entry_price).toLocaleString()}` : (isUntracked ? 'N/A' : '$0')}
          </div>
          {isUntracked && <div style={{ color: muted, fontSize: 9, marginTop: 2 }}>{position.sourceLabel || 'Not managed by SENTIX'}</div>}
        </div>
        <div>
          <div style={{ color: muted, fontSize: 10 }}>Actual</div>
          <div style={{ color: text, fontSize: 12, fontWeight: 600 }}>
            ${parseFloat(position.current_price || position.entry_price || 0).toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ color: muted, fontSize: 10 }}>P&L %</div>
          <div style={{ color: pnlColor, fontSize: 12, fontWeight: 600 }}>
            {formatPct(pnlPct)}
          </div>
        </div>
        <div>
          <div style={{ color: muted, fontSize: 10 }}>Tamano</div>
          <div style={{ color: text, fontSize: 12, fontWeight: 600 }}>
            ${parseFloat(position.position_size || 0).toFixed(2)}
          </div>
        </div>
        <div>
          <div style={{ color: muted, fontSize: 10 }}>Cantidad</div>
          <div style={{ color: text, fontSize: 12, fontWeight: 600 }}>
            {parseFloat(position.quantity || 0).toFixed(6)}
          </div>
        </div>
        <div>
          <div style={{ color: muted, fontSize: 10 }}>Duracion</div>
          <div style={{ color: text, fontSize: 12, fontWeight: 600 }}>
            {position.duration || '-'}
          </div>
        </div>
      </div>

      {/* Risk levels bar */}
      {(hasSL || hasTP || trailingActive) && (
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '8px 0',
          borderTop: `1px solid ${border}`,
          flexWrap: 'wrap'
        }}>
          {hasSL && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              background: `${red}15`,
              fontSize: 10
            }}>
              <span style={{ color: red, fontWeight: 600 }}>SL</span>
              <span style={{ color: muted }}>
                ${parseFloat(position.stop_loss).toLocaleString()}
              </span>
            </div>
          )}
          {hasTP && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              background: `${green}15`,
              fontSize: 10
            }}>
              <span style={{ color: green, fontWeight: 600 }}>TP</span>
              <span style={{ color: muted }}>
                ${parseFloat(position.take_profit_1 || position.take_profit || 0).toLocaleString()}
              </span>
            </div>
          )}
          {trailingActive && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              background: `${HEAT_COLORS.warm}15`,
              fontSize: 10
            }}>
              <span style={{ color: HEAT_COLORS.warm, fontWeight: 600 }}>Trail</span>
              <span style={{ color: muted }}>
                {parseFloat(position.trailing_stop_pct).toFixed(1)}%
              </span>
            </div>
          )}
          {position.time_decay_active && (() => {
            const tdMode = position.time_decay_mode;
            const isLocking = tdMode === 'locking_profit';
            const isReducing = tdMode === 'reducing_loss';
            const tdColor = isLocking ? (colors?.green || '#00d4aa') : isReducing ? '#f59e0b' : '#8b5cf6';
            const tdLabel = isLocking ? 'Asegurando ganancia' : isReducing ? 'Reduciendo perdida' : 'SL ajustado por tiempo';
            return (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 4,
                background: `${tdColor}15`,
                fontSize: 10
              }}>
                <span style={{ color: tdColor, fontWeight: 600 }}>TD</span>
                <span style={{ color: muted }} title={tdLabel}>
                  {isLocking ? '🔒' : isReducing ? '📉' : ''}{' '}
                  {position.time_decay_sl ? `SL $${parseFloat(position.time_decay_sl).toLocaleString()}` : tdLabel}
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default function PositionMonitor({ positions, heatMap, colors }) {
  const muted = colors?.muted || '#6b7280';
  const text = colors?.text || '#f9fafb';
  const bg = colors?.bg3 || '#1a1a1a';
  const border = colors?.border || 'rgba(255,255,255,0.08)';

  if (!positions || positions.length === 0) {
    return (
      <div style={{ color: muted, fontSize: 13, textAlign: 'center', padding: 24 }}>
        No hay posiciones abiertas
      </div>
    );
  }

  const totalPnl = positions.reduce((sum, p) => sum + parseFloat(p.unrealized_pnl || 0), 0);
  const totalValue = positions.reduce((sum, p) => sum + parseFloat(p.position_size || 0), 0);

  return (
    <div>
      {/* Summary bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        marginBottom: 12,
        background: bg,
        borderRadius: 6,
        border: `1px solid ${border}`
      }}>
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          <span style={{ color: muted }}>
            Posiciones: <span style={{ color: text, fontWeight: 600 }}>{positions.length}</span>
          </span>
          <span style={{ color: muted }}>
            Valor total: <span style={{ color: text, fontWeight: 600 }}>${totalValue.toFixed(2)}</span>
          </span>
          <span style={{ color: muted }}>
            P&L total:{' '}
            <span style={{ color: totalPnl >= 0 ? (colors?.green || '#00d4aa') : (colors?.red || '#ef4444'), fontWeight: 600 }}>
              {formatPnl(totalPnl)}
            </span>
          </span>
        </div>
        {heatMap && (
          <div style={{ display: 'flex', gap: 8, fontSize: 10 }}>
            {Object.entries(heatMap).filter(([k]) => ['cool', 'warm', 'hot'].includes(k)).map(([level, count]) => (
              <span key={level} style={{ color: HEAT_COLORS[level], fontWeight: 600 }}>
                {HEAT_LABELS[level]}: {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Position cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {positions.map((pos, i) => (
          <PositionCard key={pos.id || i} position={pos} colors={colors} />
        ))}
      </div>
    </div>
  );
}

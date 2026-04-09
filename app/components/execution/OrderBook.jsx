'use client';
import { useState } from 'react';
import { formatPrice } from '../../lib/utils';

const STATUS_COLORS = {
  PENDING: '#f59e0b',
  VALIDATED: '#3b82f6',
  SUBMITTED: '#a855f7',
  PARTIAL_FILL: '#f59e0b',
  FILLED: '#00d4aa',
  CANCELLED: '#6b7280',
  REJECTED: '#ef4444',
  EXPIRED: '#6b7280'
};

const STATUS_LABELS = {
  PENDING: 'Pendiente',
  VALIDATED: 'Validada',
  SUBMITTED: 'Enviada',
  PARTIAL_FILL: 'Parcial',
  FILLED: 'Ejecutada',
  CANCELLED: 'Cancelada',
  REJECTED: 'Rechazada',
  EXPIRED: 'Expirada'
};

export default function OrderBook({ orders, onCancel, onSubmit, colors }) {
  const [selectedOrder, setSelectedOrder] = useState(null);

  const bg = colors?.bg3 || '#1a1a1a';
  const bg2 = colors?.bg2 || '#111111';
  const border = colors?.border || 'rgba(255,255,255,0.08)';
  const text = colors?.text || '#f9fafb';
  const muted = colors?.muted || '#6b7280';
  const green = colors?.green || '#00d4aa';
  const red = colors?.red || '#ef4444';
  const purple = colors?.purple || '#a855f7';
  const amber = colors?.amber || '#f59e0b';

  if (!orders || orders.length === 0) {
    return (
      <div style={{ color: muted, fontSize: 13, textAlign: 'center', padding: 24 }}>
        No hay ordenes recientes
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${border}` }}>
            {['Fecha', 'Asset', 'Lado', 'Tipo', 'Cantidad', 'Precio', 'Estado', 'Acciones'].map(h => (
              <th key={h} style={{ padding: '8px 12px', color: muted, fontWeight: 600, textAlign: 'left', fontSize: 11 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order, i) => {
            const statusColor = STATUS_COLORS[order.status] || muted;
            const sideColor = order.side === 'BUY' ? green : red;
            const canCancel = ['PENDING', 'VALIDATED', 'SUBMITTED'].includes(order.status);
            const canSubmit = order.status === 'VALIDATED';
            const date = order.created_at ? new Date(order.created_at) : null;

            return (
              <tr key={order.id || i} style={{ borderBottom: `1px solid ${border}` }}>
                <td style={{ padding: '8px 12px', color: muted }}>
                  {date ? `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-'}
                </td>
                <td style={{ padding: '8px 12px', color: text, fontWeight: 600 }}>
                  {order.asset?.charAt(0).toUpperCase() + order.asset?.slice(1)}
                </td>
                <td style={{ padding: '8px 12px', color: sideColor, fontWeight: 700 }}>
                  {order.side}
                </td>
                <td style={{ padding: '8px 12px', color: muted }}>
                  {order.order_type?.replace('_', ' ')}
                </td>
                <td style={{ padding: '8px 12px', color: text }}>
                  {parseFloat(order.quantity || 0).toFixed(6)}
                </td>
                <td style={{ padding: '8px 12px', color: text }}>
                  {order.avg_fill_price
                    ? `$${parseFloat(order.avg_fill_price).toLocaleString()}`
                    : (order.price ? `$${parseFloat(order.price).toLocaleString()}` : 'Market')}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{
                    color: statusColor,
                    fontWeight: 600,
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: `${statusColor}15`
                  }}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                  {order.reject_reason && (
                    <div style={{ color: red, fontSize: 10, marginTop: 2 }}>{order.reject_reason}</div>
                  )}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      style={{
                        padding: '4px 8px', borderRadius: 4,
                        border: `1px solid ${purple}40`, background: `${purple}15`,
                        color: purple, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Ver
                    </button>
                    {canSubmit && (
                      <button
                        onClick={() => onSubmit?.(order.id)}
                        style={{
                          padding: '4px 8px', borderRadius: 4,
                          border: `1px solid ${green}`, background: 'transparent',
                          color: green, fontSize: 10, fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        Ejecutar
                      </button>
                    )}
                    {canCancel && (
                      <button
                        onClick={() => onCancel?.(order.id)}
                        style={{
                          padding: '4px 8px', borderRadius: 4,
                          border: `1px solid ${red}`, background: 'transparent',
                          color: red, fontSize: 10, fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          colors={{ bg, bg2, border, text, muted, green, red, purple, amber }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function OrderDetailModal({ order, onClose, colors }) {
  const { bg, bg2, border, text, muted, green, red, purple, amber } = colors;
  const snap = order.signal_snapshot || {};
  const reasons = snap.reasons ? snap.reasons.split(' • ').filter(Boolean) : [];
  const macro = snap.macroContext || {};
  const derivs = snap.derivatives || {};

  const sectionStyle = {
    background: `rgba(26,26,46,0.8)`, borderRadius: 8, padding: '12px 14px',
    marginBottom: 10, border: `1px solid ${border}`,
  };
  const sectionTitleStyle = {
    fontSize: 10, fontWeight: 700, color: purple, textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 8,
  };
  const rowStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '3px 0', fontSize: 11,
  };
  const labelStyle = { color: muted };
  const valueStyle = { color: text, fontWeight: 600 };

  const strengthColor = (label) => {
    if (!label) return muted;
    if (label.includes('STRONG BUY')) return green;
    if (label.includes('BUY')) return '#4ade80';
    if (label.includes('STRONG SELL')) return red;
    if (label.includes('SELL')) return '#f87171';
    return amber;
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: bg2, border: `1px solid ${border}`, borderRadius: 12,
          maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto',
          padding: 0, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: text }}>
              {order.asset?.charAt(0).toUpperCase() + order.asset?.slice(1)}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              background: order.side === 'BUY' ? `${green}20` : `${red}20`,
              color: order.side === 'BUY' ? green : red,
            }}>
              {order.side}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              background: `${STATUS_COLORS[order.status] || muted}20`,
              color: STATUS_COLORS[order.status] || muted,
            }}>
              {STATUS_LABELS[order.status] || order.status}
            </span>
            {snap.strengthLabel && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                background: `${strengthColor(snap.strengthLabel)}20`,
                color: strengthColor(snap.strengthLabel),
              }}>
                {snap.strengthLabel}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: muted,
              fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* Order Info */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Orden</div>
            <div style={rowStyle}>
              <span style={labelStyle}>Tipo</span>
              <span style={valueStyle}>{order.order_type?.replace('_', ' ')}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Cantidad</span>
              <span style={valueStyle}>{parseFloat(order.quantity || 0).toFixed(6)}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Precio</span>
              <span style={valueStyle}>
                {order.avg_fill_price
                  ? formatPrice(order.avg_fill_price)
                  : order.price ? formatPrice(order.price) : 'Market'}
              </span>
            </div>
            {order.position_size_usd && (
              <div style={rowStyle}>
                <span style={labelStyle}>Tamano Posicion</span>
                <span style={valueStyle}>${parseFloat(order.position_size_usd).toFixed(2)}</span>
              </div>
            )}
            {order.source && (
              <div style={rowStyle}>
                <span style={labelStyle}>Origen</span>
                <span style={valueStyle}>{order.source}</span>
              </div>
            )}
          </div>

          {/* Signal Info */}
          {(snap.rawScore != null || snap.confidence != null) && (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Senal que Gatillo la Orden</div>
              {snap.rawScore != null && (
                <div style={rowStyle}>
                  <span style={labelStyle}>Score</span>
                  <span style={valueStyle}>{snap.rawScore}</span>
                </div>
              )}
              {snap.score != null && (
                <div style={rowStyle}>
                  <span style={labelStyle}>Display Score</span>
                  <span style={valueStyle}>{snap.score}/100</span>
                </div>
              )}
              {snap.confidence != null && (
                <div style={rowStyle}>
                  <span style={labelStyle}>Confianza</span>
                  <span style={valueStyle}>{snap.confidence}%</span>
                </div>
              )}
              {snap.confluence != null && (
                <div style={rowStyle}>
                  <span style={labelStyle}>Confluencia TF</span>
                  <span style={valueStyle}>{snap.confluence}</span>
                </div>
              )}
            </div>
          )}

          {/* Entry Reasons */}
          {reasons.length > 0 && (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Razones de Entrada</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {reasons.map((r, i) => (
                  <div key={i} style={{
                    fontSize: 11, color: text, padding: '4px 8px',
                    background: 'rgba(255,255,255,0.03)', borderRadius: 4,
                    borderLeft: `2px solid ${purple}60`,
                  }}>
                    {r}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Macro Context */}
          {(macro.fearGreed != null || macro.btcDom != null || macro.dxy != null || derivs.fundingRatePercent != null) && (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Contexto Macro</div>
              {macro.fearGreed != null && (
                <div style={rowStyle}>
                  <span style={labelStyle}>Fear & Greed</span>
                  <span style={{
                    ...valueStyle,
                    color: macro.fearGreed >= 60 ? green : macro.fearGreed <= 30 ? red : amber,
                  }}>{macro.fearGreed}</span>
                </div>
              )}
              {macro.btcDom != null && (
                <div style={rowStyle}>
                  <span style={labelStyle}>BTC Dominance</span>
                  <span style={valueStyle}>{parseFloat(macro.btcDom).toFixed(1)}%</span>
                </div>
              )}
              {macro.dxy != null && (
                <div style={rowStyle}>
                  <span style={labelStyle}>DXY</span>
                  <span style={valueStyle}>{parseFloat(macro.dxy).toFixed(2)}</span>
                </div>
              )}
              {derivs.fundingRatePercent != null && (
                <div style={rowStyle}>
                  <span style={labelStyle}>Funding Rate</span>
                  <span style={{
                    ...valueStyle,
                    color: Math.abs(derivs.fundingRatePercent) > 0.05 ? amber : text,
                  }}>{derivs.fundingRatePercent.toFixed(4)}%</span>
                </div>
              )}
              {derivs.longShortRatio != null && (
                <div style={rowStyle}>
                  <span style={labelStyle}>Long/Short Ratio</span>
                  <span style={valueStyle}>{parseFloat(derivs.longShortRatio).toFixed(2)}</span>
                </div>
              )}
              {derivs.openInterest != null && (
                <div style={rowStyle}>
                  <span style={labelStyle}>Open Interest</span>
                  <span style={valueStyle}>${(parseFloat(derivs.openInterest) / 1e6).toFixed(1)}M</span>
                </div>
              )}
            </div>
          )}

          {/* Trade Levels */}
          {(order.stop_loss || order.take_profit_1 || order.take_profit_2) && (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Niveles de Riesgo</div>
              {order.stop_loss && (
                <div style={rowStyle}>
                  <span style={labelStyle}>Stop Loss</span>
                  <span style={{ ...valueStyle, color: red }}>{formatPrice(order.stop_loss)}</span>
                </div>
              )}
              {order.take_profit_1 && (
                <div style={rowStyle}>
                  <span style={labelStyle}>Take Profit 1</span>
                  <span style={{ ...valueStyle, color: green }}>{formatPrice(order.take_profit_1)}</span>
                </div>
              )}
              {order.take_profit_2 && (
                <div style={rowStyle}>
                  <span style={labelStyle}>Take Profit 2</span>
                  <span style={{ ...valueStyle, color: green }}>{formatPrice(order.take_profit_2)}</span>
                </div>
              )}
              {order.trailing_stop_pct && (
                <div style={rowStyle}>
                  <span style={labelStyle}>Trailing Stop</span>
                  <span style={{ ...valueStyle, color: amber }}>{order.trailing_stop_pct}%</span>
                </div>
              )}
              {order.risk_amount && (
                <div style={rowStyle}>
                  <span style={labelStyle}>Riesgo</span>
                  <span style={{ ...valueStyle, color: red }}>${parseFloat(order.risk_amount).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Rejection */}
          {order.reject_reason && (
            <div style={{ ...sectionStyle, borderColor: `${red}40` }}>
              <div style={{ ...sectionTitleStyle, color: red }}>Rechazo</div>
              <div style={{ fontSize: 11, color: red }}>{order.reject_reason}</div>
            </div>
          )}

          {/* Timestamp */}
          <div style={{ fontSize: 9, color: muted, textAlign: 'center', marginTop: 6 }}>
            {order.created_at ? new Date(order.created_at).toLocaleString() : ''}
            {order.execution_adapter && ` — ${order.execution_adapter}`}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

const EVENT_ICONS = {
  ORDER_CREATED: '📝',
  ORDER_VALIDATED: '✅',
  ORDER_REJECTED: '❌',
  ORDER_SUBMITTED: '🚀',
  ORDER_PARTIAL_FILL: '📊',
  ORDER_FILLED: '💰',
  ORDER_CANCELLED: '🚫',
  ORDER_EXPIRED: '⏰',
  TRADE_OPENED: '📈',
  TRADE_PARTIAL_CLOSE: '📉',
  TRADE_CLOSED: '🏁',
  RISK_CHECK_PASS: '🛡️',
  RISK_CHECK_FAIL: '⚠️',
  KILL_SWITCH: '🚨'
};

const EVENT_LABELS = {
  ORDER_CREATED: 'Orden Creada',
  ORDER_VALIDATED: 'Orden Validada',
  ORDER_REJECTED: 'Orden Rechazada',
  ORDER_SUBMITTED: 'Orden Enviada',
  ORDER_PARTIAL_FILL: 'Fill Parcial',
  ORDER_FILLED: 'Orden Ejecutada',
  ORDER_CANCELLED: 'Orden Cancelada',
  ORDER_EXPIRED: 'Orden Expirada',
  TRADE_OPENED: 'Trade Abierto',
  TRADE_PARTIAL_CLOSE: 'Cierre Parcial',
  TRADE_CLOSED: 'Trade Cerrado',
  RISK_CHECK_PASS: 'Risk Check OK',
  RISK_CHECK_FAIL: 'Risk Check Fail',
  KILL_SWITCH: 'Kill Switch'
};

const EVENT_COLORS = {
  ORDER_CREATED: '#3b82f6',
  ORDER_VALIDATED: '#00d4aa',
  ORDER_REJECTED: '#ef4444',
  ORDER_SUBMITTED: '#a855f7',
  ORDER_PARTIAL_FILL: '#f59e0b',
  ORDER_FILLED: '#00d4aa',
  ORDER_CANCELLED: '#6b7280',
  ORDER_EXPIRED: '#6b7280',
  TRADE_OPENED: '#3b82f6',
  TRADE_PARTIAL_CLOSE: '#f59e0b',
  TRADE_CLOSED: '#00d4aa',
  RISK_CHECK_PASS: '#00d4aa',
  RISK_CHECK_FAIL: '#ef4444',
  KILL_SWITCH: '#ef4444'
};

function formatDetail(details) {
  if (!details) return null;
  if (typeof details === 'string') return details;

  const parts = [];
  if (details.asset) parts.push(details.asset);
  if (details.side) parts.push(details.side);
  if (details.reason) parts.push(details.reason);
  if (details.cancelledOrders != null) parts.push(`${details.cancelledOrders} órdenes canceladas`);
  if (details.closedPositions != null) parts.push(`${details.closedPositions} posiciones cerradas`);
  if (details.fillPrice) parts.push(`@ $${parseFloat(details.fillPrice).toLocaleString()}`);
  if (details.quantity) parts.push(`qty: ${parseFloat(details.quantity).toFixed(6)}`);

  // Show risk check details
  if (details.checks && Array.isArray(details.checks)) {
    const failed = details.checks.filter(c => !c.passed);
    if (failed.length > 0) {
      parts.push(failed.map(c => c.detail).join(', '));
    }
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

export default function ExecutionAuditLog({ logs, colors }) {
  const bg = colors?.bg3 || '#1a1a1a';
  const border = colors?.border || 'rgba(255,255,255,0.08)';
  const text = colors?.text || '#f9fafb';
  const muted = colors?.muted || '#6b7280';

  if (!logs || logs.length === 0) {
    return (
      <div style={{ color: muted, fontSize: 13, textAlign: 'center', padding: 24 }}>
        No hay eventos de ejecución
      </div>
    );
  }

  return (
    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
      {logs.map((entry, i) => {
        const eventColor = EVENT_COLORS[entry.event_type] || muted;
        const date = entry.created_at ? new Date(entry.created_at) : null;
        const detail = formatDetail(entry.details);

        return (
          <div
            key={entry.id || i}
            style={{
              display: 'flex',
              gap: 12,
              padding: '10px 12px',
              borderBottom: `1px solid ${border}`,
              alignItems: 'flex-start'
            }}
          >
            {/* Timeline dot */}
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: eventColor,
              marginTop: 4,
              flexShrink: 0
            }} />

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: eventColor }}>
                  {EVENT_ICONS[entry.event_type] || '📋'}{' '}
                  {EVENT_LABELS[entry.event_type] || entry.event_type}
                </span>
                <span style={{ color: muted, fontSize: 10, flexShrink: 0 }}>
                  {date
                    ? `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : '-'}
                </span>
              </div>
              {detail && (
                <div style={{ color: muted, fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>
                  {detail}
                </div>
              )}
              {entry.order_id && (
                <div style={{ color: muted, fontSize: 10, marginTop: 2, opacity: 0.6 }}>
                  Order: {entry.order_id.slice(0, 8)}...
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

'use client';

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
  const bg = colors?.bg3 || '#1a1a1a';
  const bg2 = colors?.bg2 || '#111111';
  const border = colors?.border || 'rgba(255,255,255,0.08)';
  const text = colors?.text || '#f9fafb';
  const muted = colors?.muted || '#6b7280';
  const green = colors?.green || '#00d4aa';
  const red = colors?.red || '#ef4444';

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
                    {canSubmit && (
                      <button
                        onClick={() => onSubmit?.(order.id)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          border: `1px solid ${green}`,
                          background: 'transparent',
                          color: green,
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Ejecutar
                      </button>
                    )}
                    {canCancel && (
                      <button
                        onClick={() => onCancel?.(order.id)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          border: `1px solid ${red}`,
                          background: 'transparent',
                          color: red,
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer'
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
    </div>
  );
}

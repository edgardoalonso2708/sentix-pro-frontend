'use client';
import { useState } from 'react';

export default function KillSwitchButton({ active, onActivate, onDeactivate, colors }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (active) {
      setLoading(true);
      await onDeactivate();
      setLoading(false);
    } else {
      if (!confirming) {
        setConfirming(true);
        setTimeout(() => setConfirming(false), 5000);
      } else {
        setLoading(true);
        await onActivate('Manual activation');
        setLoading(false);
        setConfirming(false);
      }
    }
  };

  const bg = colors?.bg3 || '#1a1a1a';
  const red = colors?.red || '#ef4444';
  const green = colors?.green || '#00d4aa';
  const text = colors?.text || '#f9fafb';
  const muted = colors?.muted || '#6b7280';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          padding: '12px 24px',
          borderRadius: 8,
          border: `2px solid ${active ? green : (confirming ? '#ff6b6b' : red)}`,
          background: active ? 'rgba(0,212,170,0.1)' : (confirming ? 'rgba(255,107,107,0.2)' : 'rgba(239,68,68,0.1)'),
          color: active ? green : (confirming ? '#ff6b6b' : red),
          fontWeight: 700,
          fontSize: 14,
          cursor: loading ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          textTransform: 'uppercase',
          letterSpacing: 1
        }}
      >
        {loading ? '...' : active ? '🟢 REACTIVAR TRADING' : (confirming ? '⚠️ CONFIRMAR KILL SWITCH' : '🔴 KILL SWITCH')}
      </button>
      {confirming && !active && (
        <span style={{ color: '#ff6b6b', fontSize: 11, textAlign: 'center' }}>
          Click de nuevo para confirmar. Se cancelan todas las ordenes.
        </span>
      )}
      {active && (
        <span style={{ color: red, fontSize: 11, textAlign: 'center', fontWeight: 600 }}>
          Trading detenido. Todas las ordenes fueron canceladas.
        </span>
      )}
    </div>
  );
}

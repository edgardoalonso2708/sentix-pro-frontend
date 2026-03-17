'use client';

import { useState } from 'react';

export default function ExecutionModeToggle({
  mode, onModeChange, autoExecute, onAutoExecuteChange,
  bybitStatus, switching, colors
}) {
  const bg = colors?.bg3 || '#1a1a1a';
  const border = colors?.border || 'rgba(255,255,255,0.08)';
  const text = colors?.text || '#f9fafb';
  const muted = colors?.muted || '#6b7280';
  const green = colors?.green || '#00d4aa';
  const amber = colors?.amber || '#f59e0b';
  const red = colors?.red || '#ef4444';
  const purple = colors?.purple || '#a855f7';

  const [confirmTarget, setConfirmTarget] = useState(null); // 'live' or 'perp'

  const bybitOk = bybitStatus?.bybitConfigured;
  const testnet = bybitStatus?.testnet !== false;

  const handleModeClick = (target) => {
    if (switching) return;
    if (target === 'paper') {
      setConfirmTarget(null);
      onModeChange?.(target);
    } else {
      // SPOT or PERP → require confirmation
      if (confirmTarget === target) return; // already showing confirm
      setConfirmTarget(target);
    }
  };

  const handleConfirm = () => {
    if (confirmTarget) {
      onModeChange?.(confirmTarget);
      setConfirmTarget(null);
    }
  };

  const modeBtn = (id, label, activeColor, activeTxt = '#fff') => (
    <button
      onClick={() => handleModeClick(id)}
      disabled={switching}
      style={{
        padding: '8px 16px',
        background: mode === id ? activeColor : bg,
        color: mode === id ? activeTxt : muted,
        border: 'none',
        borderLeft: id !== 'paper' ? `1px solid ${border}` : 'none',
        fontSize: 12,
        fontWeight: 600,
        cursor: switching ? 'wait' : 'pointer',
        opacity: switching ? 0.6 : 1,
        transition: 'background 0.2s'
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      {/* Execution mode buttons */}
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${border}` }}>
        {modeBtn('paper', '\uD83D\uDCDD PAPER', purple)}
        {modeBtn('live', '\uD83D\uDD17 SPOT', green)}
        {modeBtn('perp', '\u26A1 PERP', amber, '#000')}
      </div>

      {/* Bybit connection status dot */}
      {bybitOk && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: bybitStatus?.healthy ? green : red,
            boxShadow: `0 0 4px ${bybitStatus?.healthy ? green : red}`
          }} />
          <span style={{ fontSize: 10, color: muted, fontFamily: 'monospace' }}>
            Bybit {testnet ? 'Test' : 'Live'}{bybitStatus?.healthy ? '' : ' (err)'}
          </span>
        </div>
      )}

      {/* Confirmation dialog for SPOT/PERP */}
      {confirmTarget && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,168,0,0.08)',
          border: `1px solid ${amber}44`,
          borderRadius: 6, padding: '6px 12px'
        }}>
          {!bybitOk ? (
            <>
              <span style={{ fontSize: 11, color: red, fontFamily: 'monospace' }}>
                Bybit no configurado
              </span>
              <button
                onClick={() => setConfirmTarget(null)}
                style={{
                  padding: '3px 8px', borderRadius: 4, fontSize: 10,
                  background: 'transparent', border: `1px solid ${border}`,
                  color: muted, cursor: 'pointer', fontFamily: 'monospace'
                }}
              >
                OK
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 11, color: amber, fontFamily: 'monospace' }}>
                {confirmTarget === 'live' ? 'Activar SPOT' : 'Activar PERP'} {testnet ? '(testnet)' : '(REAL)'}?
              </span>
              <button
                onClick={handleConfirm}
                disabled={switching}
                style={{
                  padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  background: `${amber}22`, border: `1px solid ${amber}`,
                  color: amber, cursor: 'pointer', fontFamily: 'monospace',
                  opacity: switching ? 0.5 : 1
                }}
              >
                {switching ? '...' : 'SI'}
              </button>
              <button
                onClick={() => setConfirmTarget(null)}
                style={{
                  padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  background: 'transparent', border: `1px solid ${border}`,
                  color: muted, cursor: 'pointer', fontFamily: 'monospace'
                }}
              >
                NO
              </button>
            </>
          )}
        </div>
      )}

      {/* Auto-execute toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: muted, fontSize: 12 }}>Auto-ejecutar:</span>
        <button
          onClick={() => onAutoExecuteChange?.(!autoExecute)}
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            border: 'none',
            background: autoExecute ? green : 'rgba(107,114,128,0.3)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s'
          }}
        >
          <div style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: 3,
            left: autoExecute ? 23 : 3,
            transition: 'left 0.2s'
          }} />
        </button>
        <span style={{ color: autoExecute ? green : amber, fontSize: 11, fontWeight: 600 }}>
          {autoExecute ? 'ON' : 'MANUAL'}
        </span>
      </div>
    </div>
  );
}

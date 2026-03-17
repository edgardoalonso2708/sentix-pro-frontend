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

  const [confirmAction, setConfirmAction] = useState(null); // 'spot-on' | 'perp-on'

  const bybitOk = bybitStatus?.bybitConfigured;
  const testnet = bybitStatus?.testnet !== false;

  const isSpotActive = mode === 'live';
  const isPerpActive = mode === 'perp';

  // Toggle switch component (reusable)
  const ToggleSwitch = ({ label, active, onToggle, activeColor, disabled = false, statusLabel }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: muted, fontSize: 12 }}>{label}:</span>
      <button
        onClick={onToggle}
        disabled={disabled || switching}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          border: 'none',
          background: active ? activeColor : 'rgba(107,114,128,0.3)',
          cursor: disabled || switching ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'background 0.2s',
          opacity: disabled ? 0.4 : switching ? 0.6 : 1
        }}
      >
        <div style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: 3,
          left: active ? 23 : 3,
          transition: 'left 0.2s'
        }} />
      </button>
      <span style={{
        color: active ? activeColor : muted,
        fontSize: 11, fontWeight: 600, fontFamily: 'monospace'
      }}>
        {statusLabel || (active ? 'ON' : 'OFF')}
      </span>
    </div>
  );

  // Handle spot toggle
  const handleSpotToggle = () => {
    if (switching) return;
    if (isSpotActive) {
      // Turn OFF → back to paper
      onModeChange?.('paper');
    } else {
      // Turn ON → needs confirmation
      if (!bybitOk) {
        setConfirmAction('no-bybit');
      } else {
        setConfirmAction('spot-on');
      }
    }
  };

  // Handle perp toggle
  const handlePerpToggle = () => {
    if (switching) return;
    if (isPerpActive) {
      onModeChange?.('paper');
    } else {
      if (!bybitOk) {
        setConfirmAction('no-bybit');
      } else {
        setConfirmAction('perp-on');
      }
    }
  };

  const handleConfirm = () => {
    if (confirmAction === 'spot-on') onModeChange?.('live');
    if (confirmAction === 'perp-on') onModeChange?.('perp');
    setConfirmAction(null);
  };

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>

      {/* Auto-execute toggle */}
      <ToggleSwitch
        label="Auto-ejecutar"
        active={autoExecute}
        onToggle={() => onAutoExecuteChange?.(!autoExecute)}
        activeColor={green}
        statusLabel={autoExecute ? 'ON' : 'MANUAL'}
      />

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: border }} />

      {/* Bybit Spot toggle */}
      <ToggleSwitch
        label={`Spot ${testnet ? 'Test' : 'Live'}`}
        active={isSpotActive}
        onToggle={handleSpotToggle}
        activeColor={green}
        statusLabel={isSpotActive ? (testnet ? 'TESTNET' : 'LIVE') : 'OFF'}
      />

      {/* Bybit Perp toggle (future) */}
      <ToggleSwitch
        label="Perp"
        active={isPerpActive}
        onToggle={handlePerpToggle}
        activeColor={amber}
        statusLabel={isPerpActive ? (testnet ? 'TESTNET' : 'LIVE') : 'OFF'}
      />

      {/* Bybit connection indicator */}
      {bybitOk && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: bybitStatus?.healthy ? green : red,
            boxShadow: `0 0 4px ${bybitStatus?.healthy ? green : red}`
          }} />
          <span style={{ fontSize: 10, color: muted, fontFamily: 'monospace' }}>
            Bybit {bybitStatus?.healthy ? 'OK' : 'err'}
          </span>
        </div>
      )}

      {/* Confirmation / error popover */}
      {confirmAction && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: confirmAction === 'no-bybit' ? 'rgba(239,68,68,0.08)' : 'rgba(255,168,0,0.08)',
          border: `1px solid ${confirmAction === 'no-bybit' ? red : amber}44`,
          borderRadius: 6, padding: '6px 12px'
        }}>
          {confirmAction === 'no-bybit' ? (
            <>
              <span style={{ fontSize: 11, color: red, fontFamily: 'monospace' }}>
                Bybit API no configurado
              </span>
              <button
                onClick={() => setConfirmAction(null)}
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
                Activar {confirmAction === 'spot-on' ? 'SPOT' : 'PERP'} {testnet ? '(testnet)' : '(REAL)'}?
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
                onClick={() => setConfirmAction(null)}
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
    </div>
  );
}

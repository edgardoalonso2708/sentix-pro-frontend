'use client';

export default function ExecutionModeToggle({ mode, onModeChange, autoExecute, onAutoExecuteChange, colors }) {
  const bg = colors?.bg3 || '#1a1a1a';
  const border = colors?.border || 'rgba(255,255,255,0.08)';
  const text = colors?.text || '#f9fafb';
  const muted = colors?.muted || '#6b7280';
  const green = colors?.green || '#00d4aa';
  const amber = colors?.amber || '#f59e0b';
  const purple = colors?.purple || '#a855f7';

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      {/* Execution mode */}
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${border}` }}>
        <button
          onClick={() => onModeChange?.('paper')}
          style={{
            padding: '8px 16px',
            background: mode === 'paper' ? purple : bg,
            color: mode === 'paper' ? '#fff' : muted,
            border: 'none',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          📝 PAPER
        </button>
        <button
          onClick={() => onModeChange?.('live')}
          style={{
            padding: '8px 16px',
            background: mode === 'live' ? green : bg,
            color: mode === 'live' ? '#fff' : muted,
            border: 'none',
            borderLeft: `1px solid ${border}`,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          🔗 SPOT
        </button>
        <button
          onClick={() => onModeChange?.('perp')}
          style={{
            padding: '8px 16px',
            background: mode === 'perp' ? amber : bg,
            color: mode === 'perp' ? '#000' : muted,
            border: 'none',
            borderLeft: `1px solid ${border}`,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ⚡ PERP
        </button>
      </div>

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

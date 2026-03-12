'use client';
import { useState } from 'react';

const CRYPTO_ASSETS = [
  'bitcoin', 'ethereum', 'solana', 'cardano', 'ripple', 'polkadot',
  'avalanche-2', 'dogecoin', 'binancecoin', 'chainlink'
];

export default function OrderEntryForm({ onSubmit, marketData, colors }) {
  const [form, setForm] = useState({
    asset: 'bitcoin',
    side: 'BUY',
    orderType: 'MARKET',
    quantity: '',
    price: '',
    stopPrice: '',
    stopLoss: '',
    takeProfit1: '',
    takeProfit2: '',
    positionSizeUsd: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const bg = colors?.bg3 || '#1a1a1a';
  const bg2 = colors?.bg2 || '#111111';
  const border = colors?.border || 'rgba(255,255,255,0.08)';
  const text = colors?.text || '#f9fafb';
  const muted = colors?.muted || '#6b7280';
  const green = colors?.green || '#00d4aa';
  const red = colors?.red || '#ef4444';

  const currentPrice = marketData?.crypto?.[form.asset]?.price || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.quantity && !form.positionSizeUsd) {
      setError('Ingresa cantidad o tamano de posicion');
      return;
    }

    setSubmitting(true);
    try {
      const qty = form.quantity
        ? parseFloat(form.quantity)
        : (parseFloat(form.positionSizeUsd) / (currentPrice || 1));

      const orderSpec = {
        asset: form.asset,
        side: form.side,
        orderType: form.orderType,
        quantity: qty,
        price: form.price ? parseFloat(form.price) : undefined,
        stopPrice: form.stopPrice ? parseFloat(form.stopPrice) : undefined,
        stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : undefined,
        takeProfit1: form.takeProfit1 ? parseFloat(form.takeProfit1) : undefined,
        takeProfit2: form.takeProfit2 ? parseFloat(form.takeProfit2) : undefined,
        positionSizeUsd: form.positionSizeUsd ? parseFloat(form.positionSizeUsd) : (qty * currentPrice),
        riskAmount: form.stopLoss ? Math.abs(currentPrice - parseFloat(form.stopLoss)) * qty : undefined,
        source: 'manual'
      };

      await onSubmit(orderSpec);
      setSuccess('Orden creada exitosamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Error al crear orden');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 6,
    padding: '8px 12px',
    color: text,
    fontSize: 13,
    width: '100%',
    outline: 'none'
  };

  const labelStyle = { color: muted, fontSize: 11, fontWeight: 600, marginBottom: 4, display: 'block' };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Asset + Side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>ASSET</label>
          <select
            value={form.asset}
            onChange={(e) => setForm({ ...form, asset: e.target.value })}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {CRYPTO_ASSETS.map(a => (
              <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>LADO</label>
          <div style={{ display: 'flex', gap: 4, borderRadius: 6, overflow: 'hidden', border: `1px solid ${border}` }}>
            <button
              type="button"
              onClick={() => setForm({ ...form, side: 'BUY' })}
              style={{
                flex: 1,
                padding: '8px 0',
                background: form.side === 'BUY' ? green : bg,
                color: form.side === 'BUY' ? '#000' : muted,
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              COMPRAR
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, side: 'SELL' })}
              style={{
                flex: 1,
                padding: '8px 0',
                background: form.side === 'SELL' ? red : bg,
                color: form.side === 'SELL' ? '#fff' : muted,
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              VENDER
            </button>
          </div>
        </div>
      </div>

      {/* Order type */}
      <div>
        <label style={labelStyle}>TIPO DE ORDEN</label>
        <div style={{ display: 'flex', gap: 4, borderRadius: 6, overflow: 'hidden', border: `1px solid ${border}` }}>
          {['MARKET', 'LIMIT', 'STOP_LIMIT'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setForm({ ...form, orderType: t })}
              style={{
                flex: 1,
                padding: '6px 0',
                background: form.orderType === t ? 'rgba(168,85,247,0.15)' : bg,
                color: form.orderType === t ? '#a855f7' : muted,
                border: 'none',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Price fields (conditional) */}
      {form.orderType !== 'MARKET' && (
        <div style={{ display: 'grid', gridTemplateColumns: form.orderType === 'STOP_LIMIT' ? '1fr 1fr' : '1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>PRECIO LIMITE</label>
            <input
              type="number"
              step="any"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder={currentPrice ? currentPrice.toFixed(2) : '0.00'}
              style={inputStyle}
            />
          </div>
          {form.orderType === 'STOP_LIMIT' && (
            <div>
              <label style={labelStyle}>PRECIO STOP (TRIGGER)</label>
              <input
                type="number"
                step="any"
                value={form.stopPrice}
                onChange={(e) => setForm({ ...form, stopPrice: e.target.value })}
                style={inputStyle}
              />
            </div>
          )}
        </div>
      )}

      {/* Quantity / Size */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>CANTIDAD (ASSET)</label>
          <input
            type="number"
            step="any"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            placeholder="0.01"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>TAMANO USD</label>
          <input
            type="number"
            step="any"
            value={form.positionSizeUsd}
            onChange={(e) => setForm({ ...form, positionSizeUsd: e.target.value })}
            placeholder="500"
            style={inputStyle}
          />
        </div>
      </div>

      {/* SL / TP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>STOP LOSS</label>
          <input
            type="number"
            step="any"
            value={form.stopLoss}
            onChange={(e) => setForm({ ...form, stopLoss: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>TAKE PROFIT 1</label>
          <input
            type="number"
            step="any"
            value={form.takeProfit1}
            onChange={(e) => setForm({ ...form, takeProfit1: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>TAKE PROFIT 2</label>
          <input
            type="number"
            step="any"
            value={form.takeProfit2}
            onChange={(e) => setForm({ ...form, takeProfit2: e.target.value })}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Current price info */}
      {currentPrice > 0 && (
        <div style={{ color: muted, fontSize: 11, padding: '4px 0' }}>
          Precio actual: <span style={{ color: text, fontWeight: 600 }}>${currentPrice.toLocaleString()}</span>
        </div>
      )}

      {/* Error / Success */}
      {error && <div style={{ color: red, fontSize: 12, padding: 8, background: 'rgba(239,68,68,0.1)', borderRadius: 6 }}>{error}</div>}
      {success && <div style={{ color: green, fontSize: 12, padding: 8, background: 'rgba(0,212,170,0.1)', borderRadius: 6 }}>{success}</div>}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: '12px 24px',
          borderRadius: 8,
          border: 'none',
          background: form.side === 'BUY' ? green : red,
          color: form.side === 'BUY' ? '#000' : '#fff',
          fontWeight: 700,
          fontSize: 14,
          cursor: submitting ? 'wait' : 'pointer',
          opacity: submitting ? 0.7 : 1,
          transition: 'opacity 0.2s'
        }}
      >
        {submitting ? 'Creando...' : `${form.side === 'BUY' ? 'COMPRAR' : 'VENDER'} ${form.asset.toUpperCase()}`}
      </button>
    </form>
  );
}

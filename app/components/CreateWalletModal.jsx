'use client'

import { useState } from 'react';

const WALLET_TYPES = ['exchange', 'wallet', 'cold_storage', 'defi', 'other'];

const WALLET_PROVIDERS = [
  { value: 'binance', label: 'Binance', color: '#F3BA2F' },
  { value: 'bybit', label: 'Bybit', color: '#F7931A' },
  { value: 'coinbase', label: 'Coinbase', color: '#0052FF' },
  { value: 'kraken', label: 'Kraken', color: '#5741D9' },
  { value: 'okx', label: 'OKX', color: '#000000' },
  { value: 'kucoin', label: 'KuCoin', color: '#23AF91' },
  { value: 'mercadopago', label: 'MercadoPago', color: '#00B1EA' },
  { value: 'skipo', label: 'Skipo', color: '#6366f1' },
  { value: 'lemon', label: 'Lemon', color: '#FFEB3B' },
  { value: 'ripio', label: 'Ripio', color: '#00C896' },
  { value: 'metamask', label: 'MetaMask', color: '#F6851B' },
  { value: 'trust_wallet', label: 'Trust Wallet', color: '#3375BB' },
  { value: 'ledger', label: 'Ledger', color: '#000000' },
  { value: 'trezor', label: 'Trezor', color: '#01B757' },
  { value: 'phantom', label: 'Phantom', color: '#AB9FF2' },
  { value: 'exodus', label: 'Exodus', color: '#0B46F9' },
  { value: 'other', label: 'Other', color: '#6366f1' },
];

/**
 * CreateWalletModal Component
 * Modal para crear nuevos wallets/exchanges
 */
export default function CreateWalletModal({ isOpen, onClose, onSuccess, userId = 'default-user', apiUrl }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'exchange',
    provider: 'binance',
    color: '#F3BA2F',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleProviderChange = (e) => {
    const provider = e.target.value;
    const providerData = WALLET_PROVIDERS.find(p => p.value === provider);

    setFormData({
      ...formData,
      provider,
      color: providerData?.color || '#6366f1'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Wallet name is required');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${apiUrl}/api/wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...formData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create wallet');
      }

      // Reset form
      setFormData({
        name: '',
        type: 'exchange',
        provider: 'binance',
        color: '#F3BA2F',
        notes: ''
      });

      // Call success callback
      onSuccess(data.wallet);
      onClose();
    } catch (err) {
      console.error('Error creating wallet:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Wallet</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="wallet-form">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="wallet-name">Wallet Name *</label>
            <input
              id="wallet-name"
              type="text"
              placeholder="e.g., Binance Main, Ledger Cold Storage"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="wallet-type">Type *</label>
            <select
              id="wallet-type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              disabled={loading}
            >
              <option value="exchange">Exchange</option>
              <option value="wallet">Wallet</option>
              <option value="cold_storage">Cold Storage</option>
              <option value="defi">DeFi</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="wallet-provider">Provider *</label>
            <select
              id="wallet-provider"
              value={formData.provider}
              onChange={handleProviderChange}
              disabled={loading}
            >
              {WALLET_PROVIDERS.map(provider => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="wallet-color">Color</label>
            <div className="color-input-group">
              <input
                id="wallet-color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                disabled={loading}
              />
              <span className="color-value">{formData.color}</span>
            </div>
            <small>Used for visual identification in the dashboard</small>
          </div>

          <div className="form-group">
            <label htmlFor="wallet-notes">Notes (optional)</label>
            <textarea
              id="wallet-notes"
              placeholder="e.g., For long-term holdings, Trading account, etc."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="button button-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Wallet'}
            </button>
          </div>
        </form>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            backdrop-filter: blur(4px);
          }

          .modal-content {
            background: #1e293b;
            border-radius: 16px;
            padding: 0;
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px;
            border-bottom: 1px solid #334155;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: #f8fafc;
          }

          .close-button {
            background: transparent;
            border: none;
            font-size: 32px;
            color: #94a3b8;
            cursor: pointer;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.2s;
          }

          .close-button:hover {
            background: #334155;
            color: #e2e8f0;
          }

          .wallet-form {
            padding: 24px;
          }

          .form-group {
            margin-bottom: 20px;
          }

          .form-group label {
            display: block;
            font-weight: 600;
            font-size: 14px;
            color: #e2e8f0;
            margin-bottom: 8px;
          }

          .form-group input[type="text"],
          .form-group select,
          .form-group textarea {
            width: 100%;
            padding: 12px 16px;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 8px;
            color: #e2e8f0;
            font-size: 14px;
            transition: all 0.2s;
          }

          .form-group input:focus,
          .form-group select:focus,
          .form-group textarea:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          }

          .form-group input:disabled,
          .form-group select:disabled,
          .form-group textarea:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .form-group small {
            display: block;
            margin-top: 6px;
            font-size: 12px;
            color: #94a3b8;
          }

          .color-input-group {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .form-group input[type="color"] {
            width: 60px;
            height: 44px;
            padding: 4px;
            cursor: pointer;
          }

          .color-value {
            font-family: monospace;
            font-size: 14px;
            color: #94a3b8;
          }

          .error-message {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            color: #fca5a5;
            margin-bottom: 20px;
            font-size: 14px;
          }

          .error-icon {
            font-size: 18px;
          }

          .form-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid #334155;
          }

          .button {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .button-secondary {
            background: #334155;
            color: #e2e8f0;
          }

          .button-secondary:hover:not(:disabled) {
            background: #475569;
          }

          .button-primary {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
          }

          .button-primary:hover:not(:disabled) {
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            transform: translateY(-1px);
          }
        `}</style>
      </div>
    </div>
  );
}

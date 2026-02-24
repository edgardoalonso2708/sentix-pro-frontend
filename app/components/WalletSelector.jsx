'use client'

import { useState, useEffect } from 'react';

/**
 * WalletSelector Component
 * Dropdown para seleccionar wallet con información de posiciones
 */
export default function WalletSelector({ userId = 'default-user', onWalletSelect, selectedWalletId, apiUrl }) {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWallets();
  }, [userId]);

  const fetchWallets = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/api/wallets/${userId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch wallets');
      }

      const data = await response.json();
      setWallets(data.wallets || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching wallets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (e) => {
    const walletId = e.target.value;
    const wallet = wallets.find(w => w.id === walletId);
    onWalletSelect(wallet);
  };

  if (loading) {
    return (
      <div className="wallet-selector loading">
        <div className="spinner"></div>
        <span>Loading wallets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wallet-selector error">
        <span className="error-icon">⚠️</span>
        <span>Error loading wallets: {error}</span>
      </div>
    );
  }

  return (
    <div className="wallet-selector">
      <label htmlFor="wallet-select" className="wallet-label">
        Select Wallet/Exchange:
      </label>
      <select
        id="wallet-select"
        value={selectedWalletId || ''}
        onChange={handleSelect}
        className="wallet-select"
      >
        <option value="">-- Select a wallet --</option>
        {wallets.map(wallet => (
          <option key={wallet.id} value={wallet.id}>
            {wallet.name} ({wallet.provider})
            {wallet.position_count > 0 && ` - ${wallet.position_count} positions`}
          </option>
        ))}
      </select>

      {wallets.length === 0 && (
        <p className="wallet-empty-message">
          No wallets found. Create your first wallet below.
        </p>
      )}

      <style jsx>{`
        .wallet-selector {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .wallet-label {
          font-weight: 600;
          font-size: 14px;
          color: #e2e8f0;
        }

        .wallet-select {
          width: 100%;
          padding: 12px 16px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .wallet-select:hover {
          border-color: #6366f1;
        }

        .wallet-select:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .wallet-selector.loading {
          flex-direction: row;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #1e293b;
          border-radius: 8px;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #334155;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .wallet-selector.error {
          flex-direction: row;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #fca5a5;
        }

        .error-icon {
          font-size: 20px;
        }

        .wallet-empty-message {
          font-size: 13px;
          color: #94a3b8;
          font-style: italic;
          margin: 8px 0 0;
        }
      `}</style>
    </div>
  );
}

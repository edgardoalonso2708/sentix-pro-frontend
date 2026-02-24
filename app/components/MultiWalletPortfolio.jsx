'use client'

import { useState, useEffect, useCallback } from 'react';
import WalletSelector from './WalletSelector';
import CreateWalletModal from './CreateWalletModal';

/**
 * MultiWalletPortfolio Component
 * Dashboard con toggle entre vista consolidada y por wallet
 */
export default function MultiWalletPortfolio({ userId = 'default-user', apiUrl }) {
  const [view, setView] = useState('consolidated'); // 'consolidated' | 'byWallet'
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/api/portfolio/${userId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch portfolio');
      }

      const data = await response.json();
      setPortfolioData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, apiUrl]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const handleWalletCreated = (wallet) => {
    console.log('Wallet created:', wallet);
    fetchPortfolio(); // Refresh data
  };

  if (loading) {
    return (
      <div className="portfolio-loading">
        <div className="spinner"></div>
        <p>Loading portfolio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portfolio-error">
        <span className="error-icon">⚠️</span>
        <p>Error loading portfolio: {error}</p>
        <button onClick={fetchPortfolio} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  const consolidated = portfolioData?.consolidated || {};
  const byWallet = portfolioData?.byWallet || [];

  return (
    <div className="multi-wallet-portfolio">
      {/* Header */}
      <div className="portfolio-header">
        <h2>💼 Portfolio</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="create-wallet-button"
        >
          + New Wallet
        </button>
      </div>

      {/* View Toggle */}
      <div className="view-toggle">
        <button
          className={`toggle-button ${view === 'consolidated' ? 'active' : ''}`}
          onClick={() => setView('consolidated')}
        >
          📊 Consolidated
        </button>
        <button
          className={`toggle-button ${view === 'byWallet' ? 'active' : ''}`}
          onClick={() => setView('byWallet')}
        >
          💼 By Wallet
        </button>
      </div>

      {/* Consolidated View */}
      {view === 'consolidated' && (
        <div className="consolidated-view">
          <ConsolidatedSummary consolidated={consolidated} />
          <ConsolidatedAssets assets={consolidated.byAsset || []} />
        </div>
      )}

      {/* By Wallet View */}
      {view === 'byWallet' && (
        <div className="by-wallet-view">
          {byWallet.length === 0 ? (
            <div className="empty-state">
              <p className="empty-icon">🏦</p>
              <p className="empty-message">No wallets with positions yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="empty-action-button"
              >
                Create Your First Wallet
              </button>
            </div>
          ) : (
            byWallet.map(wallet => (
              <WalletCard key={wallet.walletId} wallet={wallet} />
            ))
          )}
        </div>
      )}

      {/* Create Wallet Modal */}
      <CreateWalletModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleWalletCreated}
        userId={userId}
        apiUrl={apiUrl}
      />

      <style jsx>{`
        .multi-wallet-portfolio {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .portfolio-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .portfolio-header h2 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #f8fafc;
        }

        .create-wallet-button {
          padding: 12px 20px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .create-wallet-button:hover {
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          transform: translateY(-1px);
        }

        .view-toggle {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          background: #1e293b;
          padding: 6px;
          border-radius: 12px;
          width: fit-content;
        }

        .toggle-button {
          padding: 10px 20px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: #94a3b8;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-button:hover {
          color: #e2e8f0;
        }

        .toggle-button.active {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
        }

        .portfolio-loading,
        .portfolio-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 16px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #334155;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-icon {
          font-size: 48px;
        }

        .retry-button {
          padding: 10px 20px;
          background: #334155;
          color: #e2e8f0;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }

        .retry-button:hover {
          background: #475569;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          background: #1e293b;
          border-radius: 12px;
          border: 2px dashed #334155;
        }

        .empty-icon {
          font-size: 64px;
          margin: 0;
        }

        .empty-message {
          font-size: 16px;
          color: #94a3b8;
          margin: 16px 0;
        }

        .empty-action-button {
          padding: 12px 24px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .empty-action-button:hover {
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }
      `}</style>
    </div>
  );
}

/* Consolidated Summary Component */
function ConsolidatedSummary({ consolidated }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value || 0).toFixed(2)}%`;
  };

  const pnlColor = (consolidated.totalPnL || 0) >= 0 ? '#22c55e' : '#ef4444';

  return (
    <div className="summary-cards">
      <div className="summary-card">
        <div className="card-label">Total Value</div>
        <div className="card-value">{formatCurrency(consolidated.totalValue)}</div>
        <div className="card-footer">
          Across {consolidated.walletCount || 0} wallet{consolidated.walletCount !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="summary-card">
        <div className="card-label">Total Invested</div>
        <div className="card-value">{formatCurrency(consolidated.totalInvested)}</div>
        <div className="card-footer">
          {consolidated.positionCount || 0} position{consolidated.positionCount !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="summary-card pnl-card">
        <div className="card-label">Profit & Loss</div>
        <div className="card-value" style={{ color: pnlColor }}>
          {formatCurrency(Math.abs(consolidated.totalPnL || 0))}
        </div>
        <div className="card-footer" style={{ color: pnlColor }}>
          {formatPercent(consolidated.totalPnLPercent)}
        </div>
      </div>

      <style jsx>{`
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .summary-card {
          background: linear-gradient(135deg, #1e293b, #334155);
          padding: 24px;
          border-radius: 12px;
          border: 1px solid #334155;
        }

        .summary-card.pnl-card {
          background: linear-gradient(135deg, #1e293b, #2d3748);
        }

        .card-label {
          font-size: 13px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .card-value {
          font-size: 32px;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 8px;
        }

        .card-footer {
          font-size: 14px;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}

/* Consolidated Assets Table */
function ConsolidatedAssets({ assets }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value || 0).toFixed(2)}%`;
  };

  if (!assets || assets.length === 0) {
    return (
      <div className="empty-assets">
        <p>No assets in portfolio</p>
      </div>
    );
  }

  return (
    <div className="assets-table-container">
      <h3>Assets</h3>
      <div className="table-wrapper">
        <table className="assets-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Avg Buy</th>
              <th className="text-right">Current</th>
              <th className="text-right">Value</th>
              <th className="text-right">P&L</th>
              <th className="text-center">Wallets</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset, index) => {
              const pnlColor = asset.pnl >= 0 ? '#22c55e' : '#ef4444';
              return (
                <tr key={index}>
                  <td>
                    <span className="asset-name">{asset.asset.toUpperCase()}</span>
                  </td>
                  <td className="text-right">{asset.totalAmount.toFixed(4)}</td>
                  <td className="text-right">{formatCurrency(asset.avgBuyPrice)}</td>
                  <td className="text-right">{formatCurrency(asset.currentPrice)}</td>
                  <td className="text-right font-weight-bold">{formatCurrency(asset.currentValue)}</td>
                  <td className="text-right" style={{ color: pnlColor }}>
                    <div>{formatCurrency(Math.abs(asset.pnl))}</div>
                    <div className="pnl-percent">{formatPercent(asset.pnlPercent)}</div>
                  </td>
                  <td className="text-center">{asset.walletCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .assets-table-container {
          background: #1e293b;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #334155;
        }

        .assets-table-container h3 {
          margin: 0 0 20px;
          font-size: 18px;
          font-weight: 700;
          color: #f8fafc;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .assets-table {
          width: 100%;
          border-collapse: collapse;
        }

        .assets-table th {
          text-align: left;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #334155;
        }

        .assets-table td {
          padding: 16px;
          font-size: 14px;
          color: #e2e8f0;
          border-bottom: 1px solid #334155;
        }

        .assets-table tbody tr:hover {
          background: rgba(99, 102, 241, 0.05);
        }

        .asset-name {
          font-weight: 600;
          color: #f8fafc;
        }

        .text-right {
          text-align: right;
        }

        .text-center {
          text-align: center;
        }

        .font-weight-bold {
          font-weight: 600;
        }

        .pnl-percent {
          font-size: 12px;
          opacity: 0.8;
        }

        .empty-assets {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}

/* Wallet Card Component */
function WalletCard({ wallet }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value || 0).toFixed(2)}%`;
  };

  const pnlColor = (wallet.totalPnL || 0) >= 0 ? '#22c55e' : '#ef4444';

  return (
    <div className="wallet-card" style={{ borderLeftColor: wallet.walletColor }}>
      <div className="wallet-card-header">
        <div className="wallet-info">
          <h3>{wallet.walletName}</h3>
          <span className="wallet-positions">
            {wallet.positionCount} position{wallet.positionCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="wallet-stats">
          <div className="stat-value">{formatCurrency(wallet.totalValue)}</div>
          <div className="stat-pnl" style={{ color: pnlColor }}>
            {formatCurrency(Math.abs(wallet.totalPnL || 0))} ({formatPercent(wallet.totalPnLPercent)})
          </div>
        </div>
      </div>

      {wallet.positions && wallet.positions.length > 0 && (
        <div className="wallet-positions-table">
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Buy Price</th>
                <th className="text-right">Current</th>
                <th className="text-right">P&L</th>
              </tr>
            </thead>
            <tbody>
              {wallet.positions.map((pos, index) => {
                const posColor = pos.pnl >= 0 ? '#22c55e' : '#ef4444';
                return (
                  <tr key={index}>
                    <td className="asset-cell">{pos.asset.toUpperCase()}</td>
                    <td className="text-right">{pos.amount.toFixed(4)}</td>
                    <td className="text-right">{formatCurrency(pos.buy_price)}</td>
                    <td className="text-right">{formatCurrency(pos.currentPrice)}</td>
                    <td className="text-right" style={{ color: posColor }}>
                      {formatCurrency(Math.abs(pos.pnl))} ({formatPercent(pos.pnlPercent)})
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .wallet-card {
          background: #1e293b;
          border-radius: 12px;
          border: 1px solid #334155;
          border-left-width: 4px;
          margin-bottom: 20px;
          overflow: hidden;
        }

        .wallet-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 24px;
          border-bottom: 1px solid #334155;
        }

        .wallet-info h3 {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 700;
          color: #f8fafc;
        }

        .wallet-positions {
          font-size: 13px;
          color: #94a3b8;
        }

        .wallet-stats {
          text-align: right;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 4px;
        }

        .stat-pnl {
          font-size: 14px;
          font-weight: 600;
        }

        .wallet-positions-table {
          padding: 16px 24px 24px;
        }

        .wallet-positions-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .wallet-positions-table th {
          text-align: left;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .wallet-positions-table td {
          padding: 12px;
          font-size: 13px;
          color: #e2e8f0;
        }

        .asset-cell {
          font-weight: 600;
        }

        .text-right {
          text-align: right;
        }
      `}</style>
    </div>
  );
}

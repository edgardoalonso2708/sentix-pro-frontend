import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PortfolioTab from '../../app/components/tabs/PortfolioTab';

const baseProps = {
  portfolio: [],
  wallets: [],
  marketData: { crypto: {} },
  portfolioLoading: false,
  walletsLoading: false,
  showAddForm: false,
  setShowAddForm: vi.fn(),
  showBatchUpload: false,
  setShowBatchUpload: vi.fn(),
  showCreateWallet: false,
  setShowCreateWallet: vi.fn(),
  uploadStatus: null,
  setUploadStatus: vi.fn(),
  uploading: false,
  setUploading: vi.fn(),
  saving: false,
  setSaving: vi.fn(),
  selectedWalletFilter: 'all',
  setSelectedWalletFilter: vi.fn(),
  newPosition: { asset: 'bitcoin', amount: '', buyPrice: '', walletId: '' },
  setNewPosition: vi.fn(),
  newWallet: { name: '', type: 'exchange', provider: 'binance', color: '#6366f1' },
  setNewWallet: vi.fn(),
  uploadWalletId: '',
  setUploadWalletId: vi.fn(),
  calculatePortfolioValue: vi.fn(() => 50000),
  calculatePortfolioPnL: vi.fn(() => ({ pnl: 1500, percentage: 3.1 })),
  fetchWallets: vi.fn(),
  fetchPortfolio: vi.fn(),
  addToPortfolio: vi.fn(),
  removeFromPortfolio: vi.fn(),
  authFetch: vi.fn(),
  apiUrl: 'http://localhost:3001',
  userId: 'user-123',
};

describe('PortfolioTab', () => {
  it('renders portfolio value section', () => {
    render(<PortfolioTab {...baseProps} />);
    // "Valor Total" is the Spanish translation for port.totalValue
    expect(screen.getByText('Valor Total')).toBeTruthy();
    // formatLargeNumber(50000) => "$50000.00"
    expect(screen.getByText('$50000.00')).toBeTruthy();
    // P&L label
    expect(screen.getByText('P&L')).toBeTruthy();
    // pnl value with + prefix: "+$1500.00"
    expect(screen.getByText('+$1500.00')).toBeTruthy();
    // percentage: "+3.10%"
    expect(screen.getByText('+3.10%')).toBeTruthy();
  });

  it('renders wallet filter buttons when wallets exist', () => {
    const wallets = [
      { id: 'w1', name: 'My Binance', type: 'exchange', provider: 'binance', color: '#6366f1' },
      { id: 'w2', name: 'Ledger', type: 'cold_storage', provider: 'ledger', color: '#22c55e' },
    ];
    render(<PortfolioTab {...baseProps} wallets={wallets} />);
    // "Todas" is Spanish for port.all
    expect(screen.getByText('Todas (0)')).toBeTruthy();
    expect(screen.getByText('My Binance (0)')).toBeTruthy();
    expect(screen.getByText('Ledger (0)')).toBeTruthy();
  });

  it('shows loading state when portfolioLoading is true', () => {
    render(<PortfolioTab {...baseProps} portfolioLoading={true} />);
    // "Cargando portfolio..." is Spanish for port.loadingPortfolio
    expect(screen.getByText('Cargando portfolio...')).toBeTruthy();
  });

  it('renders positions when portfolio has items', () => {
    const portfolio = [
      { id: 'p1', asset: 'bitcoin', amount: 0.5, buyPrice: 60000, walletId: 'w1', walletName: 'My Binance', walletColor: '#6366f1' },
      { id: 'p2', asset: 'ethereum', amount: 10, buyPrice: 3000, walletId: 'w1', walletName: 'My Binance', walletColor: '#6366f1' },
    ];
    const marketData = {
      crypto: {
        bitcoin: { price: 65000 },
        ethereum: { price: 3500 },
      },
    };
    render(<PortfolioTab {...baseProps} portfolio={portfolio} marketData={marketData} />);
    expect(screen.getByText('BITCOIN')).toBeTruthy();
    expect(screen.getByText('ETHEREUM')).toBeTruthy();
    // "MIS POSICIONES" is Spanish for port.myPositions
    expect(screen.getByText('MIS POSICIONES')).toBeTruthy();
  });

  it('calls setShowAddForm when add position button is clicked', () => {
    const setShowAddForm = vi.fn();
    render(<PortfolioTab {...baseProps} setShowAddForm={setShowAddForm} />);
    // "Agregar Posicion" is Spanish for port.addPosition
    const addButton = screen.getByText('Agregar Posicion');
    fireEvent.click(addButton);
    expect(setShowAddForm).toHaveBeenCalledWith(true);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock CandlestickChart — lightweight-charts needs canvas
vi.mock('../../app/components/charts/CandlestickChart', () => ({
  default: (props) => <div data-testid="candlestick-chart" data-asset={props.asset} />,
}));

// Mock recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  ReferenceLine: () => null,
}));

import DashboardTab from '../../app/components/tabs/DashboardTab';

const marketData = {
  macro: {
    fearGreed: 65,
    fearGreedLabel: 'Greed',
    btcDominance: 52.3,
    totalMarketCap: 2.5e12,
  },
  crypto: {
    bitcoin: { symbol: 'BTC', name: 'Bitcoin', price: 65000, change24h: 2.5, marketCap: 1.2e12 },
    ethereum: { symbol: 'ETH', name: 'Ethereum', price: 3500, change24h: -1.2, marketCap: 4e11 },
  },
};

const baseProps = {
  marketData,
  signals: [],
  paperMetrics: null,
  paperHistory: [],
  paperPositions: [],
  paperConfig: null,
  realtimeEquityCurve: [],
  backtestHistory: [],
  backtestEquityCurve: [],
  systemHealth: null,
  sseConnected: false,
  lastUpdate: null,
  setTab: vi.fn(),
  setStrategySubTab: vi.fn(),
  apiUrl: 'http://localhost:3001',
};

describe('DashboardTab', () => {
  it('shows loading when no marketData', () => {
    render(<DashboardTab {...baseProps} marketData={null} />);
    expect(screen.getByText(/Loading market data/)).toBeTruthy();
  });

  it('renders LIVE status text with market data', () => {
    render(<DashboardTab {...baseProps} sseConnected={true} />);
    expect(screen.getByText(/LIVE/)).toBeTruthy();
  });

  it('shows SSE or Polling connection mode', () => {
    const { rerender } = render(<DashboardTab {...baseProps} sseConnected={true} />);
    expect(screen.getByText(/SSE tiempo real/)).toBeTruthy();

    rerender(<DashboardTab {...baseProps} sseConnected={false} />);
    expect(screen.getByText(/Polling cada 30s/)).toBeTruthy();
  });

  it('renders ESTADO DEL SISTEMA section', () => {
    render(<DashboardTab {...baseProps} />);
    expect(screen.getByText('ESTADO DEL SISTEMA')).toBeTruthy();
  });

  it('shows service health labels', () => {
    const systemHealth = {
      status: 'healthy',
      checks: {
        marketData: 'ok',
        database: 'ok',
        sse: 'ok',
        telegram: 'ok',
        email: 'ok',
        caches: 'ok',
      },
    };
    render(<DashboardTab {...baseProps} systemHealth={systemHealth} />);

    expect(screen.getByText('Binance')).toBeTruthy();
    expect(screen.getByText('Supabase')).toBeTruthy();
    expect(screen.getByText('Telegram')).toBeTruthy();
  });

  it('renders Fear & Greed index', () => {
    render(<DashboardTab {...baseProps} />);
    expect(screen.getByText('65')).toBeTruthy();
    expect(screen.getByText(/Greed/)).toBeTruthy();
  });

  it('renders last update timestamp', () => {
    const lastUpdate = new Date('2024-01-15T12:30:00Z');
    render(<DashboardTab {...baseProps} lastUpdate={lastUpdate} />);
    expect(document.body.textContent).toMatch(/\d{1,2}:\d{2}/);
  });
});

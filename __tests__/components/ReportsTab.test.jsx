import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock recharts — jsdom can't render SVG charts
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
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
}));

import ReportsTab from '../../app/components/tabs/ReportsTab';

const baseProps = {
  paperMetrics: null,
  paperHistory: [],
  paperPositions: [],
  paperConfig: null,
  signalAccuracy: null,
  signals: [],
  advancedPerf: null,
  correlationData: null,
  backtestHistory: [],
  authFetch: vi.fn(),
  apiUrl: 'http://localhost:3001',
  userId: 'test-user',
};

describe('ReportsTab', () => {
  it('renders all four report type buttons', () => {
    render(<ReportsTab {...baseProps} />);
    expect(screen.getByText(/Rendimiento/)).toBeTruthy();
    expect(screen.getByText(/Trades/)).toBeTruthy();
    expect(screen.getByText(/Senales/)).toBeTruthy();
    expect(screen.getByText(/Riesgo/)).toBeTruthy();
  });

  it('highlights the active report type (performance by default)', () => {
    render(<ReportsTab {...baseProps} />);
    const perfButton = screen.getByText(/Rendimiento/).closest('button');
    const tradesButton = screen.getByText(/Trades/).closest('button');
    // Active button has fontWeight 700
    expect(perfButton.style.fontWeight).toBe('700');
    // Inactive button has fontWeight 500
    expect(tradesButton.style.fontWeight).toBe('500');
  });

  it('renders day selector buttons', () => {
    render(<ReportsTab {...baseProps} />);
    expect(screen.getByText('7d')).toBeTruthy();
    expect(screen.getByText('14d')).toBeTruthy();
    expect(screen.getByText('30d')).toBeTruthy();
    expect(screen.getByText('60d')).toBeTruthy();
    expect(screen.getByText('90d')).toBeTruthy();
  });

  it('shows report content area (noData message for performance with null metrics)', () => {
    render(<ReportsTab {...baseProps} />);
    // Performance report with null metrics shows NoData
    expect(screen.getByText(/Sin datos suficientes/)).toBeTruthy();
  });

  it('clicking a report type button updates the selection', () => {
    render(<ReportsTab {...baseProps} />);
    const tradesButton = screen.getByText(/Trades/).closest('button');
    fireEvent.click(tradesButton);
    // After clicking Trades, it should be highlighted (fontWeight 700)
    expect(tradesButton.style.fontWeight).toBe('700');
    // And performance should no longer be highlighted
    const perfButton = screen.getByText(/Rendimiento/).closest('button');
    expect(perfButton.style.fontWeight).toBe('500');
  });
});

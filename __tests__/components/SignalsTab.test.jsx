import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock recharts — jsdom can't render SVG charts
vi.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  ReferenceLine: () => null,
}));

import SignalsTab from '../../app/components/tabs/SignalsTab';

const baseProps = {
  signals: [],
  signalAccuracy: null,
  accuracyDays: 7,
  setAccuracyDays: vi.fn(),
  fetchAccuracy: vi.fn(),
};

describe('SignalsTab', () => {
  it('renders SIGNAL ACCURACY heading', () => {
    render(<SignalsTab {...baseProps} />);
    expect(screen.getByText('PRECISION DE SENALES')).toBeTruthy();
  });

  it('shows gathering-data message when no accuracy data', () => {
    render(<SignalsTab {...baseProps} signalAccuracy={null} />);
    expect(screen.getByText(/Recopilando datos/)).toBeTruthy();
  });

  it('renders accuracy period buttons (7d, 30d)', () => {
    render(<SignalsTab {...baseProps} />);
    expect(screen.getByText('7d')).toBeTruthy();
    expect(screen.getByText('30d')).toBeTruthy();
  });

  it('calls setAccuracyDays and fetchAccuracy on period button click', () => {
    const setAccuracyDays = vi.fn();
    const fetchAccuracy = vi.fn();
    render(<SignalsTab {...baseProps} setAccuracyDays={setAccuracyDays} fetchAccuracy={fetchAccuracy} />);

    fireEvent.click(screen.getByText('30d'));

    expect(setAccuracyDays).toHaveBeenCalledWith(30);
    expect(fetchAccuracy).toHaveBeenCalledWith(30);
  });

  it('renders accuracy cards when data exists', () => {
    const accuracy = {
      overall: {
        hitRate1h: 62,
        hitRate4h: 58,
        hitRate24h: 55,
        avgChange1h: 0.3,
        avgChange4h: 0.8,
        avgChange24h: 1.5,
        total: 42,
      },
    };
    render(<SignalsTab {...baseProps} signalAccuracy={accuracy} />);

    expect(screen.getByText('1h Accuracy')).toBeTruthy();
    expect(screen.getByText('4h Accuracy')).toBeTruthy();
    expect(screen.getByText('24h Accuracy')).toBeTruthy();
    expect(screen.getByText('Signals')).toBeTruthy();
    expect(screen.getByText('62%')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('renders signal cards when signals provided', () => {
    const signals = [
      {
        asset: 'bitcoin',
        action: 'BUY',
        strength: 'STRONG BUY',
        confidence: 85,
        confluence: 'strong',
        timestamp: new Date().toISOString(),
        freshness: 'fresh',
        price: 65000,
        rr_ratio: 2.5,
      },
    ];
    render(<SignalsTab {...baseProps} signals={signals} />);

    expect(screen.getByText(/bitcoin/)).toBeTruthy();
    expect(screen.getByText('BUY')).toBeTruthy();
  });
});

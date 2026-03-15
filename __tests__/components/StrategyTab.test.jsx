import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StrategyTab from '../../app/components/tabs/StrategyTab';

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: () => <div data-testid="line-chart" />,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
  BarChart: () => <div data-testid="bar-chart" />,
  Bar: () => null,
  AreaChart: () => <div data-testid="area-chart" />,
  Area: () => null,
  ReferenceLine: () => null,
}));

// Mock BacktestTab and OptimizeTab as simple stubs
vi.mock('../../app/components/tabs/BacktestTab', () => ({
  default: (props) => <div data-testid="backtest-tab">BacktestTab</div>,
}));

vi.mock('../../app/components/tabs/OptimizeTab', () => ({
  default: (props) => <div data-testid="optimize-tab">OptimizeTab</div>,
}));

function buildProps(overrides = {}) {
  return {
    strategySubTab: 'config',
    setStrategySubTab: vi.fn(),
    bt: {},
    opt: { optParams: [], showSignalParams: false, setShowSignalParams: vi.fn() },
    paperConfig: {},
    setPaperConfig: vi.fn(),
    paperConfigForm: { allowed_strength: [] },
    setPaperConfigForm: vi.fn(),
    paperSavingConfig: false,
    setPaperSavingConfig: vi.fn(),
    paperShowConfig: false,
    setPaperShowConfig: vi.fn(),
    paperConfirmReset: false,
    setPaperConfirmReset: vi.fn(),
    paperConfirmFullReset: false,
    setPaperConfirmFullReset: vi.fn(),
    fetchDashboardPaper: vi.fn(),
    showAdvancedPerf: false,
    setShowAdvancedPerf: vi.fn(),
    advancedPerfDays: 30,
    setAdvancedPerfDays: vi.fn(),
    advancedPerf: null,
    authFetch: vi.fn(),
    apiUrl: 'http://localhost:5000',
    userId: 'test-user',
    ...overrides,
  };
}

describe('StrategyTab', () => {
  it('renders sub-tab buttons with Spanish labels', () => {
    render(<StrategyTab {...buildProps()} />);

    expect(screen.getByText(/Configuracion/)).toBeInTheDocument();
    expect(screen.getByText(/Backtest/)).toBeInTheDocument();
    expect(screen.getByText(/Optimizar/)).toBeInTheDocument();
  });

  it('calls setStrategySubTab when clicking a sub-tab', () => {
    const setStrategySubTab = vi.fn();
    render(<StrategyTab {...buildProps({ setStrategySubTab })} />);

    const backtestBtn = screen.getByText(/Backtest/).closest('button');
    fireEvent.click(backtestBtn);

    expect(setStrategySubTab).toHaveBeenCalledWith('backtest');
  });

  it('shows config content on config sub-tab (default)', () => {
    render(<StrategyTab {...buildProps()} />);

    // Config sub-tab renders the trading strategy header
    expect(screen.getByText(/ESTRATEGIA DE TRADING/)).toBeInTheDocument();

    // BacktestTab and OptimizeTab should NOT be rendered
    expect(screen.queryByTestId('backtest-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('optimize-tab')).not.toBeInTheDocument();
  });

  it('renders BacktestTab when subTab is backtest', () => {
    render(<StrategyTab {...buildProps({ strategySubTab: 'backtest' })} />);

    expect(screen.getByTestId('backtest-tab')).toBeInTheDocument();
    // Config content should not be visible
    expect(screen.queryByText(/ESTRATEGIA DE TRADING/)).not.toBeInTheDocument();
  });

  it('renders OptimizeTab when subTab is optimize', () => {
    render(<StrategyTab {...buildProps({ strategySubTab: 'optimize' })} />);

    expect(screen.getByTestId('optimize-tab')).toBeInTheDocument();
    // Config content should not be visible
    expect(screen.queryByText(/ESTRATEGIA DE TRADING/)).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock recharts — jsdom can't render SVG charts
vi.mock('recharts', () => ({
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

// Mock sub-components as simple divs with data-testid
vi.mock('../../app/components/execution/OrderEntryForm', () => ({
  default: (props) => <div data-testid="order-entry-form" />,
}));
vi.mock('../../app/components/execution/OrderBook', () => ({
  default: (props) => <div data-testid="order-book" />,
}));
vi.mock('../../app/components/execution/PositionMonitor', () => ({
  default: (props) => <div data-testid="position-monitor" />,
}));
vi.mock('../../app/components/execution/RiskDashboard', () => ({
  default: (props) => <div data-testid="risk-dashboard" />,
}));
vi.mock('../../app/components/execution/KillSwitchButton', () => ({
  default: (props) => <div data-testid="kill-switch-button" />,
}));
vi.mock('../../app/components/execution/ExecutionModeToggle', () => ({
  default: (props) => <div data-testid="execution-mode-toggle" />,
}));
vi.mock('../../app/components/execution/ExecutionAuditLog', () => ({
  default: (props) => <div data-testid="execution-audit-log" />,
}));

import ExecutionTab from '../../app/components/tabs/ExecutionTab';

const baseProps = {
  execSubTab: 'dashboard',
  setExecSubTab: vi.fn(),
  execOrders: [],
  execRiskDashboard: null,
  execAuditLog: [],
  execKillSwitchActive: false,
  execMode: 'paper',
  execAutoExecute: false,
  execManualOrdersEnabled: false,
  execFeedback: null,
  execLoading: false,
  paperConfig: null,
  paperPositions: [],
  paperHistory: [],
  paperMetrics: null,
  paperConfigForm: null,
  setPaperConfigForm: vi.fn(),
  paperClosingTrade: null,
  setPaperClosingTrade: vi.fn(),
  paperHistoryPage: 0,
  setPaperHistoryPage: vi.fn(),
  paperHistoryTotal: 0,
  paperLoading: false,
  correlationData: null,
  showAdvancedPerf: false,
  setShowAdvancedPerf: vi.fn(),
  advancedPerfDays: 30,
  setAdvancedPerfDays: vi.fn(),
  advancedPerf: null,
  setExecMode: vi.fn(),
  setExecAutoExecute: vi.fn(),
  setExecManualOrdersEnabled: vi.fn(),
  setExecFeedback: vi.fn(),
  setPaperConfig: vi.fn(),
  handleKillSwitch: vi.fn(),
  handleCreateOrder: vi.fn(),
  handleCancelOrder: vi.fn(),
  handleSubmitOrder: vi.fn(),
  fetchDashboardPaper: vi.fn(),
  loadExecutionData: vi.fn(),
  authFetch: vi.fn(),
  apiUrl: 'http://localhost:3001',
  userId: 'test-user',
};

describe('ExecutionTab', () => {
  it('renders sub-tab buttons (Dashboard, Posiciones, Historial)', () => {
    render(<ExecutionTab {...baseProps} />);
    expect(screen.getByText(/📊 Dashboard/)).toBeTruthy();
    expect(screen.getByText(/📈 Posiciones/)).toBeTruthy();
    expect(screen.getByText(/📋 Historial/)).toBeTruthy();
  });

  it('calls setExecSubTab when clicking a sub-tab', () => {
    const setExecSubTab = vi.fn();
    render(<ExecutionTab {...baseProps} setExecSubTab={setExecSubTab} />);

    fireEvent.click(screen.getByText(/Posiciones/));

    expect(setExecSubTab).toHaveBeenCalledWith('positions');
  });

  it('renders ExecutionModeToggle on dashboard sub-tab', () => {
    render(<ExecutionTab {...baseProps} execSubTab="dashboard" />);
    expect(screen.getByTestId('execution-mode-toggle')).toBeTruthy();
  });

  it('shows paper status when paperConfig exists', () => {
    const paperConfig = {
      is_enabled: true,
      current_capital: 12000,
      initial_capital: 10000,
    };
    render(<ExecutionTab {...baseProps} execSubTab="dashboard" paperConfig={paperConfig} />);
    expect(screen.getByText('PAPER TRADING ACTIVO')).toBeTruthy();
  });

  it('renders positions section when subTab is positions', () => {
    render(<ExecutionTab {...baseProps} execSubTab="positions" />);
    expect(screen.getByTestId('position-monitor')).toBeTruthy();
  });

  it('renders history section when subTab is history', () => {
    render(<ExecutionTab {...baseProps} execSubTab="history" paperHistory={[]} />);
    expect(screen.getByText(/HISTORIAL DE TRADES/)).toBeTruthy();
  });
});

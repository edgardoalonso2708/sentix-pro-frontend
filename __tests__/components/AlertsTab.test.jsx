import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock authFetch
const mockAuthFetch = vi.fn();
vi.mock('../../app/lib/api', () => ({
  authFetch: (...args) => mockAuthFetch(...args),
}));

import AlertsTab from '../../app/components/tabs/AlertsTab';

const baseProps = {
  alertConfig: { email: '' },
  setAlertConfig: vi.fn(),
  alerts: [],
  alertTestResult: null,
  setAlertTestResult: vi.fn(),
  alertTesting: false,
  setAlertTesting: vi.fn(),
  alertShowFilters: false,
  setAlertShowFilters: vi.fn(),
  alertFilterForm: {
    minConfidence: 60,
    actions: ['STRONG BUY', 'STRONG SELL'],
    assets: [],
  },
  setAlertFilterForm: vi.fn(),
  alertSavingFilters: false,
  setAlertSavingFilters: vi.fn(),
  alertFilterSaveMsg: null,
  setAlertFilterSaveMsg: vi.fn(),
  apiUrl: 'http://localhost:3001',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AlertsTab', () => {
  it('renders Telegram setup section', () => {
    render(<AlertsTab {...baseProps} />);
    expect(screen.getByText(/ALERTAS POR TELEGRAM/)).toBeTruthy();
  });

  it('renders alert configuration section', () => {
    render(<AlertsTab {...baseProps} />);
    expect(screen.getByText('CONFIGURACION DE ALERTAS')).toBeTruthy();
  });

  it('renders test alert button', () => {
    render(<AlertsTab {...baseProps} />);
    const buttons = screen.getAllByRole('button');
    // Should have at least the test alert button
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders custom filters section heading', () => {
    render(<AlertsTab {...baseProps} />);
    expect(screen.getByText('FILTROS PERSONALIZADOS')).toBeTruthy();
  });

  it('shows filter form when alertShowFilters is true', () => {
    render(<AlertsTab {...baseProps} alertShowFilters={true} />);
    // Filter form should show action checkboxes
    expect(screen.getByText(/STRONG BUY/)).toBeTruthy();
    expect(screen.getByText(/STRONG SELL/)).toBeTruthy();
  });

  it('shows test result on success', () => {
    render(<AlertsTab {...baseProps} alertTestResult={{ success: true }} />);
    expect(screen.getByText(/Test procesado/)).toBeTruthy();
  });

  it('shows test result on error', () => {
    render(<AlertsTab {...baseProps} alertTestResult={{ success: false }} />);
    expect(screen.getByText(/Error/)).toBeTruthy();
  });

  it('renders email textarea', () => {
    render(<AlertsTab {...baseProps} />);
    const textarea = screen.getByPlaceholderText(/email/i);
    expect(textarea).toBeTruthy();
  });
});

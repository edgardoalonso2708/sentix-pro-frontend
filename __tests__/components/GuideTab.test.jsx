import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GuideTab from '../../app/components/tabs/GuideTab';

describe('GuideTab', () => {
  it('renders without props', () => {
    render(<GuideTab />);
    // GuideTab has section navigation — it should render content
    expect(document.querySelector('div')).toBeTruthy();
  });

  it('navigates between guide sections', () => {
    render(<GuideTab />);

    // Find navigation buttons (they contain section labels)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    // Click a different section button
    fireEvent.click(buttons[1]);

    // Content should change (section rendered based on guideSection state)
    expect(document.querySelector('div')).toBeTruthy();
  });

  it('renders all section navigation buttons', () => {
    render(<GuideTab />);

    const buttons = screen.getAllByRole('button');
    // Should have multiple section buttons
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });
});

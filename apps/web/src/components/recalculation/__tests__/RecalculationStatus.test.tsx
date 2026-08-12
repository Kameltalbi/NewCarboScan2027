import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { RecalculationStatus } from '../RecalculationStatus';

// Mock useRecalculation hook
vi.mock('@/hooks/useRecalculation', () => ({
  useRecalculation: () => ({
    isRecalculating: false,
    latestTask: null,
    history: [],
    triggerRecalculation: vi.fn(),
    loadHistory: vi.fn(),
  }),
}));

describe('RecalculationStatus', () => {
  it('renders the card title', () => {
    render(<RecalculationStatus organizationId="org-123" />);
    expect(screen.getByText('Recalcul automatique')).toBeInTheDocument();
  });

  it('shows empty state when no latest task', () => {
    render(<RecalculationStatus organizationId="org-123" />);
    expect(screen.getByText('Aucun recalcul récent')).toBeInTheDocument();
  });

  it('shows manual trigger button by default', () => {
    render(<RecalculationStatus organizationId="org-123" />);
    expect(screen.getByText('Recalculer maintenant')).toBeInTheDocument();
  });

  it('hides manual trigger button when showManualTrigger is false', () => {
    render(<RecalculationStatus organizationId="org-123" showManualTrigger={false} />);
    expect(screen.queryByText('Recalculer maintenant')).not.toBeInTheDocument();
  });
});

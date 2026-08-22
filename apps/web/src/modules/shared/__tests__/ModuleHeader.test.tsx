import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import { ModuleHeader } from '../ModuleHeader';

// Mock dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}));

vi.mock('@/hooks/useOrganizationYears', () => ({
  useOrganizationYears: () => ({ allowedYears: [2024, 2025], isLoading: false }),
}));

vi.mock('@/contexts/AppDataContext', () => ({
  useAppData: () => ({ organizationId: 'org-test' }),
}));

vi.mock('@/components/ui/sidebar', () => ({
  SidebarTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/shared/OrganizationSwitcher', () => ({
  OrganizationSwitcher: () => <div data-testid="org-switcher" />,
}));

vi.mock('sonner', () => ({
  toast: { info: vi.fn() },
}));

const defaultUser = {
  name: 'Jean Dupont',
  email: 'jean@test.com',
  company: 'TestCorp',
};

describe('ModuleHeader', () => {
  it('renders with banner role and aria-label', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <ModuleHeader user={defaultUser} />
      </MemoryRouter>
    );
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header).toHaveAttribute('aria-label', 'En-tête du module');
  });

  it('displays tenant name and email', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <ModuleHeader user={defaultUser} />
      </MemoryRouter>
    );
    expect(screen.getByText('TestCorp')).toBeInTheDocument();
    expect(screen.getByText('jean@test.com')).toBeInTheDocument();
  });

  it('shows "Tableau de bord" on dashboard route', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <ModuleHeader user={defaultUser} />
      </MemoryRouter>
    );
    expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
  });

  it('shows module name when currentModule is provided', () => {
    render(
      <MemoryRouter initialEntries={['/app/bilan-carbone']}>
        <ModuleHeader
          user={defaultUser}
          currentModule={{ name: 'Bilan Carbone', description: 'Description', slug: 'bilan-carbone', route: '/app/bilan-carbone' }}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Bilan Carbone')).toBeInTheDocument();
  });

  it('renders sidebar trigger with accessible label', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <ModuleHeader user={defaultUser} />
      </MemoryRouter>
    );
    expect(screen.getByLabelText('Ouvrir/Fermer le menu latéral')).toBeInTheDocument();
  });
});

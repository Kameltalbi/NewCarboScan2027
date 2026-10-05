import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import { ModuleHeader } from '../ModuleHeader';

const supplierLabelsMock = vi.hoisted(() => ({
  current: {
    isBank: false,
    moduleTitle: 'Fournisseurs',
    pageTitle: 'Engagement fournisseurs',
  },
}));

// Mock dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}));

vi.mock('@/hooks/useOrganizationYears', () => ({
  useOrganizationYears: () => ({ allowedYears: [2024, 2025], isLoading: false }),
}));

vi.mock('@/hooks/useSupplierLabels', () => ({
  useSupplierLabels: () => supplierLabelsMock.current,
}));

vi.mock('@/contexts/AppDataContext', () => ({
  useAppData: () => ({ organizationId: 'org-test' }),
}));

const organizationMock = vi.hoisted(() => ({
  current: { logo_url: null as string | null },
}));

vi.mock('@/hooks/useOrganizationData', () => ({
  useOrganizationData: () => ({
    organization: organizationMock.current,
    organizationId: 'org-test',
    referenceYear: 2025,
    loading: false,
    error: null,
  }),
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
  beforeEach(() => {
    supplierLabelsMock.current = {
      isBank: false,
      moduleTitle: 'Fournisseurs',
      pageTitle: 'Engagement fournisseurs',
    };
    organizationMock.current = { logo_url: null };
  });

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

  it('shows bank label on fournisseurs route for financial orgs', () => {
    supplierLabelsMock.current = {
      isBank: true,
      moduleTitle: 'Émissions financées',
      pageTitle: 'Émissions financées — portefeuille PCAF',
    };
    render(
      <MemoryRouter initialEntries={['/app/fournisseurs']}>
        <ModuleHeader
          user={defaultUser}
          currentModule={{
            name: 'Gestion Fournisseurs',
            description: 'desc',
            slug: 'fournisseurs',
            route: '/app/fournisseurs',
          }}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Émissions financées')).toBeInTheDocument();
    expect(screen.queryByText('Gestion Fournisseurs')).not.toBeInTheDocument();
  });

  it('renders sidebar trigger with accessible label', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <ModuleHeader user={defaultUser} />
      </MemoryRouter>
    );
    expect(screen.getByLabelText('Ouvrir/Fermer le menu latéral')).toBeInTheDocument();
  });

  it('places the organization logo in the center of the header', () => {
    organizationMock.current = { logo_url: 'https://example.com/banque.png' };
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <ModuleHeader user={defaultUser} />
      </MemoryRouter>
    );
    const logo = screen.getByAltText('Logo TestCorp');
    expect(logo).toHaveAttribute('src', 'https://example.com/banque.png');
    expect(logo).toHaveStyle({ height: "60px", maxWidth: "none" });
  });
});

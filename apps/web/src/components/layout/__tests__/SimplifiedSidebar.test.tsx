import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'sidebarNav.items.dashboard': 'Dashboard',
        'sidebarNav.items.collect': 'Collecte',
        'sidebarNav.items.emissionFactors': "Facteurs d'émission",
        'sidebarNav.items.bilanCarbone': 'Bilan Carbone',
        'sidebarNav.items.suppliers': 'Fournisseurs',
        'sidebarNav.items.empreinteProduit': 'Empreinte Produit',
        'sidebarNav.items.acv': 'ACV',
        'sidebarNav.items.wattbim': 'WattBim',
        'sidebarNav.items.actionPlan': "Plan d'actions",
        'sidebarNav.items.scenarios': 'Modélisation scénarios',
        'sidebarNav.items.settings': 'Paramètres',
        'sidebarNav.groups.carbonAccounting': 'Comptabilité carbone',
        'sidebarNav.groups.analysis': 'Analyse',
        'sidebarNav.groups.energyBuildings': 'Énergie & bâtiments',
        'sidebarNav.groups.climateStrategy': 'Stratégie climat',
        'sidebarNav.groups.system': 'Système',
        'navigation.loading': 'Chargement…',
        'navigation.comingSoonShort': 'Bientôt',
        'navigation.comingSoonFull': 'Bientôt disponible',
        'navigation.moduleLocked': 'Module verrouillé',
        'navigation.mainNavAria': 'Navigation principale',
        'navigation.modulesMenuAria': 'Menu des modules',
        'navigation.orgLogoAlt': 'Logo organisation',
      };
      return map[key] ?? key;
    },
    i18n: { language: 'fr' },
  }),
}));

vi.mock('@/hooks/useSupplierLabels', () => ({
  useSupplierLabels: () => ({
    moduleTitle: 'Fournisseurs',
  }),
}));

vi.mock('@/contexts/AppDataContext', () => ({
  useAppData: () => ({
    modules: [{ slug: 'bilan-carbone', name: 'Bilan Carbone' }],
    modulesLoading: false,
    organizationId: 'test-org',
    organizationLoading: false,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/integrations/api/client', () => ({
  api: {
    getOrganization: vi.fn().mockResolvedValue({ organization: null }),
  },
}));

vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children, ...props }: any) => <div data-testid="sidebar" {...props}>{children}</div>,
  SidebarContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SidebarMenu: ({ children }: any) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: any) => <li>{children}</li>,
  SidebarHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SidebarFooter: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

describe('SimplifiedSidebar', () => {
  it('renders with navigation landmark', async () => {
    const { SimplifiedSidebar } = await import('@/components/layout/SimplifiedSidebar');
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <SimplifiedSidebar />
      </MemoryRouter>
    );

    expect(screen.getByTestId('sidebar')).toBeDefined();
    expect(screen.getByLabelText('Navigation principale')).toBeDefined();
  });

  it('renders dashboard menu item', async () => {
    const { SimplifiedSidebar } = await import('@/components/layout/SimplifiedSidebar');
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <SimplifiedSidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeDefined();
  });

  it('renders emission factors item translated', async () => {
    const { SimplifiedSidebar } = await import('@/components/layout/SimplifiedSidebar');
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <SimplifiedSidebar />
      </MemoryRouter>
    );

    expect(screen.getByText("Facteurs d'émission")).toBeDefined();
  });
});

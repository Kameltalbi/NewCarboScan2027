import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
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

vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children, ...props }: any) => <div data-testid="sidebar" {...props}>{children}</div>,
  SidebarContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SidebarMenu: ({ children }: any) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: any) => <li>{children}</li>,
  SidebarHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SidebarFooter: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  },
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

  it('renders logout button', async () => {
    const { SimplifiedSidebar } = await import('@/components/layout/SimplifiedSidebar');
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <SimplifiedSidebar />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Déconnexion')).toBeDefined();
  });
});

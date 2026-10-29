import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ModuleProtectedRoute } from '../ModuleProtectedRoute';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'user@example.com' },
    isLoading: false,
  }),
}));

vi.mock('@/contexts/AppDataContext', () => ({
  useAppData: () => ({
    userRole: 'admin',
    roleLoading: false,
    isSuperAdmin: false,
    modules: [],
    modulesLoading: false,
    subscriptionLoading: false,
  }),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/contact" element={<div>Page contact</div>} />
        <Route
          path="/app/parametres"
          element={
            <ModuleProtectedRoute>
              <div>Page paramètres</div>
            </ModuleProtectedRoute>
          }
        />
        <Route
          path="/app/bilan-carbone"
          element={
            <ModuleProtectedRoute>
              <div>Page bilan</div>
            </ModuleProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ModuleProtectedRoute', () => {
  it('keeps settings available when the organization has no purchased module', () => {
    renderAt('/app/parametres');
    expect(screen.getByText('Page paramètres')).toBeInTheDocument();
    expect(screen.queryByText('Page contact')).not.toBeInTheDocument();
  });

  it('still sends a locked module to the contact page when none is purchased', () => {
    renderAt('/app/bilan-carbone');
    expect(screen.getByText('Page contact')).toBeInTheDocument();
  });
});

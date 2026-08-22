import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';

const { mockMe } = vi.hoisted(() => ({
  mockMe: vi.fn(),
}));

vi.mock('@/integrations/api/client', () => ({
  api: { me: mockMe },
}));

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn(), info: vi.fn() },
  default: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn(), info: vi.fn() },
}));

import { useUserRole } from '../useUserRole';

describe('useUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null role when no user', async () => {
    mockMe.mockRejectedValue(new Error('Authentication required'));

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.userRole).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('fetches role via /auth/me when user exists', async () => {
    mockMe.mockResolvedValue({
      user: { id: 'user-123', email: 'test@test.com', role: 'admin' },
      organizations: [],
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.userRole).toBe('admin');
    });

    expect(mockMe).toHaveBeenCalled();
  });

  it('isSuperAdmin returns true for superadmin role', async () => {
    mockMe.mockResolvedValue({
      user: { id: '1', email: 'sa@test.com', role: 'superadmin', platformRole: 'superadmin' },
      organizations: [],
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.userRole).toBe('superadmin');
    });

    expect(result.current.isSuperAdmin()).toBe(true);
    expect(result.current.isAdmin()).toBe(true);
    expect(result.current.hasRole('user')).toBe(true);
  });

  it('isAdmin returns true for admin, false for isSuperAdmin', async () => {
    mockMe.mockResolvedValue({
      user: { id: '1', email: 'admin@test.com', role: 'admin' },
      organizations: [],
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.userRole).toBe('admin');
    });

    expect(result.current.isAdmin()).toBe(true);
    expect(result.current.isSuperAdmin()).toBe(false);
    expect(result.current.hasRole('superadmin')).toBe(false);
  });

  it('falls back to user role on unknown role', async () => {
    mockMe.mockResolvedValue({
      user: { id: '1', email: 'u@test.com', role: 'viewer' },
      organizations: [],
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.userRole).toBe('user');
    });
  });
});

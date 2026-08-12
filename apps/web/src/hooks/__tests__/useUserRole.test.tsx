import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';

const { mockGetSession, mockOnAuthStateChange, mockRpc, mockFrom } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
    rpc: mockRpc,
    from: mockFrom,
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn(), info: vi.fn() },
  default: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn(), info: vi.fn() },
}));

import { useUserRole } from '../useUserRole';

describe('useUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('returns null role when no user', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.userRole).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('fetches role via RPC when user exists', async () => {
    const mockUser = { id: 'user-123', email: 'test@test.com' };
    mockGetSession.mockResolvedValue({ data: { session: { user: mockUser } } });
    mockRpc.mockResolvedValue({ data: 'admin', error: null });

    const { result } = renderHook(() => useUserRole());

    // Wait for role to be set (not just isLoading, since loading goes false before role fetch)
    await waitFor(() => {
      expect(result.current.userRole).toBe('admin');
    });

    expect(mockRpc).toHaveBeenCalledWith('get_user_role', { _user_id: 'user-123' });
  });

  it('isSuperAdmin returns true for superadmin role', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: '1' } } } });
    mockRpc.mockResolvedValue({ data: 'superadmin', error: null });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.userRole).toBe('superadmin');
    });

    expect(result.current.isSuperAdmin()).toBe(true);
    expect(result.current.isAdmin()).toBe(true);
    expect(result.current.hasRole('user')).toBe(true);
  });

  it('isAdmin returns true for admin, false for isSuperAdmin', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: '1' } } } });
    mockRpc.mockResolvedValue({ data: 'admin', error: null });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.userRole).toBe('admin');
    });

    expect(result.current.isAdmin()).toBe(true);
    expect(result.current.isSuperAdmin()).toBe(false);
    expect(result.current.hasRole('superadmin')).toBe(false);
  });

  it('falls back to user role on RPC error', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: '1' } } } });
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.userRole).toBe('user');
    });
  });
});

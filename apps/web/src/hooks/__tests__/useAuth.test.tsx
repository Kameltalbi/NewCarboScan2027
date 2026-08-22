import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import React from 'react';
import { AuthProvider, useAuth } from '../useAuth';
import { api } from '@/integrations/api/client';

vi.mock('@/integrations/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/integrations/api/client')>(
    '@/integrations/api/client',
  );
  return {
    ...actual,
    api: {
      ...actual.api,
      logout: vi.fn(actual.api.logout),
      me: vi.fn(),
    },
  };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('throws when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('starts with loading state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBeDefined();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('resolves to unauthenticated when no session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('signOut clears user and session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(api.logout).toHaveBeenCalled();
  });

  it('signOut still clears state if logout throws', async () => {
    vi.mocked(api.logout).mockImplementationOnce(() => {
      throw new Error('Session expired');
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.signOut();
      } catch {
        /* still clear via hook if possible */
      }
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});

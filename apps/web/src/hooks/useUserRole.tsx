import React, { useState, useEffect } from "react";
import { api, type User } from "@/integrations/api/client";
import { logger } from '@/utils/logger';

export type UserRole = 'user' | 'admin' | 'superadmin' | 'financeur';

const mapApiRole = (role?: string | null): UserRole => {
  if (role === 'superadmin') return 'superadmin';
  if (role === 'financeur') return 'financeur';
  if (role === 'admin' || role === 'owner') return 'admin';
  return 'user';
};

export const useUserRole = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { user: me } = await api.me();
        if (cancelled) return;
        setUser(me);
        setUserRole(mapApiRole(me.role ?? me.platformRole));
      } catch (error) {
        logger.error('useUserRole: Catch error:', error);
        if (!cancelled) {
          setUser(null);
          setUserRole(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const isSuperAdmin = () => userRole === 'superadmin';
  const isAdmin = () => userRole === 'admin' || userRole === 'superadmin';
  const hasRole = (role: UserRole) => {
    if (role === 'user') return true;
    if (role === 'admin') return userRole === 'admin' || userRole === 'superadmin';
    if (role === 'superadmin') return userRole === 'superadmin';
    return false;
  };

  return {
    user,
    userRole,
    isLoading,
    isSuperAdmin,
    isAdmin,
    hasRole
  };
};

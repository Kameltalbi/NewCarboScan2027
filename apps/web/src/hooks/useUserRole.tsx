import { useState, useEffect } from "react";
import { supabase } from "@/integrations/api/client";
import { User } from "@/integrations/api/client";
import { logger } from '@/utils/logger';

export type UserRole = 'user' | 'admin' | 'superadmin' | 'financeur';

export const useUserRole = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.debug('useUserRole: Auth event:', event);
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setUserRole(null);
      setIsLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_user_role', { _user_id: user.id });

        if (!rpcError && rpcData) {
          setUserRole(rpcData);
          setIsLoading(false);
          return;
        }

        logger.warn('useUserRole: RPC failed, trying direct query...', rpcError);
        
        const { data: rolesData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error && error.code !== 'PGRST116') {
          logger.error('useUserRole: Error fetching user role:', error);
          setUserRole('user');
        } else if (rolesData && rolesData.length > 0) {
          let highestRole: UserRole = 'user';
          for (const roleItem of rolesData) {
            const roleStr = String(roleItem.role);
            if (roleStr === 'superadmin') {
              highestRole = 'superadmin';
              break;
            } else if (roleStr === 'admin') {
              highestRole = 'admin';
            } else if (roleStr === 'financeur') {
              highestRole = 'financeur';
            }
          }
          setUserRole(highestRole);
        } else {
          setUserRole('user');
        }
      } catch (error) {
        logger.error('useUserRole: Catch error:', error);
        setUserRole('user');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

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

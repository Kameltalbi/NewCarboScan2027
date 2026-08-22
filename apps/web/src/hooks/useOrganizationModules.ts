import { useState, useEffect } from 'react';
import { api } from "@/integrations/api/client";
import { useAuth } from './useAuth';
import { logger } from '@/utils/logger';

export interface OrganizationModule {
  module_id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  route: string;
  category: string | null;
  started_at: string | null;
  expires_at: string | null;
}

export const useOrganizationModules = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState<OrganizationModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchModules = async () => {
      if (!user) {
        setModules([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const { items } = await api.listOrgModules();
        setModules(
          (items || []).map((m) => ({
            ...m,
            route: m.route || `/${m.slug}`,
          })),
        );
      } catch (err) {
        logger.error('Error fetching organization modules:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setModules([]);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [user]);

  const hasModule = (slug: string): boolean => modules.some(m => m.slug === slug);
  const getModule = (slug: string): OrganizationModule | undefined =>
    modules.find(m => m.slug === slug);

  return { modules, loading, error, hasModule, getModule };
};

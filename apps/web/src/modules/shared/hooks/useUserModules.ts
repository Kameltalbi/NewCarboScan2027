import { useState, useEffect } from 'react';
import { api } from "@/integrations/api/client";
import { useAuth } from '@/hooks/useAuth';
import { ModuleConfig, moduleRegistry } from '@/modules';

export const useUserModules = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState<ModuleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserModules = async () => {
      if (!user?.id) {
        setModules([]);
        setLoading(false);
        return;
      }

      try {
        setOrganizationId(user.organizationId ?? null);
        const { items } = await api.listOrgModules();
        if (!items || items.length === 0) {
          setModules([]);
          setLoading(false);
          return;
        }

        const userModules: ModuleConfig[] = items
          .map((dbModule) => {
            const registryModule = moduleRegistry.find(m => m.slug === dbModule.slug);
            if (!registryModule) return null;
            return {
              ...registryModule,
              name: dbModule.name,
              description: dbModule.description || registryModule.description,
              icon: dbModule.icon || registryModule.icon,
              route: dbModule.route || registryModule.route,
            };
          })
          .filter((m): m is ModuleConfig => m !== null);

        setModules(userModules);
      } catch (error) {
        console.error('Error in useUserModules:', error);
        setModules(moduleRegistry.filter(m => m.category === 'core' && m.isActive));
      } finally {
        setLoading(false);
      }
    };

    fetchUserModules();
  }, [user?.id, user?.organizationId]);

  return { modules, loading, organizationId };
};

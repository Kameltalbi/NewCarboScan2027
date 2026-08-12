import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/api/client";
import { useAuth } from '@/hooks/useAuth';
import { ModuleConfig, moduleRegistry } from '@/modules';

interface UserModule {
  module_id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  category: string;
  started_at: string;
  expires_at: string | null;
}

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
        // 1. Get user's organization
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (orgError) {
          console.error('Error fetching organization:', orgError);
          // Fallback: show all modules if no organization
          setModules(moduleRegistry.filter(m => m.category === 'core' && m.isActive));
          setLoading(false);
          return;
        }

        if (!orgData) {
          // User has no organization - show all modules (trial/demo mode)
          setModules(moduleRegistry.filter(m => m.category === 'core' && m.isActive));
          setLoading(false);
          return;
        }

        setOrganizationId(orgData.id);

        // 2. Get organization's active modules
        const { data: activeModules, error: modulesError } = await supabase
          .rpc('get_organization_modules', { p_org_id: orgData.id });

        if (modulesError) {
          console.error('Error fetching modules:', modulesError);
          setModules(moduleRegistry.filter(m => m.category === 'core' && m.isActive));
          setLoading(false);
          return;
        }

        if (!activeModules || activeModules.length === 0) {
          // No modules activated - show empty or default module
          setModules([]);
          setLoading(false);
          return;
        }

        // 3. Map database modules to ModuleConfig
        const userModules: ModuleConfig[] = (activeModules as UserModule[])
          .map(dbModule => {
            // Find matching module in registry for component
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
        // Fallback to all modules
        setModules(moduleRegistry.filter(m => m.category === 'core' && m.isActive));
      } finally {
        setLoading(false);
      }
    };

    fetchUserModules();
  }, [user?.id]);

  return { modules, loading, organizationId };
};

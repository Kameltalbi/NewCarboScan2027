import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useOrganizationId } from './useOrganizationId';
import { api } from "@/integrations/api/client";

export type ModuleSlug = 'bilan-carbone' | 'empreinte-produit' | 'acv';

export interface ModuleAccess {
  'bilan-carbone': boolean;
  'empreinte-produit': boolean;
  'acv': boolean;
}

export const useModuleAccess = () => {
  const { user } = useAuth();
  const { organizationId } = useOrganizationId();
  const [moduleAccess, setModuleAccess] = useState<ModuleAccess>({
    'bilan-carbone': false,
    'empreinte-produit': false,
    'acv': false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModuleAccess = async () => {
      if (!user || !organizationId) {
        setModuleAccess({
          'bilan-carbone': false,
          'empreinte-produit': false,
          'acv': false,
        });
        setLoading(false);
        return;
      }

      try {
        const { items } = await api.listOrgModules();
        const access: ModuleAccess = {
          'bilan-carbone': true,
          'empreinte-produit': false,
          'acv': false,
        };
        for (const row of items || []) {
          if (row.slug === 'bilan-carbone') access['bilan-carbone'] = true;
          if (row.slug === 'empreinte-produit') access['empreinte-produit'] = true;
          if (row.slug === 'acv') access['acv'] = true;
        }
        setModuleAccess(access);
      } catch (error) {
        console.error('Error in useModuleAccess:', error);
        setModuleAccess({
          'bilan-carbone': true,
          'empreinte-produit': false,
          'acv': false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchModuleAccess();
  }, [user, organizationId]);

  const hasModule = (module: ModuleSlug): boolean => moduleAccess[module];
  const hasAnyModule = (modules: ModuleSlug[]): boolean => modules.some((module) => moduleAccess[module]);
  const hasAllModules = (modules: ModuleSlug[]): boolean => modules.every((module) => moduleAccess[module]);

  return { moduleAccess, loading, hasModule, hasAnyModule, hasAllModules };
};

// Hook pour vérifier l'accès aux modules spécifiques
// Utilisé pour conditionner l'affichage du dashboard

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useOrganizationId } from './useOrganizationId';
import { supabase } from "@/integrations/api/client";

export type ModuleSlug = 'bilan-carbone' | 'empreinte-produit' | 'acv';

export interface ModuleAccess {
  'bilan-carbone': boolean;
  'empreinte-produit': boolean;
  'acv': boolean;
}

/**
 * Hook pour vérifier quels modules sont activés pour l'organisation
 */
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
        // Récupérer les modules activés pour l'organisation
        // organization_modules: org_id, module_id, active
        const { data: modules, error } = await supabase
          .from('organization_modules')
          .select('active, modules:module_id (slug)')
          .eq('org_id', organizationId)
          .eq('active', true);

        if (error) {
          console.error('Error fetching modules:', error);
          // En cas d'erreur, considérer que seul le Bilan Carbone est disponible (plan de base)
          setModuleAccess({
            'bilan-carbone': true,
            'empreinte-produit': false,
            'acv': false,
          });
          return;
        }

        // Construire l'objet d'accès
        const access: ModuleAccess = {
          'bilan-carbone': false,
          'empreinte-produit': false,
          'acv': false,
        };

        // Par défaut, le Bilan Carbone est toujours disponible (plan de base)
        access['bilan-carbone'] = true;

        // Vérifier les modules achetés
        if (modules) {
          modules.forEach((row: any) => {
            const slug = row?.modules?.slug as ModuleSlug | undefined;
            const active = !!row?.active;

            if (!slug) return;
            if (slug === 'bilan-carbone') access['bilan-carbone'] = active;
            if (slug === 'empreinte-produit') access['empreinte-produit'] = active;
            if (slug === 'acv') access['acv'] = active;
          });
        }

        setModuleAccess(access);
      } catch (error) {
        console.error('Error in useModuleAccess:', error);
        // En cas d'erreur, considérer que seul le Bilan Carbone est disponible
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

  const hasModule = (module: ModuleSlug): boolean => {
    return moduleAccess[module];
  };

  const hasAnyModule = (modules: ModuleSlug[]): boolean => {
    return modules.some((module) => moduleAccess[module]);
  };

  const hasAllModules = (modules: ModuleSlug[]): boolean => {
    return modules.every((module) => moduleAccess[module]);
  };

  return {
    moduleAccess,
    loading,
    hasModule,
    hasAnyModule,
    hasAllModules,
  };
};


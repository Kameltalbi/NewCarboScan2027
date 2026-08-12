/**
 * Hook pour gérer les sous-catégories Scope 3 personnalisées par organisation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { toast } from 'sonner';
import type { Scope3Subcategory } from '@/lib/scope3/subcategories';

export interface OrganizationSubcategory {
  id: string;
  organization_id: string;
  scope3_category_id: string;
  value: string;
  label: string;
  default_unit: string;
  alternative_units: string[];
  input_type: 'mass' | 'monetary' | 'quantity';
  description?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSubcategoryInput {
  scope3_category_id: string;
  label: string;
  default_unit?: string;
  alternative_units?: string[];
  input_type?: 'mass' | 'monetary' | 'quantity';
  description?: string;
}

export function useOrganizationSubcategories(categoryId?: string) {
  const { organizationId } = useOrganizationData();
  const queryClient = useQueryClient();

  // Récupérer les sous-catégories personnalisées
  const { data: customSubcategories = [], isLoading } = useQuery({
    queryKey: ['organization-subcategories', organizationId, categoryId],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('organization_scope3_subcategories')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (categoryId) {
        query = query.eq('scope3_category_id', categoryId);
      }

      const { data, error } = await query.order('label');

      if (error) {
        console.error('Error fetching custom subcategories:', error);
        return [];
      }

      return data as OrganizationSubcategory[];
    },
    enabled: !!organizationId,
  });

  // Créer une nouvelle sous-catégorie
  const createSubcategory = useMutation({
    mutationFn: async (input: CreateSubcategoryInput) => {
      if (!organizationId) throw new Error('No organization');

      // Générer une clé unique
      const uniqueValue = `custom_${input.scope3_category_id}_${Date.now()}`;

      const { data, error } = await supabase
        .from('organization_scope3_subcategories')
        .insert({
          organization_id: organizationId,
          scope3_category_id: input.scope3_category_id,
          value: uniqueValue,
          label: input.label,
          default_unit: input.default_unit || 't',
          alternative_units: input.alternative_units || ['kg', 'TND'],
          input_type: input.input_type || 'mass',
          description: input.description,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-subcategories', organizationId] });
      toast.success('Sous-catégorie créée avec succès');
    },
    onError: (error) => {
      console.error('Error creating subcategory:', error);
      toast.error('Erreur lors de la création');
    },
  });

  // Supprimer une sous-catégorie
  const deleteSubcategory = useMutation({
    mutationFn: async (subcategoryId: string) => {
      const { error } = await supabase
        .from('organization_scope3_subcategories')
        .update({ is_active: false })
        .eq('id', subcategoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-subcategories', organizationId] });
      toast.success('Sous-catégorie supprimée');
    },
    onError: (error) => {
      console.error('Error deleting subcategory:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  // Convertir en format Scope3Subcategory pour l'interface
  const toScope3Subcategory = (custom: OrganizationSubcategory): Scope3Subcategory => ({
    value: custom.value,
    label: custom.label,
    categoryId: custom.scope3_category_id as any,
    defaultUnit: custom.default_unit,
    alternativeUnits: custom.alternative_units,
    inputType: custom.input_type,
    description: custom.description,
  });

  return {
    customSubcategories,
    customSubcategoriesAsScope3: customSubcategories.map(toScope3Subcategory),
    isLoading,
    createSubcategory,
    deleteSubcategory,
    organizationId,
  };
}

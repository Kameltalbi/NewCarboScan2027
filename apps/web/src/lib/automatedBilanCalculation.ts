// Calcul automatique du bilan carbone depuis activity_data (module Collecte)
// Les questionnaires ne sont plus utilisés — tout passe par activity_data.

import { supabase, sessionAuth} from "@/integrations/api/client";
import { BilanCarboneCalculator } from './calculators/BilanCarboneCalculator';
import { logger } from '@/utils/logger';

export interface CollectedData {
  session_id: string;
  user_id: string;
  company_id: string | null;
  year: number;
  responses?: Record<string, any>; // legacy, ignoré
  metadata: {
    source: string;
    validated: boolean;
  };
}

export interface BilanResult {
  bilan_id: string;
  emissions: {
    total: number;
    scope1: number;
    scope2: number;
    scope3: number;
  };
}

/**
 * Résoudre l'organization_id depuis un user_id
 */
async function resolveOrganizationId(userId: string): Promise<string> {
  // Propriétaire ?
  const { data: ownedOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (ownedOrg) return ownedOrg.id;

  // Membre ?
  const { data: memberOrg } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (memberOrg) return memberOrg.organization_id;

  throw new Error('Organisation non trouvée pour cet utilisateur');
}

/**
 * Calculer automatiquement le bilan carbone depuis activity_data (Collecte).
 * Ne dépend plus d'aucun questionnaire.
 */
export async function automatedBilanCalculation(
  collectedData: CollectedData
): Promise<BilanResult> {
  try {
    const { data: { user } } = await sessionAuth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const organizationId = await resolveOrganizationId(collectedData.user_id);

    const periodStart = new Date(collectedData.year, 0, 1).toISOString();
    const periodEnd = new Date(collectedData.year, 11, 31, 23, 59, 59).toISOString();

    // Calculer depuis activity_data (source unique de vérité)
    const bilanResult = await BilanCarboneCalculator.calculate(
      organizationId,
      periodStart,
      periodEnd
    );

    // Cache optionnel dans bilans_carbone
    let bilanId: string | null = null;
    try {
      const { data: bilan, error } = await supabase
        .from('bilans_carbone')
        .insert({
          user_id: collectedData.user_id,
          company_id: collectedData.company_id,
          organization_id: organizationId,
          scope1_emission: bilanResult.scope1,
          scope2_emission: bilanResult.scope2,
          scope3_emission: bilanResult.scope3,
          total_emission: bilanResult.totalEmissions,
          date_bilan: new Date().toISOString(),
          analyse_commentaire: `[COLLECTE] Bilan calculé depuis activity_data : ${Math.round(bilanResult.totalEmissions / 1000)} tCO₂e`,
        })
        .select('id')
        .single();

      if (!error) {
        bilanId = bilan.id;
        logger.debug('✅ Cache bilan carbone sauvegardé (source: activity_data)');
      }
    } catch (saveError) {
      logger.warn('⚠️ Cache bilan non sauvegardé (non bloquant):', saveError);
    }

    return {
      bilan_id: bilanId || 'cache-not-saved',
      emissions: {
        total: bilanResult.totalEmissions,
        scope1: bilanResult.scope1,
        scope2: bilanResult.scope2,
        scope3: bilanResult.scope3,
      },
    };
  } catch (error) {
    console.error('Erreur calcul automatique:', error);
    throw error;
  }
}

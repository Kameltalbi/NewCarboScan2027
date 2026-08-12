/**
 * Presets secteur : charger et appliquer les catégories Scope 3 selon le secteur d'activité.
 * Applique uniquement en mode additif (active les catégories du preset, ne désactive rien).
 */

import { supabase } from "@/integrations/api/client";
import { Scope3ActivationService } from './activation-service';
import type { Scope3CategoryId } from './ghg-protocol-categories';

export interface SectorPreset {
  id: string;
  code: string;
  name: string;
  scope3_category_ids: string[];
}

const SECTOR_TO_PRESET_CODE: Record<string, string> = {
  // Automobile
  'Concession automobile': 'concession_automobile',
  'Automobile': 'concession_automobile',
  
  // Finance et assurance
  'Finance et assurance': 'finance_assurance',
  'Banque': 'finance_assurance',
  'Assurance': 'finance_assurance',
  'Finance': 'finance_assurance',
  'Banque et Assurance': 'finance_assurance',
  
  // Agriculture
  'Agriculture': 'agriculture',
  
  // Industrie manufacturière
  'Industrie manufacturière': 'industrie_manufacturiere',
  'Industrie': 'industrie_manufacturiere',
  'Manufacturier': 'industrie_manufacturiere',
  
  // Construction / Immobilier
  'Construction': 'construction',
  'BTP': 'construction',
  'Bâtiment': 'construction',
  'Immobilier': 'construction',
  
  // Commerce
  'Commerce': 'commerce',
  'Distribution': 'commerce',
  'Retail': 'commerce',
  
  // Transport et logistique
  'Transport et logistique': 'transport_logistique',
  'Transport': 'transport_logistique',
  'Logistique': 'transport_logistique',
  
  // Services
  'Services': 'services',
  'Services aux entreprises': 'services',
  'Conseil': 'services',
  
  // Énergie
  'Énergie': 'energie',
  'Energie': 'energie',
  'Utilities': 'energie',
  
  // Technologies de l'information
  'Technologies de l\'information': 'technologies_information',
  'IT': 'technologies_information',
  'Numérique': 'technologies_information',
  'Tech': 'technologies_information',
  
  // Santé
  'Santé': 'sante',
  'Sante': 'sante',
  'Hôpital': 'sante',
  'Clinique': 'sante',
  'Pharma': 'sante',
  
  // Éducation
  'Éducation': 'education',
  'Education': 'education',
  'Enseignement': 'education',
  
  // Cimenterie
  'Cimenterie': 'cimenterie',
  'Ciment': 'cimenterie',
  'Béton': 'cimenterie',
  
  // Agroalimentaire
  'Agroalimentaire': 'agroalimentaire',
  'Agro-alimentaire': 'agroalimentaire',
  'Alimentaire': 'agroalimentaire',
  'Food': 'agroalimentaire',
  
  // Hôtellerie / Restauration
  'Hôtellerie / Restauration': 'hotellerie_restauration',
  'Hôtellerie': 'hotellerie_restauration',
  'Restauration': 'hotellerie_restauration',
  'CHR': 'hotellerie_restauration',
  'Hôtel': 'hotellerie_restauration',
  'Restaurant': 'hotellerie_restauration',
  
  // Chimie / Pharmacie
  'Chimie / Pharmacie': 'chimie_pharmacie',
  'Chimie': 'chimie_pharmacie',
  'Pharmacie': 'chimie_pharmacie',
  'Pharmaceutique': 'chimie_pharmacie',
  
  // Textile / Mode
  'Textile / Mode': 'textile_mode',
  'Textile': 'textile_mode',
  'Mode': 'textile_mode',
  'Habillement': 'textile_mode',
  'Vêtements': 'textile_mode',
  
  // Télécommunications
  'Télécommunications': 'telecommunications',
  'Telecom': 'telecommunications',
  'Télécom': 'telecommunications',
  
  // Coworking
  'Coworking': 'coworking',
  'Espace de coworking': 'coworking',
  'Espaces partagés': 'coworking',
};

/**
 * Récupère un preset par son code (ex. concession_automobile).
 */
export async function getPresetByCode(code: string): Promise<SectorPreset | null> {
  const { data, error } = await supabase
    .from('sector_presets')
    .select('id, code, name, scope3_category_ids')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    console.error('Error fetching sector preset:', error);
    return null;
  }
  return data as SectorPreset | null;
}

/**
 * Retourne le code preset si le secteur enregistré correspond à un preset (ex. "Concession automobile" -> "concession_automobile").
 */
export function getPresetCodeForSector(sector: string | null): string | null {
  if (!sector?.trim()) return null;
  return SECTOR_TO_PRESET_CODE[sector.trim()] ?? null;
}

/**
 * Applique le preset pour une organisation : active toutes les catégories Scope 3 du preset (additif uniquement).
 */
export async function applyPresetForOrganization(
  organizationId: string,
  presetCode: string
): Promise<void> {
  const preset = await getPresetByCode(presetCode);
  if (!preset?.scope3_category_ids?.length) return;

  const validIds = preset.scope3_category_ids.filter(
    (id): id is Scope3CategoryId =>
      typeof id === 'string' && id.length > 0
  );

  await Scope3ActivationService.batchUpdate(
    organizationId,
    validIds.map((categoryId) => ({
      categoryId,
      isActive: true,
      reason: `Preset secteur: ${preset.name}`,
    }))
  );
}

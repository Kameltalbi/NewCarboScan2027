// Service de gestion de la bibliothèque de paragraphes pour reporting
// Permet de récupérer, filtrer et assembler les paragraphes pour génération de rapports

import { supabase } from "@/integrations/api/client";

export interface ReportParagraph {
  paragraph_id: string;
  code_paragraph: string;
  version: number;
  status: 'draft' | 'active' | 'deprecated';
  author?: string;
  validated_by?: string;
  validation_date?: string;
  report_section: string;
  subsection?: string;
  display_order: number;
  title: string;
  body_text: string;
  variables_list: string[];
  activation_conditions: Record<string, any>;
  report_type: string[];
  regulatory_reference: string[];
  methodological_notes?: string;
  is_mandatory: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportTemplate {
  template_id: string;
  template_code: string;
  template_name: string;
  template_type: string;
  description?: string;
  paragraph_codes: string[];
  default_variables: Record<string, any>;
  is_active: boolean;
  version: number;
}

export interface GeneratedReport {
  report_id: string;
  organization_id: string;
  template_id?: string;
  report_title: string;
  report_type: string;
  period_start: string;
  period_end: string;
  paragraphs_used: any; // Snapshot JSON
  variables_values: Record<string, any>;
  file_url?: string;
  file_size?: number;
  generated_at: string;
  generated_by?: string;
  status: 'draft' | 'final' | 'archived';
}

export class ReportParagraphService {
  /**
   * Récupérer tous les paragraphes actifs
   */
  static async getAllActiveParagraphs(): Promise<ReportParagraph[]> {
    const { data, error } = await supabase
      .from('report_paragraphs')
      .select('*')
      .eq('status', 'active')
      .order('report_section', { ascending: true })
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Erreur récupération paragraphes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Récupérer les paragraphes d'une section spécifique
   */
  static async getParagraphsBySection(section: string): Promise<ReportParagraph[]> {
    const { data, error } = await supabase
      .from('report_paragraphs')
      .select('*')
      .eq('status', 'active')
      .eq('report_section', section)
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Erreur récupération paragraphes section: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Récupérer un paragraphe par son code
   */
  static async getParagraphByCode(code: string): Promise<ReportParagraph | null> {
    const { data, error } = await supabase
      .from('report_paragraphs')
      .select('*')
      .eq('code_paragraph', code)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Pas trouvé
      }
      throw new Error(`Erreur récupération paragraphe: ${error.message}`);
    }

    return data;
  }

  /**
   * Récupérer les paragraphes pour un template avec conditions
   */
  static async getParagraphsForReport(
    templateCode: string,
    conditions: Record<string, any> = {}
  ): Promise<ReportParagraph[]> {
    // Récupérer le template
    const template = await this.getTemplateByCode(templateCode);
    if (!template) {
      throw new Error(`Template ${templateCode} non trouvé`);
    }

    // Récupérer tous les paragraphes du template
    const { data, error } = await supabase
      .from('report_paragraphs')
      .select('*')
      .in('code_paragraph', template.paragraph_codes)
      .eq('status', 'active')
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Erreur récupération paragraphes: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Filtrer selon les conditions d'activation
    return data.filter((paragraph) => {
      // Si mandatory, toujours inclure
      if (paragraph.is_mandatory) {
        return true;
      }

      // Vérifier les conditions d'activation
      return this.checkActivationConditions(paragraph.activation_conditions, conditions);
    });
  }

  /**
   * Vérifier si les conditions d'activation sont satisfaites
   */
  private static checkActivationConditions(
    activationConditions: Record<string, any>,
    actualConditions: Record<string, any>
  ): boolean {
    // Si pas de conditions, toujours activé
    if (!activationConditions || Object.keys(activationConditions).length === 0) {
      return true;
    }

    // Vérifier chaque condition
    for (const [key, expectedValue] of Object.entries(activationConditions)) {
      const actualValue = actualConditions[key];

      // Condition avec opérateur ($gt, $lt, etc.)
      if (typeof expectedValue === 'object' && expectedValue !== null) {
        if ('$gt' in expectedValue && actualValue <= expectedValue.$gt) {
          return false;
        }
        if ('$lt' in expectedValue && actualValue >= expectedValue.$lt) {
          return false;
        }
        if ('$gte' in expectedValue && actualValue < expectedValue.$gte) {
          return false;
        }
        if ('$lte' in expectedValue && actualValue > expectedValue.$lte) {
          return false;
        }
        if ('$eq' in expectedValue && actualValue !== expectedValue.$eq) {
          return false;
        }
      } else {
        // Condition simple (égalité)
        if (actualValue !== expectedValue) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Remplacer les variables dans un texte
   */
  static replaceVariables(
    text: string,
    variables: Record<string, any>
  ): string {
    let result = text;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  /**
   * Remplir tous les paragraphes avec les variables
   */
  static fillParagraphsWithVariables(
    paragraphs: ReportParagraph[],
    variables: Record<string, any>
  ): ReportParagraph[] {
    return paragraphs.map((paragraph) => ({
      ...paragraph,
      title: this.replaceVariables(paragraph.title, variables),
      body_text: this.replaceVariables(paragraph.body_text, variables),
    }));
  }

  /**
   * Récupérer un template par son code
   */
  static async getTemplateByCode(code: string): Promise<ReportTemplate | null> {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('template_code', code)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erreur récupération template: ${error.message}`);
    }

    return data;
  }

  /**
   * Récupérer tous les templates actifs
   */
  static async getAllTemplates(): Promise<ReportTemplate[]> {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('is_active', true)
      .order('template_name', { ascending: true });

    if (error) {
      throw new Error(`Erreur récupération templates: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Sauvegarder un rapport généré
   */
  static async saveGeneratedReport(
    report: Omit<GeneratedReport, 'report_id' | 'generated_at'>
  ): Promise<string> {
    const { data, error } = await supabase
      .from('generated_reports')
      .insert({
        ...report,
        generated_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select('report_id')
      .single();

    if (error) {
      throw new Error(`Erreur sauvegarde rapport: ${error.message}`);
    }

    return data.report_id;
  }

  /**
   * Récupérer les rapports d'une organisation
   */
  static async getOrganizationReports(
    organizationId: string
  ): Promise<GeneratedReport[]> {
    const { data, error } = await supabase
      .from('generated_reports')
      .select('*')
      .eq('organization_id', organizationId)
      .order('generated_at', { ascending: false });

    if (error) {
      throw new Error(`Erreur récupération rapports: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Créer une nouvelle version d'un paragraphe
   */
  static async createParagraphVersion(
    paragraphId: string,
    newBodyText: string,
    changeReason?: string
  ): Promise<void> {
    const { error } = await supabase.rpc('create_paragraph_version', {
      p_paragraph_id: paragraphId,
      p_body_text: newBodyText,
      p_change_reason: changeReason,
    });

    if (error) {
      throw new Error(`Erreur création version: ${error.message}`);
    }
  }

  /**
   * Récupérer l'historique d'un paragraphe
   */
  static async getParagraphHistory(paragraphId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('report_paragraph_history')
      .select('*')
      .eq('paragraph_id', paragraphId)
      .order('version', { ascending: false });

    if (error) {
      throw new Error(`Erreur récupération historique: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Créer un nouveau paragraphe
   */
  static async createParagraph(
    paragraph: Omit<ReportParagraph, 'paragraph_id' | 'created_at' | 'updated_at'>
  ): Promise<string> {
    const { data, error } = await supabase
      .from('report_paragraphs')
      .insert(paragraph)
      .select('paragraph_id')
      .single();

    if (error) {
      throw new Error(`Erreur création paragraphe: ${error.message}`);
    }

    return data.paragraph_id;
  }

  /**
   * Mettre à jour un paragraphe
   */
  static async updateParagraph(
    paragraphId: string,
    updates: Partial<ReportParagraph>
  ): Promise<void> {
    const { error } = await supabase
      .from('report_paragraphs')
      .update(updates)
      .eq('paragraph_id', paragraphId);

    if (error) {
      throw new Error(`Erreur mise à jour paragraphe: ${error.message}`);
    }
  }

  /**
   * Supprimer un paragraphe (soft delete : status = deprecated)
   */
  static async deleteParagraph(paragraphId: string): Promise<void> {
    const { error } = await supabase
      .from('report_paragraphs')
      .update({ status: 'deprecated' })
      .eq('paragraph_id', paragraphId);

    if (error) {
      throw new Error(`Erreur suppression paragraphe: ${error.message}`);
    }
  }
}

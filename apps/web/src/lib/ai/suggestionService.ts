// Service IA pour suggestions intelligentes basées sur le contexte
import { supabase } from "@/integrations/api/client";
import { logger } from '@/utils/logger';

export interface AISuggestion {
  question_key: string;
  suggested_value: any;
  suggested_unit?: string;
  confidence: number;
  reasoning: string;
  context_used: {
    sector?: string;
    employee_count?: number;
    similar_companies?: number;
    historical_data?: boolean;
  };
}

export interface SuggestionContext {
  sector?: string;
  employee_count?: number;
  total_surface?: number;
  existing_responses?: Record<string, any>;
  year?: number;
}

/**
 * Service IA pour générer des suggestions intelligentes
 */
export class AISuggestionService {
  /**
   * Générer des suggestions pour une question basée sur le contexte
   * Utilise maintenant le service amélioré avec apprentissage
   */
  static async generateSuggestions(
    sessionId: string,
    questionKey: string,
    context: SuggestionContext
  ): Promise<AISuggestion | null> {
    try {
      // Générer une suggestion basée sur le contexte
      return await this.generateLegacySuggestion(sessionId, questionKey, context);
    } catch (error) {
      console.error('Erreur génération suggestion:', error);
      return null;
    }
  }

  /**
   * Méthode legacy (ancienne implémentation)
   */
  private static async generateLegacySuggestion(
    sessionId: string,
    questionKey: string,
    context: SuggestionContext
  ): Promise<AISuggestion | null> {
    try {
      const { data: session } = await (supabase
        .from('collect_sessions' as any)
        .select('company_id, year')
        .eq('id', sessionId)
        .single() as any);

      if (!session) {
        return null;
      }

      const { data: company } = await supabase
        .from('companies')
        .select('secteur, ca_annuel')
        .eq('id', session.company_id)
        .maybeSingle();

      const { data: historicalData } = await (supabase
        .from('collect_responses' as any)
        .select('value, question_key')
        .eq('question_key', questionKey)
        .limit(100) as any);

      const suggestion = this.calculateSuggestion(
        questionKey,
        {
          ...context,
          sector: company?.secteur || context.sector,
        },
        historicalData || []
      );

      if (!suggestion) {
        return null;
      }

      const { data: savedSuggestion } = await (supabase
        .from('collect_ai_suggestions' as any)
        .insert({
          session_id: sessionId,
          question_key: questionKey,
          suggested_value: suggestion.suggested_value,
          suggested_unit: suggestion.suggested_unit,
          confidence_score: suggestion.confidence,
          reasoning: suggestion.reasoning,
          context_data: suggestion.context_used,
          model_used: 'contextual_estimator_v1',
        })
        .select()
        .single() as any);

      return {
        ...suggestion,
        question_key: questionKey,
      };
    } catch (error) {
      console.error('Erreur génération suggestion legacy:', error);
      return null;
    }
  }

  /**
   * Calculer une suggestion basée sur le contexte et les données historiques
   */
  private static calculateSuggestion(
    questionKey: string,
    context: SuggestionContext,
    historicalData: Array<{ value: any; question_key: string }>
  ): Omit<AISuggestion, 'question_key'> | null {
    const sector = context.sector || 'Services';
    const employeeCount = context.employee_count || 10;
    const surface = context.total_surface || 100;

    // Estimations basées sur le secteur et la taille
    const sectorEstimates: Record<string, Record<string, (context: SuggestionContext) => number>> = {
      'Services': {
        electricite_quantite: (ctx) => (ctx.employee_count || 10) * 1500, // kWh/employé/an
        total_surface: (ctx) => (ctx.employee_count || 10) * 15, // m²/employé
        gaz_naturel_quantite: (ctx) => (ctx.total_surface || 100) * 0.5, // m³/m²/an
      },
      'Industrie': {
        electricite_quantite: (ctx) => (ctx.employee_count || 10) * 4000,
        total_surface: (ctx) => (ctx.employee_count || 10) * 40,
        gaz_naturel_quantite: (ctx) => (ctx.total_surface || 100) * 2,
      },
      'Commerce': {
        electricite_quantite: (ctx) => (ctx.employee_count || 10) * 2000,
        total_surface: (ctx) => (ctx.employee_count || 10) * 25,
        gaz_naturel_quantite: (ctx) => (ctx.total_surface || 100) * 1,
      },
    };

    const estimates = sectorEstimates[sector] || sectorEstimates['Services'];
    const estimator = estimates[questionKey];

    if (!estimator) {
      return null;
    }

    // Calculer la valeur suggérée
    const suggestedValue = estimator(context);

    // Calculer la confiance basée sur la quantité de données historiques
    const confidence = Math.min(0.7 + (historicalData.length / 100) * 0.3, 0.95);

    // Générer le raisonnement
    const reasoning = this.generateReasoning(questionKey, context, suggestedValue, sector);

    return {
      suggested_value: suggestedValue,
      suggested_unit: this.getUnitForQuestion(questionKey),
      confidence,
      reasoning,
      context_used: {
        sector,
        employee_count: employeeCount,
        similar_companies: historicalData.length,
        historical_data: historicalData.length > 0,
      },
    };
  }

  /**
   * Générer un raisonnement pour la suggestion
   */
  private static generateReasoning(
    questionKey: string,
    context: SuggestionContext,
    value: number,
    sector: string
  ): string {
    const employeeCount = context.employee_count || 10;
    const surface = context.total_surface || 100;

    switch (questionKey) {
      case 'electricite_quantite':
        return `Estimation basée sur ${employeeCount} employés dans le secteur ${sector}. Valeur moyenne: ${value.toLocaleString()} kWh/an.`;
      case 'total_surface':
        return `Estimation basée sur ${employeeCount} employés. Surface moyenne: ${value.toLocaleString()} m².`;
      case 'gaz_naturel_quantite':
        return `Estimation basée sur une surface de ${surface} m² dans le secteur ${sector}. Valeur moyenne: ${value.toLocaleString()} m³/an.`;
      default:
        return `Estimation basée sur les données du secteur ${sector} et la taille de l'entreprise.`;
    }
  }

  /**
   * Obtenir l'unité pour une question
   */
  private static getUnitForQuestion(questionKey: string): string {
    const units: Record<string, string> = {
      electricite_quantite: 'kWh',
      gaz_naturel_quantite: 'm³',
      fioul_quantite: 'litres',
      total_surface: 'm²',
      nb_collaborateurs: 'personnes',
      km_flotte: 'km',
    };

    return units[questionKey] || '';
  }

  /**
   * Générer des suggestions pour toutes les questions manquantes
   */
  static async generateBulkSuggestions(
    sessionId: string,
    context: SuggestionContext
  ): Promise<AISuggestion[]> {
    const questionsToSuggest = [
      'electricite_quantite',
      'gaz_naturel_quantite',
      'total_surface',
      'nb_collaborateurs',
    ];

    const suggestions: AISuggestion[] = [];

    for (const questionKey of questionsToSuggest) {
      const suggestion = await this.generateSuggestions(sessionId, questionKey, context);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Accepter une suggestion
   * Apprend maintenant de la valeur acceptée pour améliorer les futures suggestions
   */
  static async acceptSuggestion(suggestionId: string, sessionId: string): Promise<boolean> {
    try {
      const { data: suggestion } = await (supabase
        .from('collect_ai_suggestions' as any)
        .select('*')
        .eq('id', suggestionId)
        .single() as any);

      if (!suggestion) {
        return false;
      }

      // Récupérer la session pour obtenir company_id
      const { data: session } = await (supabase
        .from('collect_sessions' as any)
        .select('company_id')
        .eq('id', sessionId)
        .single() as any);

      // Créer ou mettre à jour la réponse
      await (supabase
        .from('collect_responses' as any)
        .upsert({
          session_id: sessionId,
          question_key: suggestion.question_key,
          question_category: 'general',
          value: suggestion.suggested_value,
          unit: suggestion.suggested_unit,
          source: 'ai_suggestion',
          confidence_score: suggestion.confidence_score,
          ai_suggested: true,
          ai_reasoning: suggestion.reasoning,
        }, {
          onConflict: 'session_id,question_key',
        }) as any);

      // Marquer la suggestion comme acceptée
      await (supabase
        .from('collect_ai_suggestions' as any)
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', suggestionId) as any);

      // Log de la valeur acceptée pour futur apprentissage
      logger.debug('Suggestion acceptée:', suggestion.question_key, suggestion.suggested_value);

      return true;
    } catch (error) {
      console.error('Erreur acceptation suggestion:', error);
      return false;
    }
  }

  /**
   * Rejeter une suggestion
   */
  static async rejectSuggestion(suggestionId: string): Promise<boolean> {
    try {
      await (supabase
        .from('collect_ai_suggestions' as any)
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
        })
        .eq('id', suggestionId) as any);

      return true;
    } catch (error) {
      console.error('Erreur rejet suggestion:', error);
      return false;
    }
  }
}

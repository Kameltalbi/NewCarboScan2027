import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/api/client";
import { useTranslation } from 'react-i18next';

export interface QuestionnaireItem {
  id: string;
  plan_type: string;
  scope?: number;
  category: string;
  subcategory?: string;
  question_key: string;
  input_type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  unit?: string;
  emission_factor_slug?: string;
  options?: string[];
  order_index: number;
  is_required: boolean;
  conditional_logic?: any;
  // Translation fields
  question_text: string;
  description?: string;
  help_text?: string;
  placeholder?: string;
}

export const useQuestionnaire = (planType: string) => {
  const [questions, setQuestions] = useState<QuestionnaireItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { i18n } = useTranslation();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const currentLang = i18n.language || 'fr';
        
        const { data, error: fetchError } = await supabase
          .from('questionnaires')
          .select(`
            *,
            questionnaire_translations!inner(
              question_text,
              description,
              help_text,
              placeholder
            )
          `)
          .eq('plan_type', planType)
          .eq('questionnaire_translations.language_code', currentLang)
          .order('order_index');

        if (fetchError) {
          throw fetchError;
        }

        const transformedQuestions: QuestionnaireItem[] = (data || []).map(item => ({
          id: item.id,
          plan_type: item.plan_type,
          scope: item.scope,
          category: item.category,
          subcategory: item.subcategory,
          question_key: item.question_key,
          input_type: item.input_type as 'text' | 'number' | 'select' | 'multiselect' | 'boolean',
          unit: item.unit,
          emission_factor_slug: item.emission_factor_slug,
          options: Array.isArray(item.options) ? item.options.map(opt => String(opt)) : undefined,
          order_index: item.order_index,
          is_required: item.is_required ?? true,
          conditional_logic: item.conditional_logic,
          question_text: item.questionnaire_translations[0]?.question_text || item.question_key,
          description: item.questionnaire_translations[0]?.description,
          help_text: item.questionnaire_translations[0]?.help_text,
          placeholder: item.questionnaire_translations[0]?.placeholder,
        }));

        setQuestions(transformedQuestions);
      } catch (err) {
        console.error('Error fetching questionnaire:', err);
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [planType, i18n.language]);

  return { questions, loading, error };
};
// Affichage d'une section de collecte avec toutes ses questions
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { CheckCircle2, HelpCircle, Lightbulb, ChevronDown, Save, Loader2 } from 'lucide-react';
import { CollectSection } from '@/types/collectSections';
import { CollectQuestion } from '@/types/collectQuestions';
import { toast } from 'sonner';

interface GuidedCollectSectionProps {
  section: CollectSection;
  questions: CollectQuestion[];
  responses: Array<{
    question_key: string;
    value: any;
    unit?: string | null;
  }>;
  onSave: (questionKey: string, value: any, options?: any) => Promise<boolean>;
  progress: number;
  answeredCount: number;
}

export const GuidedCollectSection: React.FC<GuidedCollectSectionProps> = ({
  section,
  questions,
  responses,
  onSave,
  progress,
  answeredCount,
}) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [showExamples, setShowExamples] = useState(true);
  const Icon = section.icon;

  // Initialiser les valeurs depuis les réponses existantes
  useEffect(() => {
    const initial: Record<string, any> = {};
    responses.forEach(r => {
      initial[r.question_key] = r.value;
    });
    setValues(prev => ({ ...prev, ...initial }));
  }, [responses]);

  // Évaluer les conditions pour afficher/masquer les questions
  const isQuestionVisible = (question: CollectQuestion): boolean => {
    if (!question.conditional_rules || question.conditional_rules.length === 0) {
      return true;
    }

    return question.conditional_rules.some(rule => {
      if (rule.action !== 'show') return true;
      
      const refValue = values[rule.condition.question_key];
      const targetValue = rule.condition.value;

      switch (rule.condition.operator) {
        case 'equals':
          return refValue === targetValue;
        case 'not_equals':
          return refValue !== targetValue;
        case 'greater_than':
          return Number(refValue) > Number(targetValue);
        case 'less_than':
          return Number(refValue) < Number(targetValue);
        case 'is_not_empty':
          return refValue !== null && refValue !== undefined && refValue !== '';
        case 'is_empty':
          return refValue === null || refValue === undefined || refValue === '';
        default:
          return true;
      }
    });
  };

  const visibleQuestions = questions.filter(isQuestionVisible);

  const handleSave = async (question: CollectQuestion) => {
    const value = values[question.key];
    if (value === undefined || value === null || value === '') return;

    setSaving(prev => ({ ...prev, [question.key]: true }));
    
    try {
      const valueToSave = question.input_type === 'number' 
        ? parseFloat(value) || value
        : value;
      
      const success = await onSave(question.key, valueToSave, {
        unit: question.unit,
        category: question.category,
        scope: question.scope,
      });

      if (success) {
        toast.success('Donnée enregistrée');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(prev => ({ ...prev, [question.key]: false }));
    }
  };

  const isAnswered = (questionKey: string): boolean => {
    const response = responses.find(r => r.question_key === questionKey);
    return response && response.value !== null && response.value !== undefined && response.value !== '';
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-lg", section.color)}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">{section.label}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-sm">
            {answeredCount} / {visibleQuestions.length}
          </Badge>
        </div>
        
        <div className="mt-4">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {Math.round(progress)}% complété
          </p>
        </div>

        {/* Aide contextuelle */}
        {section.helpText && (
          <Collapsible open={showExamples} onOpenChange={setShowExamples}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="mt-2 text-muted-foreground">
                <HelpCircle className="h-4 w-4 mr-2" />
                Aide et exemples
                <ChevronDown className={cn(
                  "h-4 w-4 ml-2 transition-transform",
                  showExamples && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">{section.helpText}</p>
                {section.examples && section.examples.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {section.examples.map((example, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        <Lightbulb className="h-3 w-3 mr-1" />
                        {example}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {visibleQuestions.map((question) => {
          const currentValue = values[question.key] ?? '';
          const answered = isAnswered(question.key);
          const isSaving = saving[question.key];

          return (
            <div
              key={question.key}
              className={cn(
                "p-4 rounded-lg border transition-colors",
                answered ? "border-green-200 bg-green-50/50" : "border-border"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <Label 
                  htmlFor={question.key} 
                  className="text-sm font-medium flex items-center gap-2"
                >
                  {question.label}
                  {question.is_required && <span className="text-destructive">*</span>}
                  {answered && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                </Label>
                {question.scope && (
                  <Badge variant="outline" className="text-xs">
                    Scope {question.scope}
                  </Badge>
                )}
              </div>

              {question.description && (
                <p className="text-xs text-muted-foreground mb-3">{question.description}</p>
              )}

              <div className="flex items-center gap-3">
                {question.input_type === 'boolean' ? (
                  <div className="flex items-center gap-4">
                    <Switch
                      id={question.key}
                      checked={currentValue === true}
                      onCheckedChange={(checked) => {
                        setValues(prev => ({ ...prev, [question.key]: checked }));
                      }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {currentValue === true ? 'Oui' : currentValue === false ? 'Non' : 'Non renseigné'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSave(question)}
                      disabled={isSaving || currentValue === undefined}
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                ) : question.input_type === 'select' ? (
                  <div className="flex items-center gap-3 flex-1">
                    <Select
                      value={currentValue || ''}
                      onValueChange={(value) => setValues(prev => ({ ...prev, [question.key]: value }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={question.placeholder || 'Sélectionnez...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {question.options?.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSave(question)}
                      disabled={isSaving || !currentValue}
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-1">
                    <Input
                      id={question.key}
                      type={question.input_type}
                      value={currentValue}
                      onChange={(e) => setValues(prev => ({ ...prev, [question.key]: e.target.value }))}
                      placeholder={question.placeholder || `Entrez la valeur${question.unit ? ` en ${question.unit}` : ''}`}
                      className="flex-1"
                    />
                    {question.unit && (
                      <span className="text-sm text-muted-foreground whitespace-nowrap">{question.unit}</span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSave(question)}
                      disabled={isSaving || !currentValue}
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>

              {/* Exemple contextuel */}
              {question.example && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700 flex items-start gap-2">
                  <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{question.example}</span>
                </div>
              )}

              {/* Texte d'aide */}
              {question.help_text && (
                <p className="mt-2 text-xs text-muted-foreground flex items-start gap-1">
                  <HelpCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  {question.help_text}
                </p>
              )}

              {/* Commentaire optionnel */}
              {question.allow_comment && answered && (
                <div className="mt-3">
                  <Label className="text-xs text-muted-foreground">Commentaire (optionnel)</Label>
                  <Textarea
                    placeholder="Ajoutez un commentaire ou une note..."
                    rows={2}
                    className="mt-1 text-xs"
                  />
                </div>
              )}
            </div>
          );
        })}

        {visibleQuestions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Aucune question dans cette section.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { calculateCarbonFootprint, CarbonCalculationResult } from '@/lib/planReportGenerator';
import { getPlanConfig } from '@/lib/planQuestionnaireConfig';
import { 
  TrendingUp, 
  Zap, 
  Leaf, 
  Building2, 
  Download,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface ResultsStepProps {
  responses: Record<string, any>;
  questions: any[];
  planType: string;
  onGenerateReport: () => void;
}

export const ResultsStep: React.FC<ResultsStepProps> = ({ 
  responses, 
  questions, 
  planType, 
  onGenerateReport 
}) => {
  const [results, setResults] = useState<CarbonCalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const planConfig = getPlanConfig(planType);

  useEffect(() => {
    const calculateResults = async () => {
      setLoading(true);
      try {
        const calculationResults = await calculateCarbonFootprint(responses, planType);
        setResults(calculationResults);
      } catch (error) {
        console.error('Error calculating carbon footprint:', error);
      } finally {
        setLoading(false);
      }
    };

    calculateResults();
  }, [responses, planType]);

  if (loading || !results) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Calcul de votre empreinte carbone...</span>
        </div>
      </div>
    );
  }

  const { scope1, scope2, scope3, total, breakdown, recommendations } = results;

  const getScopeColor = (scope: number) => {
    switch (scope) {
      case 1: return 'text-red-600';
      case 2: return 'text-yellow-600';
      case 3: return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getScopeIcon = (scope: number) => {
    switch (scope) {
      case 1: return <Building2 className="h-4 w-4" />;
      case 2: return <Zap className="h-4 w-4" />;
      case 3: return <TrendingUp className="h-4 w-4" />;
      default: return <Leaf className="h-4 w-4" />;
    }
  };

  const getTotalCategory = (total: number) => {
    if (total < 10) return { label: 'Faible', color: 'text-green-600', icon: CheckCircle };
    if (total < 50) return { label: 'Modérée', color: 'text-yellow-600', icon: AlertTriangle };
    return { label: 'Élevée', color: 'text-red-600', icon: AlertTriangle };
  };

  const category = getTotalCategory(total);
  const CategoryIcon = category.icon;

  return (
    <div className="space-y-6">
      {/* Résultat principal */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <CategoryIcon className={`h-8 w-8 ${category.color}`} />
          <div>
            <div className="text-4xl font-bold">{total}</div>
            <div className="text-sm text-muted-foreground">tonnes CO₂e/an</div>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-2">
          <Badge variant="outline" className={category.color}>
            Empreinte {category.label}
          </Badge>
          <Badge variant="secondary">
            Plan {planType}
          </Badge>
        </div>
        
        <p className="text-muted-foreground text-sm">
          Résultats basés sur {questions.length} questions • Scopes {planConfig.scopes.join(', ')}
        </p>
      </div>

      {/* Intensité carbone */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Par employé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.intensity.perEmployee}</div>
            <p className="text-xs text-muted-foreground">tCO₂e/employé</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Par m²
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.intensity.perSquareMeter}</div>
            <p className="text-xs text-muted-foreground">kgCO₂e/m²</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Par MDT de CA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.intensity.perRevenue}</div>
            <p className="text-xs text-muted-foreground">tCO₂e/MDT</p>
          </CardContent>
        </Card>
      </div>

      {/* Répartition par scope */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              {getScopeIcon(1)}
              <span className={getScopeColor(1)}>Scope 1</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scope1}</div>
            <p className="text-xs text-muted-foreground">Émissions directes</p>
            <Progress value={(scope1 / total) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              {getScopeIcon(2)}
              <span className={getScopeColor(2)}>Scope 2</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scope2}</div>
            <p className="text-xs text-muted-foreground">Électricité</p>
            <Progress value={(scope2 / total) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              {getScopeIcon(3)}
              <span className={getScopeColor(3)}>Scope 3</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {planConfig.scopes.includes(3) ? scope3 : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {planConfig.scopes.includes(3) ? 'Émissions indirectes' : 'Non inclus'}
            </p>
            {planConfig.scopes.includes(3) && (
              <Progress value={(scope3 / total) * 100} className="h-1 mt-2" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Détail par poste */}
      {Object.keys(breakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Répartition détaillée</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(breakdown)
                .sort(([,a], [,b]) => b - a)
                .map(([poste, emission], index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{poste}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{Math.round(emission * 100) / 100} t</span>
                      <div className="w-20">
                        <Progress value={(emission / total) * 100} className="h-1" />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommandations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-600" />
            Premières recommandations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-green-600">{index + 1}</span>
                </div>
                <p className="text-sm text-muted-foreground">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onGenerateReport} size="lg" className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          Générer le rapport PDF
        </Button>
        
        {planType === 'essential' && (
          <Button variant="outline" size="lg" className="flex-1">
            <TrendingUp className="h-4 w-4 mr-2" />
            Upgrader pour le Scope 3
          </Button>
        )}
      </div>

      {/* Info plan */}
      <div className="text-center text-xs text-muted-foreground">
        <p>
          Rapport généré avec le plan {planType} • 
          {planConfig.scopes.includes(3) 
            ? ' Analyse complète des 3 scopes' 
            : ' Analyse limitée aux scopes 1 et 2'
          }
        </p>
      </div>
    </div>
  );
};
// Composant pour afficher le détail par scope avec drill-down
// Visualisation hiérarchique : Scope > Poste > Catégorie

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  BilanCarboneDetailService,
  BilanCarboneDetailResult,
  BilanCarboneByScope,
  BilanCarboneByPoste,
} from '@/lib/bilan-carbone/BilanCarboneDetailService';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BilanScopesDetailProps {
  periodStart: string;
  periodEnd: string;
}

export const BilanScopesDetail: React.FC<BilanScopesDetailProps> = ({
  periodStart,
  periodEnd,
}) => {
  const { organizationId } = useOrganizationId();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<BilanCarboneDetailResult | null>(null);
  const [expandedScopes, setExpandedScopes] = useState<Set<number>>(new Set([1, 2, 3]));
  const [expandedPostes, setExpandedPostes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      if (!organizationId) return;

      try {
        setLoading(true);
        const data = await BilanCarboneDetailService.calculateDetail(
          organizationId,
          periodStart,
          periodEnd
        );
        setResult(data);
      } catch (err) {
        console.error('Erreur chargement détail:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organizationId, periodStart, periodEnd]);

  const toggleScope = (scope: number) => {
    const newExpanded = new Set(expandedScopes);
    if (newExpanded.has(scope)) {
      newExpanded.delete(scope);
    } else {
      newExpanded.add(scope);
    }
    setExpandedScopes(newExpanded);
  };

  const togglePoste = (posteCode: string) => {
    const newExpanded = new Set(expandedPostes);
    if (newExpanded.has(posteCode)) {
      newExpanded.delete(posteCode);
    } else {
      newExpanded.add(posteCode);
    }
    setExpandedPostes(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!result || result.byScope.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Aucune donnée disponible. Commencez par collecter vos données d'activité.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getScopeColor = (scope: number) => {
    if (scope === 1) return 'bg-red-100 text-red-800 border-red-200';
    if (scope === 2) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getScopeName = (scope: number) => {
    if (scope === 1) return 'Scope 1 - Émissions directes';
    if (scope === 2) return 'Scope 2 - Énergie indirecte';
    return 'Scope 3 - Autres émissions indirectes';
  };

  const totalEmissions = result.totalEmissions / 1000; // En tonnes

  return (
    <div className="space-y-4">
      {/* KPIs globaux */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total émissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmissions.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">tCO₂e</p>
          </CardContent>
        </Card>

        {result.byScope.map((scope) => (
          <Card key={scope.scope}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Scope {scope.scope}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scope.total_emissions_t_co2e.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                {((scope.total_emissions_kg_co2e / result.totalEmissions) * 100).toFixed(1)}% du total
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Détail par scope */}
      {result.byScope.map((scopeData) => {
        const isExpanded = expandedScopes.has(scopeData.scope);
        const postesInScope = result.byPoste.filter((p) => p.scope === scopeData.scope);
        const percentageOfTotal =
          (scopeData.total_emissions_kg_co2e / result.totalEmissions) * 100;

        return (
          <Card key={scopeData.scope} className="overflow-hidden">
            <CardHeader
              className={`cursor-pointer hover:bg-muted/50 transition-colors ${getScopeColor(
                scopeData.scope
              )}`}
              onClick={() => toggleScope(scopeData.scope)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  <div>
                    <CardTitle>{getScopeName(scopeData.scope)}</CardTitle>
                    <CardDescription className="mt-1">
                      {scopeData.poste_count} poste(s) • {scopeData.total_activity_data_count}{' '}
                      donnée(s)
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {scopeData.total_emissions_t_co2e.toFixed(1)} tCO₂e
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {percentageOfTotal.toFixed(1)}% du total
                  </div>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {postesInScope.map((poste) => {
                    const isPosteExpanded = expandedPostes.has(poste.poste_code);
                    const categoriesInPoste = result.details.filter(
                      (d) => d.scope === scopeData.scope && d.poste_code === poste.poste_code
                    );

                    return (
                      <div key={poste.poste_code} className="border rounded-lg">
                        <div
                          className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => togglePoste(poste.poste_code)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {isPosteExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div className="flex-1">
                                <div className="font-semibold">
                                  {poste.poste_code} • {poste.poste_name}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {poste.category_count} catégorie(s)
                                </div>
                                <div className="mt-2">
                                  <Progress value={poste.percentage} className="h-2" />
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {poste.percentage.toFixed(1)}% du scope {scopeData.scope}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-lg font-bold">
                                {poste.total_emissions_t_co2e.toFixed(2)} tCO₂e
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {((poste.total_emissions_kg_co2e / result.totalEmissions) * 100).toFixed(
                                  2
                                )}% du total
                              </div>
                            </div>
                          </div>
                        </div>

                        {isPosteExpanded && (
                          <div className="px-4 pb-4 space-y-2">
                            {categoriesInPoste.map((category) => (
                              <div
                                key={category.id}
                                className="flex items-center justify-between p-3 bg-muted/30 rounded border-l-4 border-primary"
                              >
                                <div>
                                  <div className="font-medium">
                                    {category.category_code} • {category.category_name}
                                  </div>
                                  {category.subcategory && (
                                    <div className="text-sm text-muted-foreground">
                                      {category.subcategory}
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {category.activity_data_count} donnée(s) source(s)
                                    {category.data_quality_score && (
                                      <> • Qualité: {(category.data_quality_score * 100).toFixed(0)}%</>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">
                                    {(category.emissions_kg_co2e / 1000).toFixed(3)} tCO₂e
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Complétude du bilan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result.byScope.length >= 2 ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-600" />
            )}
            Complétude du bilan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Scopes couverts:</span> {result.byScope.length} / 3
            </p>
            <p>
              <span className="font-medium">Qualité des données:</span>
            </p>
            <div className="pl-4 space-y-1">
              <p>• Données réelles: {result.dataQuality.real.toFixed(1)}%</p>
              <p>• Données estimées: {result.dataQuality.estimated.toFixed(1)}%</p>
              <p>• Valeurs par défaut: {result.dataQuality.default.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Composant de visualisation hiérarchique GHG Protocol
// Affiche Scope > Poste > Catégorie avec drill-down

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { GHGAggregationService, GHGHierarchicalResult, GHGScopeEmissions, GHGPosteEmissions } from '@/lib/bilan-carbone/GHGAggregationService';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GHGHierarchyViewProps {
  organizationId: string;
  periodStart: string;
  periodEnd: string;
}

export const GHGHierarchyView: React.FC<GHGHierarchyViewProps> = ({
  organizationId,
  periodStart,
  periodEnd,
}) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<GHGHierarchicalResult | null>(null);
  const [expandedScopes, setExpandedScopes] = useState<Set<number>>(new Set([1, 2, 3]));
  const [expandedPostes, setExpandedPostes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await GHGAggregationService.aggregateByGHGHierarchy(
          organizationId,
          periodStart,
          periodEnd
        );
        setResult(data);
      } catch (err) {
        console.error('Erreur chargement hiérarchie GHG:', err);
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

  const togglePoste = (posteId: string) => {
    const newExpanded = new Set(expandedPostes);
    if (newExpanded.has(posteId)) {
      newExpanded.delete(posteId);
    } else {
      newExpanded.add(posteId);
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

  if (!result || result.total_emissions === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Aucune donnée disponible pour cette période.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec KPIs */}
      <Card>
        <CardHeader>
          <CardTitle>Bilan Carbone - Hiérarchie GHG Protocol</CardTitle>
          <CardDescription>
            Période : {new Date(periodStart).toLocaleDateString()} - {new Date(periodEnd).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Émissions totales</div>
              <div className="text-2xl font-bold">{result.total_emissions.toFixed(1)} tCO₂e</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Qualité des données</div>
              <div className="text-2xl font-bold">
                {result.data_quality.real_percentage.toFixed(0)}% réelles
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Couverture Scope 1 & 2</div>
              <div className="flex items-center gap-2 mt-1">
                {result.coverage.scope1_covered && result.coverage.scope2_covered ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                )}
                <span className="text-lg font-semibold">
                  {result.coverage.scope1_covered && result.coverage.scope2_covered
                    ? 'Complète'
                    : 'Partielle'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Scope 3</div>
              <div className="flex items-center gap-2 mt-1">
                {result.coverage.scope3_covered ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Info className="h-5 w-5 text-gray-400" />
                )}
                <span className="text-lg font-semibold">
                  {result.coverage.scope3_covered ? 'Inclus' : 'Non évalué'}
                </span>
              </div>
            </div>
          </div>

          {result.coverage.mandatory_postes_missing.length > 0 && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-orange-900">
                    Postes obligatoires manquants
                  </div>
                  <div className="text-sm text-orange-800 mt-1">
                    {result.coverage.mandatory_postes_missing.join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hiérarchie par Scope */}
      {result.scopes.map((scope) => (
        <ScopeCard
          key={scope.scope}
          scope={scope}
          totalEmissions={result.total_emissions}
          expanded={expandedScopes.has(scope.scope)}
          onToggle={() => toggleScope(scope.scope)}
          expandedPostes={expandedPostes}
          onTogglePoste={togglePoste}
        />
      ))}
    </div>
  );
};

// Composant pour un Scope
interface ScopeCardProps {
  scope: GHGScopeEmissions;
  totalEmissions: number;
  expanded: boolean;
  onToggle: () => void;
  expandedPostes: Set<string>;
  onTogglePoste: (posteId: string) => void;
}

const ScopeCard: React.FC<ScopeCardProps> = ({
  scope,
  totalEmissions,
  expanded,
  onToggle,
  expandedPostes,
  onTogglePoste,
}) => {
  const scopeColors = {
    1: 'bg-red-100 text-red-800 border-red-300',
    2: 'bg-orange-100 text-orange-800 border-orange-300',
    3: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  const scopeNames = {
    1: 'Scope 1 - Émissions directes',
    2: 'Scope 2 - Émissions indirectes liées à l\'énergie',
    3: 'Scope 3 - Autres émissions indirectes',
  };

  return (
    <Card className={cn('border-2', scopeColors[scope.scope])}>
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {expanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
            <div>
              <CardTitle className="text-lg">{scopeNames[scope.scope]}</CardTitle>
              <CardDescription className="mt-1">
                {scope.postes.length} poste(s) • {scope.mandatory_postes_covered}/{scope.mandatory_postes_total} obligatoires
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{scope.emissions.toFixed(1)} tCO₂e</div>
            <div className="text-sm text-muted-foreground">
              {scope.percentage.toFixed(1)}% du total
            </div>
          </div>
        </div>
        <Progress value={scope.percentage} className="mt-2" />
      </CardHeader>

      {expanded && scope.postes.length > 0 && (
        <CardContent>
          <div className="space-y-3">
            {scope.postes.map((poste) => (
              <PosteRow
                key={poste.poste.id}
                poste={poste}
                scopeEmissions={scope.emissions}
                expanded={expandedPostes.has(poste.poste.id)}
                onToggle={() => onTogglePoste(poste.poste.id)}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// Composant pour un Poste
interface PosteRowProps {
  poste: GHGPosteEmissions;
  scopeEmissions: number;
  expanded: boolean;
  onToggle: () => void;
}

const PosteRow: React.FC<PosteRowProps> = ({ poste, scopeEmissions, expanded, onToggle }) => {
  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-3 flex-1">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {poste.poste.code} - {poste.poste.name}
              </span>
              {poste.poste.mandatory && (
                <Badge variant="outline" className="text-xs">
                  Obligatoire
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {poste.poste.description}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {poste.data_points_count} donnée(s) d'activité
            </div>
          </div>
        </div>
        <div className="text-right ml-4">
          <div className="text-lg font-bold">{poste.emissions.toFixed(1)} tCO₂e</div>
          <div className="text-sm text-muted-foreground">
            {poste.percentage.toFixed(1)}% du scope
          </div>
        </div>
      </div>

      {expanded && poste.categories.length > 0 && (
        <div className="mt-3 ml-7 space-y-2">
          {poste.categories.map((category) => (
            <div
              key={category.category.id}
              className="flex items-center justify-between p-3 bg-background border rounded"
            >
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {category.category.code} - {category.category.name}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {category.data_points.length} activité(s)
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="font-semibold">{category.emissions.toFixed(2)} tCO₂e</div>
                <div className="text-xs text-muted-foreground">
                  {category.percentage.toFixed(1)}% du poste
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

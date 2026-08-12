// Composant de paramétrage de la répartition des émissions par site/scope

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Settings2, 
  Loader2, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Calculator,
  Building2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  useSiteAllocation, 
  AllocationStrategy, 
  AllocationKeyType,
  SiteWithData
} from '@/hooks/useSiteAllocation';
import { useCollectSites } from '@/hooks/useCollectSites';

interface SiteAllocationSettingsProps {
  organizationId: string | null | undefined;
  companyId: string | null | undefined;
}

const STRATEGY_LABELS: Record<AllocationStrategy, { label: string; description: string; color: string }> = {
  real_data: { 
    label: 'Données réelles', 
    description: 'Émissions calculées uniquement à partir des données saisies pour chaque site',
    color: 'bg-green-100 text-green-800'
  },
  allocation_key: { 
    label: 'Clé de répartition', 
    description: 'Émissions calculées au niveau consolidé puis réparties automatiquement entre les sites',
    color: 'bg-amber-100 text-amber-800'
  },
  consolidated_only: { 
    label: 'Consolidé uniquement', 
    description: 'Émissions affichées uniquement au niveau organisation, sans répartition par site',
    color: 'bg-blue-100 text-blue-800'
  },
};

const KEY_TYPE_LABELS: Record<AllocationKeyType, string> = {
  employees: 'Effectif (% par site)',
  revenue: 'Chiffre d\'affaires (% par site)',
  surface: 'Surface (% par site)',
  manual: 'Clé manuelle (% libre)',
};

const SCOPE_LABELS = {
  1: 'Scope 1',
  2: 'Scope 2',
  3: 'Scope 3',
};

const SCOPE_DESCRIPTIONS = {
  1: 'Émissions directes (combustibles, véhicules...)',
  2: 'Émissions indirectes liées à l\'énergie',
  3: 'Autres émissions indirectes (achats, déplacements...)',
};

export const SiteAllocationSettings: React.FC<SiteAllocationSettingsProps> = ({
  organizationId,
  companyId,
}) => {
  const [activeScope, setActiveScope] = useState<string>('1');
  const [localPercentages, setLocalPercentages] = useState<Map<string, number>>(new Map());
  const [initializedScopes, setInitializedScopes] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const { sites, isLoading: sitesLoading } = useCollectSites(companyId);
  
  const {
    scopeConfigs,
    sitePercentages,
    isLoading,
    saveConfig,
    savePercentagesBatch,
    calculateAutoPercentages,
    validatePercentages,
    getConfigForScope,
    getPercentagesForScope,
  } = useSiteAllocation(organizationId);

  const currentScope = parseInt(activeScope);
  const currentConfig = getConfigForScope(currentScope);
  const currentPercentages = getPercentagesForScope(currentScope);

  // Transformer les sites pour le calcul
  const sitesWithData: SiteWithData[] = useMemo(() => 
    sites.map(s => ({
      id: s.id,
      name: s.name,
      employees_count: s.employees_count ?? null,
      annual_revenue: s.annual_revenue ?? null,
      surface_m2: s.surface_m2 ?? null,
    })),
    [sites]
  );

  // Synchroniser les pourcentages locaux avec les données serveur (seulement au changement de scope ou au chargement initial)
  useEffect(() => {
    // Ne synchroniser que si on change de scope ou si c'est le premier chargement pour ce scope
    if (initializedScopes.has(currentScope) && localPercentages.size > 0) {
      return;
    }
    
    const newMap = new Map<string, number>();
    for (const p of currentPercentages) {
      newMap.set(p.site_id, p.allocation_percentage);
    }
    // Ajouter les sites manquants avec 0%
    for (const site of sitesWithData) {
      if (!newMap.has(site.id)) {
        newMap.set(site.id, 0);
      }
    }
    setLocalPercentages(newMap);
    setInitializedScopes(prev => new Set(prev).add(currentScope));
  }, [currentScope, currentPercentages.length, sitesWithData.length]);

  // Calculer le total des pourcentages locaux
  const totalPercentage = useMemo(() => {
    let total = 0;
    for (const value of localPercentages.values()) {
      total += value;
    }
    return Math.round(total * 100) / 100;
  }, [localPercentages]);

  const isValidTotal = Math.abs(totalPercentage - 100) < 0.01;

  const handleStrategyChange = async (scope: number, strategy: AllocationStrategy) => {
    await saveConfig.mutateAsync({ 
      scope, 
      strategy,
      allocationKeyType: strategy === 'allocation_key' ? 'employees' : null,
    });
    toast.success(`Stratégie Scope ${scope} mise à jour`);
  };

  const handleKeyTypeChange = async (scope: number, keyType: AllocationKeyType) => {
    await saveConfig.mutateAsync({
      scope,
      strategy: 'allocation_key',
      allocationKeyType: keyType,
    });
    
    // Recalculer les pourcentages si ce n'est pas manuel
    if (keyType !== 'manual') {
      const autoPercentages = calculateAutoPercentages(sitesWithData, keyType);
      const percentagesArray = Array.from(autoPercentages.entries()).map(([siteId, percentage]) => ({
        siteId,
        scope,
        percentage,
      }));
      await savePercentagesBatch.mutateAsync(percentagesArray);
    }
    
    toast.success('Clé de répartition mise à jour');
  };

  const handlePercentageChange = (siteId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setLocalPercentages(prev => {
      const newMap = new Map(prev);
      newMap.set(siteId, Math.max(0, Math.min(100, numValue)));
      return newMap;
    });
  };

  const handleAutoCalculate = () => {
    const keyType = currentConfig.allocation_key_type || 'employees';
    const autoPercentages = calculateAutoPercentages(sitesWithData, keyType);
    setLocalPercentages(autoPercentages);
  };

  const handleSavePercentages = async () => {
    if (!isValidTotal) {
      toast.error(`Le total doit être égal à 100% (actuellement ${totalPercentage}%)`);
      return;
    }

    setIsSaving(true);
    try {
      const percentagesArray = Array.from(localPercentages.entries()).map(([siteId, percentage]) => ({
        siteId,
        scope: currentScope,
        percentage,
      }));
      await savePercentagesBatch.mutateAsync(percentagesArray);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || sitesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (sites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5" />
            Méthode de répartition des émissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Building2 className="h-4 w-4" />
            <AlertDescription>
              Vous devez d'abord créer des sites pour configurer la répartition des émissions.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="h-5 w-5" />
          Méthode de répartition des émissions
        </CardTitle>
        <CardDescription>
          Configurez comment les émissions sont réparties entre vos sites pour chaque scope
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alerte info */}
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            Cette configuration détermine le comportement du calcul des émissions et sera stockée 
            dans l'historique du bilan carbone. Elle sera également mentionnée dans les rapports exportés.
          </AlertDescription>
        </Alert>

        {/* Tabs par scope */}
        <Tabs value={activeScope} onValueChange={setActiveScope}>
          <TabsList className="grid w-full grid-cols-3">
            {[1, 2, 3].map(scope => {
              const config = getConfigForScope(scope);
              const strategyInfo = STRATEGY_LABELS[config.strategy] || STRATEGY_LABELS.real_data;
              return (
                <TabsTrigger key={scope} value={scope.toString()} className="flex flex-col gap-1">
                  <span className="font-medium">{SCOPE_LABELS[scope as keyof typeof SCOPE_LABELS]}</span>
                  <Badge variant="outline" className={`text-xs ${strategyInfo.color}`}>
                    {strategyInfo.label}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {[1, 2, 3].map(scope => (
            <TabsContent key={scope} value={scope.toString()} className="space-y-6 mt-6">
              {/* Description du scope */}
              <div className="text-sm text-muted-foreground">
                {SCOPE_DESCRIPTIONS[scope as keyof typeof SCOPE_DESCRIPTIONS]}
              </div>

              {/* Sélection de la stratégie */}
              <div className="space-y-3">
                <Label className="font-medium">Stratégie de répartition</Label>
                <Select
                  value={currentConfig.strategy}
                  onValueChange={(value) => handleStrategyChange(scope, value as AllocationStrategy)}
                >
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STRATEGY_LABELS).map(([key, { label, description }]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <span className="font-medium">{label}</span>
                          <span className="text-xs text-muted-foreground">{description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Options pour allocation_key */}
              {currentConfig.strategy === 'allocation_key' && (
                <div className="space-y-6 border-t pt-6">
                  {/* Type de clé */}
                  <div className="space-y-3">
                    <Label className="font-medium">Clé de répartition</Label>
                    <Select
                      value={currentConfig.allocation_key_type || 'employees'}
                      onValueChange={(value) => handleKeyTypeChange(scope, value as AllocationKeyType)}
                    >
                      <SelectTrigger className="w-full max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(KEY_TYPE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tableau des pourcentages */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Répartition par site</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAutoCalculate}
                          className="gap-2"
                        >
                          <Calculator className="h-4 w-4" />
                          Recalculer
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSavePercentages}
                          disabled={isSaving || !isValidTotal}
                          className="gap-2"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Enregistrer
                        </Button>
                      </div>
                    </div>

                    {/* Status du total */}
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${
                      isValidTotal ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                      {isValidTotal ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">
                        Total : {totalPercentage}%
                        {!isValidTotal && ' (doit être égal à 100%)'}
                      </span>
                    </div>

                    {/* Tableau */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Site</TableHead>
                            <TableHead className="w-32 text-right">Effectif</TableHead>
                            <TableHead className="w-32 text-right">Surface (m²)</TableHead>
                            <TableHead className="w-32 text-right">CA</TableHead>
                            <TableHead className="w-40 text-right">Répartition (%)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sitesWithData.map(site => (
                            <TableRow key={site.id}>
                              <TableCell className="font-medium">{site.name}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {site.employees_count?.toLocaleString('fr-FR') || '-'}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {site.surface_m2?.toLocaleString('fr-FR') || '-'}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {site.annual_revenue?.toLocaleString('fr-FR') || '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={localPercentages.get(site.id) || 0}
                                    onChange={(e) => handlePercentageChange(site.id, e.target.value)}
                                    className="w-20 text-right"
                                  />
                                  <span className="text-muted-foreground">%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              {/* Message pour consolidated_only */}
              {currentConfig.strategy === 'consolidated_only' && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    En mode consolidé, les émissions du Scope {scope} seront affichées uniquement au niveau 
                    de l'organisation. Les tableaux par site afficheront "Non réparti – choix méthodologique".
                  </AlertDescription>
                </Alert>
              )}

              {/* Message pour real_data */}
              {currentConfig.strategy === 'real_data' && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    En mode données réelles, les émissions du Scope {scope} seront calculées exclusivement 
                    à partir des données saisies pour chaque site. Aucune répartition automatique ne sera appliquée.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

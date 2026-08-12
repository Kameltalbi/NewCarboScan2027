// Composant pour afficher la consolidation multi-sites

import React, { useState, useEffect } from 'react';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { useOrganizationSites } from '@/hooks/useOrganizationSites';
import { SiteConsolidationService, ConsolidatedActivityData } from '@/lib/activity-data/SiteConsolidationService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Download, Filter, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const SiteConsolidation: React.FC = () => {
  const { organizationId } = useOrganizationId();
  const { sites, isLoading: sitesLoading } = useOrganizationSites(organizationId || undefined);
  const { toast } = useToast();
  const [consolidatedData, setConsolidatedData] = useState<ConsolidatedActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [activityType, setActivityType] = useState<string>('');

  useEffect(() => {
    if (organizationId) {
      loadConsolidation();
    }
  }, [organizationId, selectedSites, periodStart, periodEnd, activityType]);

  const loadConsolidation = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const data = await SiteConsolidationService.consolidate({
        organization_id: organizationId,
        site_ids: selectedSites.length > 0 ? selectedSites : undefined,
        period_start: periodStart || undefined,
        period_end: periodEnd || undefined,
        activity_type: activityType || undefined,
      });
      setConsolidatedData(data);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la consolidation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSiteToggle = (siteId: string) => {
    setSelectedSites(prev => {
      if (prev.includes(siteId)) {
        return prev.filter(id => id !== siteId);
      } else {
        return [...prev, siteId];
      }
    });
  };

  const handleExport = async () => {
    try {
      // Exporter en Excel (à implémenter)
      toast({
        title: 'Export',
        description: 'Fonctionnalité d\'export à venir',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de l\'export',
        variant: 'destructive',
      });
    }
  };

  if (sitesLoading || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Consolidation multi-sites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Consolidation multi-sites
              </CardTitle>
              <CardDescription>
                Agrégez et consolidez les données de plusieurs sites
              </CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtres */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Sites</Label>
              <div className="flex flex-wrap gap-2">
                {sites.map(site => (
                  <Badge
                    key={site.id}
                    variant={selectedSites.includes(site.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleSiteToggle(site.id)}
                  >
                    {site.name}
                  </Badge>
                ))}
                {selectedSites.length === 0 && (
                  <span className="text-sm text-muted-foreground">Tous les sites</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="period_start">Période début</Label>
              <Input
                id="period_start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period_end">Période fin</Label>
              <Input
                id="period_end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity_type">Type d'activité</Label>
              <Select value={activityType || 'all'} onValueChange={(value) => setActivityType(value === 'all' ? null : value)}>
                <SelectTrigger id="activity_type">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="energy">Énergie</SelectItem>
                  <SelectItem value="fuel">Carburant</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="waste">Déchets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Résultats */}
          {consolidatedData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune donnée consolidée</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span>{consolidatedData.length} groupe(s) consolidé(s)</span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type / Catégorie</TableHead>
                      <TableHead>Unité</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Sites</TableHead>
                      <TableHead>Répartition</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consolidatedData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.activity_type}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.category} {item.subcategory && `• ${item.subcategory}`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.total_quantity.toLocaleString('fr-FR', {
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.site_count} site(s)</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {item.sites.slice(0, 3).map((site, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {site.site_name || site.site_id.substring(0, 8)}
                                </span>
                                <span className="font-medium">
                                  {site.quantity.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ({site.percentage.toFixed(1)}%)
                                </span>
                              </div>
                            ))}
                            {item.sites.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{item.sites.length - 3} autre(s)
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

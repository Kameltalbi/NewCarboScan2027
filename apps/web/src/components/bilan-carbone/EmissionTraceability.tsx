// Composant de traçabilité ligne par ligne des émissions
// Permet de voir le détail de chaque donnée d'activité et son calcul

import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Search, Download } from 'lucide-react';
import { supabase } from "@/integrations/api/client";
import { Loader2 } from 'lucide-react';

interface ActivityEmissionDetail {
  id: string;
  activity_type: string;
  category: string;
  subcategory?: string;
  quantity: number;
  unit: string;
  emissions: number; // tCO₂e
  emission_factor?: number;
  emission_factor_source?: string;
  period_start: string;
  period_end: string;
  data_quality: string;
  confidence_score?: number;
  source_document?: string;
  notes?: string;
  scope_hint?: number;
  ghg_poste?: string;
  created_at: string;
  created_by?: string;
}

interface EmissionTraceabilityProps {
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  scopeFilter?: number;
  posteFilter?: string;
}

export const EmissionTraceability: React.FC<EmissionTraceabilityProps> = ({
  organizationId,
  periodStart,
  periodEnd,
  scopeFilter,
  posteFilter,
}) => {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityEmissionDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [qualityFilter, setQualityFilter] = useState<string>('all');

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);

        let query = supabase
          .from('activity_data')
          .select(
            `
            id,
            activity_type,
            category,
            subcategory,
            quantity,
            unit,
            period_start,
            period_end,
            data_quality,
            confidence_score,
            source_document,
            notes,
            scope_hint,
            emission_factor_id,
            created_at
          `
          )
          .eq('organization_id', organizationId)
          .gte('period_start', periodStart)
          .lte('period_end', periodEnd)
          .order('created_at', { ascending: false });

        if (scopeFilter) {
          query = query.eq('scope_hint', scopeFilter);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        if (!data) {
          setActivities([]);
          return;
        }

        // Enrichir avec les facteurs d'émission et calculer les émissions
        const enriched = await Promise.all(
          data.map(async (activity) => {
            let emissions = 0;
            let emissionFactor: number | undefined;
            let emissionFactorSource: string | undefined;

            if (activity.emission_factor_id) {
              const { data: ef } = await supabase
                .from('emission_factors')
                .select('emission_factor, source, name')
                .eq('id', activity.emission_factor_id)
                .single();

              if (ef) {
                emissionFactor = ef.emission_factor;
                emissionFactorSource = `${ef.name} (${ef.source})`;
                emissions = (activity.quantity * ef.emission_factor) / 1000; // Convertir en tonnes
              }
            }

            return {
              ...activity,
              emissions,
              emission_factor: emissionFactor,
              emission_factor_source: emissionFactorSource,
            };
          })
        );

        setActivities(enriched);
      } catch (err) {
        console.error('Erreur chargement traçabilité:', err);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [organizationId, periodStart, periodEnd, scopeFilter]);

  // Filtrer les activités
  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      searchTerm === '' ||
      activity.activity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (activity.notes && activity.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesQuality =
      qualityFilter === 'all' || activity.data_quality === qualityFilter;

    return matchesSearch && matchesQuality;
  });

  const totalEmissions = filteredActivities.reduce((sum, a) => sum + a.emissions, 0);

  const handleExport = () => {
    // Export CSV
    const headers = [
      'Date',
      'Type',
      'Catégorie',
      'Quantité',
      'Unité',
      'Facteur',
      'Émissions (tCO₂e)',
      'Qualité',
      'Source',
    ];

    const rows = filteredActivities.map((a) => [
      new Date(a.period_start).toLocaleDateString(),
      a.activity_type,
      a.category,
      a.quantity,
      a.unit,
      a.emission_factor || '',
      a.emissions.toFixed(3),
      a.data_quality,
      a.emission_factor_source || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tracabilite-emissions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Traçabilité des émissions</CardTitle>
            <CardDescription>
              {filteredActivities.length} donnée(s) d'activité • {totalEmissions.toFixed(2)} tCO₂e
            </CardDescription>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exporter CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filtres */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={qualityFilter} onValueChange={setQualityFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Qualité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes qualités</SelectItem>
              <SelectItem value="real">Réelles</SelectItem>
              <SelectItem value="estimated">Estimées</SelectItem>
              <SelectItem value="default">Par défaut</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucune donnée d'activité pour cette période.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type d'activité</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead className="text-right">Facteur</TableHead>
                  <TableHead className="text-right">Émissions</TableHead>
                  <TableHead>Qualité</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="text-sm">
                      {new Date(activity.period_start).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">{activity.activity_type}</TableCell>
                    <TableCell className="text-sm">
                      {activity.category}
                      {activity.subcategory && (
                        <span className="text-muted-foreground"> / {activity.subcategory}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{activity.quantity.toFixed(2)}</TableCell>
                    <TableCell>{activity.unit}</TableCell>
                    <TableCell className="text-right text-sm">
                      {activity.emission_factor ? activity.emission_factor.toFixed(4) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {activity.emissions.toFixed(3)} tCO₂e
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          activity.data_quality === 'real'
                            ? 'default'
                            : activity.data_quality === 'estimated'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {activity.data_quality === 'real'
                          ? 'Réelle'
                          : activity.data_quality === 'estimated'
                          ? 'Estimée'
                          : 'Défaut'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {activity.emission_factor_source || '-'}
                      {activity.source_document && (
                        <FileText className="inline ml-1 h-3 w-3" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

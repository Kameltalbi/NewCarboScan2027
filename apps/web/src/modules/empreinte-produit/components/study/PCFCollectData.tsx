// Composant pour lier les données du module Collect à une étude PCF
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Database, Plus, Trash2, Search, ArrowRight, Percent, Link2 } from 'lucide-react';
import type { LifeCyclePhase } from '../../types';

interface PCFCollectAllocation {
  id: string;
  study_id: string;
  collect_response_id: string;
  allocation_percentage: number;
  allocated_value: number | null;
  phase: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CollectResponse {
  id: string;
  session_id: string;
  question_key: string;
  question_category: string;
  value: any;
  unit: string | null;
  scope: number | null;
  source: string | null;
  site_id: string | null;
}

interface Props {
  studyId: string;
  locked?: boolean;
}

const PHASE_OPTIONS: { value: LifeCyclePhase; label: string }[] = [
  { value: 'materials', label: 'Matériaux' },
  { value: 'manufacturing', label: 'Fabrication' },
  { value: 'transport', label: 'Transport' },
  { value: 'packaging', label: 'Emballage' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'usage', label: 'Utilisation' },
  { value: 'endOfLife', label: 'Fin de vie' },
  { value: 'wastes', label: 'Déchets' },
];

const CATEGORY_MAP: Record<string, string> = {
  energy: 'Énergie',
  transport: 'Transport',
  waste: 'Déchets',
  water: 'Eau',
  materials: 'Matériaux',
  refrigerants: 'Réfrigérants',
};

const PCFCollectData: React.FC<Props> = ({ studyId, locked }) => {
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Fetch existing allocations for this study
  const { data: allocations = [], isLoading: loadingAllocations } = useQuery({
    queryKey: ['pcf-collect-allocations', studyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pcf_collect_allocations')
        .select('*')
        .eq('study_id', studyId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as PCFCollectAllocation[];
    },
  });

  // Fetch the linked collect_responses details
  const linkedResponseIds = allocations.map(a => a.collect_response_id);
  const { data: linkedResponses = [] } = useQuery({
    queryKey: ['pcf-linked-responses', linkedResponseIds],
    enabled: linkedResponseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('collect_responses')
        .select('id, session_id, question_key, question_category, value, unit, scope, source, site_id')
        .in('id', linkedResponseIds);
      if (error) throw error;
      return data as CollectResponse[];
    },
  });

  // Fetch all available collect responses (for the picker)
  const { data: availableResponses = [], isLoading: loadingAvailable } = useQuery({
    queryKey: ['pcf-available-collect-responses'],
    enabled: pickerOpen,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('collect_responses')
        .select('id, session_id, question_key, question_category, value, unit, scope, source, site_id')
        .not('value', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as CollectResponse[]).filter(r => {
        const val = typeof r.value === 'string' ? r.value : JSON.stringify(r.value);
        return val && val !== 'null' && val !== '""' && val !== '0';
      });
    },
  });

  // Add allocation
  const addAllocation = useMutation({
    mutationFn: async (responseId: string) => {
      const response = availableResponses.find(r => r.id === responseId);
      const numericValue = response ? parseFloat(typeof response.value === 'string' ? response.value : String(response.value)) : 0;
      
      const { data, error } = await (supabase as any)
        .from('pcf_collect_allocations')
        .insert({
          study_id: studyId,
          collect_response_id: responseId,
          allocation_percentage: 100,
          allocated_value: isNaN(numericValue) ? null : numericValue,
          phase: 'manufacturing',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcf-collect-allocations', studyId] });
      toast.success('Donnée collectée liée à l\'étude');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Update allocation
  const updateAllocation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PCFCollectAllocation> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('pcf_collect_allocations')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pcf-collect-allocations', studyId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // Remove allocation
  const removeAllocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('pcf_collect_allocations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcf-collect-allocations', studyId] });
      toast.success('Liaison supprimée');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Filtered available responses for the picker
  const filteredResponses = useMemo(() => {
    const alreadyLinked = new Set(linkedResponseIds);
    return availableResponses.filter(r => {
      if (alreadyLinked.has(r.id)) return false;
      if (categoryFilter !== 'all' && r.question_category !== categoryFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          r.question_key.toLowerCase().includes(term) ||
          r.question_category.toLowerCase().includes(term) ||
          String(r.value).toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [availableResponses, linkedResponseIds, categoryFilter, searchTerm]);

  const categories = useMemo(() => {
    const cats = new Set(availableResponses.map(r => r.question_category));
    return Array.from(cats);
  }, [availableResponses]);

  const getResponseForAllocation = (alloc: PCFCollectAllocation) =>
    linkedResponses.find(r => r.id === alloc.collect_response_id);

  const handlePercentageChange = (allocId: string, value: string, originalValue: number | null) => {
    const pct = parseFloat(value);
    if (isNaN(pct) || pct < 0 || pct > 100) return;
    const allocated = originalValue != null ? (originalValue * pct) / 100 : null;
    updateAllocation.mutate({ id: allocId, allocation_percentage: pct, allocated_value: allocated });
  };

  const handlePhaseChange = (allocId: string, phase: string) => {
    updateAllocation.mutate({ id: allocId, phase });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Données du module Collect
              </CardTitle>
              <CardDescription>
                Sélectionnez les données collectées à associer à cette étude PCF et définissez le pourcentage d'allocation
              </CardDescription>
            </div>
            {!locked && (
              <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Lier une donnée
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Sélectionner des données collectées</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-44">
                          <SelectValue placeholder="Catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes catégories</SelectItem>
                          {categories.map(c => (
                            <SelectItem key={c} value={c}>
                              {CATEGORY_MAP[c] || c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Response list */}
                    <div className="max-h-[50vh] overflow-auto border rounded-md">
                      {loadingAvailable ? (
                        <div className="p-8 text-center text-muted-foreground">Chargement...</div>
                      ) : filteredResponses.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          Aucune donnée disponible. Vérifiez que le module Collect contient des réponses.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Catégorie</TableHead>
                              <TableHead>Question</TableHead>
                              <TableHead>Valeur</TableHead>
                              <TableHead>Unité</TableHead>
                              <TableHead>Scope</TableHead>
                              <TableHead className="w-20"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredResponses.slice(0, 100).map(response => (
                              <TableRow key={response.id}>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px]">
                                    {CATEGORY_MAP[response.question_category] || response.question_category}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs font-medium">
                                  {response.question_key.replace(/_/g, ' ')}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {typeof response.value === 'object' ? JSON.stringify(response.value) : String(response.value)}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {response.unit || '—'}
                                </TableCell>
                                <TableCell>
                                  {response.scope && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      S{response.scope}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => {
                                      addAllocation.mutate(response.id);
                                    }}
                                    disabled={addAllocation.isPending}
                                  >
                                    <Link2 className="w-3 h-3" />
                                    Lier
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingAllocations ? (
            <div className="py-8 text-center text-muted-foreground">Chargement...</div>
          ) : allocations.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <Database className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Aucune donnée collectée liée</p>
              <p className="text-xs mt-1">
                Cliquez sur "Lier une donnée" pour associer des données du module Collect à cette étude
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Donnée</TableHead>
                  <TableHead>Valeur brute</TableHead>
                  <TableHead>Allocation %</TableHead>
                  <TableHead>Valeur allouée</TableHead>
                  <TableHead>Phase cycle de vie</TableHead>
                  {!locked && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map(alloc => {
                  const response = getResponseForAllocation(alloc);
                  const rawValue = response
                    ? parseFloat(typeof response.value === 'string' ? response.value : String(response.value))
                    : null;

                  return (
                    <TableRow key={alloc.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {response ? (CATEGORY_MAP[response.question_category] || response.question_category) : '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {response?.question_key.replace(/_/g, ' ') || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {rawValue != null && !isNaN(rawValue) ? rawValue.toLocaleString('fr-FR') : '—'}
                        {response?.unit && <span className="text-muted-foreground ml-1">{response.unit}</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 w-24">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={alloc.allocation_percentage}
                            onChange={e => handlePercentageChange(alloc.id, e.target.value, rawValue)}
                            className="h-7 text-xs w-16"
                            disabled={locked}
                          />
                          <Percent className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {alloc.allocated_value != null ? alloc.allocated_value.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '—'}
                        {response?.unit && <span className="text-muted-foreground ml-1">{response.unit}</span>}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={alloc.phase}
                          onValueChange={val => handlePhaseChange(alloc.id, val)}
                          disabled={locked}
                        >
                          <SelectTrigger className="h-7 text-xs w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PHASE_OPTIONS.map(p => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {!locked && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeAllocation.mutate(alloc.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PCFCollectData;

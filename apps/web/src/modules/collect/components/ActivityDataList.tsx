// Composant pour lister, filtrer, éditer et supprimer les données d'activité collectées

import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { useOrganizationSites } from '@/hooks/useOrganizationSites';
import { useOrganizationSubcategories } from '@/hooks/useOrganizationSubcategories';
import { ActivityDataService } from '@/lib/activity-data/ActivityDataService';
import { getSubcategoryLabel } from '@/lib/scope3/subcategories';
import { ActivityData, ActivityDataInput, ActivityType, ActivityCategory, DataQuality, ActivityDataFilters } from '@/lib/activity-data/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Filter, X, Search, Download, History, ChevronLeft, ChevronRight, Leaf, Pencil, Loader2, MoreVertical } from 'lucide-react';
import { BilanCarboneCalculator } from '@/lib/calculators/BilanCarboneCalculator';
import { ActivityDataHistoryComponent } from './ActivityDataHistory';
import { exportToExcel, exportToCSV, exportToJSON, exportToAuditReport } from '@/lib/activity-data/ActivityDataExportService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from "@/integrations/api/client";
import { useAuth } from '@/hooks/useAuth';
import { invalidateEmissionFactorCache } from '@/lib/calculators/BilanCarboneCalculator';

const FE_UNITS = [
  { value: 'kgCO2e/t', label: 'kgCO2e/t' },
  { value: 'kgCO2e/kg', label: 'kgCO2e/kg' },
  { value: 'kgCO2e/€', label: 'kgCO2e/€' },
  { value: 'kgCO2e/unité', label: 'kgCO2e/unité' },
  { value: 'tCO2e/unité', label: 'tCO2e/unité' },
  { value: 'kgCO2e/L', label: 'kgCO2e/L' },
];

export const ActivityDataList: React.FC = () => {
  const { organizationId } = useOrganizationId();
  const { sites } = useOrganizationSites(organizationId || undefined);
  const { customSubcategories } = useOrganizationSubcategories();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityData | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<ActivityData | null>(null);
  const [viewingHistory, setViewingHistory] = useState<ActivityData | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ActivityDataInput>>({});

  // Facteur d'émission (définir/modifier depuis le dialogue "Modifier la donnée")
  const { user } = useAuth();
  const [showFEDialog, setShowFEDialog] = useState(false);
  const [currentFE, setCurrentFE] = useState<{ id: string; factor_name: string; emission_value: number; unit: string } | null>(null);
  const [feFormData, setFeFormData] = useState({ factor_name: '', emission_value: '', unit: 'kgCO2e/unité' });
  const [savingFE, setSavingFE] = useState(false);
  const [loadingFE, setLoadingFE] = useState(false);

  // Émissions calculées par ligne (FE × quantité)
  const [emissionsMap, setEmissionsMap] = useState<Map<string, { fe: number; feUnit: string; feSource: string; emissions: number }>>(new Map());

  // Map des labels de sous-catégories personnalisées (clé technique -> label lisible)
  const customSubcatLabels = useMemo(() => {
    const map = new Map<string, string>();
    customSubcategories.forEach(sub => {
      map.set(sub.value, sub.label);
    });
    return map;
  }, [customSubcategories]);

  // Fonction pour obtenir le label lisible d'une sous-catégorie
  const getReadableSubcategoryLabel = (subcategory: string | null | undefined): string | null => {
    if (!subcategory) return null;

    // La DB peut stocker le format "categorie:sous_categorie" (ex: "cat1_purchased_goods:custom_...")
    // On ne garde que la clé de sous-catégorie pour résoudre le libellé.
    const normalizedValue = subcategory.includes(':') ? subcategory.split(':').slice(-1)[0] : subcategory;
    
    // D'abord chercher dans les sous-catégories personnalisées
    const customLabel = customSubcatLabels.get(normalizedValue);
    if (customLabel) return customLabel;
    
    // Ensuite chercher dans les sous-catégories standard
    const standardLabel = getSubcategoryLabel(normalizedValue);
    if (standardLabel) return standardLabel;
    
    // Fallback: humaniser la clé technique
    return normalizedValue
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Filtres
  const [filters, setFilters] = useState<ActivityDataFilters>({
    organization_id: organizationId || '',
    activity_type: null,
    category: null,
    data_quality: null,
    scope_hint: null,
    period_start: null,
    period_end: null,
  });

  // Charger les données
  const loadActivities = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const data = await ActivityDataService.list({
        ...filters,
        organization_id: organizationId,
      });
      setActivities(data);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors du chargement des données',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [organizationId, filters]);

  // Calculer les émissions par ligne quand les activités changent
  useEffect(() => {
    if (!organizationId || activities.length === 0) return;
    let cancelled = false;
    (async () => {
      const result = await BilanCarboneCalculator.calculate(
        organizationId,
        activities[0]?.period_start || '2025-01-01',
        activities[0]?.period_end || '2025-12-31'
      );
      if (cancelled) return;
      const map = new Map<string, { fe: number; feUnit: string; feSource: string; emissions: number }>();
      // Match detailed breakdown to activities by subcategory + quantity
      for (const activity of activities) {
        const subParts = (activity.subcategory || '').split(':');
        const subKey = subParts.length > 1 ? subParts[1] : subParts[0];
        const match = result.detailedBreakdown.find(d => 
          d.subcategory === subKey && d.quantity === parseFloat(String(activity.quantity))
        );
        if (match) {
          map.set(activity.id, {
            fe: match.emissionFactor,
            feUnit: match.emissionFactorUnit,
            feSource: match.emissionFactorSource,
            emissions: match.emissions,
          });
        }
      }
      setEmissionsMap(map);
    })();
    return () => { cancelled = true; };
  }, [organizationId, activities]);

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, activities.length]);

  // Calcul de la pagination
  const totalPages = Math.ceil(activities.length / ITEMS_PER_PAGE);
  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return activities.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [activities, currentPage]);

  // Réinitialiser les filtres
  const resetFilters = () => {
    setFilters({
      organization_id: organizationId || '',
      activity_type: null,
      category: null,
      data_quality: null,
      scope_hint: null,
      period_start: null,
      period_end: null,
    });
  };

  // Charger le FE existant pour la sous-catégorie (Scope 3)
  const subcategoryKey = editFormData.subcategory?.trim();
  const isScope3 = editFormData.category === 'scope3_upstream' || editFormData.category === 'scope3_downstream';
  useEffect(() => {
    if (!organizationId || !editingActivity || !isScope3 || !subcategoryKey) {
      setCurrentFE(null);
      return;
    }
    let cancelled = false;
    setLoadingFE(true);
    (async () => {
      try {
        let data: any[] | null = null;
        let error: any = null;
        const { data: d1, error: e1 } = await supabase
          .from('organization_emission_factors')
          .select('id, custom_source, custom_value, custom_unit')
          .eq('organization_id', organizationId)
          .eq('subcategory_key', subcategoryKey);
        if (cancelled) return;
        if (!e1 && d1?.length) {
          data = d1;
        } else if (subcategoryKey.includes(':')) {
          const shortKey = subcategoryKey.split(':').slice(-1)[0];
          const { data: d2, error: e2 } = await supabase
            .from('organization_emission_factors')
            .select('id, custom_source, custom_value, custom_unit')
            .eq('organization_id', organizationId)
            .eq('subcategory_key', shortKey);
          if (!cancelled && !e2) data = d2;
          error = e2;
        } else {
          error = e1;
        }
        if (cancelled) return;
        if (error && !data) {
          setCurrentFE(null);
          return;
        }
        const row = Array.isArray(data) && data.length ? data[0] : null;
        if (row) {
          setCurrentFE({
            id: row.id,
            factor_name: row.custom_source || 'Facteur personnalisé',
            emission_value: row.custom_value,
            unit: row.custom_unit || 'kgCO2e/unité',
          });
          setFeFormData({
            factor_name: row.custom_source || '',
            emission_value: String(row.custom_value),
            unit: row.custom_unit || 'kgCO2e/unité',
          });
        } else {
          setCurrentFE(null);
          setFeFormData({ factor_name: getReadableSubcategoryLabel(subcategoryKey) || '', emission_value: '', unit: 'kgCO2e/unité' });
        }
      } finally {
        if (!cancelled) setLoadingFE(false);
      }
    })();
    return () => { cancelled = true; };
  }, [organizationId, editingActivity?.id, isScope3, subcategoryKey]);

  // Ouvrir le dialogue FE (définir / modifier)
  const openFEDialog = () => {
    if (currentFE) {
      setFeFormData({
        factor_name: currentFE.factor_name,
        emission_value: String(currentFE.emission_value),
        unit: currentFE.unit,
      });
    } else {
      setFeFormData({
        factor_name: getReadableSubcategoryLabel(subcategoryKey || '') || '',
        emission_value: '',
        unit: 'kgCO2e/unité',
      });
    }
    setShowFEDialog(true);
  };

  const saveFE = async () => {
    if (!organizationId || !user?.id || !subcategoryKey) return;
    const value = parseFloat(feFormData.emission_value.replace(',', '.'));
    if (isNaN(value) || value < 0) {
      toast({ title: 'Valeur invalide', description: 'Saisissez une valeur numérique positive.', variant: 'destructive' });
      return;
    }
    const factorName = (feFormData.factor_name || getReadableSubcategoryLabel(subcategoryKey) || 'Facteur personnalisé').trim();
    setSavingFE(true);
    try {
      const notes = `scope:3|category:${editFormData.category === 'scope3_upstream' ? 'scope3_upstream' : 'scope3_downstream'}|from_edit_dialog:1`;
      if (currentFE) {
        const { error } = await supabase
          .from('organization_emission_factors')
          .update({
            custom_value: value,
            custom_unit: feFormData.unit,
            custom_source: factorName,
            notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentFE.id);
        if (error) throw error;
        toast({ title: 'Facteur d\'émission mis à jour', description: 'Le dashboard sera recalculé.' });
      } else {
        const { error } = await supabase
          .from('organization_emission_factors')
          .insert({
            organization_id: organizationId,
            base_factor_id: null,
            custom_value: value,
            custom_unit: feFormData.unit,
            custom_source: factorName,
            notes,
            subcategory_key: subcategoryKey,
            created_by: user.id,
          });
        if (error) throw error;
        toast({ title: 'Facteur d\'émission créé', description: 'Il sera utilisé pour le calcul des émissions de cette sous-catégorie.' });
      }
      invalidateEmissionFactorCache();
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      window.dispatchEvent(new CustomEvent('emissionFactorsUpdated'));
      setCurrentFE(currentFE ? { ...currentFE, factor_name: factorName, emission_value: value, unit: feFormData.unit } : { id: '', factor_name: factorName, emission_value: value, unit: feFormData.unit });
      setShowFEDialog(false);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Impossible d\'enregistrer le facteur.', variant: 'destructive' });
    } finally {
      setSavingFE(false);
    }
  };

  // Ouvrir l'édition
  const handleEdit = (activity: ActivityData) => {
    setEditingActivity(activity);
    setEditFormData({
      activity_type: activity.activity_type,
      category: activity.category,
      subcategory: activity.subcategory || undefined,
      quantity: activity.quantity,
      unit: activity.unit,
      period_start: activity.period_start,
      period_end: activity.period_end,
      data_quality: activity.data_quality,
      scope_hint: activity.scope_hint || undefined,
      notes: activity.notes || undefined,
      site_id: activity.site_id || undefined,
    });
    setCurrentFE(null);
    setShowFEDialog(false);
  };

  // Sauvegarder l'édition
  const handleSaveEdit = async () => {
    if (!editingActivity || !organizationId) return;

    try {
      await ActivityDataService.update(editingActivity.id, {
        ...editFormData,
        organization_id: organizationId,
      } as ActivityDataInput);

      toast({
        title: 'Donnée mise à jour',
        description: 'La donnée a été mise à jour avec succès.',
      });

      setEditingActivity(null);
      loadActivities();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la mise à jour',
        variant: 'destructive',
      });
    }
  };

  // Supprimer
  const handleDelete = async () => {
    if (!deletingActivity) return;

    try {
      await ActivityDataService.delete(deletingActivity.id);
      toast({
        title: 'Donnée supprimée',
        description: 'La donnée a été supprimée avec succès.',
      });
      setDeletingActivity(null);
      loadActivities();
      // Invalider le cache du dashboard pour que le total se mette à jour
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      window.dispatchEvent(new Event('activityDataUpdated'));
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la suppression',
        variant: 'destructive',
      });
    }
  };

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Obtenir le badge de qualité
  const getQualityBadge = (quality: DataQuality) => {
    const variants: Record<DataQuality, 'default' | 'secondary' | 'outline'> = {
      real: 'default',
      estimated: 'secondary',
      default: 'outline',
    };
    const labels: Record<DataQuality, string> = {
      real: 'Réelle',
      estimated: 'Estimée',
      default: 'Par défaut',
    };
    return <Badge variant={variants[quality]}>{labels[quality]}</Badge>;
  };

  // Déduire le scope depuis la catégorie si scope_hint est absent
  const inferScope = (activity: { scope_hint?: number | null; category: string }): number | null => {
    if (activity.scope_hint) return activity.scope_hint;
    const cat = activity.category?.toLowerCase() || '';
    if (cat.startsWith('scope1')) return 1;
    if (cat.startsWith('scope2')) return 2;
    if (cat.startsWith('scope3')) return 3;
    return null;
  };

  // Obtenir le badge de scope
  const getScopeBadge = (scope: number | null) => {
    if (!scope) return null;
    const colors: Record<number, string> = {
      1: 'bg-red-100 text-red-800',
      2: 'bg-yellow-100 text-yellow-800',
      3: 'bg-blue-100 text-blue-800',
    };
    return <Badge className={colors[scope]}>Scope {scope}</Badge>;
  };

  if (loading && activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Chargement des données...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête avec filtres */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Données collectées</h3>
          <p className="text-sm text-muted-foreground">
            {activities.length} donnée{activities.length > 1 ? 's' : ''} trouvée{activities.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {activities.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportToExcel(activities)}>
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToCSV(activities)}>
                  CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToJSON(activities)}>
                  JSON (.json)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToAuditReport(activities)}>
                  Rapport d'audit (.txt)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtres
          </Button>
          {(filters.activity_type || filters.category || filters.data_quality || filters.scope_hint || filters.period_start || filters.period_end) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
            >
              <X className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Panneau de filtres */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Type d'activité</Label>
                <Select
                  value={filters.activity_type || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, activity_type: value === 'all' ? null : value as ActivityType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="energy">Énergie</SelectItem>
                    <SelectItem value="fuel">Carburant</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="purchase">Achat</SelectItem>
                    <SelectItem value="material">Matière</SelectItem>
                    <SelectItem value="waste">Déchet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={filters.category || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, category: value === 'all' ? null : value as ActivityCategory })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="scope1">Scope 1</SelectItem>
                    <SelectItem value="scope2">Scope 2</SelectItem>
                    <SelectItem value="scope3_upstream">Scope 3 Amont</SelectItem>
                    <SelectItem value="scope3_downstream">Scope 3 Aval</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Qualité</Label>
                <Select
                  value={filters.data_quality || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, data_quality: value === 'all' ? null : value as DataQuality })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="real">Réelle</SelectItem>
                    <SelectItem value="estimated">Estimée</SelectItem>
                    <SelectItem value="default">Par défaut</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Scope</Label>
                <Select
                  value={filters.scope_hint?.toString() || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, scope_hint: value === 'all' ? null : parseInt(value) as 1 | 2 | 3 })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="1">Scope 1</SelectItem>
                    <SelectItem value="2">Scope 2</SelectItem>
                    <SelectItem value="3">Scope 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Période début</Label>
                <Input
                  type="date"
                  value={filters.period_start || ''}
                  onChange={(e) => setFilters({ ...filters, period_start: e.target.value || null })}
                />
              </div>

              <div className="space-y-2">
                <Label>Période fin</Label>
                <Input
                  type="date"
                  value={filters.period_end || ''}
                  onChange={(e) => setFilters({ ...filters, period_end: e.target.value || null })}
                />
              </div>

              <div className="space-y-2">
                <Label>Site</Label>
                <Select
                  value={filters.site_id || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, site_id: value === 'all' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name} {site.code && `(${site.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tableau des données */}
      {activities.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Aucune donnée trouvée. Commencez par ajouter des données via la saisie directe ou les modes guidés.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>FE</TableHead>
                    <TableHead>Total CO₂e</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Qualité</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedActivities.map((activity) => {
                    const subcategoryLabel = getReadableSubcategoryLabel(activity.subcategory);
                    
                    // Labels traduits pour activity_type
                    const ACTIVITY_TYPE_LABELS: Record<string, string> = {
                      energy: 'Énergie',
                      fuel: 'Carburant',
                      transport: 'Transport',
                      purchase: 'Achats',
                      material: 'Matériaux',
                      waste: 'Déchets',
                      service: 'Service',
                      usage: 'Usage',
                      product_component: 'Composants',
                      natural_gas: 'Gaz naturel',
                      electricity: 'Électricité',
                      water: 'Eau',
                      refrigerant: 'Fluide frigorigène',
                    };
                    
                    // Afficher le libellé de sous-catégorie en priorité s'il existe
                    const displayLabel = subcategoryLabel || ACTIVITY_TYPE_LABELS[activity.activity_type] || activity.activity_type;
                    const activityTypeLabel = ACTIVITY_TYPE_LABELS[activity.activity_type] || activity.activity_type;
                    
                    return (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">
                        {displayLabel}
                        {subcategoryLabel && (
                          <span className="text-xs text-muted-foreground block">{activityTypeLabel}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {activity.site_id 
                          ? sites.find(s => s.id === activity.site_id)?.name || '—'
                          : <span className="text-muted-foreground">Tous</span>
                        }
                      </TableCell>
                      <TableCell>{activity.category}</TableCell>
                      <TableCell>
                        {activity.quantity.toLocaleString('fr-FR')} {activity.unit}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const em = emissionsMap.get(activity.id);
                          if (!em) return <span className="text-muted-foreground text-xs">—</span>;
                          return (
                            <div>
                              <span className="text-sm">{em.fe.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}</span>
                              <span className="text-xs text-muted-foreground block">{em.feSource}</span>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const em = emissionsMap.get(activity.id);
                          if (!em) return <span className="text-muted-foreground text-xs">—</span>;
                          const tco2 = em.emissions / 1000;
                          return (
                            <span className="font-semibold">
                              {tco2 < 1 
                                ? tco2.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : tco2.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
                              } <span className="text-xs font-normal text-muted-foreground">tCO₂e</span>
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {formatDate(activity.period_start)} - {formatDate(activity.period_end)}
                      </TableCell>
                      <TableCell>{getQualityBadge(activity.data_quality)}</TableCell>
                      <TableCell>{getScopeBadge(inferScope(activity))}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingHistory(activity)}>
                              <History className="w-4 h-4 mr-2" />
                              Historique
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(activity)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeletingActivity(activity)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Affichage {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, activities.length)} sur {activities.length} données
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Précédent
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Suivant
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog d'édition */}
      <Dialog open={!!editingActivity} onOpenChange={(open) => !open && setEditingActivity(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la donnée</DialogTitle>
            <DialogDescription>
              Modifiez les informations de cette donnée d'activité.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type d'activité</Label>
                <Select
                  value={editFormData.activity_type}
                  onValueChange={(value) => setEditFormData({ ...editFormData, activity_type: value as ActivityType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="energy">Énergie</SelectItem>
                    <SelectItem value="fuel">Carburant</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="purchase">Achat</SelectItem>
                    <SelectItem value="material">Matière</SelectItem>
                    <SelectItem value="waste">Déchet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={editFormData.category}
                  onValueChange={(value) => setEditFormData({ ...editFormData, category: value as ActivityCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scope1">Scope 1</SelectItem>
                    <SelectItem value="scope2">Scope 2</SelectItem>
                    <SelectItem value="scope3_upstream">Scope 3 Amont</SelectItem>
                    <SelectItem value="scope3_downstream">Scope 3 Aval</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sélecteur de Site */}
              <div className="space-y-2 col-span-2">
                <Label>Site <span className="text-xs text-muted-foreground">(recommandé pour le filtrage dashboard)</span></Label>
                <Select
                  value={editFormData.site_id || '__none__'}
                  onValueChange={(value) => setEditFormData({ ...editFormData, site_id: value === '__none__' ? undefined : value })}
                >
                  <SelectTrigger className={!editFormData.site_id ? 'border-amber-300 bg-amber-50' : ''}>
                    <SelectValue placeholder="Sélectionner un site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Non spécifié (consolidé)</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!editFormData.site_id && (
                  <p className="text-xs text-amber-600">
                    💡 Associer un site permet le filtrage par site dans le dashboard
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Quantité</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.quantity || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Unité</Label>
                <Select
                  value={editFormData.unit || ''}
                  onValueChange={(value) => setEditFormData({ ...editFormData, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une unité" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Unités de masse - pour déchets, matières premières */}
                    <SelectItem value="kg">Kilogrammes (kg)</SelectItem>
                    <SelectItem value="t">Tonnes (t)</SelectItem>
                    <SelectItem value="unités">Unités</SelectItem>
                    {/* Unités de volume - pour carburants, liquides */}
                    <SelectItem value="L">Litres (L)</SelectItem>
                    <SelectItem value="m³">Mètres cubes (m³)</SelectItem>
                    {/* Unités d'énergie */}
                    <SelectItem value="kWh">Kilowattheures (kWh)</SelectItem>
                    {/* Unités de transport */}
                    <SelectItem value="km">Kilomètres (km)</SelectItem>
                    <SelectItem value="t.km">Tonnes-kilomètres (t.km)</SelectItem>
                    <SelectItem value="part.km">Passagers-km (part.km)</SelectItem>
                    {/* Unités monétaires - pour achats/services */}
                    <SelectItem value="TND">Dinars (TND)</SelectItem>
                    {/* Unités spécifiques - voyages d'affaires */}
                    {subcategoryKey?.includes('hotel') && (
                      <SelectItem value="nuitées">Nuitées</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Période début</Label>
                <Input
                  type="date"
                  value={editFormData.period_start || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, period_start: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Période fin</Label>
                <Input
                  type="date"
                  value={editFormData.period_end || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, period_end: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Qualité</Label>
                <Select
                  value={editFormData.data_quality}
                  onValueChange={(value) => setEditFormData({ ...editFormData, data_quality: value as DataQuality })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="real">Réelle</SelectItem>
                    <SelectItem value="estimated">Estimée</SelectItem>
                    <SelectItem value="default">Par défaut</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Scope</Label>
                <Select
                  value={editFormData.scope_hint?.toString() || 'none'}
                  onValueChange={(value) => setEditFormData({ ...editFormData, scope_hint: value === 'none' ? undefined : parseInt(value) as 1 | 2 | 3 })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    <SelectItem value="1">Scope 1</SelectItem>
                    <SelectItem value="2">Scope 2</SelectItem>
                    <SelectItem value="3">Scope 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isScope3 && subcategoryKey && (
              <>
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <span className="text-muted-foreground">Sous-catégorie : </span>
                  <strong>{getReadableSubcategoryLabel(subcategoryKey) || subcategoryKey}</strong>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-200">
                      <Leaf className="h-4 w-4" />
                      Facteur d'émission
                    </Label>
                    {loadingFE ? (
                      <span className="text-sm text-muted-foreground">Chargement...</span>
                    ) : currentFE ? (
                      <span className="text-sm">
                        {currentFE.emission_value} {currentFE.unit}
                      </span>
                    ) : (
                      <span className="text-sm text-amber-600 dark:text-amber-400">Non défini — les émissions ne seront pas calculées</span>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={openFEDialog} className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/50">
                    {currentFE ? <><Pencil className="h-3.5 w-3 mr-1" /> Modifier le facteur d'émission</> : <>Définir le facteur d'émission</>}
                  </Button>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={editFormData.notes || ''}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="Notes optionnelles..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingActivity(null)}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Définir / Modifier le facteur d'émission */}
      <Dialog open={showFEDialog} onOpenChange={setShowFEDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{currentFE ? 'Modifier le facteur d\'émission' : 'Définir le facteur d\'émission'}</DialogTitle>
            <DialogDescription>
              Pour la sous-catégorie « {getReadableSubcategoryLabel(subcategoryKey || '') || subcategoryKey} ». Ce facteur sera utilisé pour calculer les émissions de cette donnée.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nom du facteur</Label>
              <Input
                value={feFormData.factor_name}
                onChange={(e) => setFeFormData({ ...feFormData, factor_name: e.target.value })}
                placeholder="Ex: Pneus neufs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Valeur (kgCO2e / unité)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={feFormData.emission_value}
                  onChange={(e) => setFeFormData({ ...feFormData, emission_value: e.target.value })}
                  placeholder="Ex: 2.5"
                />
              </div>
              <div className="grid gap-2">
                <Label>Unité</Label>
                <Select
                  value={feFormData.unit}
                  onValueChange={(u) => setFeFormData({ ...feFormData, unit: u })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FE_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFEDialog(false)} disabled={savingFE}>Annuler</Button>
            <Button onClick={saveFE} disabled={savingFE || !feFormData.emission_value.trim()}>
              {savingFE && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {currentFE ? 'Enregistrer' : 'Créer le facteur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deletingActivity} onOpenChange={(open) => !open && setDeletingActivity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la donnée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La donnée sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog d'historique */}
      <Dialog open={!!viewingHistory} onOpenChange={(open) => !open && setViewingHistory(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historique des modifications</DialogTitle>
            <DialogDescription>
              Historique complet des modifications de cette donnée d'activité
            </DialogDescription>
          </DialogHeader>
          {viewingHistory && (
            <ActivityDataHistoryComponent activityId={viewingHistory.id} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingHistory(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

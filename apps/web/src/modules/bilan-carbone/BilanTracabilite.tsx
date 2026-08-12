// Page Traçabilité - Détail complet des calculs d'émissions
// Utilise le composant EmissionsSummaryTable du dashboard avec les mêmes libellés

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, Calculator, Download, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { useAppData } from '@/contexts/AppDataContext';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { useOrganizationSubcategories } from '@/hooks/useOrganizationSubcategories';
import { BilanCarboneCalculator, EmissionLineDetail } from '@/lib/calculators/BilanCarboneCalculator';
import { EmissionsSummaryTable, EmissionRow, DataStatus } from '@/components/dashboard/multi-tenant/EmissionsSummaryTable';
import { getSubcategoryLabel } from '@/lib/scope3/subcategories';

// Mapping data quality to DataStatus
const mapDataQuality = (quality: string): DataStatus => {
  switch (quality) {
    case 'real':
      return 'consolidated';
    case 'estimated':
      return 'estimated';
    case 'default':
      return 'default';
    default:
      return 'provisional';
  }
};

export const BilanTracabilite: React.FC = () => {
  const { organizationId, organizationLoading } = useAppData();
  const { organization, loading: orgDataLoading } = useOrganizationData();
  const { customSubcategories } = useOrganizationSubcategories(organizationId || undefined);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<EmissionLineDetail[]>([]);
  const [totalEmissions, setTotalEmissions] = useState(0);

  // Année de référence depuis l'organisation (comme le dashboard)
  const year = useMemo(() => 
    organization?.reference_year || new Date().getFullYear(),
    [organization?.reference_year]
  );

  // Map pour lookup rapide des labels personnalisés
  const customLabelsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (customSubcategories) {
      customSubcategories.forEach((sub: { value: string; label: string }) => {
        if (sub.value && sub.label) {
          map.set(sub.value.toLowerCase(), sub.label);
        }
      });
    }
    return map;
  }, [customSubcategories]);

  // Fonction pour formater les noms de catégories (identique au dashboard)
  const formatCategoryName = useCallback((category: string): string => {
    const nameMap: Record<string, string> = {
      'essence_sans_plomb': 'Essence Sans Plomb',
      'gasoil': 'Gasoil',
      'gasoil_super': 'Gasoil Super',
      'fossil_gas': 'Gaz Naturel',
      'fossil_fuel_oil': 'Fioul',
      'electricity': 'Électricité',
      'r410a': 'Fluide Frigorigène R410A',
      'r22': 'Fluide Frigorigène R22',
      'fuel_diesel': 'Diesel',
      // Scope 3 standard categories
      'cat1_imported_spare_parts': 'Pièces détachées importées',
      'cat6_flight_short': 'Vols court-courrier',
      'cat6_flight_medium': 'Vols moyen-courrier',
      'cat6_flight_long': 'Vols long-courrier',
      'cat7_commuting': 'Trajets domicile-travail',
      'cat7_company_cars': 'Véhicules de fonction',
      'cat13_leased_vehicles_km': 'Véhicules loués (km)',
    };

    // Extraire la sous-catégorie si format composite (cat1_xxx:subcategory)
    const parts = category.split(':');
    const subcategory = parts.length > 1 ? parts[1] : parts[0];
    const subcategoryLower = subcategory.toLowerCase();

    // 1. Vérifier les labels personnalisés (sous-catégories org) – correspondance exacte
    if (customLabelsMap.has(subcategoryLower)) {
      return customLabelsMap.get(subcategoryLower)!;
    }

    // 1b. Clé custom_ mais pas de correspondance exacte : chercher par préfixe
    if (subcategoryLower.startsWith('custom_')) {
      const found = customSubcategories?.find(
        (sub: { value: string; label: string }) =>
          sub.value?.toLowerCase() === subcategoryLower ||
          subcategoryLower.startsWith(sub.value?.toLowerCase() ?? '') ||
          (sub.value?.toLowerCase() ?? '').startsWith(subcategoryLower)
      );
      if (found?.label) return found.label;
    }

    // 2. Labels standard Scope 3 (ex: cat2_tires_new → Pneus achetés)
    const standardLabel = getSubcategoryLabel(subcategory) || getSubcategoryLabel(category);
    if (standardLabel) return standardLabel;

    // 3. Map statique (Scope 1/2, noms courants)
    if (nameMap[subcategoryLower]) {
      return nameMap[subcategoryLower];
    }

    // 4. Fallback: formater la clé (sans tronquer)
    return subcategory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }, [customLabelsMap, customSubcategories]);

  useEffect(() => {
    const loadData = async () => {
      if (!organizationId || organizationLoading || orgDataLoading) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Période basée sur l'année de référence de l'organisation
        const periodStart = `${year}-01-01`;
        const periodEnd = `${year}-12-31`;
        
        const result = await BilanCarboneCalculator.calculate(
          organizationId,
          periodStart,
          periodEnd
        );
        
        if (result.detailedBreakdown) {
          setDetails(result.detailedBreakdown);
        }
        setTotalEmissions(result.totalEmissions);
      } catch (error) {
        console.error('Erreur chargement traçabilité:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organizationId, organizationLoading, orgDataLoading, year]);

  // Transformer les détails en format EmissionRow pour le composant
  // Avec agrégation par subcategory (identique au dashboard)
  const tableData: EmissionRow[] = useMemo(() => {
    if (details.length === 0) return [];
    
    const total = details.reduce((sum, d) => sum + d.emissions, 0);
    
    // Agréger par subcategory pour éviter les doublons, mais garder les détails
    const aggregated = new Map<string, {
      scope: 1 | 2 | 3;
      post: string;
      emissions: number;
      quantity: number;
      unit: string;
      emissionFactor: number;
      emissionFactorUnit: string;
      emissionFactorSource: string;
      dataQuality: string;
    }>();
    
    details.forEach(item => {
      const key = item.subcategory;
      if (aggregated.has(key)) {
        const existing = aggregated.get(key)!;
        existing.emissions += item.emissions;
        existing.quantity += item.quantity;
      } else {
        aggregated.set(key, {
          scope: item.scope,
          post: formatCategoryName(item.subcategory),
          emissions: item.emissions,
          quantity: item.quantity,
          unit: item.unit,
          emissionFactor: item.emissionFactor,
          emissionFactorUnit: item.emissionFactorUnit,
          emissionFactorSource: item.emissionFactorSource,
          dataQuality: item.dataQuality,
        });
      }
    });
    
    return Array.from(aggregated.values()).map(item => ({
      scope: item.scope,
      post: item.post,
      emissions: item.emissions,
      percentage: total > 0 ? (item.emissions / total) * 100 : 0,
      dataStatus: mapDataQuality(item.dataQuality),
      quantity: item.quantity,
      unit: item.unit,
      emissionFactor: item.emissionFactor,
      emissionFactorUnit: item.emissionFactorUnit,
      emissionFactorSource: item.emissionFactorSource,
    }));
  }, [details, formatCategoryName]);

  const handleExportExcel = useCallback(async () => {
    if (tableData.length === 0) return;

    const rows = [...tableData]
      .sort((a, b) => b.emissions - a.emissions)
      .map(row => ({
        'Scope': `Scope ${row.scope}`,
        'Poste d\'émission': row.post,
        'Quantité': row.quantity ?? '',
        'Unité': row.unit ?? '',
        'Facteur d\'émission': row.emissionFactor ?? '',
        'Unité FE': row.emissionFactorUnit ?? '',
        'Source FE': row.emissionFactorSource ?? '',
        'Émissions (kgCO₂e)': Math.round(row.emissions),
        'Émissions (tCO₂e)': +(row.emissions / 1000).toFixed(2),
        'Part (%)': +row.percentage.toFixed(1),
        'Statut': row.dataStatus === 'consolidated' ? 'Consolidé' : row.dataStatus === 'estimated' ? 'Estimé' : row.dataStatus === 'default' ? 'Par défaut' : 'Provisoire',
      }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Traçabilité');

    const columns = Object.keys(rows[0]);
    worksheet.columns = columns.map((key) => ({
      header: key,
      key,
      width: Math.max(
        key.length,
        ...rows.map((row) => String((row as Record<string, unknown>)[key] ?? '').length)
      ) + 2,
    }));

    rows.forEach((row) => {
      worksheet.addRow(row);
    });

    const orgName = organization?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'organisation';
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tracabilite_${orgName}_${year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [tableData, organization, year]);

  if (loading || organizationLoading || orgDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune organisation sélectionnée</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Traçabilité des calculs
          </h1>
          <p className="text-muted-foreground mt-1">
            Détail complet de chaque ligne de calcul : quantité × facteur d'émission = émissions ({year})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="shrink-0">
            <Link to="/app/bilan-carbone/preuve">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Noyau de preuve
            </Link>
          </Button>
          {tableData.length > 0 && (
            <Button onClick={handleExportExcel} className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
              <Download className="h-4 w-4 mr-2" />
              Télécharger Excel
            </Button>
          )}
        </div>
      </div>

      {/* Tableau avec lignes expansibles */}
      <EmissionsSummaryTable
        data={tableData}
        totalEmissions={totalEmissions}
      />
    </div>
  );
};

export default BilanTracabilite;

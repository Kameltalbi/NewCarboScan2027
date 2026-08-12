// Tableau de synthèse des émissions avec lignes expansibles
// Colonnes: Scope, Poste d'émission, Émissions (tCO₂e), Part (%), Statut des données
// Détail au clic: Quantité × FE = Émissions (traçabilité complète)

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Calculator } from 'lucide-react';

export type DataStatus = 'consolidated' | 'estimated' | 'default' | 'provisional';

export interface EmissionRow {
  scope: 1 | 2 | 3;
  post: string;
  emissions: number;
  percentage: number;
  dataStatus: DataStatus;
  // Nouvelles propriétés pour la traçabilité
  quantity?: number;
  unit?: string;
  emissionFactor?: number;
  emissionFactorUnit?: string;
  emissionFactorSource?: string;
}

interface EmissionsSummaryTableProps {
  data: EmissionRow[];
  totalEmissions: number;
}

// Palette dashboard – terracotta (S1), cyan (S2), bleu (S3)
const SCOPE_COLORS = {
  1: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
  2: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
  3: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
};

const STATUS_CONFIG: Record<DataStatus, { label: string; className: string }> = {
  consolidated: {
    label: 'Consolidé',
    className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
  },
  estimated: {
    label: 'Estimé',
    className: 'bg-amber-100 text-amber-700 border-amber-300',
  },
  default: {
    label: 'Par défaut',
    className: 'bg-gray-100 text-gray-600 border-gray-300',
  },
  provisional: {
    label: 'Provisoire',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
  },
};

// Conversion kg → tonnes
const kgToTonnes = (kg: number) => kg / 1000;

// Formatage intelligent : 2 décimales si < 1 tonne, sinon entier arrondi
const formatTonnes = (kg: number): string => {
  const tonnes = kgToTonnes(kg);
  if (tonnes > 0 && tonnes < 1) {
    return tonnes.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return Math.round(tonnes).toLocaleString('fr-FR');
};

// Formatage des quantités
const formatQuantity = (value: number): string => {
  if (value < 1) {
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  if (value < 100) {
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return Math.round(value).toLocaleString('fr-FR');
};

// Formatage des FE
const formatEF = (value: number): string => {
  if (value < 0.01) {
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  }
  if (value < 1) {
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

// Composant de ligne expansible
const ExpandableRow: React.FC<{
  row: EmissionRow;
  index: number;
}> = ({ row, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetails = row.quantity !== undefined && row.emissionFactor !== undefined;

  return (
    <>
      <TableRow 
        className={cn(
          "hover:bg-muted/30 transition-colors",
          hasDetails && "cursor-pointer"
        )}
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
      >
        <TableCell className="py-2 w-8">
          {hasDetails && (
            <span className="text-muted-foreground">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}
        </TableCell>
        <TableCell className="py-2">
          <Badge 
            variant="outline" 
            className={cn("text-[10px] sm:text-xs font-medium", SCOPE_COLORS[row.scope])}
          >
            S{row.scope}
          </Badge>
        </TableCell>
        <TableCell className="font-medium text-xs sm:text-sm py-2 min-w-[140px] max-w-[320px]" title={row.post}>
          <span className="line-clamp-2 break-words">{row.post}</span>
        </TableCell>
        <TableCell className="text-right tabular-nums font-semibold text-xs sm:text-sm py-2">
          {formatTonnes(row.emissions)} t
        </TableCell>
        <TableCell className="text-right tabular-nums text-muted-foreground text-xs py-2 hidden sm:table-cell">
          {Math.round(row.percentage)}%
        </TableCell>
        <TableCell className="text-center py-2 hidden sm:table-cell">
          <Badge 
            variant="outline" 
            className={cn("text-[10px] font-medium", STATUS_CONFIG[row.dataStatus].className)}
          >
            {STATUS_CONFIG[row.dataStatus].label}
          </Badge>
        </TableCell>
      </TableRow>
      
      {/* Ligne de détail expansible */}
      {isExpanded && hasDetails && (
        <TableRow className="bg-muted/20 border-0">
          <TableCell colSpan={6} className="py-3 px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-6">
              <Calculator className="h-3.5 w-3.5 text-primary/70" />
              <span className="font-medium text-foreground/80">Calcul :</span>
              <span className="font-mono bg-background/80 px-2 py-0.5 rounded border">
                {formatQuantity(row.quantity!)} {row.unit || '?'}
              </span>
              <span>×</span>
              <span className="font-mono bg-background/80 px-2 py-0.5 rounded border">
                {formatEF(row.emissionFactor!)} {row.emissionFactorUnit || 'kgCO₂e/?'}
              </span>
              <span>=</span>
              <span className="font-mono font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                {formatTonnes(row.emissions)} tCO₂e
              </span>
              {row.emissionFactorSource && (
                <span className="ml-2 text-muted-foreground/70 italic">
                  (Source: {row.emissionFactorSource})
                </span>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export const EmissionsSummaryTable: React.FC<EmissionsSummaryTableProps> = ({
  data,
  totalEmissions,
}) => {
  // Sort by emissions descending
  const sortedData = [...data].sort((a, b) => b.emissions - a.emissions);

  if (sortedData.length === 0) {
    return (
      <Card className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-700">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">Sous-catégories saisies et émissions calculées</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Liste de toutes les sous-catégories pour lesquelles des données ont été saisies, avec les émissions calculées.</p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if any row has details
  const hasAnyDetails = sortedData.some(row => row.quantity !== undefined && row.emissionFactor !== undefined);

  return (
    <Card className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">Sous-catégories saisies et émissions calculées</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Liste de toutes les sous-catégories pour lesquelles des données ont été saisies, avec les émissions calculées (tCO₂e) et la part du total.
          {hasAnyDetails && (
            <span className="block mt-1 text-primary/80">
              💡 Cliquez sur une ligne pour voir le détail du calcul (Quantité × FE = Émissions)
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-16 sm:w-20 text-xs">Scope</TableHead>
                <TableHead className="min-w-[120px] text-xs">Poste</TableHead>
                <TableHead className="text-right w-24 sm:w-32 text-xs">Émissions</TableHead>
                <TableHead className="text-right w-14 sm:w-20 text-xs hidden sm:table-cell">Part</TableHead>
                <TableHead className="text-center w-20 sm:w-28 text-xs hidden sm:table-cell">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row, index) => (
                <ExpandableRow key={index} row={row} index={index} />
              ))}
              
              {/* Total row */}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell></TableCell>
                <TableCell colSpan={2} className="py-2">
                  <span className="text-foreground text-xs sm:text-sm">Total</span>
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm sm:text-lg py-2">
                  {Math.round(kgToTonnes(totalEmissions)).toLocaleString('fr-FR')} tCO₂e
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs py-2 hidden sm:table-cell">
                  100%
                </TableCell>
                <TableCell className="hidden sm:table-cell" />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
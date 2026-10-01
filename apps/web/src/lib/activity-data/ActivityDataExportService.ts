// Service pour exporter les données d'activité (Excel, CSV, JSON)

import ExcelJS from 'exceljs';
import { ActivityData } from './types';
import {
  buildPortableExportRows,
  PORTABLE_HEADERS,
  type PortableExportInput,
  type PortableRow,
} from './portableExport';

export type { PortableExportInput };

export interface ExportOptions {
  format: 'excel' | 'csv' | 'json' | 'audit';
  includeMetadata?: boolean;
  includeEmissions?: boolean;
}

export async function createPortableWorkbook(
  rows: PortableRow[],
  activities: ActivityData[] = [],
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const dataSheet = workbook.addWorksheet('Données');
  dataSheet.columns = PORTABLE_HEADERS.map((header) => ({
    header,
    key: header,
    width: Math.min(40, Math.max(14, header.length + 2)),
  }));
  rows.forEach((row) => dataSheet.addRow(row));

  // Feuille 2: Statistiques
  const statsSheet = workbook.addWorksheet('Statistiques');
  statsSheet.columns = [
    { header: 'Indicateur', key: 'indicator', width: 30 },
    { header: 'Valeur', key: 'value', width: 20 },
  ];

  const totalCount = activities.length;
  const realCount = activities.filter(a => a.data_quality === 'real').length;
  const estimatedCount = activities.filter(a => a.data_quality === 'estimated').length;
  const defaultCount = activities.filter(a => a.data_quality === 'default').length;
  const scope1Count = activities.filter(a => a.scope_hint === 1).length;
  const scope2Count = activities.filter(a => a.scope_hint === 2).length;
  const scope3Count = activities.filter(a => a.scope_hint === 3).length;

  statsSheet.addRows([
    { indicator: 'Total données', value: totalCount },
    { indicator: 'Données réelles', value: realCount },
    { indicator: 'Données estimées', value: estimatedCount },
    { indicator: 'Données par défaut', value: defaultCount },
    { indicator: 'Scope 1', value: scope1Count },
    { indicator: 'Scope 2', value: scope2Count },
    { indicator: 'Scope 3', value: scope3Count },
    { indicator: 'Taux de données réelles', value: totalCount > 0 ? `${((realCount / totalCount) * 100).toFixed(1)}%` : '0%' },
  ]);

  // Feuille 3: Par type d'activité
  const byTypeSheet = workbook.addWorksheet('Par type');
  byTypeSheet.columns = [
    { header: 'Type d\'activité', key: 'type', width: 20 },
    { header: 'Nombre', key: 'count', width: 10 },
    { header: 'Quantité totale', key: 'total_quantity', width: 15 },
  ];

  const byType = activities.reduce((acc, activity) => {
    if (!acc[activity.activity_type]) {
      acc[activity.activity_type] = { count: 0, totalQuantity: 0 };
    }
    acc[activity.activity_type].count++;
    acc[activity.activity_type].totalQuantity += activity.quantity;
    return acc;
  }, {} as Record<string, { count: number; totalQuantity: number }>);

  Object.entries(byType).forEach(([type, stats]) => {
    byTypeSheet.addRow({
      type,
      count: stats.count,
      total_quantity: stats.totalQuantity,
    });
  });

  return workbook;
}

/**
 * Exporter les données d'activité en Excel.
 * Le classeur reprend les lignes portables. Il ne relit pas le catalogue.
 */
export async function exportToExcel(
  activities: ActivityData[],
  options: ExportOptions = { format: 'excel' },
  portable?: Omit<PortableExportInput, 'activities'>,
): Promise<void> {
  const rows = buildPortableExportRows({ activities, ...portable });
  const workbook = await createPortableWorkbook(rows, activities);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // Télécharger
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `donnees-collectees-${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Exporter les données d'activité en CSV
 */
export function exportToCSV(
  activities: ActivityData[],
  portable?: Omit<PortableExportInput, 'activities'>,
): void {
  const portableRows = buildPortableExportRows({ activities, ...portable });
  const headers = [...PORTABLE_HEADERS];
  const rows = portableRows.map((row) => headers.map((header) => {
    const value = row[header];
    return value == null ? '' : String(value).replace(/"/g, '""');
  }));

  const csvContent = [
    headers.join(';'),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM pour Excel
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `donnees-collectees-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Exporter les données d'activité en JSON
 */
export function exportToJSON(activities: ActivityData[]): void {
  const jsonContent = JSON.stringify(activities, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `donnees-collectees-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Exporter un rapport d'audit (texte)
 */
export function exportToAuditReport(activities: ActivityData[]): void {
  const lines: string[] = [];
  
  lines.push('='.repeat(80));
  lines.push('RAPPORT D\'AUDIT - DONNÉES COLLECTÉES');
  lines.push('='.repeat(80));
  lines.push(`Date d'export: ${new Date().toLocaleString('fr-FR')}`);
  lines.push(`Nombre total de données: ${activities.length}`);
  lines.push('');

  // Statistiques
  lines.push('STATISTIQUES');
  lines.push('-'.repeat(80));
  const realCount = activities.filter(a => a.data_quality === 'real').length;
  const estimatedCount = activities.filter(a => a.data_quality === 'estimated').length;
  const defaultCount = activities.filter(a => a.data_quality === 'default').length;
  lines.push(`Données réelles: ${realCount} (${((realCount / activities.length) * 100).toFixed(1)}%)`);
  lines.push(`Données estimées: ${estimatedCount} (${((estimatedCount / activities.length) * 100).toFixed(1)}%)`);
  lines.push(`Données par défaut: ${defaultCount} (${((defaultCount / activities.length) * 100).toFixed(1)}%)`);
  lines.push('');

  // Par scope
  lines.push('RÉPARTITION PAR SCOPE');
  lines.push('-'.repeat(80));
  const scope1 = activities.filter(a => a.scope_hint === 1).length;
  const scope2 = activities.filter(a => a.scope_hint === 2).length;
  const scope3 = activities.filter(a => a.scope_hint === 3).length;
  lines.push(`Scope 1: ${scope1}`);
  lines.push(`Scope 2: ${scope2}`);
  lines.push(`Scope 3: ${scope3}`);
  lines.push('');

  // Détail des données
  lines.push('DÉTAIL DES DONNÉES');
  lines.push('-'.repeat(80));
  activities.forEach((activity, index) => {
    lines.push(`\n${index + 1}. ${activity.activity_type} - ${activity.category}`);
    lines.push(`   ID: ${activity.id}`);
    lines.push(`   Quantité: ${activity.quantity} ${activity.unit}`);
    lines.push(`   Période: ${formatDate(activity.period_start)} - ${formatDate(activity.period_end)}`);
    lines.push(`   Qualité: ${activity.data_quality}`);
    if (activity.scope_hint) lines.push(`   Scope: ${activity.scope_hint}`);
    if (activity.notes) lines.push(`   Notes: ${activity.notes}`);
    lines.push(`   Créé le: ${formatDateTime(activity.created_at)}`);
  });

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rapport-audit-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Fonctions utilitaires
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR');
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('fr-FR');
}

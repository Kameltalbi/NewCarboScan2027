// Service pour exporter les données d'activité (Excel, CSV, JSON)

import ExcelJS from 'exceljs';
import { ActivityData } from './types';

export interface ExportOptions {
  format: 'excel' | 'csv' | 'json' | 'audit';
  includeMetadata?: boolean;
  includeEmissions?: boolean;
}

/**
 * Exporter les données d'activité en Excel
 */
export async function exportToExcel(
  activities: ActivityData[],
  options: ExportOptions = { format: 'excel' }
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  
  // Feuille 1: Données principales
  const dataSheet = workbook.addWorksheet('Données');
  dataSheet.columns = [
    { header: 'ID', key: 'id', width: 36 },
    { header: 'Type d\'activité', key: 'activity_type', width: 15 },
    { header: 'Catégorie', key: 'category', width: 20 },
    { header: 'Sous-catégorie', key: 'subcategory', width: 20 },
    { header: 'Quantité', key: 'quantity', width: 15 },
    { header: 'Unité', key: 'unit', width: 10 },
    { header: 'Période début', key: 'period_start', width: 15 },
    { header: 'Période fin', key: 'period_end', width: 15 },
    { header: 'Qualité', key: 'data_quality', width: 12 },
    { header: 'Scope', key: 'scope_hint', width: 8 },
    { header: 'Score confiance', key: 'confidence_score', width: 15 },
    { header: 'Site ID', key: 'site_id', width: 36 },
    { header: 'Produit ID', key: 'product_id', width: 36 },
    { header: 'Notes', key: 'notes', width: 30 },
    { header: 'Créé le', key: 'created_at', width: 20 },
    { header: 'Modifié le', key: 'updated_at', width: 20 },
  ];

  activities.forEach((activity) => {
    dataSheet.addRow({
      id: activity.id,
      activity_type: activity.activity_type,
      category: activity.category,
      subcategory: activity.subcategory || '',
      quantity: activity.quantity,
      unit: activity.unit,
      period_start: formatDate(activity.period_start),
      period_end: formatDate(activity.period_end),
      data_quality: activity.data_quality,
      scope_hint: activity.scope_hint || '',
      confidence_score: activity.confidence_score || '',
      site_id: activity.site_id || '',
      product_id: activity.product_id || '',
      notes: activity.notes || '',
      created_at: formatDateTime(activity.created_at),
      updated_at: formatDateTime(activity.updated_at),
    });
  });

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

  // Générer le fichier
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
export function exportToCSV(activities: ActivityData[]): void {
  const headers = [
    'ID',
    'Type d\'activité',
    'Catégorie',
    'Sous-catégorie',
    'Quantité',
    'Unité',
    'Période début',
    'Période fin',
    'Qualité',
    'Scope',
    'Score confiance',
    'Site ID',
    'Produit ID',
    'Notes',
    'Créé le',
    'Modifié le',
  ];

  const rows = activities.map((activity) => [
    activity.id,
    activity.activity_type,
    activity.category,
    activity.subcategory || '',
    activity.quantity.toString(),
    activity.unit,
    formatDate(activity.period_start),
    formatDate(activity.period_end),
    activity.data_quality,
    activity.scope_hint?.toString() || '',
    activity.confidence_score?.toString() || '',
    activity.site_id || '',
    activity.product_id || '',
    (activity.notes || '').replace(/"/g, '""'), // Échapper les guillemets
    formatDateTime(activity.created_at),
    formatDateTime(activity.updated_at),
  ]);

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

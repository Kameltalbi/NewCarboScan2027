import React, { useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, BarChart3, Printer } from 'lucide-react';
import { ClimateScenario, SCENARIO_TYPE_LABELS, SCENARIO_TYPE_COLORS } from '../types';
import { toast } from 'sonner';

interface Props {
  scenarios: ClimateScenario[];
  activeScenario: ClimateScenario | null;
}

const REPORT_TYPES = [
  { id: 'executive', label: 'Synthèse exécutive', desc: 'Résumé des scénarios pour le comité climat.', icon: FileText },
  { id: 'detail', label: 'Fiche détaillée', desc: 'Détail complet du scénario sélectionné.', icon: BarChart3 },
  { id: 'comparison', label: 'Comparaison', desc: 'Analyse comparative de tous les scénarios.', icon: BarChart3 },
  { id: 'projection', label: 'Projection annuelle', desc: 'Tableau des émissions projetées année par année.', icon: BarChart3 },
  { id: 'methodology', label: 'Note méthodologique', desc: 'Détail des hypothèses, sources et méthodes.', icon: FileText },
];

/** Generate CSV content and trigger download */
function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const csv = bom + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Generate and open a printable HTML report (for PDF via browser print) */
function openPrintableReport(title: string, content: string) {
  const win = window.open('', '_blank');
  if (!win) { toast.error('Popup bloquée. Autorisez les popups pour exporter en PDF.'); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 22px; border-bottom: 2px solid #10b981; padding-bottom: 8px; margin-bottom: 24px; }
  h2 { font-size: 16px; color: #374151; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  th { background: #f3f4f6; padding: 8px 12px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600; }
  td { padding: 8px 12px; border: 1px solid #e5e7eb; }
  tr:nth-child(even) { background: #f9fafb; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  .footer { margin-top: 40px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  @media print { body { margin: 20px; } }
</style></head><body>${content}
<div class="footer">Rapport généré par CarboScan Suite — ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

function formatNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

export const ScenarioReportingSection: React.FC<Props> = ({ scenarios, activeScenario }) => {

  const buildExecutiveHTML = useCallback(() => {
    const rows = scenarios.map(s => `<tr>
      <td>${s.name}</td>
      <td>${SCENARIO_TYPE_LABELS[s.scenario_type]}</td>
      <td>${s.baseline_year}–${s.target_year}</td>
      <td>${formatNum(s.baseline_emissions_tco2e)} tCO₂e</td>
      <td>${formatNum(s.target_emissions_tco2e)} tCO₂e</td>
      <td>${s.target_reduction_percent != null ? s.target_reduction_percent + '%' : '—'}</td>
      <td>${s.status}</td>
    </tr>`).join('');
    return `<h1>Synthèse exécutive — Scénarios climat</h1>
      <p class="meta">${scenarios.length} scénario(s) • Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
      <table><thead><tr><th>Scénario</th><th>Type</th><th>Période</th><th>Baseline</th><th>Cible</th><th>Réduction</th><th>Statut</th></tr></thead><tbody>${rows}</tbody></table>`;
  }, [scenarios]);

  const buildDetailHTML = useCallback(() => {
    const s = activeScenario;
    if (!s) return '<p>Aucun scénario sélectionné.</p>';
    return `<h1>Fiche détaillée — ${s.name}</h1>
      <p class="meta">${SCENARIO_TYPE_LABELS[s.scenario_type]} • ${s.baseline_year}–${s.target_year}</p>
      <h2>Paramètres</h2>
      <table><tbody>
        <tr><td><strong>Baseline</strong></td><td>${formatNum(s.baseline_emissions_tco2e)} tCO₂e</td></tr>
        <tr><td><strong>Cible</strong></td><td>${formatNum(s.target_emissions_tco2e)} tCO₂e</td></tr>
        <tr><td><strong>Réduction visée</strong></td><td>${s.target_reduction_percent ?? '—'}%</td></tr>
        <tr><td><strong>Net Zero</strong></td><td>${s.net_zero_flag ? 'Oui' : 'Non'}</td></tr>
        <tr><td><strong>CA annuel</strong></td><td>${s.annual_revenue_eur ? formatNum(s.annual_revenue_eur) + ' €' : '—'}</td></tr>
        <tr><td><strong>Statut</strong></td><td>${s.status}</td></tr>
      </tbody></table>
      ${s.notes ? `<h2>Notes</h2><p>${s.notes}</p>` : ''}`;
  }, [activeScenario]);

  const buildComparisonHTML = useCallback(() => {
    const headers = '<tr><th>Paramètre</th>' + scenarios.map(s => `<th>${s.name}</th>`).join('') + '</tr>';
    const row = (label: string, fn: (s: ClimateScenario) => string) =>
      `<tr><td><strong>${label}</strong></td>${scenarios.map(s => `<td>${fn(s)}</td>`).join('')}</tr>`;
    return `<h1>Comparaison des scénarios</h1>
      <p class="meta">${scenarios.length} scénario(s)</p>
      <table><thead>${headers}</thead><tbody>
        ${row('Type', s => SCENARIO_TYPE_LABELS[s.scenario_type])}
        ${row('Période', s => `${s.baseline_year}–${s.target_year}`)}
        ${row('Baseline', s => formatNum(s.baseline_emissions_tco2e) + ' tCO₂e')}
        ${row('Cible', s => formatNum(s.target_emissions_tco2e) + ' tCO₂e')}
        ${row('Réduction', s => (s.target_reduction_percent ?? '—') + '%')}
        ${row('Net Zero', s => s.net_zero_flag ? 'Oui' : 'Non')}
        ${row('Statut', s => s.status)}
      </tbody></table>`;
  }, [scenarios]);

  const handleExport = (type: string, format: string) => {
    if (format === 'CSV') {
      exportCSV(type);
    } else if (format === 'PDF') {
      exportPDF(type);
    } else if (format === 'Excel') {
      // Excel = CSV with .xls extension for Excel compatibility
      exportCSV(type, true);
    }
  };

  const exportCSV = (type: string, asExcel = false) => {
    const ext = asExcel ? 'xls' : 'csv';
    const timestamp = new Date().toISOString().slice(0, 10);

    if (type === 'executive' || type === 'comparison') {
      const headers = ['Scénario', 'Type', 'Baseline (tCO₂e)', 'Cible (tCO₂e)', 'Réduction (%)', 'Période', 'Statut'];
      const rows = scenarios.map(s => [
        s.name, SCENARIO_TYPE_LABELS[s.scenario_type],
        String(s.baseline_emissions_tco2e ?? ''), String(s.target_emissions_tco2e ?? ''),
        String(s.target_reduction_percent ?? ''), `${s.baseline_year}-${s.target_year}`, s.status,
      ]);
      downloadCSV(`carboscan_scenarios_${type}_${timestamp}`, headers, rows);
    } else if (type === 'detail' && activeScenario) {
      const s = activeScenario;
      const headers = ['Paramètre', 'Valeur'];
      const rows = [
        ['Nom', s.name], ['Type', SCENARIO_TYPE_LABELS[s.scenario_type]],
        ['Baseline (tCO₂e)', String(s.baseline_emissions_tco2e ?? '')],
        ['Cible (tCO₂e)', String(s.target_emissions_tco2e ?? '')],
        ['Réduction (%)', String(s.target_reduction_percent ?? '')],
        ['Période', `${s.baseline_year}-${s.target_year}`],
        ['Net Zero', s.net_zero_flag ? 'Oui' : 'Non'],
        ['CA annuel (€)', String(s.annual_revenue_eur ?? '')],
        ['Statut', s.status],
        ['Notes', s.notes || ''],
      ];
      downloadCSV(`carboscan_scenario_${s.name.replace(/\s+/g, '_')}_${timestamp}`, headers, rows);
    } else if (type === 'projection') {
      // Generate yearly projection rows
      const headers = ['Scénario', 'Année', 'Émissions projetées (tCO₂e)', 'Réduction vs baseline (%)'];
      const rows: string[][] = [];
      scenarios.forEach(s => {
        if (!s.baseline_emissions_tco2e || !s.target_emissions_tco2e) return;
        const years = s.target_year - s.baseline_year;
        for (let y = 0; y <= years; y++) {
          const year = s.baseline_year + y;
          const progress = years > 0 ? y / years : 1;
          const projected = s.baseline_emissions_tco2e - (s.baseline_emissions_tco2e - s.target_emissions_tco2e) * progress;
          const reduction = ((s.baseline_emissions_tco2e - projected) / s.baseline_emissions_tco2e * 100);
          rows.push([s.name, String(year), projected.toFixed(1), reduction.toFixed(1)]);
        }
      });
      downloadCSV(`carboscan_projections_${timestamp}`, headers, rows);
    } else if (type === 'methodology') {
      const headers = ['Scénario', 'Type', 'Description', 'Notes'];
      const rows = scenarios.map(s => [s.name, SCENARIO_TYPE_LABELS[s.scenario_type], s.description || '', s.notes || '']);
      downloadCSV(`carboscan_methodologie_${timestamp}`, headers, rows);
    } else {
      toast.info('Aucune donnée à exporter.');
    }
    toast.success(`Export ${asExcel ? 'Excel' : 'CSV'} téléchargé.`);
  };

  const exportPDF = (type: string) => {
    let html = '';
    switch (type) {
      case 'executive': html = buildExecutiveHTML(); break;
      case 'detail': html = buildDetailHTML(); break;
      case 'comparison': html = buildComparisonHTML(); break;
      case 'projection':
        html = `<h1>Projections annuelles</h1><p class="meta">${scenarios.length} scénario(s)</p>`;
        scenarios.forEach(s => {
          if (!s.baseline_emissions_tco2e || !s.target_emissions_tco2e) return;
          const years = s.target_year - s.baseline_year;
          let tableRows = '';
          for (let y = 0; y <= years; y++) {
            const year = s.baseline_year + y;
            const progress = years > 0 ? y / years : 1;
            const projected = s.baseline_emissions_tco2e - (s.baseline_emissions_tco2e - s.target_emissions_tco2e) * progress;
            const reduction = ((s.baseline_emissions_tco2e - projected) / s.baseline_emissions_tco2e * 100);
            tableRows += `<tr><td>${year}</td><td>${formatNum(projected)} tCO₂e</td><td>${reduction.toFixed(1)}%</td></tr>`;
          }
          html += `<h2>${s.name} (${SCENARIO_TYPE_LABELS[s.scenario_type]})</h2>
            <table><thead><tr><th>Année</th><th>Émissions</th><th>Réduction</th></tr></thead><tbody>${tableRows}</tbody></table>`;
        });
        break;
      case 'methodology':
        html = `<h1>Note méthodologique</h1><p class="meta">Généré le ${new Date().toLocaleDateString('fr-FR')}</p>`;
        scenarios.forEach(s => {
          html += `<h2>${s.name}</h2><p><strong>Type :</strong> ${SCENARIO_TYPE_LABELS[s.scenario_type]}</p>
            ${s.description ? `<p>${s.description}</p>` : ''}
            ${s.notes ? `<p><strong>Notes :</strong> ${s.notes}</p>` : ''}`;
        });
        break;
      default: html = '<p>Type de rapport non reconnu.</p>';
    }
    openPrintableReport(`CarboScan — ${REPORT_TYPES.find(r => r.id === type)?.label || type}`, html);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Reporting</h2>
        <p className="text-sm text-muted-foreground">Exportez vos scénarios et trajectoires en PDF, Excel ou CSV.</p>
      </div>

      {activeScenario && (
        <Card className="bg-muted/30">
          <CardContent className="py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Scénario actif : {activeScenario.name}</p>
              <p className="text-xs text-muted-foreground">{SCENARIO_TYPE_LABELS[activeScenario.scenario_type]} • {activeScenario.baseline_year}–{activeScenario.target_year}</p>
            </div>
            <Badge variant="outline">{scenarios.length} scénario(s) au total</Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {REPORT_TYPES.map(rt => {
          const Icon = rt.icon;
          return (
            <Card key={rt.id}>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{rt.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{rt.desc}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleExport(rt.id, 'PDF')}>
                    <Printer className="h-3 w-3" />PDF
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleExport(rt.id, 'Excel')}>
                    <Download className="h-3 w-3" />Excel
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleExport(rt.id, 'CSV')}>
                    <Download className="h-3 w-3" />CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

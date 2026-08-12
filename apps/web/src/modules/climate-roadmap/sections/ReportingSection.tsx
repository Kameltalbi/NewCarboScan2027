// Section 8 — Reporting

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, BarChart3, Calendar, Target, Users } from 'lucide-react';
import { ClimateRoadmap, ClimateAction, ClimateLever } from '../types';
import { toast } from 'sonner';

interface ReportingSectionProps {
  roadmap: ClimateRoadmap;
  actions: ClimateAction[];
  levers: ClimateLever[];
}

const reportTypes = [
  { id: 'executive', icon: FileText, title: 'Synthèse exécutive', description: 'Résumé stratégique pour la direction', formats: ['PDF'] },
  { id: 'full', icon: BarChart3, title: 'Feuille de route complète', description: 'Document détaillé avec tous les leviers et actions', formats: ['PDF', 'Excel'] },
  { id: 'by-scope', icon: Target, title: 'Plan par scope', description: 'Actions détaillées par scope d\'émissions', formats: ['PDF', 'Excel'] },
  { id: 'by-lever', icon: Target, title: 'Plan par levier', description: 'Actions groupées par levier de réduction', formats: ['PDF', 'Excel'] },
  { id: 'quarterly', icon: Calendar, title: 'Rapport trimestriel', description: 'Suivi périodique pour comité climat', formats: ['PDF'] },
  { id: 'consultant', icon: Users, title: 'Rapport consultant', description: 'Version complète pour consultant ou audit', formats: ['PDF', 'Excel', 'CSV'] },
];

export const ReportingSection: React.FC<ReportingSectionProps> = ({ roadmap, actions, levers }) => {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleExport = async (reportId: string, format: string) => {
    setGenerating(reportId);
    // Simulate generation
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (format === 'CSV') {
      // CSV export
      const headers = 'Action,Levier,Statut,Priorité,Réduction (tCO₂e),Budget (€),Avancement (%)';
      const rows = actions.map(a => {
        const lever = levers.find(l => l.id === a.lever_id);
        return `"${a.title}","${lever?.name || ''}","${a.status}","${a.priority}",${a.expected_reduction_tco2e},${a.budget_estimated},${a.progress_percent}`;
      });
      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `feuille-de-route-${roadmap.name.replace(/\s+/g, '-')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Export CSV téléchargé');
    } else {
      toast.success(`Rapport "${reportTypes.find(r => r.id === reportId)?.title}" généré en ${format}`);
    }

    setGenerating(null);
  };

  const totalExpected = actions.reduce((s, a) => s + (a.expected_reduction_tco2e || 0), 0);
  const totalRealized = actions.reduce((s, a) => s + (a.realized_reduction_tco2e || 0), 0);
  const completed = actions.filter(a => a.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Reporting</h2>
        <p className="text-sm text-muted-foreground">Générez des rapports professionnels de votre feuille de route climat</p>
      </div>

      {/* Summary card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Feuille de route</div>
              <div className="text-sm font-bold">{roadmap.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Période</div>
              <div className="text-sm font-bold">{roadmap.baseline_year} — {roadmap.target_year}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Leviers / Actions</div>
              <div className="text-sm font-bold">{levers.length} / {actions.length}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Réduction attendue</div>
              <div className="text-sm font-bold text-primary">{Math.round(totalExpected).toLocaleString('fr-FR')} tCO₂e</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Avancement</div>
              <div className="text-sm font-bold">{actions.length > 0 ? Math.round((completed / actions.length) * 100) : 0}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map(report => {
          const Icon = report.icon;
          return (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{report.title}</h3>
                    <p className="text-xs text-muted-foreground">{report.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {report.formats.map(format => (
                    <Button
                      key={format}
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 h-7"
                      disabled={generating === report.id}
                      onClick={() => handleExport(report.id, format)}
                    >
                      <Download className="h-3 w-3" />
                      {format}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

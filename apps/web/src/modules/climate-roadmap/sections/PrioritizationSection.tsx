// Section 5 — Priorisation

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell } from 'recharts';
import { ClimateAction, ClimateLever, PRIORITY_LABELS, PRIORITY_COLORS, ACTION_STATUS_LABELS } from '../types';

interface PrioritizationSectionProps {
  actions: ClimateAction[];
  levers: ClimateLever[];
}

export const PrioritizationSection: React.FC<PrioritizationSectionProps> = ({ actions, levers }) => {
  // Compute impact/effort scores for each action
  const maxReduction = Math.max(...actions.map(a => a.expected_reduction_tco2e || 1), 1);
  const maxCost = Math.max(...actions.map(a => a.budget_estimated || 1), 1);

  const quadrantData = actions.map(action => {
    const impact = ((action.expected_reduction_tco2e || 0) / maxReduction) * 100;
    const effort = ((action.budget_estimated || 0) / maxCost) * 100;
    const quadrant = impact >= 50
      ? (effort < 50 ? 'quick_win' : 'strategic')
      : (effort < 50 ? 'low_priority' : 'long_term');
    return { ...action, impact, effort, quadrant };
  });

  const quadrantColors: Record<string, string> = {
    quick_win: '#10b981',
    strategic: '#6366f1',
    long_term: '#f59e0b',
    low_priority: '#94a3b8',
  };

  const quadrantLabels: Record<string, string> = {
    quick_win: 'Quick Wins',
    strategic: 'Actions structurantes',
    long_term: 'Long terme',
    low_priority: 'Faible priorité',
  };

  // Sort by cost-effectiveness (reduction per euro)
  const ranked = [...actions]
    .filter(a => a.budget_estimated > 0)
    .map(a => ({
      ...a,
      cost_effectiveness: (a.expected_reduction_tco2e || 0) / (a.budget_estimated || 1),
      lever_name: levers.find(l => l.id === a.lever_id)?.name || '—',
    }))
    .sort((a, b) => b.cost_effectiveness - a.cost_effectiveness);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Priorisation</h2>
        <p className="text-sm text-muted-foreground">Matrice impact / effort et classement des actions</p>
      </div>

      {/* Impact/Effort quadrant */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Matrice Impact / Effort</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            {Object.entries(quadrantLabels).map(([k, v]) => (
              <Badge key={k} variant="outline" className="text-[10px]" style={{ borderColor: quadrantColors[k], color: quadrantColors[k] }}>
                ● {v}
              </Badge>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="effort" name="Effort (coût)" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: 'Effort →', position: 'insideBottom', offset: -10, fontSize: 11 }} />
              <YAxis type="number" dataKey="impact" name="Impact carbone" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: 'Impact ↑', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <ZAxis range={[60, 200]} />
              <Tooltip content={({ payload }) => {
                if (!payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-background border rounded p-2 shadow text-xs">
                    <div className="font-semibold">{d.title}</div>
                    <div>Impact: {Math.round(d.expected_reduction_tco2e)} tCO₂e</div>
                    <div>Coût: {Math.round(d.budget_estimated).toLocaleString('fr-FR')} €</div>
                    <Badge className="text-[9px] mt-1" style={{ backgroundColor: `${quadrantColors[d.quadrant]}20`, color: quadrantColors[d.quadrant] }}>
                      {quadrantLabels[d.quadrant]}
                    </Badge>
                  </div>
                );
              }} />
              {/* Reference lines at 50/50 */}
              <Scatter data={quadrantData} shape="circle">
                {quadrantData.map((entry, i) => (
                  <Cell key={i} fill={quadrantColors[entry.quadrant]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Ranking table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Classement par efficacité coût-carbone</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-10">#</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">Levier</TableHead>
                <TableHead className="text-xs text-right">Réduction (tCO₂e)</TableHead>
                <TableHead className="text-xs text-right">Coût (€)</TableHead>
                <TableHead className="text-xs text-right">€/tCO₂e</TableHead>
                <TableHead className="text-xs">Priorité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">Aucune action avec budget renseigné</TableCell></TableRow>
              ) : ranked.map((action, i) => (
                <TableRow key={action.id} className="text-xs">
                  <TableCell className="font-bold text-primary">{i + 1}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{action.title}</TableCell>
                  <TableCell className="text-muted-foreground">{action.lever_name}</TableCell>
                  <TableCell className="text-right">{Math.round(action.expected_reduction_tco2e)}</TableCell>
                  <TableCell className="text-right">{Math.round(action.budget_estimated).toLocaleString('fr-FR')}</TableCell>
                  <TableCell className="text-right font-medium">{Math.round(action.budget_estimated / Math.max(action.expected_reduction_tco2e, 1))}</TableCell>
                  <TableCell><Badge className={`${PRIORITY_COLORS[action.priority]} text-[10px]`}>{PRIORITY_LABELS[action.priority]}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quadrant summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(quadrantLabels).map(([k, label]) => {
          const count = quadrantData.filter(a => a.quadrant === k).length;
          const totalReduction = quadrantData.filter(a => a.quadrant === k).reduce((s, a) => s + (a.expected_reduction_tco2e || 0), 0);
          return (
            <Card key={k}>
              <CardContent className="pt-4 pb-3 text-center">
                <div className="text-xs font-medium mb-1" style={{ color: quadrantColors[k] }}>{label}</div>
                <div className="text-lg font-bold">{count}</div>
                <div className="text-[10px] text-muted-foreground">actions — {Math.round(totalReduction)} tCO₂e</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

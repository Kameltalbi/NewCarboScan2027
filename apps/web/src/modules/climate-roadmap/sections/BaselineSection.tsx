// Section 2 — Baseline climat

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ClimateRoadmap } from '../types';
import { Flame, Factory, Truck, Info } from 'lucide-react';

interface BaselineSectionProps {
  roadmap: ClimateRoadmap;
}

export const BaselineSection: React.FC<BaselineSectionProps> = ({ roadmap }) => {
  const baseline = roadmap.baseline_emissions_tco2e || 0;
  
  // Mock scope distribution — in production would come from bilan carbone
  const scopeData = [
    { name: 'Scope 1', value: Math.round(baseline * 0.15), color: '#ef4444', icon: Flame },
    { name: 'Scope 2', value: Math.round(baseline * 0.10), color: '#f59e0b', icon: Factory },
    { name: 'Scope 3', value: Math.round(baseline * 0.75), color: '#6366f1', icon: Truck },
  ];

  // Mock top emission categories
  const topCategories = [
    { name: 'Achats de biens & services', value: Math.round(baseline * 0.30), scope: 3 },
    { name: 'Transport amont', value: Math.round(baseline * 0.15), scope: 3 },
    { name: 'Énergie (combustion)', value: Math.round(baseline * 0.12), scope: 1 },
    { name: 'Électricité', value: Math.round(baseline * 0.08), scope: 2 },
    { name: 'Déplacements professionnels', value: Math.round(baseline * 0.07), scope: 3 },
    { name: 'Fret aval', value: Math.round(baseline * 0.06), scope: 3 },
    { name: 'Déchets', value: Math.round(baseline * 0.05), scope: 3 },
    { name: 'Immobilisations', value: Math.round(baseline * 0.05), scope: 3 },
    { name: 'Utilisation des produits', value: Math.round(baseline * 0.04), scope: 3 },
    { name: 'Autres', value: Math.round(baseline * 0.08), scope: 3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Baseline climat</h2>
          <p className="text-sm text-muted-foreground">Situation de référence — Année {roadmap.baseline_year}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {Math.round(baseline).toLocaleString('fr-FR')} tCO₂e
        </Badge>
      </div>

      <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-800">
          Les données ci-dessous proviennent de votre dernier bilan carbone validé. 
          Connectez le module Bilan Carbone pour des données réelles.
        </p>
      </div>

      {/* Scope cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scopeData.map((scope) => {
          const Icon = scope.icon;
          const pct = baseline > 0 ? Math.round((scope.value / baseline) * 100) : 0;
          return (
            <Card key={scope.name}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${scope.color}15` }}>
                    <Icon className="h-4 w-4" style={{ color: scope.color }} />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">{scope.name}</div>
                    <div className="text-lg font-bold">{scope.value.toLocaleString('fr-FR')} <span className="text-xs font-normal text-muted-foreground">tCO₂e</span></div>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: scope.color }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{pct}% du total</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top categories */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Top 10 postes les plus émetteurs</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topCategories} layout="vertical" margin={{ left: 140 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-FR')} tCO₂e`} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Scope pie */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Répartition par scope</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={scopeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                {scopeData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-FR')} tCO₂e`} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

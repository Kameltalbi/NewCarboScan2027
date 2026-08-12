import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Flame, Zap, Droplets, FlaskConical, AlertTriangle, Loader2, Target, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useACVProjects } from '@/hooks/useACVProjects';
import { useACVCalculation } from '../hooks/useACVCalculation';
import { formatImpact } from '../engine/acvCalculationEngine';
import { calculatePEFNormalization, formatPEFScore, getRatingColor, getRatingLabel, SECTOR_BENCHMARKS } from '../engine/pefNormalization';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const ACVResultats: React.FC = () => {
  const { projects } = useACVProjects();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const { baselineResult, isLoading } = useACVCalculation(selectedProjectId || undefined);

  const pefResult = baselineResult
    ? calculatePEFNormalization(baselineResult.totals, selectedSector || undefined)
    : null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Résultats & Hotspots
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Impacts multi-critères, normalisation PEF et analyse des hotspots
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Projet ACV</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionnez un projet" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Secteur (benchmark PEF)</Label>
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Optionnel — comparaison" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SECTOR_BENCHMARKS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && selectedProjectId && (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}

      {!isLoading && selectedProjectId && !baselineResult && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Aucune donnée. Ajoutez des composants dans l'onglet Modélisation.</p>
          </CardContent>
        </Card>
      )}

      {baselineResult && pefResult && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Carbone', value: formatImpact(baselineResult.totals.carbon, 'carbon'), icon: Flame, color: 'text-red-500' },
              { label: 'Énergie', value: formatImpact(baselineResult.totals.energy, 'energy'), icon: Zap, color: 'text-yellow-500' },
              { label: 'Eau', value: formatImpact(baselineResult.totals.water, 'water'), icon: Droplets, color: 'text-blue-500' },
              { label: 'Acidification', value: formatImpact(baselineResult.totals.acidification, 'acidification'), icon: FlaskConical, color: 'text-purple-500' },
              { label: 'Score PEF', value: formatPEFScore(pefResult.total_weighted_score), icon: Target, color: 'text-primary' },
            ].map(kpi => (
              <Card key={kpi.label}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  </div>
                  <p className="text-lg font-bold font-mono">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="components">
            <TabsList>
              <TabsTrigger value="components">Par composant</TabsTrigger>
              <TabsTrigger value="lifecycle">Par phase</TabsTrigger>
              <TabsTrigger value="pef">Normalisation PEF</TabsTrigger>
              <TabsTrigger value="hotspots">Hotspots</TabsTrigger>
            </TabsList>

            <TabsContent value="components" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={baselineResult.components.map(c => ({
                      name: c.component_name.length > 15 ? c.component_name.slice(0, 15) + '…' : c.component_name,
                      'Matériau': c.material_impact.carbon,
                      'Procédé': c.process_impact.carbon,
                      'Transport': c.transport_impact.carbon,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Matériau" stackId="a" fill="hsl(var(--primary))" />
                      <Bar dataKey="Procédé" stackId="a" fill="#10b981" />
                      <Bar dataKey="Transport" stackId="a" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lifecycle" className="mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Répartition par phase (kgCO₂e)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={baselineResult.lifecycle.map(l => ({
                            name: `${l.module_code} ${l.module_name}`,
                            value: Math.max(l.impact.carbon, 0),
                          }))}
                          dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {baselineResult.lifecycle.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Détail par module</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {baselineResult.lifecycle.map(l => (
                        <div key={l.module_code} className="flex items-center justify-between p-2 rounded border">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary w-6">{l.module_code}</span>
                            <span className="text-sm">{l.module_name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-xs">{formatImpact(l.impact.carbon, 'carbon')}</span>
                            <span className="text-[10px] text-muted-foreground ml-2">({l.percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── NOUVEL ONGLET : NORMALISATION PEF ── */}
            <TabsContent value="pef" className="mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Radar chart normalisé */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Profil environnemental normalisé (PEF 3.0)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={pefResult.impacts.map(i => ({
                        category: i.label,
                        value: i.percentage_of_total,
                      }))}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis tick={{ fontSize: 9 }} />
                        <Radar name="Contribution (%)" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                        <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Détail des scores */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Scores pondérés par catégorie</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pefResult.impacts.map(i => (
                        <div key={i.category} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{i.label}</span>
                            <span className="font-mono font-bold">{formatPEFScore(i.weighted_value)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(i.percentage_of_total, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-12 text-right">{i.percentage_of_total.toFixed(1)}%</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {i.raw_value.toFixed(3)} {i.raw_unit} → {i.normalized_value.toFixed(6)} PE
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Score total */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Score PEF total</span>
                        <span className="font-mono font-bold text-lg">{formatPEFScore(pefResult.total_weighted_score)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Catégorie dominante : {pefResult.dominant_category}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Benchmark sectoriel */}
                {pefResult.benchmark_comparison && (
                  <Card className="md:col-span-2 border-accent/30">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-accent" />
                        Comparaison sectorielle — {pefResult.benchmark_comparison.sector}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-6 text-center">
                        <div className="p-4 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Votre score</p>
                          <p className="font-mono font-bold text-lg">{formatPEFScore(pefResult.total_weighted_score)}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Moyenne sectorielle</p>
                          <p className="font-mono font-bold text-lg">{formatPEFScore(pefResult.benchmark_comparison.sector_average)}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Performance</p>
                          <p className={`font-bold text-lg ${getRatingColor(pefResult.benchmark_comparison.rating)}`}>
                            {getRatingLabel(pefResult.benchmark_comparison.rating)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Ratio : {pefResult.benchmark_comparison.performance_ratio.toFixed(2)}x
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="hotspots" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Contributions principales (≥ 5%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {baselineResult.hotspots.length === 0 ? (
                    <p className="text-muted-foreground text-center py-6">Aucun hotspot identifié</p>
                  ) : (
                    <div className="space-y-2">
                      {baselineResult.hotspots.filter(h => h.impact_category === 'carbon').map((h, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{h.source}</p>
                            <Badge variant="secondary" className="text-[10px] mt-1 capitalize">{h.type}</Badge>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm font-bold">{h.percentage.toFixed(1)}%</p>
                            <p className="text-[10px] text-muted-foreground">{formatImpact(h.value, 'carbon')}</p>
                          </div>
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min(h.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

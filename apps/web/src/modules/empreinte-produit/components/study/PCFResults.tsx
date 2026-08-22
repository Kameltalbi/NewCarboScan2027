// Page Résultats – Calcul serveur via Edge Function + scénarios what-if + ACV multi-indicateurs
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, BarChart3, Calculator, History, Lock, GitBranch, Droplets, Zap, Wind, TrendingUp } from 'lucide-react';
import PCFSensitivityTornado from './PCFSensitivityTornado';
import PCFDataQualityScore from './PCFDataQualityScore';
import { usePCFVersions } from '../../hooks/usePCFVersions';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { PCFStudy } from '../../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase, sessionAuth} from "@/integrations/api/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const COLORS = ['#0E7C66', '#0F172A', '#1ABC9C', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B', '#EC4899'];

const PHASE_LABELS: Record<string, string> = {
  materials: 'Matières premières',
  transport: 'Transport',
  manufacturing: 'Fabrication',
  subcontracting: 'Sous-traitance',
  wastes: 'Déchets',
  packaging: 'Emballage',
  usage: 'Utilisation',
  endOfLife: 'Fin de vie',
};

interface PhaseBreakdown {
  phase: string;
  emissions: number;
  energy_mj?: number;
  water_m3?: number;
  acidification_kgso2e?: number;
}

const INDICATOR_CONFIG = {
  co2: { label: 'Carbone', unit: 'kg CO₂e', icon: Wind, color: 'hsl(var(--carbon-impact, 160 60% 27%))' },
  energy: { label: 'Énergie primaire', unit: 'MJ', icon: Zap, color: '#F59E0B' },
  water: { label: 'Eau', unit: 'm³', icon: Droplets, color: '#3B82F6' },
  acid: { label: 'Acidification', unit: 'kg SO₂e', icon: Wind, color: '#EF4444' },
};

const PCFResults: React.FC<{ studyId: string; study: PCFStudy }> = ({ studyId, study }) => {
  const { data: versions } = usePCFVersions(studyId);
  const isACV = study.study_mode === 'acv';

  const [calculating, setCalculating] = React.useState(false);
  const [calculated, setCalculated] = React.useState(false);
  const [results, setResults] = React.useState<PhaseBreakdown[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalEnergy, setTotalEnergy] = React.useState(0);
  const [totalWater, setTotalWater] = React.useState(0);
  const [totalAcid, setTotalAcid] = React.useState(0);
  const [allocationFactor, setAllocationFactor] = React.useState(1);
  const [showHistory, setShowHistory] = React.useState(false);
  const [activeIndicator, setActiveIndicator] = React.useState<'co2' | 'energy' | 'water' | 'acid'>('co2');

  const [scenarioResults, setScenarioResults] = React.useState<PhaseBreakdown[] | null>(null);
  const [scenarioTotal, setScenarioTotal] = React.useState(0);
  const [showScenarioCompare, setShowScenarioCompare] = React.useState(false);

  const isLocked = study.status === 'locked';

  const callPcfCalculate = async (isScenario = false, overrides?: Record<string, any>) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const { data: { session } } = await sessionAuth.getSession();

    const res = await fetch(`${supabaseUrl}/functions/v1/pcf-calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
      },
      body: JSON.stringify({ study_id: studyId, is_scenario: isScenario, scenario_overrides: overrides || null }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Calculation failed');
    }
    return res.json();
  };

  const handleCalculate = async () => {
    if (isLocked) return;
    setCalculating(true);
    try {
      const result = await callPcfCalculate(false);
      setResults(result.breakdown || []);
      setTotal(result.total_emissions || 0);
      setTotalEnergy(result.total_energy_mj || 0);
      setTotalWater(result.total_water_m3 || 0);
      setTotalAcid(result.total_acidification_kgso2e || 0);
      setAllocationFactor(result.allocation_factor || 1);
      setCalculated(true);
      const modeLabel = isACV ? 'ACV multi-indicateurs' : 'Empreinte carbone';
      toast.success(`${modeLabel} calculée : ${result.total_emissions?.toFixed(2)} kg CO₂e (v${result.version})`);
    } catch (e: any) {
      toast.error(e.message || 'Erreur de calcul');
    } finally {
      setCalculating(false);
    }
  };

  const handleScenarioCompare = async () => {
    try {
      const result = await callPcfCalculate(true);
      setScenarioResults(result.breakdown || []);
      setScenarioTotal(result.total_emissions || 0);
      setShowScenarioCompare(true);
    } catch (e: any) {
      toast.error(e.message || 'Erreur simulation');
    }
  };

  const handleLock = async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const { data: { session } } = await sessionAuth.getSession();
    await fetch(`${supabaseUrl}/rest/v1/pcf_studies?id=eq.${studyId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ status: 'locked' }),
    });
    window.location.reload();
  };

  const getIndicatorValue = (r: PhaseBreakdown, indicator: string): number => {
    switch (indicator) {
      case 'co2': return r.emissions;
      case 'energy': return r.energy_mj || 0;
      case 'water': return r.water_m3 || 0;
      case 'acid': return r.acidification_kgso2e || 0;
      default: return r.emissions;
    }
  };

  const getIndicatorTotal = (indicator: string): number => {
    switch (indicator) {
      case 'co2': return total;
      case 'energy': return totalEnergy;
      case 'water': return totalWater;
      case 'acid': return totalAcid;
      default: return total;
    }
  };

  const config = INDICATOR_CONFIG[activeIndicator];
  const indicatorTotal = getIndicatorTotal(activeIndicator);

  const chartData = results.map((r, i) => ({
    name: PHASE_LABELS[r.phase] || r.phase,
    value: Number(getIndicatorValue(r, activeIndicator).toFixed(4)),
    percentage: indicatorTotal > 0 ? (getIndicatorValue(r, activeIndicator) / indicatorTotal * 100) : 0,
    fill: COLORS[i % COLORS.length],
  }));

  const comparisonData = showScenarioCompare && scenarioResults
    ? results.map((r) => {
        const scenarioPhase = scenarioResults.find(s => s.phase === r.phase);
        return {
          name: PHASE_LABELS[r.phase] || r.phase,
          baseline: Number(r.emissions.toFixed(2)),
          scenario: Number((scenarioPhase?.emissions || 0).toFixed(2)),
        };
      })
    : [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Résultats</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isACV
              ? 'Calcul multi-indicateurs (CO₂e, Énergie, Eau, Acidification) – Mode ACV Expert'
              : 'Calcul serveur (Edge Function) – Mode PCF'}
          </p>
        </div>
        <div className="flex gap-2">
          {versions && versions.length > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowHistory(!showHistory)}>
              <History className="w-3.5 h-3.5" />
              Historique ({versions.length})
            </Button>
          )}
          {calculated && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleScenarioCompare}>
              <GitBranch className="w-3.5 h-3.5" />
              Scénario what-if
            </Button>
          )}
          {calculated && !isLocked && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Verrouiller
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Verrouiller cette étude ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Action <strong>irréversible</strong>. Toutes les sections seront en lecture seule.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    <Lock className="w-3.5 h-3.5 mr-1.5" />
                    Verrouiller définitivement
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={handleCalculate} className="gap-2" disabled={calculating || isLocked}>
            {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            {isLocked ? 'Étude verrouillée' : calculated ? 'Recalculer' : 'Calculer l\'empreinte'}
          </Button>
        </div>
      </div>

      {isLocked && (
        <Card className="p-3 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" />
            Cette étude est verrouillée. Les données ne peuvent plus être modifiées.
          </p>
        </Card>
      )}

      {showHistory && versions && versions.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <History className="w-4 h-4" /> Historique des versions
          </h3>
          <div className="space-y-2">
            {versions.map(v => {
              const snap = v.snapshot as any;
              return (
                <div key={v.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-[10px]">v{v.version_number}</Badge>
                    <span className="text-foreground font-medium">{snap?.total?.toFixed(2) || '–'} kg CO₂e</span>
                    <span className="text-muted-foreground text-xs">{v.comment}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(v.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {calculated && (
        <>
          {/* ACV Summary Cards */}
          {isACV ? (
            <div className="grid grid-cols-4 gap-4">
              {([
                { key: 'co2' as const, value: total, unit: 'kg CO₂e', label: 'Changement climatique', icon: Wind, color: 'hsl(var(--carbon-impact, 160 60% 27%))' },
                { key: 'energy' as const, value: totalEnergy, unit: 'MJ', label: 'Énergie primaire', icon: Zap, color: '#F59E0B' },
                { key: 'water' as const, value: totalWater, unit: 'm³', label: 'Consommation d\'eau', icon: Droplets, color: '#3B82F6' },
                { key: 'acid' as const, value: totalAcid, unit: 'kg SO₂e', label: 'Acidification', icon: Wind, color: '#EF4444' },
              ]).map(ind => {
                const Icon = ind.icon;
                const isActive = activeIndicator === ind.key;
                return (
                  <Card
                    key={ind.key}
                    className={`p-4 cursor-pointer transition-all ${isActive ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                    onClick={() => setActiveIndicator(ind.key)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4" style={{ color: ind.color }} />
                      <p className="text-xs text-muted-foreground">{ind.label}</p>
                    </div>
                    <p className="text-2xl font-black" style={{ color: ind.color }}>
                      {ind.value < 0.01 && ind.value > 0 ? ind.value.toExponential(2) : ind.value.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">{ind.unit} / {study.functional_unit}</p>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-6 text-center border-2 border-[hsl(var(--carbon-impact))]">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Empreinte carbone totale</p>
              <p className="text-4xl font-black text-[hsl(var(--carbon-impact))] mt-2">{total.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">kg CO₂e / {study.functional_unit}</p>
              {allocationFactor < 1 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Allocation coproduit appliquée : {(allocationFactor * 100).toFixed(0)}%
                </p>
              )}
            </Card>
          )}

          {/* Breakdown table */}
          <Card>
            {isACV && (
              <div className="p-3 border-b border-border">
                <Badge variant="outline" className="text-xs">{config.label} ({config.unit})</Badge>
              </div>
            )}
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">Phase</th>
                <th className="text-right p-3 font-medium">Impact ({config.unit})</th>
                <th className="text-right p-3 font-medium">Part (%)</th>
                {isACV && activeIndicator === 'co2' && (
                  <>
                    <th className="text-right p-3 font-medium text-amber-600">MJ</th>
                    <th className="text-right p-3 font-medium text-blue-600">m³</th>
                    <th className="text-right p-3 font-medium text-red-600">SO₂e</th>
                  </>
                )}
              </tr></thead>
              <tbody>
                {results.filter(r => getIndicatorValue(r, activeIndicator) !== 0).map((r, i) => {
                  const val = getIndicatorValue(r, activeIndicator);
                  return (
                    <tr key={r.phase} className="border-b border-border">
                      <td className="p-3 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        {PHASE_LABELS[r.phase] || r.phase}
                      </td>
                      <td className="p-3 text-right font-semibold">{val.toFixed(4)}</td>
                      <td className="p-3 text-right text-muted-foreground">
                        {indicatorTotal > 0 ? (val / indicatorTotal * 100).toFixed(1) : '0'}%
                      </td>
                      {isACV && activeIndicator === 'co2' && (
                        <>
                          <td className="p-3 text-right text-amber-600 text-xs">{(r.energy_mj || 0).toFixed(2)}</td>
                          <td className="p-3 text-right text-blue-600 text-xs">{(r.water_m3 || 0).toFixed(4)}</td>
                          <td className="p-3 text-right text-red-600 text-xs">{(r.acidification_kgso2e || 0).toFixed(4)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
                <tr className="bg-muted/50 font-bold">
                  <td className="p-3">Total</td>
                  <td className="p-3 text-right" style={{ color: config.color }}>{indicatorTotal.toFixed(4)}</td>
                  <td className="p-3 text-right">100%</td>
                  {isACV && activeIndicator === 'co2' && (
                    <>
                      <td className="p-3 text-right text-amber-600">{totalEnergy.toFixed(2)}</td>
                      <td className="p-3 text-right text-blue-600">{totalWater.toFixed(4)}</td>
                      <td className="p-3 text-right text-red-600">{totalAcid.toFixed(4)}</td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Répartition – {config.label}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={chartData.filter(c => c.value > 0)} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                    label={({ percentage }) => `${percentage.toFixed(0)}%`} labelLine={false}>
                    {chartData.filter(c => c.value > 0).map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toFixed(4)} ${config.unit}`} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Comparaison des postes – {config.label}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.filter(c => c.value > 0)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number) => `${v} ${config.unit}`} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.filter(c => c.value > 0).map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* ACV Multi-indicator comparison bar chart */}
          {isACV && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Vue croisée – Tous les indicateurs par phase</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={results.filter(r => r.emissions !== 0).map(r => ({
                  name: PHASE_LABELS[r.phase] || r.phase,
                  'CO₂e (kg)': Number(r.emissions.toFixed(2)),
                  'Énergie (MJ)': Number((r.energy_mj || 0).toFixed(2)),
                  'Eau (m³)': Number((r.water_m3 || 0).toFixed(4)),
                  'Acid. (kg SO₂e)': Number((r.acidification_kgso2e || 0).toFixed(4)),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="CO₂e (kg)" fill="#0E7C66" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Énergie (MJ)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Eau (m³)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Acid. (kg SO₂e)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Sensitivity Tornado */}
          <PCFSensitivityTornado
            results={results}
            total={total}
            totalEnergy={totalEnergy}
            totalWater={totalWater}
            totalAcid={totalAcid}
            isACV={isACV}
          />

          {/* Data Quality Score (DQR) */}
          <PCFDataQualityScore results={results} studyMode={isACV ? 'acv' : 'pcf'} />

          {/* Scenario comparison */}
          {showScenarioCompare && scenarioResults && (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Comparaison scénario what-if
                </h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium">
                    Base : <strong className="text-[hsl(var(--carbon-impact))]">{total.toFixed(2)}</strong> kg CO₂e
                  </span>
                  <span className="font-medium">
                    Scénario : <strong className="text-blue-600">{scenarioTotal.toFixed(2)}</strong> kg CO₂e
                  </span>
                  {scenarioTotal !== total && (
                    <Badge variant={scenarioTotal < total ? 'default' : 'destructive'} className="text-xs">
                      {scenarioTotal < total ? '↓' : '↑'} {Math.abs(((scenarioTotal - total) / total) * 100).toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number) => `${v} kg CO₂e`} />
                  <Legend />
                  <Bar dataKey="baseline" name="Base" fill="#0E7C66" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="scenario" name="Scénario" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}

      {!calculated && (
        <Card className="p-12 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Cliquez sur « Calculer l'empreinte » pour lancer le calcul côté serveur.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {isACV
              ? 'Le calcul intègre 4 indicateurs : CO₂e, Énergie primaire, Eau, Acidification – sur toutes les phases du cycle de vie.'
              : 'Le calcul intègre : matières (+ scrap rate), transport, fabrication, sous-traitance, coproduits, données Collect et fin de vie.'}
          </p>
        </Card>
      )}
    </div>
  );
};

export default PCFResults;
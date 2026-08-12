// Analyse de sensibilité – Diagramme Tornado
// Varie chaque phase de ±variation% et mesure l'impact sur le total
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface PhaseBreakdown {
  phase: string;
  emissions: number;
  energy_mj?: number;
  water_m3?: number;
  acidification_kgso2e?: number;
}

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

interface Props {
  results: PhaseBreakdown[];
  total: number;
  totalEnergy: number;
  totalWater: number;
  totalAcid: number;
  isACV: boolean;
}

type Indicator = 'co2' | 'energy' | 'water' | 'acid';

const INDICATOR_META: Record<Indicator, { label: string; unit: string }> = {
  co2: { label: 'Carbone', unit: 'kg CO₂e' },
  energy: { label: 'Énergie', unit: 'MJ' },
  water: { label: 'Eau', unit: 'm³' },
  acid: { label: 'Acidification', unit: 'kg SO₂e' },
};

const VARIATION_OPTIONS = [10, 15, 20, 30];

function getVal(r: PhaseBreakdown, ind: Indicator): number {
  switch (ind) {
    case 'co2': return r.emissions;
    case 'energy': return r.energy_mj || 0;
    case 'water': return r.water_m3 || 0;
    case 'acid': return r.acidification_kgso2e || 0;
  }
}

function getTotal(props: Props, ind: Indicator): number {
  switch (ind) {
    case 'co2': return props.total;
    case 'energy': return props.totalEnergy;
    case 'water': return props.totalWater;
    case 'acid': return props.totalAcid;
  }
}

const PCFSensitivityTornado: React.FC<Props> = (props) => {
  const { results, isACV } = props;
  const [variation, setVariation] = React.useState(20);
  const [indicator, setIndicator] = React.useState<Indicator>('co2');

  const baseTotal = getTotal(props, indicator);

  // For each phase, compute impact of ±variation%
  const tornadoData = results
    .filter(r => getVal(r, indicator) !== 0)
    .map(r => {
      const phaseVal = getVal(r, indicator);
      const delta = phaseVal * (variation / 100);
      // low = total when this phase decreases, high = total when phase increases
      const low = baseTotal - delta;
      const high = baseTotal + delta;
      return {
        phase: PHASE_LABELS[r.phase] || r.phase,
        low: Number((low - baseTotal).toFixed(4)),
        high: Number((high - baseTotal).toFixed(4)),
        absSpread: Math.abs(delta) * 2,
        lowTotal: Number(low.toFixed(4)),
        highTotal: Number(high.toFixed(4)),
      };
    })
    .sort((a, b) => b.absSpread - a.absSpread);

  const meta = INDICATOR_META[indicator];

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Analyse de sensibilité (Tornado)
        </h3>
        <div className="flex items-center gap-2">
          {isACV && (
            <Select value={indicator} onValueChange={(v) => setIndicator(v as Indicator)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(INDICATOR_META) as [Indicator, { label: string }][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={String(variation)} onValueChange={(v) => setVariation(Number(v))}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VARIATION_OPTIONS.map(v => (
                <SelectItem key={v} value={String(v)}>±{v}%</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Impact d'une variation de ±{variation}% de chaque poste sur le total ({meta.label}).
        Base : <strong>{baseTotal.toFixed(2)} {meta.unit}</strong>
      </p>

      {tornadoData.length > 0 ? (
        <ResponsiveContainer width="100%" height={Math.max(200, tornadoData.length * 40 + 60)}>
          <BarChart data={tornadoData} layout="vertical" margin={{ left: 120, right: 30, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`}
              label={{ value: `Δ ${meta.unit}`, position: 'insideBottomRight', offset: -5, fontSize: 10 }}
            />
            <YAxis type="category" dataKey="phase" tick={{ fontSize: 10 }} width={110} />
            <ReferenceLine x={0} stroke="hsl(var(--foreground))" strokeWidth={1.5} />
            <Tooltip
              formatter={(value: number, name: string) => {
                const label = name === 'low' ? `−${variation}%` : `+${variation}%`;
                return [`${value > 0 ? '+' : ''}${value} ${meta.unit}`, label];
              }}
              labelFormatter={(label) => `Phase : ${label}`}
            />
            <Bar dataKey="low" stackId="a" barSize={20} radius={[4, 0, 0, 4]}>
              {tornadoData.map((_, i) => (
                <Cell key={i} fill="#3B82F6" />
              ))}
            </Bar>
            <Bar dataKey="high" stackId="a" barSize={20} radius={[0, 4, 4, 0]}>
              {tornadoData.map((_, i) => (
                <Cell key={i} fill="#EF4444" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée pour cet indicateur.</p>
      )}

      {/* Ranking table */}
      <div className="text-xs">
        <p className="font-medium mb-2">Classement par sensibilité :</p>
        <div className="space-y-1">
          {tornadoData.slice(0, 5).map((d, i) => (
            <div key={d.phase} className="flex items-center justify-between">
              <span className="text-muted-foreground">{i + 1}. {d.phase}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono">
                  [{d.lowTotal.toFixed(2)} → {d.highTotal.toFixed(2)}]
                </Badge>
                <Badge variant={i === 0 ? 'destructive' : 'secondary'} className="text-[10px]">
                  ±{(d.absSpread / 2).toFixed(4)} {meta.unit}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default PCFSensitivityTornado;

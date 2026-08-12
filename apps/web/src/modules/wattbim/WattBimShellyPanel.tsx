import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Radio, Moon, Zap, Snowflake, Lightbulb, Server, Factory, Plug } from 'lucide-react';
import type { WattBimMeter, WattBimReading, WattBimAlert } from './types';
import { useApiKeys } from './apiKeysHooks';
import { useOrgCurrency } from './useOrgCurrency';

type Props = {
  meters: WattBimMeter[];
  readings: WattBimReading[];
  alerts: WattBimAlert[];
};

type Circuit = { key: string; label: string; icon: React.ReactNode; kwh: number; match: RegExp };

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);

export const WattBimShellyPanel: React.FC<Props> = ({ meters, readings, alerts }) => {
  const currency = useOrgCurrency();
  const { data: apiKeys = [] } = useApiKeys();

  const activeGateways = apiKeys.filter(k => k.is_active).length;
  const iotReadings = readings.filter(r => r.source === 'iot');
  const iotShare = readings.length > 0 ? Math.round((iotReadings.length / readings.length) * 100) : 0;

  const circuits: Circuit[] = useMemo(() => {
    const defs: Omit<Circuit, 'kwh'>[] = [
      { key: 'general', label: 'Arrivée générale', icon: <Zap className="h-4 w-4" />, match: /g[ée]n[ée]ral|main|arriv/i },
      { key: 'clim', label: 'Climatisation', icon: <Snowflake className="h-4 w-4" />, match: /clim|hvac|a\/?c|froid/i },
      { key: 'light', label: 'Éclairage', icon: <Lightbulb className="h-4 w-4" />, match: /[ée]clair|light|lamp/i },
      { key: 'it', label: 'IT / Data', icon: <Server className="h-4 w-4" />, match: /it\b|data|serveur|server|onduleur|ups/i },
      { key: 'prod', label: 'Production', icon: <Factory className="h-4 w-4" />, match: /prod|atelier|machine|four/i },
    ];
    const kwhByMeter = new Map<string, number>();
    readings.forEach(r => {
      kwhByMeter.set(r.meter_id, (kwhByMeter.get(r.meter_id) || 0) + Number(r.value || 0));
    });
    const result: Circuit[] = defs.map(d => ({ ...d, kwh: 0 }));
    let other = 0;
    meters.forEach(m => {
      const k = kwhByMeter.get(m.id) || 0;
      const hit = defs.find(d => d.match.test(m.name));
      if (hit) {
        result.find(r => r.key === hit.key)!.kwh += k;
      } else {
        other += k;
      }
    });
    if (other > 0) result.push({ key: 'other', label: 'Autres circuits', icon: <Plug className="h-4 w-4" />, kwh: other, match: /./ });
    return result.filter(c => c.kwh > 0).sort((a, b) => b.kwh - a.kwh);
  }, [meters, readings]);

  const totalCircuits = circuits.reduce((s, c) => s + c.kwh, 0);

  const nightAlerts = alerts.filter(a => a.alert_type === 'night_consumption');
  const nightWasteKwh = nightAlerts.reduce((s, a) => s + Number(a.value_observed || 0), 0);
  const totalKwh = readings.reduce((s, r) => s + Number(r.value || 0), 0);
  const nightShare = totalKwh > 0 ? Math.round((nightWasteKwh / totalKwh) * 100) : 0;

  const lastIot = iotReadings.length > 0
    ? iotReadings.reduce((a, b) => (new Date(a.created_at) > new Date(b.created_at) ? a : b))
    : null;
  const lastIotMinutesAgo = lastIot
    ? Math.max(0, Math.round((Date.now() - new Date(lastIot.created_at).getTime()) / 60000))
    : null;

  // Rough live power estimate: last IoT reading value if hourly, else average of last 24 readings
  const recent = readings.slice(-24);
  const avgKwh = recent.length > 0 ? recent.reduce((s, r) => s + Number(r.value || 0), 0) / recent.length : 0;
  const livePowerW = Math.round(avgKwh * 1000); // 1 kWh/h ≈ 1 kW

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            Supervision IoT — Shelly EM
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={activeGateways > 0 ? 'default' : 'outline'} className="gap-1">
              <span className={`h-2 w-2 rounded-full ${activeGateways > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              {activeGateways} passerelle{activeGateways > 1 ? 's' : ''} connectée{activeGateways > 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline">{iotShare}% des relevés en IoT</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricTile
            icon={<Activity className="h-4 w-4" />}
            label="Puissance moyenne"
            value={`${fmt(livePowerW)} W`}
            hint={lastIotMinutesAgo !== null ? `Dernier point IoT : il y a ${lastIotMinutesAgo} min` : 'Aucun point IoT reçu'}
          />
          <MetricTile
            icon={<Moon className="h-4 w-4" />}
            label="Gaspillage nocturne"
            value={`${fmt(nightWasteKwh)} kWh`}
            hint={`${nightShare}% de la conso — ${nightAlerts.length} alerte${nightAlerts.length > 1 ? 's' : ''}`}
            accent={nightAlerts.length > 0 ? 'warning' : undefined}
          />
          <MetricTile
            icon={<Zap className="h-4 w-4" />}
            label="Circuits mesurés"
            value={circuits.length.toString()}
            hint={`${meters.length} pinces Shelly déclarées`}
          />
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Répartition par circuit (2 canaux par Shelly EM)
          </p>
          {circuits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
              Nommez vos compteurs avec des mots-clés (« Général », « Clim », « Éclairage »…) pour activer la ventilation par circuit.
            </p>
          ) : (
            <ul className="space-y-2">
              {circuits.map(c => {
                const pct = totalCircuits > 0 ? (c.kwh / totalCircuits) * 100 : 0;
                return (
                  <li key={c.key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">{c.icon}<span>{c.label}</span></span>
                      <span className="text-muted-foreground">{fmt(c.kwh)} kWh · {pct.toFixed(0)}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          💡 Le Shelly EM mesure jusqu'à <strong>2 circuits par appareil</strong> (ex. arrivée générale + climatisation).
          Pour plus de postes, ajoutez plusieurs Shelly EM ou un Shelly 3EM. Devise&nbsp;: {currency}.
        </div>
      </CardContent>
    </Card>
  );
};

const MetricTile: React.FC<{ icon: React.ReactNode; label: string; value: string; hint?: string; accent?: 'warning' }> = ({ icon, label, value, hint, accent }) => (
  <div className="rounded-md border p-3">
    <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}<span>{label}</span></div>
    <p className={`text-xl font-bold mt-1 ${accent === 'warning' ? 'text-amber-600' : ''}`}>{value}</p>
    {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
  </div>
);

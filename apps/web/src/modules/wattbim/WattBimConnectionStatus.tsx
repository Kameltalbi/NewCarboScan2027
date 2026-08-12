import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Clock, RefreshCw, Radio } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MeterStatus {
  id: string;
  name: string;
  external_id: string | null;
  last_reading_at: string | null;
  last_value: number | null;
  last_unit: string | null;
  source: string | null;
  count_7d: number;
}

const freshnessStatus = (iso: string | null) => {
  if (!iso) return { label: 'Aucune donnée', color: 'destructive' as const, icon: AlertCircle };
  const ageH = (Date.now() - new Date(iso).getTime()) / 36e5;
  if (ageH < 2) return { label: 'En ligne', color: 'default' as const, icon: CheckCircle2 };
  if (ageH < 26) return { label: 'Récent', color: 'secondary' as const, icon: Clock };
  return { label: 'Hors ligne', color: 'destructive' as const, icon: AlertCircle };
};

export const WattBimConnectionStatus: React.FC = () => {
  const [meters, setMeters] = useState<MeterStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: metersData } = await supabase
      .from('wattbim_meters')
      .select('id, name, external_id')
      .order('name');

    if (!metersData) {
      setLoading(false);
      return;
    }

    const enriched = await Promise.all(
      metersData.map(async (m: any) => {
        const { data: last } = await supabase
          .from('wattbim_readings')
          .select('period_end, value, unit, source, created_at')
          .eq('meter_id', m.id)
          .order('period_end', { ascending: false })
          .limit(1)
          .maybeSingle();

        const sinceIso = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
        const { count } = await supabase
          .from('wattbim_readings')
          .select('id', { count: 'exact', head: true })
          .eq('meter_id', m.id)
          .gte('period_end', sinceIso);

        return {
          id: m.id,
          name: m.name,
          external_id: m.external_id,
          last_reading_at: last?.created_at ?? null,
          last_value: last?.value ?? null,
          last_unit: last?.unit ?? null,
          source: last?.source ?? null,
          count_7d: count ?? 0,
        };
      })
    );
    setMeters(enriched);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const online = meters.filter((m) => m.last_reading_at && (Date.now() - new Date(m.last_reading_at).getTime()) / 36e5 < 2).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="h-6 w-6 text-primary" />
            État de connexion IoT
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vérifie en temps réel si tes compteurs Shelly EM envoient bien leurs données.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Compteurs en ligne</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{online}/{meters.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Relevés 7 derniers jours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{meters.reduce((s, m) => s + m.count_7d, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Endpoint d'ingestion</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-xs break-all">…/functions/v1/wattbim-ingest</code>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compteurs & dernière remontée</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {meters.map((m) => {
              const s = freshnessStatus(m.last_reading_at);
              const Icon = s.icon;
              return (
                <div key={m.id} className="flex items-center justify-between py-3">
                  <div className="flex-1">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">
                      ID: <code>{m.external_id ?? '—'}</code>
                      {m.source && <> · source: <code>{m.source}</code></>}
                    </div>
                  </div>
                  <div className="text-right mr-4">
                    <div className="text-sm">
                      {m.last_value != null ? `${m.last_value} ${m.last_unit ?? ''}` : '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {m.last_reading_at
                        ? `il y a ${formatDistanceToNow(new Date(m.last_reading_at), { locale: fr })}`
                        : 'aucune donnée'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {m.count_7d} relevés / 7j
                    </div>
                  </div>
                  <Badge variant={s.color as any} className="gap-1">
                    <Icon className="h-3 w-3" />
                    {s.label}
                  </Badge>
                </div>
              );
            })}
            {meters.length === 0 && !loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Aucun compteur configuré. Ajoute-en dans <strong>Compteurs</strong>.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Que faire si un compteur est "Hors ligne" ?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>1. Vérifie que le Shelly EM est bien alimenté (LED bleue).</p>
          <p>2. Vérifie qu'il est connecté à ton WiFi (app Shelly Smart Control).</p>
          <p>3. Dans l'app Shelly → <strong>Settings → Actions → Energy Meter Report</strong>, vérifie l'URL et le header <code>x-api-key</code>.</p>
          <p>4. Vérifie que le champ <code>external_id</code> de ton compteur correspond bien au canal envoyé par le Shelly.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WattBimConnectionStatus;

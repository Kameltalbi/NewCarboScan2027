// Écran Clés API — création / listing / révocation
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, KeyRound, Plus, Copy, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from "@/integrations/api/client";
import { useAuth } from '@/hooks/useAuth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const AVAILABLE_SCOPES = [
  { id: 'read:activity', label: 'read:activity', desc: 'Lire les données de collecte' },
  { id: 'write:activity', label: 'write:activity', desc: 'Créer / modifier des données de collecte' },
];

type ApiKeyRow = {
  id: string;
  app_name: string;
  key_prefix: string;
  scopes: string[];
  env: 'live' | 'test';
  is_active: boolean;
  revoked_at: string | null;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
};

async function callApi(path: string, method: string, body?: unknown) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/api-keys${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return json;
}

export const ParametresApiKeys: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: organization } = useQuery({
    queryKey: ['user-organization-for-apikeys', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: owned } = await supabase
        .from('organizations').select('id, name').eq('user_id', user.id).maybeSingle();
      if (owned) return owned;
      const { data: mem } = await supabase
        .from('organization_members')
        .select('organizations(id, name)').eq('user_id', user.id).maybeSingle();
      return (mem?.organizations as any) ?? null;
    },
    enabled: !!user?.id,
  });

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api-keys', organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const r = await callApi(`?organization_id=${organization!.id}`, 'GET');
      return (r.data ?? []) as ApiKeyRow[];
    },
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['api-request-logs', organization?.id],
    enabled: !!organization?.id,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase
        .from('api_request_logs')
        .select('id, endpoint, method, status, duration_ms, created_at, api_key_id')
        .eq('organization_id', organization!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [appName, setAppName] = useState('');
  const [env, setEnv] = useState<'live' | 'test'>('live');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['read:activity']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error('Organisation introuvable');
      return callApi('', 'POST', {
        organization_id: organization.id,
        app_name: appName,
        env,
        scopes: selectedScopes,
      });
    },
    onSuccess: (r) => {
      setCreatedKey(r.data.key);
      setAppName('');
      setSelectedScopes(['read:activity']);
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('Clé créée. Copie-la maintenant, elle ne sera plus affichée.');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erreur création'),
  });

  const revokeMut = useMutation({
    mutationFn: async (id: string) => callApi(`/${id}`, 'DELETE'),
    onSuccess: () => {
      toast.success('Clé révoquée');
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erreur révocation'),
  });

  const toggleScope = (s: string) =>
    setSelectedScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const copy = async (v: string) => {
    await navigator.clipboard.writeText(v);
    toast.success('Copié dans le presse-papier');
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <KeyRound className="h-6 w-6" /> Clés API
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Autorise tes applications ou ton ERP à interagir avec CarboScan via l'API REST.
          </p>
        </div>
        <Button onClick={() => { setCreatedKey(null); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle clé
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vos clés</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : keys.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Aucune clé. Crée-en une pour connecter une application externe.
            </div>
          ) : (
            <div className="divide-y">
              {keys.map((k) => {
                const revoked = !k.is_active || !!k.revoked_at;
                return (
                  <div key={k.id} className="py-4 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[220px]">
                      <div className="font-medium flex items-center gap-2">
                        {k.app_name}
                        <Badge variant={k.env === 'live' ? 'default' : 'secondary'}>{k.env}</Badge>
                        {revoked && <Badge variant="destructive">révoquée</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">
                        {k.key_prefix}…
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Scopes : {k.scopes.join(', ')}
                        {' · '}Dernière utilisation :{' '}
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'jamais'}
                      </div>
                    </div>
                    {!revoked && (
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => {
                          if (confirm(`Révoquer la clé "${k.app_name}" ? Cette action est irréversible.`))
                            revokeMut.mutate(k.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Révoquer
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Utilisation</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Envoie la clé dans l'en-tête <code className="bg-muted px-1 rounded">x-api-key</code> :</p>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`curl "${SUPABASE_URL}/functions/v1/collect-api" \\
  -H "apikey: ${ANON_KEY}" \\
  -H "x-api-key: sk_live_…"`}
          </pre>
          <p className="text-xs text-muted-foreground">
            Documentation interactive : <a href="/developers" className="underline">/developers</a>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Derniers appels API</CardTitle></CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              Aucun appel enregistré pour l'instant.
            </div>
          ) : (
            <div className="divide-y text-xs">
              {recentLogs.map((l: any) => (
                <div key={l.id} className="py-2 flex items-center gap-3">
                  <Badge variant={l.status >= 400 ? 'destructive' : 'secondary'} className="w-14 justify-center">
                    {l.status}
                  </Badge>
                  <span className="font-mono w-14">{l.method}</span>
                  <span className="font-mono flex-1 truncate">{l.endpoint}</span>
                  <span className="text-muted-foreground w-16 text-right">{l.duration_ms} ms</span>
                  <span className="text-muted-foreground w-40 text-right">
                    {new Date(l.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setCreatedKey(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{createdKey ? 'Clé créée' : 'Nouvelle clé API'}</DialogTitle>
            <DialogDescription>
              {createdKey
                ? 'Copie-la maintenant. Pour des raisons de sécurité, elle ne sera plus affichée après fermeture.'
                : 'Cette clé permettra à une application externe d\'appeler l\'API CarboScan.'}
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md border p-3 bg-muted/40 font-mono text-sm break-all">
                {createdKey}
              </div>
              <Button onClick={() => copy(createdKey)} className="w-full">
                <Copy className="h-4 w-4 mr-2" /> Copier la clé
              </Button>
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                Sauvegarde-la dans ton gestionnaire de secrets. Impossible de la retrouver après fermeture.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="app_name">Nom de l'application</Label>
                <Input id="app_name" value={appName} onChange={(e) => setAppName(e.target.value)}
                  placeholder="ex. ERP-SoftFacture" />
              </div>
              <div>
                <Label>Environnement</Label>
                <Select value={env} onValueChange={(v) => setEnv(v as 'live' | 'test')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Production (sk_live_…)</SelectItem>
                    <SelectItem value="test">Test (sk_test_…)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scopes</Label>
                <div className="space-y-2 mt-2">
                  {AVAILABLE_SCOPES.map((s) => (
                    <div key={s.id} className="flex items-start gap-2">
                      <Checkbox
                        id={`scope-${s.id}`}
                        checked={selectedScopes.includes(s.id)}
                        onCheckedChange={() => toggleScope(s.id)}
                      />
                      <label htmlFor={`scope-${s.id}`} className="text-sm cursor-pointer">
                        <div className="font-mono text-xs">{s.label}</div>
                        <div className="text-muted-foreground text-xs">{s.desc}</div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {createdKey ? (
              <Button variant="secondary" onClick={() => { setCreateOpen(false); setCreatedKey(null); }}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> J'ai copié la clé
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
                <Button
                  onClick={() => createMut.mutate()}
                  disabled={!appName.trim() || selectedScopes.length === 0 || createMut.isPending}
                >
                  {createMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Créer la clé
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

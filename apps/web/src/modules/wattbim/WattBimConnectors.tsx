import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Copy, KeyRound, Radio, Zap, Wifi, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from './apiKeysHooks';
import { toast } from 'sonner';

const PROJECT_REF = 'jhucjukyvlilhgjbtlkt';
const INGEST_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/wattbim-ingest`;

export const WattBimConnectors: React.FC = () => {
  const { data: keys = [], isLoading } = useApiKeys();
  const create = useCreateApiKey();
  const revoke = useRevokeApiKey();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);

  const submit = async () => {
    try {
      const { apiKey } = await create.mutateAsync(name);
      setNewKey(apiKey);
      setName('');
    } catch (e: any) { toast.error(e.message || 'Erreur'); }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />Clés API</CardTitle>
            <CardDescription>Pour ingérer des relevés depuis un capteur, une passerelle IoT ou un script ERP.</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setNewKey(null); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Nouvelle clé</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{newKey ? 'Clé créée' : 'Nouvelle clé API'}</DialogTitle></DialogHeader>
              {!newKey ? (
                <>
                  <div className="space-y-3">
                    <div><Label>Nom *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Gateway Bâtiment A" /></div>
                  </div>
                  <DialogFooter>
                    <Button onClick={submit} disabled={!name || create.isPending}>Générer</Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Copiez cette clé maintenant — elle ne sera plus jamais affichée.</p>
                    <div className="flex gap-2">
                      <Input readOnly value={newKey} className="font-mono text-xs" />
                      <Button size="icon" variant="outline" onClick={() => copy(newKey)}><Copy className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => { setNewKey(null); setOpen(false); }}>Fermer</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune clé. Créez-en une pour connecter un capteur ou une gateway.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Préfixe</TableHead><TableHead>Statut</TableHead><TableHead>Dernière utilisation</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {keys.map(k => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell className="font-mono text-xs">{k.key_prefix}…</TableCell>
                    <TableCell>{k.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Révoquée</Badge>}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : '—'}</TableCell>
                    <TableCell className="text-right">
                      {k.is_active && (
                        <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Révoquer ${k.name} ?`)) revoke.mutate(k.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5" />Endpoint d'ingestion</CardTitle>
          <CardDescription>Envoyez un POST avec votre clé API dans l'en-tête <code>X-API-Key</code>.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input readOnly value={INGEST_URL} className="font-mono text-xs" />
            <Button size="icon" variant="outline" onClick={() => copy(INGEST_URL)}><Copy className="h-4 w-4" /></Button>
          </div>

          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="nodered">Node-RED</TabsTrigger>
              <TabsTrigger value="batch">Batch</TabsTrigger>
            </TabsList>

            <TabsContent value="curl">
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`curl -X POST ${INGEST_URL} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: wbk_xxxxxxxxxxxxxxxx" \\
  -d '{
    "meter_external_id": "STEG-12345",
    "period_start": "2026-06-01",
    "period_end": "2026-06-30",
    "value": 1240.5,
    "unit": "kWh",
    "cost_amount": 372.15,
    "currency": "TND"
  }'`}</pre>
            </TabsContent>

            <TabsContent value="python">
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`import requests

requests.post(
    "${INGEST_URL}",
    headers={"X-API-Key": "wbk_xxxxxxxxxxxxxxxx"},
    json={
        "meter_external_id": "STEG-12345",
        "period_start": "2026-06-01",
        "period_end": "2026-06-30",
        "value": 1240.5,
        "unit": "kWh",
    },
)`}</pre>
            </TabsContent>

            <TabsContent value="nodered">
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`// Function node avant un node http request
msg.url = "${INGEST_URL}";
msg.method = "POST";
msg.headers = {
  "Content-Type": "application/json",
  "X-API-Key": "wbk_xxxxxxxxxxxxxxxx"
};
msg.payload = {
  meter_external_id: "STEG-12345",
  period_start: "2026-06-01",
  period_end: "2026-06-30",
  value: msg.payload.kwh,
  unit: "kWh"
};
return msg;`}</pre>
            </TabsContent>

            <TabsContent value="batch">
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">{`// Jusqu'à 500 relevés par requête
{
  "readings": [
    { "meter_external_id": "STEG-12345", "period_start": "2026-06-01", "period_end": "2026-06-30", "value": 1240.5 },
    { "meter_external_id": "STEG-67890", "period_start": "2026-06-01", "period_end": "2026-06-30", "value": 880.2 }
  ]
}`}</pre>
            </TabsContent>
          </Tabs>

          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Important :</strong> chaque compteur doit avoir un <code>external_id</code> (renseigné dans l'onglet Compteurs) qui correspond au capteur physique.</p>
            <p><strong>Réponses :</strong> 201 = succès · 400 = données invalides · 401 = clé invalide · 404 = compteur inconnu.</p>
          </div>
        </CardContent>
      </Card>

      {/* Guide Shelly EM — scénario recommandé pour la Tunisie */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500" />Guide pas-à-pas : Shelly EM (recommandé)</CardTitle>
          <CardDescription>Le scénario le plus simple pour équiper un site en 1 semaine, sans intervention lourde sur l'installation électrique.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded border bg-muted/30">
              <div className="text-xs text-muted-foreground">Matériel</div>
              <div className="font-medium">Shelly EM + pince ampèremétrique 50A ou 120A</div>
              <div className="text-xs text-muted-foreground mt-1">~250 TND</div>
            </div>
            <div className="p-3 rounded border bg-muted/30">
              <div className="text-xs text-muted-foreground">Installation</div>
              <div className="font-medium">Électricien local, ~2h par site</div>
              <div className="text-xs text-muted-foreground mt-1">~200 TND</div>
            </div>
            <div className="p-3 rounded border bg-muted/30">
              <div className="text-xs text-muted-foreground">Connectivité</div>
              <div className="font-medium">WiFi 2,4 GHz du site</div>
              <div className="text-xs text-muted-foreground mt-1">Aucun abonnement</div>
            </div>
          </div>

          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
              <div>
                <div className="font-semibold">Créer le bâtiment et le compteur dans WattBim</div>
                <p className="text-muted-foreground">Onglet <strong>Bâtiments</strong> → ajouter le site. Puis <strong>Compteurs</strong> → créer un compteur électricité et renseigner un <code>external_id</code> unique (ex. <code>SHELLY-SIEGE-01</code>). Cet ID lie le capteur physique aux relevés.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
              <div>
                <div className="font-semibold">Générer une clé API dédiée</div>
                <p className="text-muted-foreground">Ci-dessus, cliquez <strong>Nouvelle clé</strong> avec un nom explicite (ex. <em>Shelly Siège</em>). Copiez la clé <code>wbk_…</code> — elle ne sera plus affichée.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
              <div>
                <div className="font-semibold">Installer le Shelly EM</div>
                <p className="text-muted-foreground">L'électricien clipse la pince autour du câble d'arrivée (après le disjoncteur général) et alimente le Shelly sur phase + neutre. <strong>Aucune coupure de circuit nécessaire.</strong></p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
              <div>
                <div className="font-semibold">Connecter au WiFi</div>
                <p className="text-muted-foreground">App <em>Shelly Smart Control</em> → ajouter l'appareil → renseigner SSID + mot de passe WiFi du site (2,4 GHz uniquement).</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">5</span>
              <div>
                <div className="font-semibold">Configurer l'envoi vers WattBim (Actions → URL)</div>
                <p className="text-muted-foreground mb-2">Interface web du Shelly (IP locale) → <em>Settings → Actions → Report Interval</em> : 15 min. Puis <em>Actions → URL actions → Report URL</em> :</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{`${INGEST_URL}?meter_external_id=SHELLY-SIEGE-01&api_key=wbk_xxxxxxxx`}</pre>
                <p className="text-xs text-muted-foreground mt-1">Ou utilisez un script Node-RED / Home Assistant pour agréger en relevés horaires/journaliers (voir onglets ci-dessus).</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold"><CheckCircle2 className="h-4 w-4" /></span>
              <div>
                <div className="font-semibold">Vérifier la réception</div>
                <p className="text-muted-foreground">Après 15-30 min, ouvrez <strong>Relevés</strong> : les données doivent apparaître avec <code>source = iot</code>. Sinon, vérifiez la clé API, l'<code>external_id</code>, et la connectivité WiFi du Shelly.</p>
              </div>
            </li>
          </ol>

          <div className="flex items-start gap-2 p-3 rounded border border-amber-500/30 bg-amber-500/5 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-700 dark:text-amber-400">Sécurité électrique</div>
              <p className="text-muted-foreground">L'installation du Shelly nécessite un électricien qualifié. Ne jamais intervenir sur le tableau STEG sans coupure et habilitation.</p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded border bg-muted/30 text-sm">
            <Wifi className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Autres passerelles compatibles</div>
              <p className="text-muted-foreground">Node-RED, Home Assistant, Modbus TCP (via passerelle), automates industriels (Siemens LOGO!, Wago), scripts Python cron. Tous doivent envoyer un POST au endpoint ci-dessus avec l'en-tête <code>X-API-Key</code>.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


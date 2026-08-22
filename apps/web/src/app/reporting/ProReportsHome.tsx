import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, Sparkles, Building2, Globe2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { useOrganizationYears } from '@/hooks/useOrganizationYears';
import { supabase, sessionAuth} from "@/integrations/api/client";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr as frLocale, enGB } from 'date-fns/locale';
import { analytics } from '@/lib/analytics';

const TEMPLATES = [
  { id: 'executive-summary', name: 'Synthèse exécutive', desc: '7 pages — cover, KPIs, scopes, méthodologie, plan d\'action, glossaire', pages: 7, badge: 'Recommandé' },
];

export const ProReportsHome: React.FC = () => {
  const { organizationId } = useOrganizationId();
  const years = useOrganizationYears();
  const yearsLoading = years.isLoading;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [year, setYear] = useState<number | null>(null);
  const [templateId, setTemplateId] = useState('executive-summary');
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [generating, setGenerating] = useState(false);

  React.useEffect(() => {
    if (!year && years?.defaultYear) setYear(years.defaultYear);
  }, [years, year]);

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['pro-reports', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('pro_reports')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const handleGenerate = async () => {
    if (!organizationId || !year) return;
    setGenerating(true);
    try {
      const { data: session } = await sessionAuth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `https://${projectId}.supabase.co/functions/v1/generate-report-pro`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${session.session?.access_token ?? anonKey}`,
        },
        body: JSON.stringify({ organization_id: organizationId, year, template_id: templateId, language }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Génération échouée');
      analytics.createCarbonReport(templateId);
      toast({ title: 'Rapport généré', description: `${json.pages} pages — prêt au téléchargement.` });
      if (json.file_path) {
        await handleDownload(json.file_path);
        analytics.exportReport('pdf', 'pro_report');
      }
      queryClient.invalidateQueries({ queryKey: ['pro-reports', organizationId] });

    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message || 'Échec de génération', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage.from('pro-reports').download(filePath);
      if (error || !data) throw error || new Error('Fichier introuvable');
      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filePath.split('/').pop() || 'rapport.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Impossible de télécharger', variant: 'destructive' });
    }
  };


  const allowedYears = years?.allowedYears || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header sobre */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rapport annuel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bilan carbone conforme GHG Protocol / ISO 14064, prêt à partager.
          </p>
        </div>
        <div className="flex items-end gap-3">
          {!yearsLoading && (
            <Select value={year?.toString() || ''} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Année" /></SelectTrigger>
              <SelectContent>
                {allowedYears.length === 0 && year && (
                  <SelectItem value={year.toString()}>{year}</SelectItem>
                )}
                {allowedYears.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={language} onValueChange={(v) => setLanguage(v as 'fr' | 'en')}>
            <SelectTrigger className="w-[110px]">
              <Globe2 className="h-4 w-4 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">FR</SelectItem>
              <SelectItem value="en">EN</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={!year || generating} size="lg">
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Génération…</>
            ) : (
              <><FileText className="h-4 w-4 mr-2" /> Générer le rapport</>
            )}
          </Button>
        </div>
      </div>

      {/* Historique */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Rapports générés</CardTitle>
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
          ) : !reports || reports.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-10">
              Aucun rapport pour l'instant. Cliquez sur « Générer le rapport ».
            </div>
          ) : (
            <div className="divide-y">
              {reports.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {r.status === 'ready' && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                    {r.status === 'generating' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                    {r.status === 'failed' && <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-medium truncate">Rapport annuel — {r.year}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: r.language === 'en' ? enGB : frLocale })}
                        {r.page_count ? ` · ${r.page_count} pages` : ''}
                        {r.language ? ` · ${r.language.toUpperCase()}` : ''}
                      </div>
                    </div>
                  </div>
                  {r.status === 'ready' && r.file_path && (
                    <Button size="sm" variant="outline" onClick={() => handleDownload(r.file_path)}>
                      <Download className="h-4 w-4 mr-2" /> Télécharger
                    </Button>
                  )}
                  {r.status === 'failed' && (
                    <span className="text-xs text-destructive truncate max-w-[240px]" title={r.error_message}>
                      {r.error_message || 'Erreur'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProReportsHome;

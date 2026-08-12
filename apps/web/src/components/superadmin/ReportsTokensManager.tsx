import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, Plus, Minus, Coins, Download, FileText, Search } from "lucide-react";

interface Organization {
  id: string;
  nom_entreprise: string;
  user_id: string;
}

interface OrgQuota {
  orgId: string;
  orgName: string;
  userId: string;
  year: number;
  tokensTotal: number;
  tokensUsed: number;
  tokensRemaining: number;
  quotaId: string | null;
  generationsCount: number;
  lastReportUrl: string | null;
  lastReportDate: string | null;
}

interface ReportsTokensManagerProps {
  organizations: Organization[];
}

export const ReportsTokensManager: React.FC<ReportsTokensManagerProps> = ({ organizations }) => {
  const [orgQuotas, setOrgQuotas] = useState<OrgQuota[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const currentYear = new Date().getFullYear();
  const { toast } = useToast();

  useEffect(() => {
    if (organizations.length > 0) {
      fetchAllQuotas();
    }
  }, [organizations]);

  const fetchAllQuotas = async () => {
    setIsLoading(true);
    try {
      // Fetch all quotas for current year
      const { data: quotas, error: quotaError } = await supabase
        .from('report_quota')
        .select('*')
        .eq('year', currentYear);

      if (quotaError) throw quotaError;

      // Fetch generation counts per org
      const { data: generations, error: genError } = await supabase
        .from('report_generations')
        .select('organization_id, id, created_at')
        .eq('year', currentYear)
        .order('created_at', { ascending: false });

      if (genError) throw genError;

      // Build map of quotas by org_id
      const quotaMap = new Map<string, any>();
      (quotas || []).forEach(q => quotaMap.set(q.organization_id, q));

      // Build map of generation counts by org_id
      const genCountMap = new Map<string, number>();
      const lastGenMap = new Map<string, string>();
      (generations || []).forEach(g => {
        genCountMap.set(g.organization_id, (genCountMap.get(g.organization_id) || 0) + 1);
        if (!lastGenMap.has(g.organization_id)) {
          lastGenMap.set(g.organization_id, g.created_at);
        }
      });

      // Build org quotas list
      const result: OrgQuota[] = organizations
        .filter(org => org.user_id) // Only orgs with user_id
        .map(org => {
          const quota = quotaMap.get(org.user_id);
          return {
            orgId: org.id,
            orgName: org.nom_entreprise || 'Organisation sans nom',
            userId: org.user_id,
            year: currentYear,
            tokensTotal: quota?.tokens_total ?? 20,
            tokensUsed: quota?.tokens_used ?? 0,
            tokensRemaining: (quota?.tokens_total ?? 20) - (quota?.tokens_used ?? 0),
            quotaId: quota?.id ?? null,
            generationsCount: genCountMap.get(org.user_id) || 0,
            lastReportUrl: null, // TODO: fetch from storage if needed
            lastReportDate: lastGenMap.get(org.user_id) || null,
          };
        });

      setOrgQuotas(result);
    } catch (error) {
      console.error('Error fetching quotas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetTokens = async (orgQuota: OrgQuota) => {
    setIsSaving(orgQuota.userId);
    try {
      if (orgQuota.quotaId) {
        const { error } = await supabase
          .from('report_quota')
          .update({ tokens_used: 0, updated_at: new Date().toISOString() })
          .eq('id', orgQuota.quotaId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('report_quota')
          .insert({ organization_id: orgQuota.userId, year: currentYear, tokens_total: 20, tokens_used: 0 });
        if (error) throw error;
      }
      toast({ title: "Tokens réinitialisés", description: `${orgQuota.orgName} — compteur remis à zéro` });
      fetchAllQuotas();
    } catch (error) {
      console.error('Error resetting tokens:', error);
      toast({ title: "Erreur", description: "Impossible de réinitialiser", variant: "destructive" });
    } finally {
      setIsSaving(null);
    }
  };

  const setTokenTotal = async (orgQuota: OrgQuota, newTotal: number) => {
    setIsSaving(orgQuota.userId);
    try {
      if (orgQuota.quotaId) {
        const { error } = await supabase
          .from('report_quota')
          .update({ tokens_total: newTotal, updated_at: new Date().toISOString() })
          .eq('id', orgQuota.quotaId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('report_quota')
          .insert({ organization_id: orgQuota.userId, year: currentYear, tokens_total: newTotal, tokens_used: 0 });
        if (error) throw error;
      }
      toast({ title: "Quota mis à jour", description: `${orgQuota.orgName} — ${newTotal} tokens pour ${currentYear}` });
      fetchAllQuotas();
    } catch (error) {
      console.error('Error setting tokens:', error);
      toast({ title: "Erreur", description: "Impossible de modifier le quota", variant: "destructive" });
    } finally {
      setIsSaving(null);
    }
  };

  const adjustTokensUsed = async (orgQuota: OrgQuota, adjustment: number) => {
    if (!orgQuota.quotaId) {
      // Create quota first
      await setTokenTotal(orgQuota, 20);
      return;
    }
    const newUsed = Math.max(0, Math.min(orgQuota.tokensTotal, orgQuota.tokensUsed + adjustment));
    setIsSaving(orgQuota.userId);
    try {
      const { error } = await supabase
        .from('report_quota')
        .update({ tokens_used: newUsed, updated_at: new Date().toISOString() })
        .eq('id', orgQuota.quotaId);
      if (error) throw error;
      fetchAllQuotas();
    } catch (error) {
      console.error('Error adjusting tokens:', error);
      toast({ title: "Erreur", description: "Impossible d'ajuster", variant: "destructive" });
    } finally {
      setIsSaving(null);
    }
  };

  const downloadReport = async (orgQuota: OrgQuota) => {
    // Check if there's a validated report PDF in storage
    try {
      const { data: bilan } = await supabase
        .from('bilans_carbone')
        .select('id, expert_pdf_url, status')
        .eq('organization_id', orgQuota.userId)
        .eq('status', 'validated')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bilan?.expert_pdf_url) {
        window.open(bilan.expert_pdf_url, '_blank');
      } else {
        toast({ title: "Aucun rapport", description: `Pas de rapport validé pour ${orgQuota.orgName}`, variant: "destructive" });
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({ title: "Erreur", description: "Impossible de télécharger le rapport", variant: "destructive" });
    }
  };

  const filteredQuotas = orgQuotas.filter(q =>
    q.orgName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Chargement des quotas...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-500" />
          Rapports & Tokens par organisation
        </CardTitle>
        <CardDescription>
          Gérez les tokens de modification de rapport et téléchargez les rapports validés — Année {currentYear}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une organisation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead className="text-center">Tokens</TableHead>
                <TableHead className="text-center">Générations</TableHead>
                <TableHead className="text-center">Dernier rapport</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotas.map((q) => {
                const isExhausted = q.tokensRemaining <= 0;
                const isLow = q.tokensRemaining <= 5;
                const saving = isSaving === q.userId;

                return (
                  <TableRow key={q.userId}>
                    <TableCell className="font-medium">{q.orgName}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge
                          variant={isExhausted ? 'destructive' : isLow ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          {q.tokensUsed}/{q.tokensTotal}
                        </Badge>
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min((q.tokensUsed / q.tokensTotal) * 100, 100)}%`,
                              backgroundColor: isExhausted ? '#ef4444' : isLow ? '#f59e0b' : '#22c55e',
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{q.generationsCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {q.lastReportDate
                        ? new Date(q.lastReportDate).toLocaleDateString('fr-FR')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => adjustTokensUsed(q, -1)}
                          disabled={saving || q.tokensUsed <= 0}
                          title="-1 token utilisé"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => adjustTokensUsed(q, 1)}
                          disabled={saving || q.tokensUsed >= q.tokensTotal}
                          title="+1 token utilisé"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetTokens(q)}
                          disabled={saving}
                          title="Remettre à zéro"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTokenTotal(q, 20)}
                          disabled={saving}
                          title="Accorder 20 tokens"
                        >
                          20
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTokenTotal(q, 50)}
                          disabled={saving}
                          title="Accorder 50 tokens"
                        >
                          50
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReport(q)}
                          title="Télécharger rapport validé"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        {saving && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredQuotas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Aucune organisation trouvée
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

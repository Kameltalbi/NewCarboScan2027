import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, Plus, Minus, Coins } from "lucide-react";

interface TokenQuotaManagerProps {
  organizationId: string;
  organizationName: string;
}

interface QuotaData {
  id: string;
  tokens_total: number;
  tokens_used: number;
  year: number;
}

export const TokenQuotaManager: React.FC<TokenQuotaManagerProps> = ({
  organizationId,
  organizationName,
}) => {
  const [quotas, setQuotas] = useState<QuotaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [customTokens, setCustomTokens] = useState<number>(20);
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchQuotas();
  }, [organizationId]);

  const fetchQuotas = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('report_quota')
        .select('id, tokens_total, tokens_used, year')
        .eq('organization_id', organizationId)
        .order('year', { ascending: false });

      if (error) throw error;
      setQuotas(data || []);
    } catch (error) {
      console.error('Error fetching quotas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetTokens = async (year: number) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('report_quota')
        .update({ tokens_used: 0, updated_at: new Date().toISOString() })
        .eq('organization_id', organizationId)
        .eq('year', year);

      if (error) throw error;

      toast({
        title: "Tokens réinitialisés",
        description: `Compteur remis à zéro pour ${organizationName} (${year})`,
      });
      fetchQuotas();
    } catch (error) {
      console.error('Error resetting tokens:', error);
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser les tokens",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const setTokenTotal = async (year: number, newTotal: number) => {
    setIsSaving(true);
    try {
      const existing = quotas.find(q => q.year === year);
      if (existing) {
        const { error } = await supabase
          .from('report_quota')
          .update({ tokens_total: newTotal, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('report_quota')
          .insert({ organization_id: organizationId, year, tokens_total: newTotal, tokens_used: 0 });
        if (error) throw error;
      }

      toast({
        title: "Quota mis à jour",
        description: `${organizationName} a maintenant ${newTotal} tokens pour ${year}`,
      });
      fetchQuotas();
    } catch (error) {
      console.error('Error setting token total:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le quota",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const adjustTokensUsed = async (year: number, adjustment: number) => {
    const quota = quotas.find(q => q.year === year);
    if (!quota) return;
    const newUsed = Math.max(0, Math.min(quota.tokens_total, quota.tokens_used + adjustment));
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('report_quota')
        .update({ tokens_used: newUsed, updated_at: new Date().toISOString() })
        .eq('id', quota.id);

      if (error) throw error;
      fetchQuotas();
    } catch (error) {
      console.error('Error adjusting tokens:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajuster les tokens",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const createQuotaForYear = async () => {
    setIsSaving(true);
    try {
      const existing = quotas.find(q => q.year === currentYear);
      if (existing) {
        toast({ title: "Info", description: `Le quota ${currentYear} existe déjà` });
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from('report_quota')
        .insert({ organization_id: organizationId, year: currentYear, tokens_total: customTokens, tokens_used: 0 });

      if (error) throw error;

      toast({
        title: "Quota créé",
        description: `${customTokens} tokens accordés à ${organizationName} pour ${currentYear}`,
      });
      fetchQuotas();
    } catch (error) {
      console.error('Error creating quota:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le quota",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-500" />
          Tokens de génération de rapport
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {quotas.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Aucun quota configuré pour cette organisation.</p>
            <div className="flex items-center gap-3">
              <Label className="text-sm whitespace-nowrap">Tokens à accorder :</Label>
              <Input
                type="number"
                value={customTokens}
                onChange={(e) => setCustomTokens(parseInt(e.target.value) || 20)}
                className="w-24"
                min={1}
              />
              <Button onClick={createQuotaForYear} disabled={isSaving} size="sm">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Créer quota {currentYear}
              </Button>
            </div>
          </div>
        ) : (
          quotas.map((quota) => {
            const remaining = quota.tokens_total - quota.tokens_used;
            const usagePercent = (quota.tokens_used / quota.tokens_total) * 100;
            const isLow = remaining <= 3;
            const isExhausted = remaining <= 0;

            return (
              <div key={quota.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-sm font-mono">{quota.year}</Badge>
                    <Badge 
                      variant={isExhausted ? 'destructive' : isLow ? 'secondary' : 'default'}
                      className="text-base px-3 py-1"
                    >
                      {quota.tokens_used} / {quota.tokens_total} utilisés
                    </Badge>
                    <span className={`text-sm font-medium ${isExhausted ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-green-600'}`}>
                      ({remaining} restant{remaining > 1 ? 's' : ''})
                    </span>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(usagePercent, 100)}%`,
                      backgroundColor: isExhausted ? '#ef4444' : isLow ? '#f59e0b' : '#22c55e',
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustTokensUsed(quota.year, -1)}
                    disabled={isSaving || quota.tokens_used <= 0}
                  >
                    <Minus className="h-4 w-4 mr-1" />
                    -1 utilisé
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustTokensUsed(quota.year, 1)}
                    disabled={isSaving || quota.tokens_used >= quota.tokens_total}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    +1 utilisé
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetTokens(quota.year)}
                    disabled={isSaving}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Remettre à zéro
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTokenTotal(quota.year, 20)}
                    disabled={isSaving}
                  >
                    Accorder 20 tokens
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTokenTotal(quota.year, 50)}
                    disabled={isSaving}
                  >
                    Accorder 50 tokens
                  </Button>
                </div>
              </div>
            );
          })
        )}

        {/* Créer un quota pour une nouvelle année si des quotas existent déjà */}
        {quotas.length > 0 && !quotas.find(q => q.year === currentYear) && (
          <div className="flex items-center gap-3 pt-2 border-t">
            <Label className="text-sm whitespace-nowrap">Ajouter quota {currentYear} :</Label>
            <Input
              type="number"
              value={customTokens}
              onChange={(e) => setCustomTokens(parseInt(e.target.value) || 20)}
              className="w-24"
              min={1}
            />
            <Button onClick={createQuotaForYear} disabled={isSaving} size="sm">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Créer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

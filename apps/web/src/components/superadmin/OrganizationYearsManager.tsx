import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from "@/integrations/api/client";
import { useToast } from '@/hooks/use-toast';
import { CalendarPlus, Trash2, Plus } from 'lucide-react';

interface OrganizationYear {
  id: string;
  year: number;
  is_included: boolean;
  granted_at: string;
}

interface OrganizationYearsManagerProps {
  userId: string; // The user_id who owns the organization
  organizationName: string;
}

export const OrganizationYearsManager: React.FC<OrganizationYearsManagerProps> = ({
  userId,
  organizationName,
}) => {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [years, setYears] = useState<OrganizationYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [isIncluded, setIsIncluded] = useState(true);
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const possibleYears = Array.from({ length: currentYear - 2021 }, (_, i) => 2022 + i);

  // Resolve the real organization ID from user_id
  useEffect(() => {
    const resolveOrgId = async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setOrgId(data.id);
      }
    };
    if (userId) resolveOrgId();
  }, [userId]);

  const fetchYears = async () => {
    if (!orgId) return;
    try {
      const { data, error } = await supabase
        .from('organization_years')
        .select('*')
        .eq('organization_id', orgId)
        .order('year', { ascending: true });

      if (error) throw error;
      setYears((data as OrganizationYear[]) || []);
    } catch (error) {
      console.error('Error fetching organization years:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) fetchYears();
  }, [orgId]);

  const addYear = async () => {
    if (!selectedYear) return;
    const yearNum = parseInt(selectedYear);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('organization_years')
        .insert({
          organization_id: orgId!,
          year: yearNum,
          is_included: isIncluded,
          granted_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: 'Année ajoutée',
        description: `L'année ${yearNum} a été accordée à ${organizationName}`,
      });
      setSelectedYear('');
      fetchYears();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message?.includes('duplicate') 
          ? 'Cette année est déjà configurée'
          : 'Impossible d\'ajouter l\'année',
        variant: 'destructive',
      });
    }
  };

  const removeYear = async (yearId: string, year: number) => {
    try {
      const { error } = await supabase
        .from('organization_years')
        .delete()
        .eq('id', yearId);

      if (error) throw error;

      toast({
        title: 'Année supprimée',
        description: `L'année ${year} a été retirée`,
      });
      fetchYears();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'année',
        variant: 'destructive',
      });
    }
  };

  const toggleIncluded = async (yearId: string, newValue: boolean) => {
    try {
      const { error } = await supabase
        .from('organization_years')
        .update({ is_included: newValue })
        .eq('id', yearId);

      if (error) throw error;
      fetchYears();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour',
        variant: 'destructive',
      });
    }
  };

  const existingYearNums = years.map(y => y.year);
  const availableToAdd = possibleYears.filter(y => !existingYearNums.includes(y));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarPlus className="h-5 w-5" />
          Gestion des années
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current years */}
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Chargement...</p>
        ) : years.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aucune année configurée. L'organisation n'a accès à aucune année.
          </p>
        ) : (
          <div className="space-y-2">
            {years.map((y) => (
              <div key={y.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">{y.year}</span>
                  <Badge variant={y.is_included ? 'default' : 'secondary'}>
                    {y.is_included ? 'Incluse (gratuite)' : 'Payante'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Incluse</Label>
                    <Switch
                      checked={y.is_included}
                      onCheckedChange={(val) => toggleIncluded(y.id, val)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeYear(y.id, y.year)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add year */}
        {availableToAdd.length > 0 && (
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Incluse</Label>
              <Switch checked={isIncluded} onCheckedChange={setIsIncluded} />
            </div>
            <Button size="sm" onClick={addYear} disabled={!selectedYear}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

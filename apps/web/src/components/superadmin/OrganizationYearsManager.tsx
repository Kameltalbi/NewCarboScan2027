import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { api } from "@/integrations/api/client";
import { useToast } from '@/hooks/use-toast';
import { CalendarPlus, Trash2 } from 'lucide-react';

interface OrganizationYear {
  id: string;
  year: number;
  is_included: boolean;
  created_at?: string;
}

interface OrganizationYearsManagerProps {
  organizationId: string;
  organizationName: string;
  userId?: string;
}

export const OrganizationYearsManager: React.FC<OrganizationYearsManagerProps> = ({
  organizationId,
  organizationName,
}) => {
  const [years, setYears] = useState<OrganizationYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [isIncluded, setIsIncluded] = useState(true);
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const possibleYears = Array.from({ length: currentYear - 2021 }, (_, i) => 2022 + i);

  const fetchYears = async () => {
    if (!organizationId) return;
    try {
      const { items } = await api.adminListOrgYears(organizationId);
      setYears(items || []);
    } catch (error) {
      console.error('Error fetching organization years:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, [organizationId]);

  const addYear = async () => {
    if (!selectedYear) return;
    const yearNum = parseInt(selectedYear);
    try {
      await api.adminAddOrgYear(organizationId, yearNum, isIncluded);
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
      await api.adminDeleteOrgYear(organizationId, yearId);
      toast({
        title: 'Année supprimée',
        description: `L'année ${year} a été retirée`,
      });
      fetchYears();
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'année',
        variant: 'destructive',
      });
    }
  };

  const toggleIncluded = async (yearId: string, newValue: boolean) => {
    try {
      await api.adminPatchOrgYear(organizationId, yearId, newValue);
      fetchYears();
    } catch {
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
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label>Année</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToAdd.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={isIncluded} onCheckedChange={setIsIncluded} />
                <Label>Incluse</Label>
              </div>
              <Button size="sm" onClick={addYear} disabled={!selectedYear}>Ajouter</Button>
            </div>
            <div className="space-y-2">
              {years.map((y) => (
                <div key={y.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{y.year}</span>
                    <Badge variant={y.is_included ? "default" : "secondary"}>
                      {y.is_included ? "Incluse" : "Exclue"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={y.is_included}
                      onCheckedChange={(v) => toggleIncluded(y.id, v)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeYear(y.id, y.year)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {years.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune année configurée.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

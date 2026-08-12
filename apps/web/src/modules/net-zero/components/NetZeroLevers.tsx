// Écran 5: Leviers de réduction

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { NetZeroService } from '@/lib/net-zero/NetZeroService';
import { ReductionLever, ReductionLeverCategory, ActionType } from '@/lib/net-zero/types';
import { MACCCalculator } from '@/lib/net-zero/MACCCalculator';
import { MACCChart } from '@/components/net-zero/MACCChart';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const NetZeroLevers: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId } = useOrganizationId();
  const [loading, setLoading] = useState(true);
  const [levers, setLevers] = useState<ReductionLever[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newLever, setNewLever] = useState<Partial<ReductionLever>>({
    category: 'energy',
    priority: 'medium',
    status: 'planned',
    enabled: true,
    start_year: new Date().getFullYear(),
    end_year: new Date().getFullYear() + 5,
  });

  useEffect(() => {
    const loadLevers = async () => {
      if (!organizationId) return;

      try {
        setLoading(true);
        const trajectory = await NetZeroService.getTrajectory(organizationId);
        if (trajectory) {
          // Enrichir tous les leviers avec les calculs MACC
          const enrichedLevers = (trajectory.levers || []).map((lever) =>
            lever.estimated_cost !== undefined && lever.estimated_cost !== null
              ? MACCCalculator.enrichLeverWithMACC(lever)
              : lever
          );
          setLevers(enrichedLevers);
        }
      } catch (err) {
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLevers();
  }, [organizationId]);

  const handleAddLever = async () => {
    if (!organizationId || !newLever.name || !newLever.estimated_impact) {
      toast.error('Veuillez compléter tous les champs obligatoires');
      return;
    }

    try {
      let lever: ReductionLever = {
        id: `lever-${Date.now()}`,
        category: newLever.category!,
        name: newLever.name,
        description: newLever.description || '',
        estimated_impact: newLever.estimated_impact,
        estimated_cost: newLever.estimated_cost,
        annual_savings: newLever.annual_savings,
        start_year: newLever.start_year!,
        end_year: newLever.end_year!,
        priority: newLever.priority!,
        status: newLever.status!,
        enabled: newLever.enabled!,
      };

      // Enrichir avec les calculs MACC si coût défini
      if (lever.estimated_cost !== undefined && lever.estimated_cost !== null) {
        lever = MACCCalculator.enrichLeverWithMACC(lever);
        toast.success(`Levier ajouté - Coût/tonne: ${lever.cost_per_tonne?.toFixed(1)} €/tCO₂e`);
      } else {
        toast.success('Levier ajouté');
      }

      await NetZeroService.addLever(organizationId, lever);
      setLevers([...levers, lever]);
      setShowForm(false);
      setNewLever({
        category: 'energy',
        priority: 'medium',
        status: 'planned',
        enabled: true,
        start_year: new Date().getFullYear(),
        end_year: new Date().getFullYear() + 5,
      });
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    }
  };

  const handleDeleteLever = async (leverId: string) => {
    if (!organizationId) return;

    try {
      const trajectory = await NetZeroService.getTrajectory(organizationId);
      if (trajectory) {
        const updatedLevers = trajectory.levers.filter((l) => l.id !== leverId);
        await NetZeroService.saveTrajectory(organizationId, {
          ...trajectory,
          levers: updatedLevers,
        });
        setLevers(updatedLevers);
        toast.success('Levier supprimé');
      }
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    }
  };

  const categoryLabels: Record<ReductionLeverCategory, string> = {
    energy: 'Énergie',
    transport: 'Transport',
    purchases: 'Achats',
    products: 'Produits',
    organization: 'Organisation',
    waste: 'Déchets',
    other: 'Autre',
  };

  const priorityColors: Record<'quick_win' | 'high' | 'medium' | 'low', string> = {
    quick_win: 'bg-green-100 text-green-800',
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leviers de réduction</h1>
          <p className="text-muted-foreground mt-1">
            Identifiez et quantifiez les actions de réduction pour atteindre vos objectifs
          </p>
        </div>
        <div className="flex gap-2">
          {levers.some(l => l.estimated_cost !== undefined) && (
            <Button variant="outline" onClick={() => navigate('/app/decarbotech/trajectoire/macc')}>
              📊 Voir la MACC
            </Button>
          )}
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un levier
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nouveau levier de réduction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select
                  value={newLever.category}
                  onValueChange={(value) => setNewLever({ ...newLever, category: value as ReductionLeverCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priorité</Label>
                <Select
                  value={newLever.priority}
                  onValueChange={(value) => setNewLever({ ...newLever, priority: value as 'high' | 'medium' | 'low' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="low">Basse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nom du levier *</Label>
              <Input
                id="name"
                value={newLever.name || ''}
                onChange={(e) => setNewLever({ ...newLever, name: e.target.value })}
                placeholder="Ex: Passage à l'électricité renouvelable"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newLever.description || ''}
                onChange={(e) => setNewLever({ ...newLever, description: e.target.value })}
                placeholder="Détails sur ce levier de réduction..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="impact">Impact estimé (tCO₂e/an) *</Label>
                <Input
                  id="impact"
                  type="number"
                  value={newLever.estimated_impact || ''}
                  onChange={(e) => setNewLever({ ...newLever, estimated_impact: parseFloat(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Coût estimé (€)</Label>
                <Input
                  id="cost"
                  type="number"
                  value={newLever.estimated_cost || ''}
                  onChange={(e) => setNewLever({ ...newLever, estimated_cost: parseFloat(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="savings">Économies annuelles (€/an)</Label>
                <Input
                  id="savings"
                  type="number"
                  value={newLever.annual_savings || ''}
                  onChange={(e) => setNewLever({ ...newLever, annual_savings: parseFloat(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_year">Année de début</Label>
                <Input
                  id="start_year"
                  type="number"
                  value={newLever.start_year}
                  onChange={(e) => setNewLever({ ...newLever, start_year: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_year">Année de fin</Label>
                <Input
                  id="end_year"
                  type="number"
                  value={newLever.end_year}
                  onChange={(e) => setNewLever({ ...newLever, end_year: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleAddLever} className="flex-1">
                Ajouter
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {levers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucun levier de réduction défini</p>
            <Button onClick={() => setShowForm(true)} className="mt-4">
              Ajouter votre premier levier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {levers.map((lever) => (
            <Card key={lever.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{lever.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {categoryLabels[lever.category]}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteLever(lever.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {lever.description && (
                  <p className="text-sm text-muted-foreground">{lever.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={priorityColors[lever.priority]}>
                    {lever.priority === 'quick_win' && '⚡ '}
                    Priorité {lever.priority === 'quick_win' ? 'Quick Win' : lever.priority === 'high' ? 'haute' : lever.priority === 'medium' ? 'moyenne' : 'basse'}
                  </Badge>
                  <Badge variant="outline">
                    {lever.start_year} - {lever.end_year}
                  </Badge>
                  {lever.macc_rank && (
                    <Badge variant="secondary">
                      Rang MACC: #{lever.macc_rank}
                    </Badge>
                  )}
                </div>
                <div className="pt-2 border-t grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Impact estimé</div>
                    <div className="text-xl font-bold text-green-600">
                      -{Math.round(lever.estimated_impact)} tCO₂e/an
                    </div>
                  </div>
                  {lever.cost_per_tonne !== undefined && (
                    <div>
                      <div className="text-sm text-muted-foreground">Coût/tonne</div>
                      <div className={`text-xl font-bold ${lever.cost_per_tonne < 0 ? 'text-green-600' : lever.cost_per_tonne < 100 ? 'text-orange-600' : 'text-red-600'}`}>
                        {Math.round(lever.cost_per_tonne)} €/tCO₂e
                      </div>
                    </div>
                  )}
                </div>
                {lever.roi_years && (
                  <div className="text-sm text-muted-foreground">
                    ROI: {lever.roi_years.toFixed(1)} ans
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MACC Chart */}
      {levers.length > 0 && levers.some(l => l.estimated_cost !== undefined) && (
        <MACCChart maccPoints={MACCCalculator.calculateMACC(levers)} />
      )}

      {levers.length > 0 && (
        <div className="flex gap-4">
          <Button onClick={() => navigate('/app/decarbotech/trajectoire/scenarios')} className="flex-1">
            Simuler des scénarios <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate('/app/decarbotech/trajectoire')}>
            Retour
          </Button>
        </div>
      )}
    </div>
  );
};


import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { GitCompare, Plus, Trash2, TrendingDown, TrendingUp, Minus, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useACVProjects } from '@/hooks/useACVProjects';
import { useACVCalculation } from '../hooks/useACVCalculation';
import { useACVScenarios } from '../hooks/useACVScenarios';
import { formatImpact, calculateVariation } from '../engine/acvCalculationEngine';

export const ACVScenariosPage: React.FC = () => {
  const { projects } = useACVProjects();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const { baselineResult, isLoading } = useACVCalculation(selectedProjectId || undefined);
  const { scenarios, createScenario, deleteScenario } = useACVScenarios(selectedProjectId || undefined);

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = () => {
    if (!selectedProjectId || !newName) return;
    createScenario.mutate({
      project_id: selectedProjectId,
      name: newName,
      description: newDesc || undefined,
      is_baseline: scenarios.length === 0,
    });
    setNewName('');
    setNewDesc('');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <GitCompare className="h-6 w-6 text-primary" />
          Scénarios de comparaison
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comparez différentes options : matière recyclée, énergie renouvelable, transport optimisé
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm font-medium">Projet ACV</Label>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionnez un projet" /></SelectTrigger>
            <SelectContent>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProjectId && (
        <>
          {/* Création de scénario */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nouveau scénario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Nom *</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Scénario recyclé" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Remplacement acier par acier recyclé" />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={!newName || createScenario.isPending} size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Créer
              </Button>
            </CardContent>
          </Card>

          {/* Liste des scénarios */}
          <div className="grid gap-4">
            {scenarios.map(s => (
              <Card key={s.id} className={s.is_baseline ? 'border-primary/30' : ''}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{s.name}</h3>
                        {s.is_baseline && <Badge>Référence</Badge>}
                      </div>
                      {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {s.total_carbon > 0 && (
                        <span className="font-mono text-sm">{formatImpact(s.total_carbon, 'carbon')}</span>
                      )}
                      {!s.is_baseline && (
                        <Button variant="ghost" size="sm" onClick={() => deleteScenario.mutate(s.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comparaison visuelle */}
          {baselineResult && scenarios.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Comparaison des scénarios</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={scenarios.map(s => ({
                    name: s.name,
                    Carbone: s.total_carbon,
                    Énergie: s.total_energy,
                    Eau: s.total_water,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Carbone" fill="hsl(var(--primary))" />
                    <Bar dataKey="Énergie" fill="#f59e0b" />
                    <Bar dataKey="Eau" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

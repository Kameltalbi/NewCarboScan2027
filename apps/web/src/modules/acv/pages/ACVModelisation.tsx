import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Boxes, Plus, Trash2, Package, Loader2 } from 'lucide-react';
import { useACVProjects } from '@/hooks/useACVProjects';
import { useACVComponents } from '../hooks/useACVComponents';
import { useACVMaterials, useACVProcesses, useACVTransportModes } from '../hooks/useACVLibrary';
import { MATERIAL_CATEGORIES } from '../types';

export const ACVModelisation: React.FC = () => {
  const { projects } = useACVProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const { components, isLoading, addComponent, deleteComponent } = useACVComponents(selectedProjectId || undefined);
  const { data: materials } = useACVMaterials();
  const { data: processes } = useACVProcesses();
  const { data: transports } = useACVTransportModes();

  const [newComponent, setNewComponent] = useState({
    component_name: '',
    material_id: '',
    process_id: '',
    quantity: 0,
    unit: 'kg',
    transport_mode_id: '',
    transport_distance_km: 0,
    recycled_percentage: 0,
    supplier_country: '',
  });

  const handleAdd = () => {
    if (!selectedProjectId || !newComponent.component_name) return;
    addComponent.mutate({
      project_id: selectedProjectId,
      component_name: newComponent.component_name,
      material_id: newComponent.material_id || undefined,
      process_id: newComponent.process_id || undefined,
      quantity: newComponent.quantity,
      unit: newComponent.unit,
      transport_mode_id: newComponent.transport_mode_id || undefined,
      transport_distance_km: newComponent.transport_distance_km,
      recycled_percentage: newComponent.recycled_percentage,
      supplier_country: newComponent.supplier_country || undefined,
    } as any);
    setNewComponent({ component_name: '', material_id: '', process_id: '', quantity: 0, unit: 'kg', transport_mode_id: '', transport_distance_km: 0, recycled_percentage: 0, supplier_country: '' });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Boxes className="h-6 w-6 text-primary" />
          Modélisation produit
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Structure hiérarchique : Produit → Composants → Matériaux
        </p>
      </div>

      {/* Sélection du projet */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm font-medium">Projet ACV</Label>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Sélectionnez un projet" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProjectId && (
        <>
          {/* Formulaire d'ajout */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" /> Ajouter un composant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Nom du composant *</Label>
                  <Input
                    value={newComponent.component_name}
                    onChange={e => setNewComponent(p => ({ ...p, component_name: e.target.value }))}
                    placeholder="Ex: Châssis acier"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Matériau</Label>
                  <Select value={newComponent.material_id} onValueChange={v => setNewComponent(p => ({ ...p, material_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {(materials ?? []).map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Procédé</Label>
                  <Select value={newComponent.process_id} onValueChange={v => setNewComponent(p => ({ ...p, process_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {(processes ?? []).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Quantité (kg)</Label>
                  <Input
                    type="number"
                    value={newComponent.quantity || ''}
                    onChange={e => setNewComponent(p => ({ ...p, quantity: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Transport</Label>
                  <Select value={newComponent.transport_mode_id} onValueChange={v => setNewComponent(p => ({ ...p, transport_mode_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
                    <SelectContent>
                      {(transports ?? []).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Distance (km)</Label>
                  <Input
                    type="number"
                    value={newComponent.transport_distance_km || ''}
                    onChange={e => setNewComponent(p => ({ ...p, transport_distance_km: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">% Recyclé</Label>
                  <Input
                    type="number" min={0} max={100}
                    value={newComponent.recycled_percentage || ''}
                    onChange={e => setNewComponent(p => ({ ...p, recycled_percentage: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pays fournisseur</Label>
                  <Input
                    value={newComponent.supplier_country}
                    onChange={e => setNewComponent(p => ({ ...p, supplier_country: e.target.value }))}
                    placeholder="Ex: France"
                  />
                </div>
              </div>
              <Button onClick={handleAdd} disabled={!newComponent.component_name || addComponent.isPending} className="gap-2">
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </CardContent>
          </Card>

          {/* Liste des composants */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" /> Composants ({components.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : components.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Aucun composant. Ajoutez-en pour modéliser votre produit.</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Composant</th>
                        <th className="text-left p-3 font-medium">Matériau</th>
                        <th className="text-left p-3 font-medium">Procédé</th>
                        <th className="text-right p-3 font-medium">Quantité</th>
                        <th className="text-right p-3 font-medium">% Recyclé</th>
                        <th className="text-right p-3 font-medium">Transport</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {components.map(c => (
                        <tr key={c.id} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium">{c.component_name}</td>
                          <td className="p-3 text-xs">
                            {materials?.find(m => m.id === c.material_id)?.name ?? <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="p-3 text-xs">
                            {processes?.find(p => p.id === c.process_id)?.name ?? <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="p-3 text-right font-mono text-xs">{c.quantity} {c.unit}</td>
                          <td className="p-3 text-right font-mono text-xs">{c.recycled_percentage}%</td>
                          <td className="p-3 text-right text-xs">
                            {c.transport_distance_km ? `${c.transport_distance_km} km` : '—'}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => deleteComponent.mutate(c.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

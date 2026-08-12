import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BookOpen, Search, Flame, Droplets, Zap, FlaskConical } from 'lucide-react';
import { useACVMaterials, useACVProcesses, useACVTransportModes } from '../hooks/useACVLibrary';
import { MATERIAL_CATEGORIES, PROCESS_SECTORS } from '../types';

export const ACVBibliotheque: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [materialCategory, setMaterialCategory] = useState<string>('');
  const { data: materials, isLoading: matLoading } = useACVMaterials(materialCategory || undefined);
  const { data: processes, isLoading: procLoading } = useACVProcesses();
  const { data: transports, isLoading: transLoading } = useACVTransportModes();

  const filteredMaterials = (materials ?? []).filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredProcesses = (processes ?? []).filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredTransports = (transports ?? []).filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Bibliothèque ACV
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Base de données centralisée — Matériaux, procédés et transports
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="materials">
        <TabsList>
          <TabsTrigger value="materials">Matériaux ({filteredMaterials.length})</TabsTrigger>
          <TabsTrigger value="processes">Procédés ({filteredProcesses.length})</TabsTrigger>
          <TabsTrigger value="transport">Transport ({filteredTransports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="mt-4">
          <div className="flex gap-2 mb-4 flex-wrap">
            <Badge
              variant={materialCategory === '' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setMaterialCategory('')}
            >
              Tous
            </Badge>
            {MATERIAL_CATEGORIES.map(cat => (
              <Badge
                key={cat.value}
                variant={materialCategory === cat.value ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setMaterialCategory(cat.value)}
              >
                {cat.label}
              </Badge>
            ))}
          </div>
          <div className="grid gap-3">
            {matLoading ? (
              <p className="text-muted-foreground text-center py-8">Chargement...</p>
            ) : filteredMaterials.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucun matériau trouvé</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Matériau</th>
                      <th className="text-left p-3 font-medium">Catégorie</th>
                      <th className="text-right p-3 font-medium">
                        <span className="flex items-center justify-end gap-1"><Flame className="h-3 w-3" /> CO₂e</span>
                      </th>
                      <th className="text-right p-3 font-medium">
                        <span className="flex items-center justify-end gap-1"><Zap className="h-3 w-3" /> Énergie</span>
                      </th>
                      <th className="text-right p-3 font-medium">
                        <span className="flex items-center justify-end gap-1"><Droplets className="h-3 w-3" /> Eau</span>
                      </th>
                      <th className="text-right p-3 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaterials.map(m => (
                      <tr key={m.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">{m.name}</td>
                        <td className="p-3">
                          <Badge variant="secondary" className="text-xs">
                            {MATERIAL_CATEGORIES.find(c => c.value === m.category)?.label ?? m.category}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-mono text-xs">
                          {m.carbon_factor > 0 ? `${m.carbon_factor} kg/${m.unit}` : 
                           <span className="text-green-600">{m.carbon_factor} kg/{m.unit}</span>}
                        </td>
                        <td className="p-3 text-right font-mono text-xs">{m.energy_factor} MJ/{m.unit}</td>
                        <td className="p-3 text-right font-mono text-xs">{m.water_factor} m³/{m.unit}</td>
                        <td className="p-3 text-right text-xs text-muted-foreground">{m.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="processes" className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Procédé</th>
                  <th className="text-left p-3 font-medium">Secteur</th>
                  <th className="text-right p-3 font-medium">Émissions (kgCO₂e/{'{'}u{'}'})</th>
                  <th className="text-right p-3 font-medium">Énergie (MJ/{'{'}u{'}'})</th>
                  <th className="text-right p-3 font-medium">Eau (m³/{'{'}u{'}'})</th>
                </tr>
              </thead>
              <tbody>
                {(filteredProcesses ?? []).map(p => (
                  <tr key={p.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-xs">
                        {PROCESS_SECTORS.find(s => s.value === p.sector)?.label ?? p.sector}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-mono text-xs">{p.emission_factor}</td>
                    <td className="p-3 text-right font-mono text-xs">{p.energy_consumption}</td>
                    <td className="p-3 text-right font-mono text-xs">{p.water_consumption}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="transport" className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Mode</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-right p-3 font-medium">CO₂e (kg/t.km)</th>
                  <th className="text-right p-3 font-medium">Énergie (MJ/t.km)</th>
                  <th className="text-left p-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {(filteredTransports ?? []).map(t => (
                  <tr key={t.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{t.name}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-xs capitalize">{t.mode_type}</Badge>
                    </td>
                    <td className="p-3 text-right font-mono text-xs">{t.emission_factor_tkm}</td>
                    <td className="p-3 text-right font-mono text-xs">{t.energy_factor_tkm}</td>
                    <td className="p-3 text-xs text-muted-foreground">{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Layers, Check, X, Loader2 } from 'lucide-react';
import { useACVProjects } from '@/hooks/useACVProjects';
import { useACVLifecycle } from '../hooks/useACVLifecycle';
import { LIFECYCLE_MODULES } from '../types';

const GROUP_LABELS: Record<string, { label: string; color: string }> = {
  production: { label: 'Production (A1-A3)', color: 'bg-blue-100 text-blue-800' },
  construction: { label: 'Construction (A4-A5)', color: 'bg-cyan-100 text-cyan-800' },
  use: { label: 'Utilisation (B1-B7)', color: 'bg-green-100 text-green-800' },
  end_of_life: { label: 'Fin de vie (C1-C4)', color: 'bg-orange-100 text-orange-800' },
  beyond: { label: 'Au-delà (D)', color: 'bg-purple-100 text-purple-800' },
};

export const ACVCycleVie: React.FC = () => {
  const { projects } = useACVProjects();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const { modules, isLoading, initializeModules, updateModule } = useACVLifecycle(selectedProjectId || undefined);

  const handleInit = () => {
    if (selectedProjectId) {
      initializeModules.mutate(selectedProjectId);
    }
  };

  const grouped = LIFECYCLE_MODULES.reduce((acc, lm) => {
    if (!acc[lm.group]) acc[lm.group] = [];
    const existing = modules.find(m => m.module_code === lm.code);
    acc[lm.group].push({ ...lm, dbModule: existing });
    return acc;
  }, {} as Record<string, Array<typeof LIFECYCLE_MODULES[0] & { dbModule?: any }>>);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Layers className="h-6 w-6 text-primary" />
          Cycle de vie — EN 15804
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Définissez le périmètre du cycle de vie de votre produit (modules A1 à D)
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 flex items-end gap-4">
          <div className="flex-1">
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
          </div>
          {selectedProjectId && modules.length === 0 && (
            <Button onClick={handleInit} disabled={initializeModules.isPending}>
              Initialiser les modules
            </Button>
          )}
        </CardContent>
      </Card>

      {selectedProjectId && isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}

      {selectedProjectId && !isLoading && modules.length > 0 && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, items]) => {
            const groupInfo = GROUP_LABELS[group] ?? { label: group, color: 'bg-muted' };
            return (
              <Card key={group}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge className={groupInfo.color}>{groupInfo.label}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div
                        key={item.code}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          item.dbModule?.is_included ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-primary w-8">{item.code}</span>
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            {item.priority && (
                              <Badge variant="outline" className="text-[10px] mt-0.5">Prioritaire</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {item.dbModule?.is_included && item.dbModule?.carbon_impact > 0 && (
                            <span className="text-xs font-mono text-muted-foreground">
                              {item.dbModule.carbon_impact.toFixed(2)} kgCO₂e
                            </span>
                          )}
                          <Switch
                            checked={item.dbModule?.is_included ?? false}
                            onCheckedChange={checked => {
                              if (item.dbModule) {
                                updateModule.mutate({ id: item.dbModule.id, is_included: checked });
                              }
                            }}
                            disabled={!item.dbModule}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

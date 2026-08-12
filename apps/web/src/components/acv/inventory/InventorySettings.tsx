import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, Info, Settings2 } from 'lucide-react';
import { useACVInventory, type InventorySettings } from '@/hooks/useACVInventory';

const settingsSchema = z.object({
  period_year: z.number().min(2020).max(2030),
  location_default: z.string().min(1, 'La localisation est requise'),
  scope_boundaries: z.array(z.string()).min(1, 'Au moins une étape doit être sélectionnée'),
  allocation_rule: z.string(),
  cutoff_individual_threshold: z.number().min(0).max(1),
  cutoff_cumulative_threshold: z.number().min(0).max(1),
});

interface InventorySettingsProps {
  projectId: string;
  settings: InventorySettings | null;
}

export function InventorySettings({ projectId, settings }: InventorySettingsProps) {
  const { saveSettings } = useACVInventory(projectId);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      period_year: settings?.period_year || new Date().getFullYear(),
      location_default: settings?.location_default || 'Tunisie',
      scope_boundaries: settings?.scope_boundaries || ['A1-A3', 'A4', 'B', 'C'],
      allocation_rule: settings?.allocation_rule || 'economic',
      cutoff_individual_threshold: settings?.cutoff_individual_threshold || 0.01,
      cutoff_cumulative_threshold: settings?.cutoff_cumulative_threshold || 0.05,
    },
  });

  const scopeOptions = [
    { id: 'A1-A3', label: '🏭 Fabrication des matières premières', description: 'Extraction et production des matériaux' },
    { id: 'A4', label: '🚚 Transport jusqu\'au client', description: 'Livraison et distribution' },
    { id: 'A5', label: '🔧 Installation/Mise en œuvre', description: 'Assemblage et mise en service' },
    { id: 'B', label: '👥 Utilisation par le client', description: 'Phase d\'usage du produit' },
    { id: 'C', label: '♻️ Fin de vie (recyclage, déchets)', description: 'Recyclage, valorisation ou élimination' },
  ];

  const scopeOptionsAdvanced = [
    { id: 'A1-A3', label: 'A1-A3 Production' },
    { id: 'A4', label: 'A4 Transport' },
    { id: 'A5', label: 'A5 Mise en œuvre' },
    { id: 'B', label: 'B Utilisation' },
    { id: 'C', label: 'C Fin de vie' },
  ];

  const onSubmit = async (values: z.infer<typeof settingsSchema>) => {
    await saveSettings(values);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Paramètres de votre projet ACV</h2>
          <p className="text-muted-foreground">
            Définissez simplement votre étude. Les options complexes sont disponibles dans la section avancée.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Project Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations de base</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="period_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Année d'étude
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Année de référence pour les données collectées</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[2024, 2023, 2022, 2021, 2020].map(year => (
                              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location_default"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays principal</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le pays" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Tunisie">🇹🇳 Tunisie</SelectItem>
                            <SelectItem value="France">🇫🇷 France</SelectItem>
                            <SelectItem value="Allemagne">🇩🇪 Allemagne</SelectItem>
                            <SelectItem value="Espagne">🇪🇸 Espagne</SelectItem>
                            <SelectItem value="Italie">🇮🇹 Italie</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Localisation principale de votre activité
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Life Cycle Phases */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Étapes incluses dans l'analyse</CardTitle>
                <CardDescription>
                  Choisissez les étapes du cycle de vie que vous voulez analyser
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="scope_boundaries"
                  render={() => (
                    <FormItem>
                      <div className="space-y-3">
                        {scopeOptions.map((scope) => (
                          <FormField
                            key={scope.id}
                            control={form.control}
                            name="scope_boundaries"
                            render={({ field }) => {
                              return (
                                <div key={scope.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(scope.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, scope.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== scope.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <div className="space-y-1">
                                    <FormLabel className="text-sm font-medium cursor-pointer">
                                      {scope.label}
                                    </FormLabel>
                                    <p className="text-xs text-muted-foreground">
                                      {scope.description}
                                    </p>
                                  </div>
                                </div>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Simple Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Méthode de répartition
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Méthode pour partager les impacts entre plusieurs produits</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="allocation_rule"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="economic">💰 Économique (recommandé)</SelectItem>
                            <SelectItem value="mass">⚖️ Massique</SelectItem>
                            <SelectItem value="energy">⚡ Énergétique</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Par défaut, basée sur la valeur économique
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Tolérance sur les petits postes
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Évite de saisir des données insignifiantes qui changent peu les résultats</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="cutoff_individual_threshold"
                    render={({ field }) => (
                      <FormItem>
                        <Select 
                          onValueChange={(value) => {
                            if (value === "recommended") {
                              field.onChange(0.01);
                              form.setValue("cutoff_cumulative_threshold", 0.05);
                            } else if (value === "include_all") {
                              field.onChange(0);
                              form.setValue("cutoff_cumulative_threshold", 0);
                            }
                          }} 
                          defaultValue={field.value === 0.01 ? "recommended" : "include_all"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="recommended">✅ Ignorer les postes {"<"} 1% (recommandé)</SelectItem>
                            <SelectItem value="include_all">📋 Tout inclure</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Simplifie la saisie sans affecter les résultats
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" type="button" className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Options avancées (ISO)
                    <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>

              <Button type="submit" className="min-w-[200px]">
                Sauvegarder et continuer vers l'inventaire
              </Button>
            </div>

            {/* Advanced Settings */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleContent className="space-y-6">
                <Card className="border-orange-200 bg-orange-50/50">
                  <CardHeader>
                    <CardTitle className="text-lg text-orange-900 flex items-center gap-2">
                      <Settings2 className="h-5 w-5" />
                      Paramètres avancés ISO 14040/14044
                    </CardTitle>
                    <CardDescription className="text-orange-800">
                      Ces paramètres utilisent la terminologie ISO pour les experts en ACV
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Advanced Scope Boundaries */}
                    <FormField
                      control={form.control}
                      name="scope_boundaries"
                      render={() => (
                        <FormItem>
                          <FormLabel>Périmètre d'étude (ISO 14040)</FormLabel>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {scopeOptionsAdvanced.map((scope) => (
                              <FormField
                                key={scope.id}
                                control={form.control}
                                name="scope_boundaries"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={scope.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(scope.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, scope.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== scope.id
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm font-normal">
                                        {scope.label}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormDescription>
                            Sélectionnez les phases du cycle de vie selon la norme ISO
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Advanced Allocation */}
                    <FormField
                      control={form.control}
                      name="allocation_rule"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Règle d'allocation (ISO 14044)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="mass">Allocation massique</SelectItem>
                              <SelectItem value="economic">Allocation économique</SelectItem>
                              <SelectItem value="energy">Allocation énergétique</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Méthode de répartition des flux élémentaires
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Advanced Cutoffs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cutoff_individual_threshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Seuil de coupure individuel</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.001"
                                max="1"
                                {...field} 
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Seuil pour ignorer les flux individuels (0-1)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cutoff_cumulative_threshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Seuil de coupure cumulé</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.001"
                                max="1"
                                {...field} 
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Seuil cumulé pour la troncature (0-1)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </form>
        </Form>
      </div>
    </TooltipProvider>
  );
}
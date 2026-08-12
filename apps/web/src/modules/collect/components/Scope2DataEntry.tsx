/**
 * SCOPE 2 - ÉMISSIONS INDIRECTES LIÉES À L'ÉNERGIE
 * 
 * Saisie des émissions indirectes liées à la consommation d'énergie :
 * - Électricité achetée (réseau, autoproduction)
 * - Chaleur / vapeur / froid achetés
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { useOrganizationSites } from '@/hooks/useOrganizationSites';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityDataService } from '@/lib/activity-data/ActivityDataService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Zap, Flame, Snowflake, MapPin, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Catégories Scope 2
const SCOPE2_CATEGORIES = [
  {
    id: 'electricity',
    label: 'Électricité',
    icon: Zap,
    color: 'bg-yellow-500',
    subcategories: [
      { value: 'electricity_grid', label: 'Électricité réseau (standard)', defaultUnit: 'kWh', alternativeUnits: ['MWh'] },
      { value: 'electricity_green', label: 'Électricité verte (renouvelable)', defaultUnit: 'kWh', alternativeUnits: ['MWh'] },
      { value: 'electricity_self', label: 'Autoproduction consommée (solaire, éolien...)', defaultUnit: 'kWh', alternativeUnits: ['MWh'] },
    ],
  },
  {
    id: 'heat',
    label: 'Chaleur / Vapeur',
    icon: Flame,
    color: 'bg-orange-500',
    subcategories: [
      { value: 'district_heat', label: 'Chaleur réseau (chauffage urbain)', defaultUnit: 'kWh', alternativeUnits: ['MWh', 'GJ'] },
      { value: 'district_steam', label: 'Vapeur achetée', defaultUnit: 'kWh', alternativeUnits: ['MWh', 't'] },
    ],
  },
  {
    id: 'cooling',
    label: 'Froid',
    icon: Snowflake,
    color: 'bg-cyan-500',
    subcategories: [
      { value: 'district_cold', label: 'Froid réseau (climatisation urbaine)', defaultUnit: 'kWh', alternativeUnits: ['MWh', 'GJ'] },
    ],
  },
];

interface Scope2DataEntryProps {
  onSuccess?: () => void;
}

export const Scope2DataEntry: React.FC<Scope2DataEntryProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const { organizationId, referenceYear } = useOrganizationData();
  const { sites } = useOrganizationSites(organizationId || undefined);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string>('electricity');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    quantity: '',
    unit: '',
    description: '',
    period_start: `${referenceYear}-01-01`,
    period_end: `${referenceYear}-12-31`,
    data_quality: 'estimated' as 'real' | 'estimated' | 'default',
  });

  const currentCategory = SCOPE2_CATEGORIES.find(c => c.id === selectedCategory);
  const currentSubcategory = currentCategory?.subcategories.find(s => s.value === selectedSubcategory);

  // Mettre à jour l'unité par défaut
  useEffect(() => {
    if (currentSubcategory) {
      setFormData(prev => ({ ...prev, unit: currentSubcategory.defaultUnit }));
    }
  }, [currentSubcategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !organizationId || !selectedSubcategory) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une sous-catégorie',
        variant: 'destructive',
      });
      return;
    }

    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir une quantité valide',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await ActivityDataService.create({
        organization_id: organizationId,
        activity_type: 'energy',
        category: 'scope2',
        subcategory: selectedSubcategory,
        quantity,
        unit: formData.unit,
        period_start: formData.period_start,
        period_end: formData.period_end,
        data_quality: formData.data_quality as any,
        notes: formData.description || undefined,
        site_id: selectedSite === 'all' ? null : selectedSite,
        scope_hint: 2,
      });

      toast({
        title: 'Donnée enregistrée ✓',
        description: 'Émission Scope 2 ajoutée avec succès',
      });

      // Réinitialiser le formulaire
      setFormData({
        quantity: '',
        unit: currentSubcategory?.defaultUnit || '',
        description: '',
        period_start: formData.period_start,
        period_end: formData.period_end,
        data_quality: 'estimated',
      });
      setSelectedSubcategory('');

      // Rafraîchir les données et le dashboard
      queryClient.invalidateQueries({ queryKey: ['activity-data'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      window.dispatchEvent(new Event('activityDataUpdated'));

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving Scope 2 data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer les données',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertDescription>
          <strong>Scope 2 - Émissions indirectes liées à l'énergie</strong> : Émissions provenant de la production d'électricité, de chaleur, de vapeur ou de froid achetés et consommés par votre organisation.
        </AlertDescription>
      </Alert>

      {/* Note méthodologique */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Note :</strong> Les émissions amont liées à la production de cette énergie (extraction, raffinage, pertes réseau) seront calculées automatiquement dans le <strong>Scope 3 - Catégorie 3</strong>.
        </AlertDescription>
      </Alert>

      {/* Sélection de la catégorie */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">
          Catégories d'énergie indirecte ({SCOPE2_CATEGORIES.length})
        </h4>
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 gap-6">
          {SCOPE2_CATEGORIES.map(category => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setSelectedSubcategory('');
                }}
                className="flex flex-col items-center gap-2 group"
              >
                {/* Cercle avec icône */}
                <div className={`
                  w-16 h-16 rounded-full flex items-center justify-center transition-all
                  ${category.color} text-white
                  ${isSelected ? 'ring-4 ring-primary shadow-lg scale-110' : 'hover:scale-105 hover:shadow-md'}
                `}>
                  <Icon className="w-8 h-8" />
                </div>
                
                {/* Titre en dessous */}
                <p className={`
                  text-xs text-center line-clamp-2 max-w-[90px]
                  ${isSelected ? 'font-semibold text-primary' : 'text-muted-foreground group-hover:text-foreground'}
                `}>
                  {category.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Formulaire de saisie */}
      {currentCategory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {React.createElement(currentCategory.icon, { className: 'h-5 w-5' })}
              {currentCategory.label}
            </CardTitle>
            <CardDescription>
              Sélectionnez le type d'énergie et saisissez la quantité consommée
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type d'énergie */}
              <div className="space-y-2">
                <Label htmlFor="subcategory">Type d'énergie *</Label>
                <Select 
                  key={selectedCategory}
                  value={selectedSubcategory} 
                  onValueChange={setSelectedSubcategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentCategory.subcategories.map(sub => (
                      <SelectItem key={sub.value} value={sub.value}>
                        {sub.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSubcategory && currentSubcategory && (
                <>
                  {/* Quantité et unité */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantité consommée *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="any"
                        placeholder="0"
                        value={formData.quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unit">Unité</Label>
                      <Select value={formData.unit} onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={currentSubcategory.defaultUnit}>
                            {currentSubcategory.defaultUnit}
                          </SelectItem>
                          {currentSubcategory.alternativeUnits?.map(unit => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Site - Recommandé */}
                  <div className="space-y-2">
                    <Label htmlFor="site" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Site
                      <span className="text-xs text-amber-600 font-normal">(recommandé)</span>
                    </Label>
                    <Select value={selectedSite} onValueChange={setSelectedSite}>
                      <SelectTrigger className={selectedSite === 'all' ? 'border-amber-300 bg-amber-50' : ''}>
                        <SelectValue placeholder="Sélectionner un site" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-muted-foreground">Non spécifié (consolidé)</SelectItem>
                        {sites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedSite === 'all' && (
                      <p className="text-xs text-amber-600">
                        💡 Associer un site permet le filtrage par site dans le dashboard
                      </p>
                    )}
                  </div>

                  {/* Qualité des données */}
                  <div className="space-y-2">
                    <Label htmlFor="data_quality">Qualité des données</Label>
                    <Select 
                      value={formData.data_quality} 
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, data_quality: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="real">
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="text-xs">Mesurée</Badge>
                            <span className="text-xs text-muted-foreground">Facture, compteur</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="estimated">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">Estimée</Badge>
                            <span className="text-xs text-muted-foreground">Calcul, extrapolation</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="default">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Par défaut</Badge>
                            <span className="text-xs text-muted-foreground">Donnée manquante</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optionnelle)</Label>
                    <Textarea
                      id="description"
                      placeholder="Ex: Consommation électricité STEG, facture janvier 2025"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  {/* Période */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="period_start">Début de période</Label>
                      <Input
                        id="period_start"
                        type="date"
                        value={formData.period_start}
                        onChange={(e) => setFormData(prev => ({ ...prev, period_start: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="period_end">Fin de période</Label>
                      <Input
                        id="period_end"
                        type="date"
                        value={formData.period_end}
                        onChange={(e) => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Bouton d'envoi */}
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Enregistrer
                      </>
                    )}
                  </Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

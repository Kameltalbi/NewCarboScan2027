import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ActivityDataService } from '@/lib/activity-data/ActivityDataService';
import { toast } from 'sonner';
import { Loader2, Plane } from 'lucide-react';
import { useOrganizationSites } from '@/hooks/useOrganizationSites';

interface ActivityDataRow {
  id: string;
  category: string;
  activity_type: string;
  subcategory?: string | null;
  period_start: string;
  period_end: string;
  quantity: number;
  unit: string;
  data_quality: string;
  site_id?: string | null;
  notes?: string | null;
}

interface EditActivityDialogProps {
  activity: ActivityDataRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  organizationId: string;
}

// Types d'activité valides selon la base de données
const ACTIVITY_TYPES = [
  { value: 'energy', label: 'Énergie' },
  { value: 'transport', label: 'Transport' },
  { value: 'purchase', label: 'Achat' },
  { value: 'material', label: 'Matière' },
  { value: 'product_component', label: 'Composant produit' },
  { value: 'usage', label: 'Usage' },
  { value: 'waste', label: 'Déchet' },
  { value: 'service', label: 'Service' },
];

const CATEGORIES = [
  { value: 'scope1', label: 'Scope 1 - Émissions directes' },
  { value: 'scope2', label: 'Scope 2 - Énergie indirecte' },
  { value: 'scope3_upstream', label: 'Scope 3 Amont' },
  { value: 'scope3_downstream', label: 'Scope 3 Aval' },
];

const DATA_QUALITY_OPTIONS = [
  { value: 'real', label: 'Réel' },
  { value: 'estimated', label: 'Estimé' },
  { value: 'default', label: 'Par défaut' },
];

// Sous-catégories ÉNERGIE (structure audit-proof)
const ENERGY_SUBCATEGORIES = [
  // Combustibles fossiles – fixes
  { value: 'fossil_gas', label: 'Gaz naturel (fixe)' },
  { value: 'fossil_fuel_oil', label: 'Fioul (fixe)' },
  { value: 'fossil_diesel', label: 'Diesel (fixe)' },
  { value: 'fossil_coal', label: 'Charbon' },
  { value: 'fossil_coke', label: 'Coke' },
  { value: 'fossil_lpg', label: 'GPL (fixe)' },
  // Carburants – mobilité interne
  { value: 'fuel_diesel', label: 'Diesel (véhicules)' },
  { value: 'fuel_gasoline', label: 'Essence (véhicules)' },
  { value: 'fuel_lpg', label: 'GPL (véhicules)' },
  { value: 'fuel_cng', label: 'GNV (véhicules)' },
  // Électricité achetée
  { value: 'electricity_grid', label: 'Électricité réseau' },
  { value: 'electricity_self', label: 'Autoproduction consommée' },
  // Chaleur / vapeur / froid
  { value: 'district_heat', label: 'Chaleur réseau' },
  { value: 'district_steam', label: 'Vapeur achetée' },
  { value: 'district_cold', label: 'Froid réseau' },
  // Biomasse énergétique
  { value: 'biomass_wood', label: 'Bois' },
  { value: 'biomass_pellets', label: 'Pellets' },
  { value: 'biomass_residues', label: 'Résidus agricoles' },
  // Émissions fugitives
  { value: 'fugitive_refrigerant', label: 'Fuites fluides frigorigènes' },
  { value: 'fugitive_gas', label: 'Fuites de gaz' },
];

// Distances moyennes par type de vol (km, aller simple)
const FLIGHT_TYPES = [
  { value: 'short', label: 'Court-courrier (< 1 500 km)', km: 1000 },
  { value: 'medium', label: 'Moyen-courrier (1 500 – 4 000 km)', km: 2500 },
  { value: 'long', label: 'Long-courrier (> 4 000 km)', km: 8000 },
];

const FlightConverter: React.FC<{ onApply: (pkm: number) => void }> = ({ onApply }) => {
  const [open, setOpen] = useState(false);
  const [trips, setTrips] = useState<number>(1);
  const [roundTrip, setRoundTrip] = useState(true);
  const [flightType, setFlightType] = useState('short');
  const [passengers, setPassengers] = useState<number>(1);

  const km = FLIGHT_TYPES.find((f) => f.value === flightType)?.km || 1000;
  const pkm = Math.round(trips * (roundTrip ? 2 : 1) * km * passengers);

  return (
    <div className="col-span-2 rounded-lg border border-sky-200 bg-sky-50/50 p-3 space-y-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-sky-900 hover:text-sky-700"
      >
        <Plane className="h-4 w-4" />
        Convertisseur vols → passager.km
        <span className="text-xs text-sky-700">({open ? 'masquer' : 'ouvrir'})</span>
      </button>
      {open && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Les FE avion ADEME sont en kgCO₂e/passager.km. Saisis ci-dessous tes trajets pour obtenir la quantité correcte.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nombre de trajets</Label>
              <Input
                type="number"
                min={0}
                value={trips}
                onChange={(e) => setTrips(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Passagers / trajet</Label>
              <Input
                type="number"
                min={1}
                value={passengers}
                onChange={(e) => setPassengers(parseFloat(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Type de vol</Label>
              <Select value={flightType} onValueChange={setFlightType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FLIGHT_TYPES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label} — ~{f.km} km
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                id="roundtrip"
                checked={roundTrip}
                onChange={(e) => setRoundTrip(e.target.checked)}
              />
              <label htmlFor="roundtrip">Aller-retour (×2)</label>
            </div>
          </div>
          <div className="flex items-center justify-between bg-white rounded-md p-2 border border-sky-200">
            <div className="text-sm">
              <span className="text-muted-foreground">Résultat : </span>
              <span className="font-semibold text-sky-900">{pkm.toLocaleString('fr-FR')} passager.km</span>
            </div>
            <Button type="button" size="sm" onClick={() => onApply(pkm)}>
              Appliquer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const EditActivityDialog: React.FC<EditActivityDialogProps> = ({
  activity,
  open,
  onOpenChange,
  onSaved,
  organizationId,
}) => {
  const { sites } = useOrganizationSites();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    activity_type: '',
    category: '',
    subcategory: '',
    quantity: 0,
    unit: '',
    period_start: '',
    period_end: '',
    data_quality: 'estimated',
    site_id: '',
    notes: '',
  });

  // Initialiser le formulaire quand l'activité change
  useEffect(() => {
    if (activity) {
      setFormData({
        activity_type: activity.activity_type,
        category: activity.category,
        subcategory: activity.subcategory || '',
        quantity: activity.quantity,
        unit: activity.unit,
        period_start: activity.period_start,
        period_end: activity.period_end,
        data_quality: activity.data_quality,
        site_id: activity.site_id || '',
        notes: activity.notes || '',
      });
    }
  }, [activity]);

  const getSubcategoryOptions = () => {
    if (formData.activity_type === 'energy') return ENERGY_SUBCATEGORIES;
    return [];
  };

  const handleSave = async () => {
    if (!activity) return;

    setSaving(true);
    try {
      await ActivityDataService.update(activity.id, {
        activity_type: formData.activity_type as any,
        category: formData.category as any,
        subcategory: formData.subcategory || null,
        quantity: formData.quantity,
        unit: formData.unit,
        period_start: formData.period_start,
        period_end: formData.period_end,
        data_quality: formData.data_quality as any,
        site_id: formData.site_id || null,
        notes: formData.notes || null,
        organization_id: organizationId,
      });

      toast.success('Donnée mise à jour avec succès');
      
      // Invalider le cache dashboard pour mise à jour immédiate des calculs
      queryClient.invalidateQueries({ queryKey: ['activity-data'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      window.dispatchEvent(new Event('activityDataUpdated'));
      
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const subcategoryOptions = getSubcategoryOptions();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la donnée</DialogTitle>
          <DialogDescription>
            Modifiez les informations de cette donnée d'activité.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Type d'activité */}
            <div className="space-y-2">
              <Label>Type d'activité</Label>
              <Select
                value={formData.activity_type}
                onValueChange={(value) => setFormData({ ...formData, activity_type: value, subcategory: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Catégorie (Scope) */}
            <div className="space-y-2">
              <Label>Catégorie (Scope)</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Site - Positionné en haut pour visibilité */}
            <div className="space-y-2 col-span-2">
              <Label>Site <span className="text-xs text-muted-foreground">(recommandé pour le filtrage dashboard)</span></Label>
              <Select
                value={formData.site_id || '__none__'}
                onValueChange={(value) => setFormData({ ...formData, site_id: value === '__none__' ? '' : value })}
              >
                <SelectTrigger className={!formData.site_id ? 'border-amber-300 bg-amber-50' : ''}>
                  <SelectValue placeholder="Sélectionner un site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Non spécifié (consolidé)</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!formData.site_id && (
                <p className="text-xs text-amber-600">
                  💡 Associer un site permet le filtrage par site dans le dashboard
                </p>
              )}
            </div>

            {/* Sous-catégorie (conditionnelle) */}
            {subcategoryOptions.length > 0 && (
              <div className="space-y-2">
                <Label>Sous-catégorie</Label>
                <Select
                  value={formData.subcategory}
                  onValueChange={(value) => setFormData({ ...formData, subcategory: value === '__custom__' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategoryOptions.map((sub) => (
                      <SelectItem key={sub.value} value={sub.value}>
                        {sub.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">Autre (saisie libre)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Champ texte libre pour sous-catégorie personnalisée */}
            {formData.activity_type === 'energy' && (
              <div className="space-y-2">
                <Label>Sous-type (saisie libre)</Label>
                <Input
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  placeholder="Ex: Électricité verte, Biogaz..."
                />
              </div>
            )}


            {/* Quantité */}
            <div className="space-y-2">
              <Label>Quantité</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Unité */}
            <div className="space-y-2">
              <Label>Unité</Label>
              <Input
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="kWh, L, kg, km..."
              />
            </div>

            {/* Convertisseur vols → passager.km */}
            {formData.activity_type === 'transport' && (
              <FlightConverter
                onApply={(pkm) =>
                  setFormData((f) => ({ ...f, quantity: pkm, unit: 'passager.km' }))
                }
              />
            )}

            {/* Période début */}
            <div className="space-y-2">
              <Label>Début de période</Label>
              <Input
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
              />
            </div>

            {/* Période fin */}
            <div className="space-y-2">
              <Label>Fin de période</Label>
              <Input
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
              />
            </div>

            {/* Qualité des données */}
            <div className="space-y-2 col-span-2">
              <Label>Qualité des données</Label>
              <Select
                value={formData.data_quality}
                onValueChange={(value) => setFormData({ ...formData, data_quality: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_QUALITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2 col-span-2">
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informations complémentaires..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

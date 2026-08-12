/**
 * Dialog pour ajouter une sous-catégorie personnalisée et optionnellement
 * son facteur d'émission en une seule saisie (plus de double saisie / matching).
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrganizationSubcategories, CreateSubcategoryInput } from '@/hooks/useOrganizationSubcategories';
import { useOrganizationData } from '@/hooks/useOrganizationData';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { invalidateEmissionFactorCache } from '@/lib/calculators/BilanCarboneCalculator';
import { Loader2, Plus, Leaf } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

// Unités FE courantes pour Scope 3 (alignées avec les unités de données)
const FE_UNITS = [
  { value: 'kgCO2e/t', label: 'kgCO2e/t' },
  { value: 'kgCO2e/kg', label: 'kgCO2e/kg' },
  { value: 'kgCO2e/€', label: 'kgCO2e/€' },
  { value: 'kgCO2e/unité', label: 'kgCO2e/unité' },
  { value: 'tCO2e/unité', label: 'tCO2e/unité' },
  { value: 'kgCO2e/L', label: 'kgCO2e/L' },
];

interface CustomSubcategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
  onCreated?: (value: string) => void;
}

export const CustomSubcategoryDialog: React.FC<CustomSubcategoryDialogProps> = ({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  onCreated,
}) => {
  const { createSubcategory } = useOrganizationSubcategories(categoryId);
  const { organizationId } = useOrganizationData();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [label, setLabel] = useState('');
  const [defaultUnit, setDefaultUnit] = useState('t');
  const [inputType, setInputType] = useState<'mass' | 'monetary' | 'quantity'>('mass');
  const [description, setDescription] = useState('');

  const [defineFE, setDefineFE] = useState(true);
  const [feFactorName, setFeFactorName] = useState('');
  const [feValue, setFeValue] = useState('');
  const [feUnit, setFeUnit] = useState('kgCO2e/t');

  useEffect(() => {
    if (defineFE && label.trim()) setFeFactorName(label.trim());
  }, [defineFE, label]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    const input: CreateSubcategoryInput = {
      scope3_category_id: categoryId,
      label: label.trim(),
      default_unit: defaultUnit,
      input_type: inputType,
      description: description.trim() || undefined,
    };

    try {
      const result = await createSubcategory.mutateAsync(input);
      const subcategoryKey = result.value;

      if (defineFE && organizationId && user?.id) {
        const value = parseFloat(feValue.replace(',', '.'));
        if (isNaN(value) || value < 0) {
          toast.error('Veuillez saisir une valeur de facteur d\'émission valide');
          return;
        }
        const factorName = (feFactorName || label).trim();
        const notesWithMeta = `scope:3|category:${categoryId}|custom_subcategory:${subcategoryKey}`;

        const { error } = await supabase
          .from('organization_emission_factors')
          .insert({
            organization_id: organizationId,
            base_factor_id: null,
            custom_value: value,
            custom_unit: feUnit,
            custom_source: factorName,
            notes: notesWithMeta,
            subcategory_key: subcategoryKey,
            created_by: user.id,
          });

        if (error) throw error;
        invalidateEmissionFactorCache();
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        window.dispatchEvent(new CustomEvent('emissionFactorsUpdated'));
        toast.success('Produit et facteur d\'émission créés');
      }

      onCreated?.(subcategoryKey);
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la création');
    }
  };

  const resetForm = () => {
    setLabel('');
    setDescription('');
    setDefaultUnit('t');
    setInputType('mass');
    setDefineFE(true);
    setFeFactorName('');
    setFeValue('');
    setFeUnit('kgCO2e/t');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nouveau produit personnalisé
            </DialogTitle>
            <DialogDescription>
              Créez la sous-catégorie et le facteur d'émission en une seule fois. Plus besoin de ressaisir dans Paramètres.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="label">Nom du produit *</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Pièces moteur BMW M3"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unit">Unité par défaut</Label>
                <Select value={defaultUnit} onValueChange={setDefaultUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="t">Tonnes (t)</SelectItem>
                    <SelectItem value="kg">Kilogrammes (kg)</SelectItem>
                    <SelectItem value="TND">Dinars (TND)</SelectItem>
                    <SelectItem value="€">Euros (€)</SelectItem>
                    <SelectItem value="unités">Unités</SelectItem>
                    <SelectItem value="L">Litres (L)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="inputType">Type de saisie</Label>
                <Select value={inputType} onValueChange={(v) => setInputType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mass">Masse</SelectItem>
                    <SelectItem value="monetary">Monétaire</SelectItem>
                    <SelectItem value="quantity">Quantité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détails sur ce produit..."
                rows={2}
              />
            </div>

            {/* Facteur d'émission en une seule fois */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="defineFE"
                  checked={defineFE}
                  onCheckedChange={(v) => setDefineFE(v === true)}
                />
                <Label htmlFor="defineFE" className="flex items-center gap-1.5 cursor-pointer">
                  <Leaf className="w-4 h-4 text-emerald-600" />
                  Définir le facteur d'émission maintenant
                </Label>
              </div>
              {defineFE && (
                <div className="grid gap-3 pt-1">
                  <div className="grid gap-2">
                    <Label htmlFor="feFactorName">Nom du facteur</Label>
                    <Input
                      id="feFactorName"
                      value={feFactorName}
                      onChange={(e) => setFeFactorName(e.target.value)}
                      placeholder={label || 'Ex: Pièces moteur BMW M3'}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="feValue">Valeur (kgCO2e / unité)</Label>
                      <Input
                        id="feValue"
                        type="text"
                        inputMode="decimal"
                        value={feValue}
                        onChange={(e) => setFeValue(e.target.value)}
                        placeholder="Ex: 2.5"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="feUnit">Unité du FE</Label>
                      <Select value={feUnit} onValueChange={setFeUnit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FE_UNITS.map((u) => (
                            <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={!label.trim() || createSubcategory.isPending || (defineFE && !feValue.trim())}
            >
              {createSubcategory.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : defineFE && feValue.trim() ? (
                'Créer produit et facteur d\'émission'
              ) : (
                'Créer produit'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

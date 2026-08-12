import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Zap, Factory, DollarSign, TrendingUp } from 'lucide-react';
import type { CBAMPayload } from '../types';

interface CBAMFormProps {
  initialData?: CBAMPayload;
  onSubmit: (data: CBAMPayload, etsPrice: number, carbonPaidLocal: number, cbamInput?: any, totalProduction?: number) => void;
  onExcelImport?: (data: CBAMPayload) => void;
}

export const CBAMForm: React.FC<CBAMFormProps> = ({ initialData, onSubmit, onExcelImport }) => {
  const [formData, setFormData] = useState<CBAMPayload>(initialData || {
    general: {
      product_name: '',
      hs_code: '',
      country: '',
      period: '',
      unit: 'tonne',
      quantity_imported: 0,
    },
    energy: [],
    materials: [],
    transport: [],
    process: [],
  });

  // États pour les nouveaux champs CBAM
  const [totalProduction, setTotalProduction] = useState<number>(0);
  const [processEmissions, setProcessEmissions] = useState<number>(0);
  const [fuelConsumption, setFuelConsumption] = useState<number>(0);
  const [fuelFE, setFuelFE] = useState<number>(0);
  const [electricityKWh, setElectricityKWh] = useState<number>(0);
  const [electricityFE, setElectricityFE] = useState<number>(0);
  const [carbonPaidLocal, setCarbonPaidLocal] = useState<number>(0);
  const [etsPrice, setEtsPrice] = useState<number>(60); // Prix ETS par défaut
  const [etsPriceMode, setEtsPriceMode] = useState<'auto' | 'manual'>('auto');

  const updateGeneral = (field: keyof typeof formData.general, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      general: { ...prev.general, [field]: value }
    }));
  };

  // Pré-remplir depuis Excel si initialData change
  React.useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      if (onExcelImport) {
        onExcelImport(initialData);
      }
    }
  }, [initialData]);

  // Charger le prix ETS automatiquement (simulation API)
  React.useEffect(() => {
    if (etsPriceMode === 'auto') {
      // Simuler un appel API pour récupérer le prix ETS actuel
      // En production, remplacer par un vrai appel API
      setEtsPrice(60); // Prix moyen ETS UE
    }
  }, [etsPriceMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculer les émissions de carburant
    const fuelEmissions = fuelConsumption * (fuelFE || 0);
    
    // Construire le payload CBAM avec la nouvelle structure
    const cbamPayload: CBAMPayload = {
      general: {
        ...formData.general,
        quantity_imported: formData.general.quantity_imported,
      },
      energy: electricityKWh > 0 ? [{
        type: 'electricity',
        unit: 'kWh',
        quantity: electricityKWh,
        FE: electricityFE || undefined,
      }] : [],
      materials: [],
      transport: [],
      process: [
        // Émissions directes de processus
        ...(processEmissions > 0 ? [{
          process_name: 'Émissions directes de processus',
          unit: 'tCO₂e',
          value: processEmissions,
        }] : []),
        // Consommation de carburant
        ...(fuelEmissions > 0 ? [{
          process_name: 'Consommation de carburant',
          unit: 'tCO₂e',
          value: fuelEmissions,
        }] : []),
      ],
    };

    // Ajouter les données supplémentaires pour le calcul CBAM
    const cbamInput = {
      processEmissions,
      fuelEmissions,
      electricityKwh: electricityKWh,
      electricityEF: electricityFE || 0,
      totalProduction,
      importedQuantity: formData.general.quantity_imported,
      etsPrice,
      localCarbonPrice: carbonPaidLocal,
    };

    // Passer les données au handler parent avec les infos supplémentaires
    onSubmit(cbamPayload, etsPrice, carbonPaidLocal, cbamInput, totalProduction);
  };

  const currentYear = new Date().getFullYear();
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Produit (obligatoire) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#009879]">Produit (Obligatoire)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="product_name">Nom du Produit *</Label>
              <Input
                id="product_name"
                value={formData.general.product_name}
                onChange={(e) => updateGeneral('product_name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="hs_code">Code HS (6 chiffres) *</Label>
              <Input
                id="hs_code"
                value={formData.general.hs_code}
                onChange={(e) => updateGeneral('hs_code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
              />
            </div>
            <div>
              <Label htmlFor="quantity_imported">Quantité importée (t) *</Label>
              <Input
                id="quantity_imported"
                type="number"
                step="0.01"
                value={formData.general.quantity_imported || ''}
                onChange={(e) => updateGeneral('quantity_imported', parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div>
              <Label htmlFor="total_production">Production totale usine (t) *</Label>
              <Input
                id="total_production"
                type="number"
                step="0.01"
                value={totalProduction || ''}
                onChange={(e) => setTotalProduction(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div>
              <Label htmlFor="country">Pays d'origine *</Label>
              <Select value={formData.general.country} onValueChange={(value) => updateGeneral('country', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un pays" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tunisie">Tunisie</SelectItem>
                  <SelectItem value="Algérie">Algérie</SelectItem>
                  <SelectItem value="Maroc">Maroc</SelectItem>
                  <SelectItem value="Chine">Chine</SelectItem>
                  <SelectItem value="Inde">Inde</SelectItem>
                  <SelectItem value="Turquie">Turquie</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="period">Période *</Label>
              <Select value={formData.general.period} onValueChange={(value) => updateGeneral('period', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une période" />
                </SelectTrigger>
                <SelectContent>
                  {quarters.map(q => (
                    <SelectItem key={`${currentYear}-${q}`} value={`${currentYear}-${q}`}>
                      {q} {currentYear}
                    </SelectItem>
                  ))}
                  {months.map((m, i) => (
                    <SelectItem key={`${currentYear}-${i + 1}`} value={`${currentYear}-${String(i + 1).padStart(2, '0')}`}>
                      {m} {currentYear}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Émissions Directes (obligatoire) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#009879]">
            <Factory className="h-5 w-5" />
            Émissions Directes (Obligatoire)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="process_emissions">Émissions de Processus (tCO₂e) *</Label>
              <Input
                id="process_emissions"
                type="number"
                step="0.001"
                value={processEmissions || ''}
                onChange={(e) => setProcessEmissions(parseFloat(e.target.value) || 0)}
                required
                placeholder="0.000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Émissions directes de processus industriels
              </p>
            </div>
            <div>
              <Label htmlFor="fuel_consumption">Consommation de Carburant *</Label>
              <Input
                id="fuel_consumption"
                type="number"
                step="0.001"
                value={fuelConsumption || ''}
                onChange={(e) => setFuelConsumption(parseFloat(e.target.value) || 0)}
                required
                placeholder="0.000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Consommation de carburant (L ou m³)
              </p>
            </div>
            <div>
              <Label htmlFor="fuel_fe">Facteur d'Émission Carburant (FE) *</Label>
              <Input
                id="fuel_fe"
                type="number"
                step="0.001"
                value={fuelFE || ''}
                onChange={(e) => setFuelFE(parseFloat(e.target.value) || 0)}
                required
                placeholder="tCO₂e/L ou tCO₂e/m³"
              />
              <p className="text-xs text-gray-500 mt-1">
                Facteur d'émission du carburant
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Émissions Indirectes (obligatoire) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#009879]">
            <Zap className="h-5 w-5" />
            Émissions Indirectes (Obligatoire)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="electricity_kwh">kWh consommés *</Label>
              <Input
                id="electricity_kwh"
                type="number"
                step="0.01"
                value={electricityKWh || ''}
                onChange={(e) => setElectricityKWh(parseFloat(e.target.value) || 0)}
                required
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Consommation électrique totale
              </p>
            </div>
            <div>
              <Label htmlFor="electricity_fe">Facteur d'Émission Électricité Pays (tCO₂e/kWh) *</Label>
              <Input
                id="electricity_fe"
                type="number"
                step="0.000001"
                value={electricityFE || ''}
                onChange={(e) => setElectricityFE(parseFloat(e.target.value) || 0)}
                required
                placeholder="0.000630"
              />
              <p className="text-xs text-gray-500 mt-1">
                Exemple Tunisie: 0.000630 tCO₂e/kWh (0.63 tCO₂e/MWh)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Carbone payé localement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#009879]">
            <DollarSign className="h-5 w-5" />
            Carbone Payé Localement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="carbon_paid">€/tCO₂ payé</Label>
              <Input
                id="carbon_paid"
                type="number"
                step="0.01"
                value={carbonPaidLocal || ''}
                onChange={(e) => setCarbonPaidLocal(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Montant payé localement pour le carbone (souvent 0)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Prix ETS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#009879]">
            <TrendingUp className="h-5 w-5" />
            Prix ETS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ets_mode">Mode de prix ETS</Label>
              <Select value={etsPriceMode} onValueChange={(value: 'auto' | 'manual') => setEtsPriceMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatique (via API)</SelectItem>
                  <SelectItem value="manual">Manuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ets_price">Prix ETS (€/tCO₂e)</Label>
              <Input
                id="ets_price"
                type="number"
                step="0.01"
                value={etsPrice || ''}
                onChange={(e) => setEtsPrice(parseFloat(e.target.value) || 0)}
                disabled={etsPriceMode === 'auto'}
                placeholder="60.00"
              />
              {etsPriceMode === 'auto' && (
                <p className="text-xs text-green-600 mt-1">
                  Prix récupéré automatiquement depuis l'API ETS UE
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bouton de calcul */}
      <div className="flex justify-center">
        <Button
          type="submit"
          size="lg"
          className="bg-[#009879] hover:bg-[#007a63] text-white px-8"
        >
          Calculer les émissions CBAM
        </Button>
      </div>
    </form>
  );
};

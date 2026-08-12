// Étape 1: Informations produit

import React, { useState, useEffect } from 'react';
import { ProductCalculation, ProductCategory } from '../../types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowRight, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Step1Props {
  data: Partial<ProductCalculation>;
  onNext: (data: Partial<ProductCalculation>) => void;
  onPrevious: () => void;
}

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'produit', label: 'Produit manufacturé' },
  { value: 'service', label: 'Service' },
  { value: 'industriel', label: 'Produit industriel' },
  { value: 'alimentaire', label: 'Produit alimentaire' },
  { value: 'textile', label: 'Textile' },
  { value: 'electronique', label: 'Électronique' },
  { value: 'construction', label: 'Construction' },
  { value: 'ciment' as ProductCategory, label: 'Ciment (CBAM)' },
  { value: 'acier-fer' as ProductCategory, label: 'Fer & Acier (CBAM)' },
  { value: 'aluminium' as ProductCategory, label: 'Aluminium (CBAM)' },
  { value: 'engrais' as ProductCategory, label: 'Engrais (CBAM)' },
  { value: 'hydrogene' as ProductCategory, label: 'Hydrogène (CBAM)' },
  { value: 'electricite' as ProductCategory, label: 'Électricité (CBAM)' },
  { value: 'autre', label: 'Autre' },
];

export const Step1ProductInfo: React.FC<Step1Props> = ({ data, onNext }) => {
  const [name, setName] = useState(data.product?.name || '');
  const [category, setCategory] = useState<ProductCategory>(data.product?.category || 'produit');
  const [functionalUnit, setFunctionalUnit] = useState(data.product?.functionalUnit || '1 produit');
  const [description, setDescription] = useState(data.product?.description || '');

  const handleNext = () => {
    if (!name.trim()) {
      return;
    }

    onNext({
      product: {
        name: name.trim(),
        category,
        functionalUnit: functionalUnit.trim(),
        description: description.trim() || undefined,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Informations sur votre produit
        </h2>
        <p className="text-muted-foreground">
          Commençons par les informations de base sur votre produit
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Nom du produit <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: T-shirt en coton"
            className="max-w-md"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">
            Catégorie <span className="text-destructive">*</span>
          </Label>
          <Select value={category} onValueChange={(value) => setCategory(value as ProductCategory)}>
            <SelectTrigger id="category" className="max-w-md">
              <SelectValue />
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

        <div className="space-y-2">
          <Label htmlFor="functionalUnit">
            Unité fonctionnelle <span className="text-destructive">*</span>
          </Label>
          <Input
            id="functionalUnit"
            value={functionalUnit}
            onChange={(e) => setFunctionalUnit(e.target.value)}
            placeholder="Ex: 1 produit, 1 kg, 1 m²"
            className="max-w-md"
          />
          <p className="text-sm text-muted-foreground">
            L'unité pour laquelle vous calculez l'empreinte carbone
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optionnel)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez brièvement votre produit..."
            rows={3}
            className="max-w-md"
          />
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Vous pourrez modifier ces informations plus tard. L'unité fonctionnelle détermine 
          comment l'empreinte carbone sera exprimée (par produit, par kg, etc.).
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!name.trim() || !functionalUnit.trim()}>
          Continuer
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};


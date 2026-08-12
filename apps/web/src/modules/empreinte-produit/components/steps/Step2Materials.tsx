// Étape 2: Matières premières

import React, { useState } from 'react';
import { ProductCalculation, Material } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Plus, X, Search } from 'lucide-react';
import { MATERIALS_DATABASE, searchMaterials } from '../../data/materials';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Step2Props {
  data: Partial<ProductCalculation>;
  onNext: (data: Partial<ProductCalculation>) => void;
  onPrevious: () => void;
}

export const Step2Materials: React.FC<Step2Props> = ({ data, onNext, onPrevious }) => {
  const [materials, setMaterials] = useState<Material[]>(data.materials || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddMaterial = (materialData: typeof MATERIALS_DATABASE[0]) => {
    const newMaterial: Material = {
      id: `${Date.now()}`,
      name: materialData.name,
      quantity: 0,
      unit: materialData.unit,
      emissionFactor: materialData.emissionFactor,
      isEstimated: false,
    };
    setMaterials([...materials, newMaterial]);
    setIsDialogOpen(false);
    setSearchQuery('');
  };

  const handleUpdateMaterial = (id: string, updates: Partial<Material>) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleRemoveMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const filteredMaterials = searchQuery ? searchMaterials(searchQuery) : MATERIALS_DATABASE.slice(0, 20);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Matières premières et composants
        </h2>
        <p className="text-muted-foreground">
          Ajoutez les matériaux utilisés dans votre produit avec leurs quantités
        </p>
      </div>

      {/* Liste des matériaux ajoutés */}
      <div className="space-y-3">
        {materials.map((material) => (
          <Card key={material.id}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Matériau</Label>
                    <p className="font-medium">{material.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Quantité</Label>
                    <Input
                      type="number"
                      value={material.quantity || ''}
                      onChange={(e) => handleUpdateMaterial(material.id, { 
                        quantity: parseFloat(e.target.value) || 0 
                      })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Unité</Label>
                    <p className="text-sm">{material.unit}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Facteur</Label>
                    <p className="text-sm">{material.emissionFactor} kg CO₂e/{material.unit}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveMaterial(material.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ajouter un matériau */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un matériau
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Rechercher un matériau</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher un matériau..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredMaterials.map((mat) => (
                <Card
                  key={mat.id}
                  className="cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleAddMaterial(mat)}
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{mat.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {mat.emissionFactor} kg CO₂e/{mat.unit}
                        </p>
                        {mat.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{mat.notes}</p>
                        )}
                      </div>
                      <Badge variant="secondary">{mat.category}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
        <Button variant="outline" onClick={onPrevious} className="w-full sm:w-auto">
          Précédent
        </Button>
        <Button onClick={() => onNext({ materials })} className="w-full sm:w-auto">
          Continuer
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};


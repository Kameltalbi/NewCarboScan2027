import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { 
  FileSpreadsheet, 
  FileText, 
  PenLine, 
  Users,
  Upload,
  Download,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExcelImport?: (file: File) => void;
  onOcrImport?: (file: File) => void;
  onManualEntry?: (data: any) => void;
  onSupplierSubmit?: (data: any) => void;
}

export const AddDataModal: React.FC<AddDataModalProps> = ({
  open,
  onOpenChange,
  onExcelImport,
  onOcrImport,
  onManualEntry,
  onSupplierSubmit,
}) => {
  const [activeTab, setActiveTab] = useState('excel');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent, type: 'excel' | 'ocr') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (type === 'excel') {
        onExcelImport?.(file);
      } else {
        onOcrImport?.(file);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Ajouter des données</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
            <TabsTrigger value="excel" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Excel</span>
            </TabsTrigger>
            <TabsTrigger value="ocr" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">PDF/OCR</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <PenLine className="h-4 w-4" />
              <span className="hidden sm:inline">Manuel</span>
            </TabsTrigger>
            <TabsTrigger value="supplier" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Fournisseur</span>
            </TabsTrigger>
          </TabsList>

          {/* Excel Import Tab */}
          <TabsContent value="excel" className="mt-6 space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={(e) => handleDrop(e, 'excel')}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
              <h3 className="font-semibold mb-2">Importer un fichier Excel</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Glissez-déposez votre fichier .xlsx ou .csv ici
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Parcourir
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          onExcelImport?.(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </Button>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger le modèle
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* OCR Import Tab */}
          <TabsContent value="ocr" className="mt-6 space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={(e) => handleDrop(e, 'ocr')}
            >
              <div className="relative inline-block">
                <FileText className="h-12 w-12 mx-auto mb-4 text-violet-500" />
                <Sparkles className="h-5 w-5 absolute -top-1 -right-1 text-violet-400" />
              </div>
              <h3 className="font-semibold mb-2">Importer un PDF avec OCR IA</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Factures, relevés, rapports... L'IA extraira automatiquement les données
              </p>
              <Button variant="outline" asChild>
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Sélectionner un PDF
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        onOcrImport?.(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </Button>
            </div>
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual" className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="energy">Énergie</SelectItem>
                    <SelectItem value="fuel">Carburants</SelectItem>
                    <SelectItem value="water">Eau</SelectItem>
                    <SelectItem value="waste">Déchets</SelectItem>
                    <SelectItem value="purchases">Achats</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="travel">Déplacements</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type de donnée</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consumption">Consommation</SelectItem>
                    <SelectItem value="invoice">Facture</SelectItem>
                    <SelectItem value="meter">Relevé compteur</SelectItem>
                    <SelectItem value="estimate">Estimation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valeur</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Unité</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kwh">kWh</SelectItem>
                    <SelectItem value="mwh">MWh</SelectItem>
                    <SelectItem value="l">Litres</SelectItem>
                    <SelectItem value="m3">m³</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="t">Tonnes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea placeholder="Informations complémentaires..." />
            </div>

            <Button className="w-full" onClick={() => onManualEntry?.({})}>
              <PenLine className="h-4 w-4 mr-2" />
              Enregistrer la donnée
            </Button>
          </TabsContent>

          {/* Supplier Submission Tab */}
          <TabsContent value="supplier" className="mt-6 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-rose-500" />
              <h3 className="font-semibold mb-2">Demander des données à un fournisseur</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Envoyez une demande de collecte de données à vos fournisseurs
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email du fournisseur</Label>
                <Input type="email" placeholder="fournisseur@exemple.com" />
              </div>
              <div className="space-y-2">
                <Label>Nom de l'entreprise</Label>
                <Input placeholder="Nom du fournisseur" />
              </div>
              <div className="space-y-2">
                <Label>Catégories demandées</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner les catégories..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les catégories</SelectItem>
                    <SelectItem value="energy">Énergie uniquement</SelectItem>
                    <SelectItem value="transport">Transport uniquement</SelectItem>
                    <SelectItem value="materials">Matériaux uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Message personnalisé (optionnel)</Label>
                <Textarea placeholder="Message pour le fournisseur..." />
              </div>
            </div>

            <Button className="w-full" onClick={() => onSupplierSubmit?.({})}>
              <Users className="h-4 w-4 mr-2" />
              Envoyer la demande
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

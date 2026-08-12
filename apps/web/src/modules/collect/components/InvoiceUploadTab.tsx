// Composant pour le téléversement de factures avec OCR automatique
// Upload PDF + extraction automatique via OCR + formulaire pour validation/correction

import React, { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { ActivityDataService } from '@/lib/activity-data/ActivityDataService';
import { ActivityDataInput, ActivityType, ActivityCategory, DataQuality } from '@/lib/activity-data/types';
import { OCRService, OCRResult } from '@/lib/ai/ocrService';
import { supabase } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Receipt, CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

type InvoiceType = 'facture_electricite' | 'facture_gaz' | 'facture_fuel' | 'facture_carburant';

export const InvoiceUploadTab: React.FC = () => {
  const { user } = useAuth();
  const { organizationId } = useOrganizationId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('facture_electricite');
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  
  // Formulaire de données
  const [formData, setFormData] = useState({
    period_start: '',
    period_end: '',
    consumption: '',
    unit: 'kWh',
    amount: '',
    supplier: '',
  });

  const handleDownloadTemplate = () => {
    toast({
      title: 'Modèle disponible',
      description: 'Téléversez votre facture PDF et renseignez les informations ci-dessous.',
    });
  };

  const handleFile = async (file: File) => {
    if (!file.type.includes('pdf')) {
      toast({
        title: 'Format non supporté',
        description: 'Veuillez sélectionner un fichier PDF',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10 MB
      toast({
        title: 'Fichier trop volumineux',
        description: 'Taille maximale : 10 MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadedFile(file);
    setIsUploading(true);

    try {
      // Upload vers Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('collect-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('collect-files')
        .getPublicUrl(fileName);

      setFileUrl(urlData.publicUrl);

      // Lancer l'extraction OCR automatique directement depuis Storage.
      // (Plus robuste : ne dépend pas de l'insertion dans la table collect_files)
      setIsExtracting(true);
      try {
        const ocr = await OCRService.extractFromStorage({
          filePath: fileName,
          bucket: 'collect-files',
          category: invoiceType,
        });
        setOcrResult(ocr);

        if (ocr.success && ocr.extractedFields) {
          const fields = ocr.extractedFields;

          const quantityField = getQuantityFieldKey(invoiceType);
          if (fields[quantityField]) {
            setFormData(prev => ({
              ...prev,
              consumption: fields[quantityField].value.toString(),
            }));
          }

          if (fields.fournisseur) {
            setFormData(prev => ({
              ...prev,
              supplier: fields.fournisseur.value.toString(),
            }));
          }

          if (fields.montant) {
            setFormData(prev => ({
              ...prev,
              amount: fields.montant.value.toString(),
            }));
          }

          if (fields.periode) {
            const period = parsePeriod(fields.periode.value.toString());
            if (period.start) setFormData(prev => ({ ...prev, period_start: period.start }));
            if (period.end) setFormData(prev => ({ ...prev, period_end: period.end }));
          }

          toast({
            title: 'Extraction réussie',
            description: `Données extraites avec ${Math.round(ocr.confidence * 100)}% de confiance. Vérifiez et corrigez si nécessaire.`,
          });
        } else {
          toast({
            title: 'Extraction partielle',
            description: 'Certaines données n\'ont pas pu être extraites. Veuillez les renseigner manuellement.',
            variant: 'default',
          });
        }
      } catch (ocrError: any) {
        console.error('Erreur OCR:', ocrError);
        toast({
          title: 'Extraction non disponible',
          description: 'L\'extraction automatique n\'a pas fonctionné. Veuillez renseigner les informations manuellement.',
          variant: 'default',
        });
      } finally {
        setIsExtracting(false);
      }

      toast({
        title: 'Facture téléversée',
        description: 'Votre facture a été téléversée avec succès.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur lors du téléversement',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Fonctions utilitaires pour l'OCR
  const getQuantityFieldKey = (type: InvoiceType): string => {
    switch (type) {
      case 'facture_electricite': return 'electricite_quantite';
      case 'facture_gaz': return 'gaz_naturel_quantite';
      case 'facture_fuel': return 'fuel_quantite';
      case 'facture_carburant': return 'carburant_quantite';
      default: return 'quantite';
    }
  };

  const parsePeriod = (periodString: string): { start?: string; end?: string } => {
    // Essayer de parser différentes formats de période
    // Ex: "01/01/2024 - 31/01/2024" ou "Janvier 2024"
    const dateRangeMatch = periodString.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\s*[-à]\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/);
    if (dateRangeMatch) {
      return {
        start: formatDateForInput(dateRangeMatch[1]),
        end: formatDateForInput(dateRangeMatch[2]),
      };
    }
    return {};
  };

  const formatDateForInput = (dateString: string): string => {
    // Convertir "DD/MM/YYYY" en "YYYY-MM-DD"
    const parts = dateString.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const getActivityTypeAndCategory = (type: InvoiceType): { activityType: ActivityType; category: ActivityCategory } => {
    switch (type) {
      case 'facture_electricite':
        return { activityType: 'energy', category: 'scope2' };
      case 'facture_gaz':
        return { activityType: 'energy', category: 'scope2' };
      case 'facture_fuel':
        return { activityType: 'fuel', category: 'scope1' };
      case 'facture_carburant':
        return { activityType: 'fuel', category: 'scope1' };
      default:
        return { activityType: 'energy', category: 'scope2' };
    }
  };

  const getDefaultUnit = (type: InvoiceType): string => {
    switch (type) {
      case 'facture_electricite':
        return 'kWh';
      case 'facture_gaz':
        return 'm³';
      case 'facture_fuel':
        return 'L';
      case 'facture_carburant':
        return 'L';
      default:
        return 'kWh';
    }
  };

  const handleSave = async () => {
    if (!organizationId || !user) {
      toast({
        title: 'Erreur',
        description: 'Organisation ou utilisateur non trouvé',
        variant: 'destructive',
      });
      return;
    }

    if (!uploadedFile || !fileUrl) {
      toast({
        title: 'Erreur',
        description: 'Veuillez téléverser une facture',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.period_start || !formData.period_end || !formData.consumption) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { activityType, category } = getActivityTypeAndCategory(invoiceType);

      // Créer l'entrée dans activity_data
      await ActivityDataService.create({
        organization_id: organizationId,
        activity_type: activityType,
        category: category,
        quantity: parseFloat(formData.consumption) || 0,
        unit: formData.unit,
        period_start: formData.period_start,
        period_end: formData.period_end,
        data_quality: 'real' as DataQuality, // Facture = donnée réelle
        notes: `Facture ${invoiceType}. Fournisseur: ${formData.supplier || 'Non spécifié'}. Montant: ${formData.amount || 'Non spécifié'} €. Fichier: ${fileUrl}`,
      } as ActivityDataInput);

      toast({
        title: 'Données enregistrées',
        description: 'Votre facture et les données associées ont été enregistrées avec succès.',
      });

      // Invalider le cache dashboard
      queryClient.invalidateQueries({ queryKey: ['activity-data'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      window.dispatchEvent(new Event('activityDataUpdated'));

      // Réinitialiser
      setUploadedFile(null);
      setFileUrl(null);
      setFormData({
        period_start: '',
        period_end: '',
        consumption: '',
        unit: getDefaultUnit(invoiceType),
        amount: '',
        supplier: '',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Téléverser des factures</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Téléversez vos factures (électricité, gaz, carburants) comme preuve.
            Vous devrez renseigner manuellement les informations clés.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sélection du type de facture */}
          <div className="space-y-2">
            <Label htmlFor="invoice_type">Type de facture *</Label>
            <Select value={invoiceType} onValueChange={(value) => {
              setInvoiceType(value as InvoiceType);
              setFormData({ ...formData, unit: getDefaultUnit(value as InvoiceType) });
            }}>
              <SelectTrigger id="invoice_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="facture_electricite">Facture d'électricité</SelectItem>
                <SelectItem value="facture_gaz">Facture de gaz</SelectItem>
                <SelectItem value="facture_fuel">Facture de fioul</SelectItem>
                <SelectItem value="facture_carburant">Facture de carburant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Upload de fichier */}
          {!uploadedFile && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Glissez-déposez votre facture PDF ici ou
              </p>
              <Button variant="outline" asChild>
                <label className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Sélectionner un fichier
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileInput}
                    disabled={isUploading}
                  />
                </label>
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Format accepté : PDF (max 10 MB)
              </p>
            </div>
          )}

          {isUploading && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Téléversement en cours...</p>
            </div>
          )}

          {isExtracting && (
            <div className="text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Extraction des données en cours...</p>
              <p className="text-xs text-muted-foreground">Analyse de la facture avec l'IA</p>
            </div>
          )}

          {uploadedFile && fileUrl && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <strong>Facture téléversée :</strong> {uploadedFile.name}
                    {ocrResult && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant={ocrResult.success ? 'default' : 'secondary'}>
                          <Sparkles className="w-3 h-3 mr-1" />
                          {ocrResult.success 
                            ? `Extraction: ${Math.round(ocrResult.confidence * 100)}% confiance`
                            : 'Extraction échouée'}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => {
                      setUploadedFile(null);
                      setFileUrl(null);
                      setFileId(null);
                      setOcrResult(null);
                      setFormData({
                        period_start: '',
                        period_end: '',
                        consumption: '',
                        unit: getDefaultUnit(invoiceType),
                        amount: '',
                        supplier: '',
                      });
                    }}
                  >
                    Changer
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Formulaire de données */}
          {uploadedFile && fileUrl && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Informations de la facture</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period_start">Période de facturation début *</Label>
                  <Input
                    id="period_start"
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period_end">Période de facturation fin *</Label>
                  <Input
                    id="period_end"
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consumption">Consommation *</Label>
                  <Input
                    id="consumption"
                    type="number"
                    step="0.01"
                    value={formData.consumption}
                    onChange={(e) => setFormData({ ...formData, consumption: e.target.value })}
                    placeholder="1000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unité *</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="kWh, m³, L..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Montant (optionnel)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="1500.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier">Fournisseur (optionnel)</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="EDF, Engie..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadedFile(null);
                    setFileUrl(null);
                    setFormData({
                      period_start: '',
                      period_end: '',
                      consumption: '',
                      unit: getDefaultUnit(invoiceType),
                      amount: '',
                      supplier: '',
                    });
                  }}
                >
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


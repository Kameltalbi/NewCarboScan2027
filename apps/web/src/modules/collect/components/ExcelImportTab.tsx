// Composant pour l'import Excel/CSV
// Convertit les données importées en activity_data

import React, { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { ActivityDataService } from '@/lib/activity-data/ActivityDataService';
import { ActivityDataInput, ActivityType, ActivityCategory, DataQuality } from '@/lib/activity-data/types';
import { ExcelImportService, ExcelImportResult } from '@/lib/ai/excelImportService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Download, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { validateSpreadsheetFile } from '@/lib/spreadsheetValidate';

export const ExcelImportTab: React.FC = () => {
  const { organizationId } = useOrganizationId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ExcelImportResult | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<string>('general');

  const handleDownloadTemplate = async (templateType?: string) => {
    try {
      if (templateType && templateType !== 'general') {
        // Télécharger un template spécialisé
        await ExcelImportService.generateCategoryTemplate(templateType);
      } else {
        // Télécharger le template général
        await ExcelImportService.downloadTemplate();
      }
      toast({
        title: 'Modèle téléchargé',
        description: 'Le modèle Excel a été téléchargé avec succès.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors du téléchargement du modèle',
        variant: 'destructive',
      });
    }
  };

  const handleFile = async (file: File) => {
    const guard = await validateSpreadsheetFile(file);
    if (!guard.ok) {
      toast({
        title: 'Fichier refusé',
        description: guard.error,
        variant: 'destructive',
      });
      return;
    }

    setIsParsing(true);
    setFileName(file.name);

    try {
      const result = await ExcelImportService.parseFile(file);
      setPreviewData(result);
      
      if (result.errors.length > 0) {
        toast({
          title: 'Fichier parsé avec erreurs',
          description: `${result.imported_count} données détectées, ${result.errors.length} erreur(s)`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Fichier parsé avec succès',
          description: `${result.imported_count} données détectées`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erreur lors du parsing',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
      setFileName(null);
      setPreviewData(null);
    } finally {
      setIsParsing(false);
    }
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

  const convertToActivityData = async () => {
    if (!previewData || !organizationId) return;

    setIsImporting(true);
    try {
      const activityDataInputs: ActivityDataInput[] = [];
      const currentYear = new Date().getFullYear();
      const defaultPeriodStart = `${currentYear}-01-01`;
      const defaultPeriodEnd = `${currentYear}-12-31`;

      // Convertir les réponses en activity_data avec mapping amélioré
      for (const response of previewData.responses) {
        // Mapper question_key vers activity_type et category
        const mapping = mapQuestionKeyToActivityData(response.question_key);
        
        // Utiliser les périodes extraites du fichier si disponibles
        let periodStart = defaultPeriodStart;
        let periodEnd = defaultPeriodEnd;
        
        // Les périodes peuvent être dans response.period_start/period_end si détectées
        if ((response as any).period_start) {
          periodStart = (response as any).period_start;
        }
        if ((response as any).period_end) {
          periodEnd = (response as any).period_end;
        }
        
        activityDataInputs.push({
          organization_id: organizationId,
          activity_type: mapping.activityType,
          category: mapping.category,
          subcategory: mapping.subcategory,
          quantity: typeof response.value === 'number' ? response.value : parseFloat(String(response.value)) || 0,
          unit: response.unit || mapping.defaultUnit || 'unit',
          period_start: periodStart,
          period_end: periodEnd,
          data_quality: 'real' as DataQuality, // Import Excel = données réelles
          confidence_score: Math.round(response.confidence * 100),
          scope_hint: mapping.scopeHint,
          notes: `Importé depuis ${fileName} - Ligne ${response.source_row || 'N/A'}`,
        });
      }

      if (activityDataInputs.length > 0) {
        await ActivityDataService.bulkCreate(activityDataInputs);
        
        toast({
          title: 'Import réussi',
          description: `${activityDataInputs.length} données importées avec succès dans la base centrale.`,
        });
        
        // Invalider le cache dashboard
        queryClient.invalidateQueries({ queryKey: ['activity-data'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        window.dispatchEvent(new Event('activityDataUpdated'));
        
        // Réinitialiser
        setPreviewData(null);
        setFileName(null);
      }
    } catch (error: any) {
      toast({
        title: 'Erreur lors de l\'import',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Importer des données</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Importez vos données depuis un fichier Excel ou CSV
              </p>
            </div>
            <div className="flex gap-2">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Type de modèle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Modèle général</SelectItem>
                  <SelectItem value="energy">Énergie</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="purchases">Achats</SelectItem>
                  <SelectItem value="waste">Déchets</SelectItem>
                  <SelectItem value="water">Eau</SelectItem>
                  <SelectItem value="buildings">Bâtiments</SelectItem>
                  <SelectItem value="refrigerants">Fluides frigorigènes</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => handleDownloadTemplate(selectedTemplate)}>
                <Download className="w-4 h-4 mr-2" />
                Télécharger le modèle
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Glissez-déposez votre fichier ici ou
            </p>
            <Button variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Sélectionner un fichier
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileInput}
                  disabled={isParsing}
                />
              </label>
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Formats acceptés : .xlsx, .xls, .csv
            </p>
          </div>

          {isParsing && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">Analyse du fichier en cours...</p>
            </div>
          )}

          {fileName && !isParsing && (
            <div className="mt-4">
              <p className="text-sm font-medium">Fichier sélectionné : {fileName}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prévisualisation */}
      {previewData && (
        <Card>
          <CardHeader>
            <CardTitle>Prévisualisation</CardTitle>
            <p className="text-sm text-muted-foreground">
              {previewData.imported_count} données détectées
              {previewData.errors.length > 0 && ` • ${previewData.errors.length} erreur(s)`}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewData.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{previewData.errors.length} erreur(s) détectée(s) :</strong>
                  <ul className="list-disc list-inside mt-2">
                    {previewData.errors.slice(0, 5).map((error, index) => (
                      <li key={index} className="text-sm">
                        Ligne {error.row}, colonne {error.column} : {error.error}
                      </li>
                    ))}
                    {previewData.errors.length > 5 && (
                      <li className="text-sm">... et {previewData.errors.length - 5} autre(s)</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {previewData.responses.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Données à importer :</p>
                <div className="border rounded-lg max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Valeur</TableHead>
                        <TableHead>Unité</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.responses.slice(0, 10).map((response, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-sm">{response.question_key}</TableCell>
                          <TableCell className="text-sm">{response.value}</TableCell>
                          <TableCell className="text-sm">{response.unit || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {previewData.responses.length > 10 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                            ... et {previewData.responses.length - 10} autre(s) donnée(s)
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPreviewData(null);
                  setFileName(null);
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={convertToActivityData}
                disabled={isImporting || previewData.responses.length === 0}
              >
                {isImporting ? 'Import en cours...' : `Importer ${previewData.responses.length} données`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Fonctions de mapping améliorées
interface ActivityDataMapping {
  activityType: ActivityType;
  category: ActivityCategory;
  subcategory?: string;
  defaultUnit?: string;
  scopeHint?: 1 | 2 | 3;
}

function mapQuestionKeyToActivityData(questionKey: string): ActivityDataMapping {
  const key = questionKey.toLowerCase();
  
  // === ÉMISSIONS DIRECTES (SCOPE 1) ===
  if (key.includes('scope1') || key.includes('scope_1') || key.includes('emissions_scope1')) {
    return {
      activityType: 'fuel',
      category: 'scope1',
      subcategory: 'emissions_directes',
      defaultUnit: 'tCO2e',
      scopeHint: 1,
    };
  }
  
  // === ÉMISSIONS INDIRECTES ÉNERGIE (SCOPE 2) ===
  if (key.includes('scope2') || key.includes('scope_2') || key.includes('emissions_scope2')) {
    return {
      activityType: 'energy',
      category: 'scope2',
      subcategory: 'emissions_energie',
      defaultUnit: 'tCO2e',
      scopeHint: 2,
    };
  }
  
  // === ÉMISSIONS SCOPE 3 ===
  if (key.includes('scope3') || key.includes('scope_3') || key.includes('emissions_scope3')) {
    return {
      activityType: 'purchase',
      category: 'scope3_upstream',
      subcategory: 'emissions_amont',
      defaultUnit: 'tCO2e',
      scopeHint: 3,
    };
  }
  
  // === ÉMISSIONS CO2 GÉNÉRIQUES ===
  if (key.includes('emissions_co2') || key.includes('co2') || key.includes('carbone') || 
      key.includes('ges') || key.includes('ghg') || key.includes('footprint') || 
      key.includes('empreinte') || key.includes('bilan')) {
    return {
      activityType: 'energy',
      category: 'scope2',
      subcategory: 'emissions_totales',
      defaultUnit: 'tCO2e',
      scopeHint: null,
    };
  }
  
  // === ÉLECTRICITÉ ===
  if (key.includes('electricite') || key.includes('electricity') || key.includes('steg') || key.includes('kwh') || key.includes('mwh')) {
    return {
      activityType: 'energy',
      category: 'scope2',
      subcategory: 'electricite',
      defaultUnit: 'kWh',
      scopeHint: 2,
    };
  }
  
  // === GAZ NATUREL ===
  if (key.includes('gaz_naturel') || key.includes('gaz') || key.includes('natural_gas') || key.includes('thermie')) {
    return {
      activityType: 'energy',
      category: 'scope2',
      subcategory: 'gaz_naturel',
      defaultUnit: 'm³',
      scopeHint: 2,
    };
  }
  
  // === FIOUL / FUEL ===
  if (key.includes('fioul') || key.includes('mazout')) {
    return {
      activityType: 'fuel',
      category: 'scope1',
      subcategory: 'fioul',
      defaultUnit: 'L',
      scopeHint: 1,
    };
  }
  
  // === CARBURANT / DIESEL / ESSENCE ===
  if (key.includes('carburant') || key.includes('essence') || key.includes('diesel') || 
      key.includes('gasoil') || key.includes('gazole') || key.includes('gpl')) {
    return {
      activityType: 'fuel',
      category: 'scope1',
      subcategory: 'carburant',
      defaultUnit: 'L',
      scopeHint: 1,
    };
  }
  
  // === COMBUSTION / CHAUDIÈRE ===
  if (key.includes('combustion') || key.includes('chaudiere') || key.includes('chauffage')) {
    return {
      activityType: 'fuel',
      category: 'scope1',
      subcategory: 'combustion',
      defaultUnit: 'kWh',
      scopeHint: 1,
    };
  }
  
  // === CLIMATISATION / RÉFRIGÉRANTS ===
  if (key.includes('climatisation') || key.includes('froid') || key.includes('refrigerant') || key.includes('frigorigene')) {
    return {
      activityType: 'fuel',
      category: 'scope1',
      subcategory: 'climatisation',
      defaultUnit: 'kg',
      scopeHint: 1,
    };
  }
  
  // === TRANSPORT ===
  if (key.includes('transport') || key.includes('km') || key.includes('kilometrage') || 
      key.includes('distance') || key.includes('flotte') || key.includes('fleet') || key.includes('deplacement')) {
    return {
      activityType: 'transport',
      category: 'scope3_upstream',
      subcategory: 'transport_routier',
      defaultUnit: 'km',
      scopeHint: 3,
    };
  }
  
  // === VOYAGES / AVION / TRAIN ===
  if (key.includes('voyage') || key.includes('avion') || key.includes('flight') || key.includes('train')) {
    return {
      activityType: 'transport',
      category: 'scope3_upstream',
      subcategory: 'deplacements',
      defaultUnit: 'km',
      scopeHint: 3,
    };
  }
  
  // === ACHATS / MATIÈRES PREMIÈRES ===
  if (key.includes('achat') || key.includes('purchase') || key.includes('matiere') || key.includes('material') || key.includes('fret') || key.includes('freight')) {
    return {
      activityType: 'purchase',
      category: 'scope3_upstream',
      subcategory: 'achats',
      defaultUnit: 'EUR',
      scopeHint: 3,
    };
  }
  
  // === DÉCHETS ===
  if (key.includes('dechet') || key.includes('waste') || key.includes('recyclage') || key.includes('recycling')) {
    return {
      activityType: 'waste',
      category: 'scope3_upstream',
      subcategory: 'dechets',
      defaultUnit: 'tonnes',
      scopeHint: 3,
    };
  }
  
  // === EAU ===
  if (key.includes('eau') || key.includes('water')) {
    return {
      activityType: 'service',
      category: 'scope3_upstream',
      subcategory: 'eau',
      defaultUnit: 'm³',
      scopeHint: 3,
    };
  }
  
  // === ÉNERGIE GÉNÉRIQUE ===
  if (key.includes('energie') || key.includes('energy')) {
    return {
      activityType: 'energy',
      category: 'scope2',
      subcategory: 'energie',
      defaultUnit: 'kWh',
      scopeHint: 2,
    };
  }
  
  // === SURFACE ===
  if (key.includes('surface') || key.includes('superficie') || key.includes('m2') || key.includes('area')) {
    return {
      activityType: 'service',
      category: 'scope3_upstream',
      subcategory: 'surface',
      defaultUnit: 'm²',
    };
  }
  
  // === EMPLOYÉS ===
  if (key.includes('employe') || key.includes('collaborateur') || key.includes('effectif') || 
      key.includes('personnel') || key.includes('employee') || key.includes('headcount') || 
      key.includes('etp') || key.includes('fte')) {
    return {
      activityType: 'service',
      category: 'scope3_upstream',
      subcategory: 'rh',
      defaultUnit: 'personnes',
    };
  }
  
  // === VÉHICULES ===
  if (key.includes('vehicule') || key.includes('vehicle')) {
    return {
      activityType: 'service',
      category: 'scope3_upstream',
      subcategory: 'flotte',
      defaultUnit: 'vehicules',
    };
  }
  
  // === QUANTITÉ GÉNÉRIQUE ===
  if (key.includes('quantite') || key.includes('quantity') || key.includes('valeur') || 
      key.includes('value') || key.includes('montant') || key.includes('amount') || 
      key.includes('total') || key.includes('generique')) {
    return {
      activityType: 'energy',
      category: 'scope2',
      subcategory: 'donnees_generiques',
      defaultUnit: 'unit',
    };
  }
  
  // Par défaut - importer quand même comme donnée générique
  return {
    activityType: 'energy',
    category: 'scope2',
    subcategory: 'import_excel',
    defaultUnit: 'unit',
  };
}


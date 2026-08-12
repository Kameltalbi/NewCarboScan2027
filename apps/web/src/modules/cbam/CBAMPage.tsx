/**
 * CBAM Main Page Component
 * Formulaire complet avec option Excel pour pré-remplissage
 */

import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Download, Loader2, Save } from 'lucide-react';
import { CBAMForm } from './components/CBAMForm';
import { CBAMExcelImport } from './components/CBAMExcelImport';
import { CBAMResult } from './CBAMResult';
import { supabase } from "@/integrations/api/client";
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { calculateCbam, type CbamInput, type CbamResult } from './utils/cbamCalculator';
import { prepareExportData, downloadBase64File } from './utils/exportHelpers';
import type { CBAMPayload, CBAMCalculationResult } from './types';
import type { CBAMExportData } from './types/export';

interface CBAMReportInsert {
  product_name: string;
  country: string;
  period: string;
  energy_em: number;
  materials_em: number;
  transport_em: number;
  process_em: number;
  total_em: number;
  pdf_url: string | null;
  raw_json: Record<string, unknown>;
}

export const CBAMPage: React.FC = () => {
  const [formData, setFormData] = useState<CBAMPayload | null>(null);
  const [result, setResult] = useState<CBAMCalculationResult | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [etsPrice, setEtsPrice] = useState<number>(60);
  const [carbonPaidLocal, setCarbonPaidLocal] = useState<number>(0);
  const [cbamCalculationResult, setCbamCalculationResult] = useState<CbamResult | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleExcelImport = (data: CBAMPayload) => {
    setFormData(data);
    setError(null);
    toast({
      title: "Fichier importé",
      description: "Le formulaire a été pré-rempli avec les données Excel.",
    });
  };

  const handleFormDataChange = (data: CBAMPayload, etsPriceValue: number, carbonPaidValue: number) => {
    setFormData(data);
    setEtsPrice(etsPriceValue);
    setCarbonPaidLocal(carbonPaidValue);
  };

  const handleFormSubmit = async (data: CBAMPayload, etsPriceValue: number, carbonPaidValue: number, cbamInput?: CbamInput, totalProd?: number) => {
    if (totalProd) {
      setTotalProduction(totalProd);
    }
    setFormData(data);
    setEtsPrice(etsPriceValue);
    setCarbonPaidLocal(carbonPaidValue);
    setError(null);
    setIsCalculating(true);

    try {
      // Validation minimale
      if (!data.general.product_name || !data.general.hs_code || !data.general.country || !data.general.period) {
        throw new Error('Veuillez remplir au moins les informations générales');
      }

      if (!cbamInput) {
        throw new Error('Données de calcul manquantes');
      }

      // Calcul CBAM côté client avec la formule officielle
      const cbamResult = calculateCbam(cbamInput);
      setCbamCalculationResult(cbamResult);

      // Construire le résultat au format attendu par CBAMResult
      const calculationResult: CBAMCalculationResult = {
        energyEm: cbamResult.indirectEmissions,
        materialsEm: 0,
        transportEm: 0,
        processEm: cbamResult.directEmissions,
        total: cbamResult.declarableEmissions,
        breakdown: {
          energy: cbamInput.electricityKwh > 0 ? [{
            type: 'electricity',
            quantity: cbamInput.electricityKwh,
            FE: cbamInput.electricityEF,
            emissions: cbamResult.indirectEmissions,
          }] : [],
          materials: [],
          transport: [],
          process: [
            ...(cbamInput.processEmissions > 0 ? [{
              name: 'Émissions de processus',
              value: cbamInput.processEmissions,
              emissions: cbamInput.processEmissions,
            }] : []),
            ...(cbamInput.fuelEmissions > 0 ? [{
              name: 'Émissions carburant',
              value: cbamInput.fuelEmissions,
              emissions: cbamInput.fuelEmissions,
            }] : []),
          ],
        },
      };

      setResult(calculationResult);

      // Optionnel : Appeler le backend pour générer le PDF
      try {
        const { data: responseData, error: functionError } = await supabase.functions.invoke('cbam-calc', {
          body: data,
        });

        if (!functionError && responseData) {
          setPdfUrl(responseData.pdf_url || null);
          setReportId(responseData.report_id || null);
        }
      } catch (pdfError) {
        logger.warn('Erreur lors de la génération du PDF:', pdfError);
        // Ne pas bloquer si le PDF échoue
      }

      toast({
        title: "Calcul réussi",
        description: "Les émissions CBAM ont été calculées avec succès.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur s\'est produite lors du calcul';
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSaveDeclaration = async () => {
    if (!formData || !result || !cbamCalculationResult) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord effectuer un calcul",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const insertData: CBAMReportInsert = {
        product_name: formData.general.product_name,
        country: formData.general.country,
        period: formData.general.period,
        energy_em: cbamCalculationResult.indirectEmissions,
        materials_em: 0,
        transport_em: 0,
        process_em: cbamCalculationResult.directEmissions,
        total_em: cbamCalculationResult.declarableEmissions,
        pdf_url: pdfUrl,
        raw_json: {
          ...formData,
          cbam_calculation: cbamCalculationResult,
          ets_price: etsPrice,
          local_carbon_price: carbonPaidLocal,
        },
      };

      const { error: saveError } = await (supabase
        .from('cbam_reports' as any)
        .insert(insertData as any) as unknown as Promise<{ error: any }>);

      if (saveError) throw saveError;

      toast({
        title: "Déclaration enregistrée",
        description: "Votre déclaration CBAM a été enregistrée avec succès.",
      });

      // Rediriger vers la liste des déclarations après 1 seconde
      setTimeout(() => {
        navigate('/app/cbam/declarations');
      }, 1000);
    } catch (err) {
      console.error('Error saving declaration:', err);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la déclaration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const [totalProduction, setTotalProduction] = useState<number>(0);

  const handleDownloadPDF = async () => {
    if (!formData || !cbamCalculationResult) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord effectuer un calcul",
        variant: "destructive",
      });
      return;
    }

    try {
      // Préparer les données d'export
      const exportData = prepareExportData(
        formData,
        cbamCalculationResult,
        etsPrice,
        carbonPaidLocal,
        totalProduction || formData.general.quantity_imported
      );

      // Appeler l'Edge Function
      const { data: responseData, error: functionError } = await supabase.functions.invoke('cbam-generate-pdf', {
        body: exportData,
      });

      if (functionError) {
        throw new Error(functionError.message || 'Erreur lors de la génération PDF');
      }

      if (!responseData?.success || !responseData?.pdf) {
        throw new Error('Aucune donnée retournée par la génération PDF');
      }

      // Télécharger le fichier
      downloadBase64File(
        responseData.pdf,
        responseData.filename || `CBAM_${formData.general.product_name}_${formData.general.period}.pdf`,
        'application/pdf'
      );

      toast({
        title: "PDF généré",
        description: "Le rapport PDF CBAM a été téléchargé avec succès.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur s\'est produite lors de la génération PDF';
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDownloadExcel = async () => {
    if (!formData || !cbamCalculationResult) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord effectuer un calcul",
        variant: "destructive",
      });
      return;
    }

    try {
      // Préparer les données d'export
      const exportData = prepareExportData(
        formData,
        cbamCalculationResult,
        etsPrice,
        carbonPaidLocal,
        totalProduction || formData.general.quantity_imported
      );

      // Appeler l'Edge Function
      const { data: responseData, error: functionError } = await supabase.functions.invoke('cbam-generate-excel', {
        body: exportData,
      });

      if (functionError) {
        throw new Error(functionError.message || 'Erreur lors de la génération Excel');
      }

      if (!responseData?.success || !responseData?.excel) {
        throw new Error('Aucune donnée retournée par la génération Excel');
      }

      // Télécharger le fichier
      downloadBase64File(
        responseData.excel,
        responseData.filename || `CBAM_${formData.general.product_name}_${formData.general.period}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      toast({
        title: "Excel généré",
        description: "Le fichier Excel CBAM a été téléchargé avec succès.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur s\'est produite lors de la génération Excel';
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Utiliser le résultat du calcul CBAM officiel
  const cbamAmount = cbamCalculationResult ? cbamCalculationResult.cbamDue : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#009879] mb-2">
          Nouveau Calcul CBAM
        </h1>
        <p className="text-gray-600 text-lg mb-4">
          Le CBAM s'applique aux importations vers l'Union Européenne. Utilisez cette page pour calculer automatiquement vos émissions déclarables et générer les rapports officiels.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Formulaire Complet - Colonne principale */}
        <div className="lg:col-span-3">
          <CBAMForm
            initialData={formData || undefined}
            onSubmit={handleFormSubmit}
            onExcelImport={handleExcelImport}
          />
        </div>

        {/* Section Import Excel Optionnel - Colonne droite */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <CBAMExcelImport onImport={handleExcelImport} />
          </div>
        </div>

        {/* Affichage des erreurs */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Indicateur de calcul en cours */}
        {isCalculating && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <p className="text-blue-800 font-medium">Calcul des émissions CBAM en cours...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Résultats */}
        {result && formData && (
          <div className="lg:col-span-4 space-y-6">
            <CBAMResult result={result} productName={formData.general.product_name} />

            {/* Détails du calcul CBAM */}
            {cbamCalculationResult && (
              <>
                <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4 text-[#009879]">Détails du Calcul CBAM</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Émissions directes:</span>
                          <span className="font-semibold">{cbamCalculationResult.directEmissions.toFixed(4)} tCO₂e</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Émissions indirectes:</span>
                          <span className="font-semibold">{cbamCalculationResult.indirectEmissions.toFixed(4)} tCO₂e</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total usine:</span>
                          <span className="font-semibold">{cbamCalculationResult.totalPlantEmissions.toFixed(4)} tCO₂e</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Émissions par tonne:</span>
                          <span className="font-semibold">{cbamCalculationResult.emissionsPerTon.toFixed(4)} tCO₂e/t</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-sm font-medium text-gray-900">Émissions déclarables:</span>
                          <span className="font-bold text-lg">{cbamCalculationResult.declarableEmissions.toFixed(4)} tCO₂e</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Prix ETS:</span>
                          <span className="font-semibold">{etsPrice}€/tCO₂e</span>
                        </div>
                        {carbonPaidLocal > 0 && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Carbone payé localement:</span>
                            <span className="font-semibold">{carbonPaidLocal}€/tCO₂e</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t pt-2 mt-4">
                          <span className="text-sm font-medium text-gray-900">CBAM dû:</span>
                          <span className="font-bold text-2xl text-green-700">
                            {cbamAmount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Montant CBAM */}
                <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-1 text-[#009879]">Montant CBAM Final</h3>
                        <p className="text-sm text-gray-600">
                          {cbamCalculationResult.declarableEmissions.toFixed(4)} tCO₂e déclarables
                          {carbonPaidLocal > 0 && ` | ${carbonPaidLocal}€/tCO₂e payé localement`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-green-700">
                          {cbamAmount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {etsPrice}€/tCO₂e × {cbamCalculationResult.declarableEmissions.toFixed(4)} tCO₂e
                          {carbonPaidLocal > 0 && ` - ${carbonPaidLocal}€/tCO₂e`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Boutons d'export et sauvegarde */}
            <Card className="border-2 border-[#009879]">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4 text-[#009879]">Exports CBAM</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Téléchargez vos rapports CBAM officiels au format PDF ou Excel après chaque calcul.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleDownloadPDF}
                    className="bg-[#009879] hover:bg-[#007a63] text-white"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Télécharger PDF
                  </Button>
                  <Button
                    onClick={handleDownloadExcel}
                    variant="outline"
                    className="border-[#009879] text-[#009879] hover:bg-[#009879]/10"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger Excel
                  </Button>
                  <Button
                    onClick={handleSaveDeclaration}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Enregistrer la déclaration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Table, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateACVPDF, generateACVExcel } from '@/lib/acvExportUtils';

export default function ACVExport() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  

  const [exportOptions, setExportOptions] = useState({
    includeObjective: true,
    includeInventory: true,
    includeResults: true,
    includeInterpretation: true,
    includeComparison: false,
    includeGraphs: true,
    includeSourceData: false,
  });

  const handleExportPDF = async () => {
    if (!projectId) return;
    
    setIsExporting(true);
    try {
      await generateACVPDF(projectId, exportOptions);
      
      toast({
        title: "Export réussi",
        description: "Le rapport PDF a été généré et téléchargé",
      });
    } catch (error) {
      console.error('Erreur export PDF:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le rapport PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!projectId) return;
    
    setIsExporting(true);
    try {
      await generateACVExcel(projectId, exportOptions);
      
      toast({
        title: "Export réussi",
        description: "Le fichier Excel a été généré et téléchargé",
      });
    } catch (error) {
      console.error('Erreur export Excel:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le fichier Excel",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/acv/projet/${projectId}/comparaison`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la comparaison
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Export du rapport ACV
          </h1>
          <p className="text-gray-600">
            Générez et partagez votre rapport d'analyse de cycle de vie complet
          </p>
        </div>

        <div className="grid gap-8">
          {/* Options d'export */}
          <Card>
            <CardHeader>
              <CardTitle>Contenu du rapport</CardTitle>
              <CardDescription>
                Sélectionnez les sections à inclure dans votre rapport
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="objective"
                    checked={exportOptions.includeObjective}
                    onCheckedChange={(checked) => 
                      setExportOptions({...exportOptions, includeObjective: !!checked})
                    }
                  />
                  <Label htmlFor="objective">Objectif et champ d'étude</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="inventory"
                    checked={exportOptions.includeInventory}
                    onCheckedChange={(checked) => 
                      setExportOptions({...exportOptions, includeInventory: !!checked})
                    }
                  />
                  <Label htmlFor="inventory">Inventaire des flux</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="results"
                    checked={exportOptions.includeResults}
                    onCheckedChange={(checked) => 
                      setExportOptions({...exportOptions, includeResults: !!checked})
                    }
                  />
                  <Label htmlFor="results">Résultats d'impact</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="interpretation"
                    checked={exportOptions.includeInterpretation}
                    onCheckedChange={(checked) => 
                      setExportOptions({...exportOptions, includeInterpretation: !!checked})
                    }
                  />
                  <Label htmlFor="interpretation">Interprétation</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="comparison"
                    checked={exportOptions.includeComparison}
                    onCheckedChange={(checked) => 
                      setExportOptions({...exportOptions, includeComparison: !!checked})
                    }
                  />
                  <Label htmlFor="comparison">Comparaison de scénarios</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="graphs"
                    checked={exportOptions.includeGraphs}
                    onCheckedChange={(checked) => 
                      setExportOptions({...exportOptions, includeGraphs: !!checked})
                    }
                  />
                  <Label htmlFor="graphs">Graphiques et visualisations</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="sourceData"
                    checked={exportOptions.includeSourceData}
                    onCheckedChange={(checked) => 
                      setExportOptions({...exportOptions, includeSourceData: !!checked})
                    }
                  />
                  <Label htmlFor="sourceData">Données sources détaillées</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formats d'export */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PDF */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Rapport PDF
                </CardTitle>
                <CardDescription>
                  Rapport complet formaté selon les normes ISO 14040/14044
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    <p>Contenu :</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Page de garde avec informations projet</li>
                      <li>Sections selon la norme ISO 14040</li>
                      <li>Graphiques et tableaux intégrés</li>
                      <li>Méthodologie et sources</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={handleExportPDF} 
                    disabled={isExporting}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isExporting ? 'Génération...' : 'Télécharger PDF'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Excel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Table className="w-5 h-5 mr-2" />
                  Fichier Excel
                </CardTitle>
                <CardDescription>
                  Données détaillées pour analyse et calculs personnalisés
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    <p>Contenu :</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Inventaire complet des flux</li>
                      <li>Facteurs d'impact utilisés</li>
                      <li>Calculs détaillés par catégorie</li>
                      <li>Tableaux de comparaison</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={handleExportExcel} 
                    disabled={isExporting}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isExporting ? 'Génération...' : 'Télécharger Excel'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Navigation finale */}
        <div className="flex justify-between mt-8">
          <Button 
            variant="outline"
            onClick={() => navigate(`/acv/projet/${projectId}/comparaison`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Étape précédente
          </Button>
          <Button 
            onClick={() => navigate('/acv')}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="w-4 h-4 mr-2" />
            Terminer l'ACV
          </Button>
        </div>
      </div>
    </div>
  );
}
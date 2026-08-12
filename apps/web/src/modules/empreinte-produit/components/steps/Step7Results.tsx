// Étape 7: Résultats et visualisations

import React, { useMemo, useState, useEffect } from 'react';
import { ProductCalculation } from '../../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ProductCalculationToActivityData } from '@/lib/converters/ProductCalculationToActivityData';
import { ActivityDataService } from '@/lib/activity-data/ActivityDataService';
import { ProductFootprintCalculator } from '@/lib/calculators/ProductFootprintCalculator';
import { generateProductFootprintPDF } from '@/lib/productFootprintExportUtils';

interface Step7Props {
  data: Partial<ProductCalculation>;
  productId?: string;
  organizationId?: string;
  onFinish?: () => void;
  onPrevious: () => void;
}

const COLORS = ['#1ABC9C', '#0F172A', '#86EFAC', '#F59E0B', '#EF4444'];

const PHASE_LABELS: Record<string, string> = {
  materials: 'Matières premières',
  manufacturing: 'Fabrication',
  transport: 'Transport',
  usage: 'Utilisation',
  endOfLife: 'Fin de vie',
};

export const Step7Results: React.FC<Step7Props> = ({ data, productId, organizationId, onFinish }) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    const calculateAndSave = async () => {
      if (!data.product || !data.materials || !data.manufacturing || !data.transport) {
        setIsCalculating(false);
        return;
      }

      if (!organizationId || !productId) {
        toast({
          title: "Erreur",
          description: "Organisation ou produit non trouvé. Veuillez réessayer.",
          variant: "destructive"
        });
        setIsCalculating(false);
        return;
      }

      try {
        setIsCalculating(true);
        setIsSaving(true);

        // 1. Convertir ProductCalculation en activity_data
        const periodStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const periodEnd = new Date().toISOString().split('T')[0];

        const activityDataInputs = ProductCalculationToActivityData.convert(
          data as ProductCalculation,
          organizationId,
          productId,
          periodStart,
          periodEnd
        );

        // 2. Sauvegarder dans activity_data
        if (activityDataInputs.length > 0) {
          await ActivityDataService.bulkCreate(activityDataInputs);
          
        }

        // 3. Calculer l'empreinte depuis activity_data
        const footprintResult = await ProductFootprintCalculator.calculate(
          organizationId,
          productId,
          data.product.functionalUnit,
          periodStart,
          periodEnd
        );

        // 4. Formater les résultats pour l'affichage (compatibilité avec l'ancien format)
        const formattedResult = {
          totalEmissions: footprintResult.totalEmissions,
          breakdown: footprintResult.breakdown.map(item => ({
            phase: item.phase,
            emissions: item.emissions,
            percentage: item.percentage,
            isEstimated: footprintResult.dataQuality.estimated > 50, // Simplification
          })),
          dominantPhase: footprintResult.breakdown[0]?.phase || 'materials',
          dataQuality: {
            realData: footprintResult.dataQuality.real,
            estimatedData: footprintResult.dataQuality.estimated,
          },
          methodology: 'Méthodologie simplifiée basée sur les facteurs d\'émission de la Base Carbone ADEME et estimations sectorielles',
        };

        setResult(formattedResult);
      } catch (error: any) {
        console.error('Erreur lors du calcul:', error);
        toast({
          title: "Erreur",
          description: error.message || "Une erreur s'est produite lors du calcul.",
          variant: "destructive"
        });
      } finally {
        setIsCalculating(false);
        setIsSaving(false);
      }
    };

    calculateAndSave();
  }, [data, productId, organizationId, toast]);

  if (isCalculating || !result) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">
          {isSaving ? 'Enregistrement des données...' : 'Calcul en cours...'}
        </p>
      </div>
    );
  }

  const chartData = result.breakdown.map(item => ({
    name: PHASE_LABELS[item.phase] || item.phase,
    value: item.emissions,
    percentage: item.percentage,
  }));

  const handleExportPDF = async () => {
    if (!result || !data.product) {
      toast({
        title: "Erreur",
        description: "Aucune donnée à exporter",
        variant: "destructive",
      });
      return;
    }

    try {
      await generateProductFootprintPDF({
        product: {
          name: data.product.name,
          category: data.product.category,
          functionalUnit: data.product.functionalUnit,
          description: data.product.description,
        },
        result: {
          totalEmissions: result.totalEmissions,
          breakdown: result.breakdown,
          dominantPhase: result.dominantPhase,
          dataQuality: result.dataQuality,
          methodology: result.methodology,
        },
      });

      toast({
        title: "Export réussi",
        description: "Le rapport PDF a été généré et téléchargé",
      });
    } catch (error: any) {
      console.error('Erreur export PDF:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer le rapport PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Résultats du calcul
        </h2>
        <p className="text-muted-foreground">
          Empreinte carbone de votre produit
        </p>
      </div>

      {/* Résultat principal */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-lg text-muted-foreground">
            Empreinte carbone totale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-foreground">
              {result.totalEmissions.toFixed(2)}
            </span>
            <span className="text-xl text-muted-foreground">
              kg CO₂e / {data.product?.functionalUnit || 'unité'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Phase dominante: <strong>{PHASE_LABELS[result.dominantPhase]}</strong>
          </p>
        </CardContent>
      </Card>

      {/* Graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par phase</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toFixed(2)} kg CO₂e`} />
                <Bar dataKey="value" fill="#1ABC9C" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pourcentage par phase</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(2)} kg CO₂e`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Détail par phase */}
      <Card>
        <CardHeader>
          <CardTitle>Détail par phase du cycle de vie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.breakdown.map((item, index) => (
              <div key={item.phase} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <p className="font-medium">{PHASE_LABELS[item.phase] || item.phase}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.percentage.toFixed(1)}% du total
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{item.emissions.toFixed(2)} kg CO₂e</p>
                  {item.isEstimated && (
                    <Badge variant="secondary" className="text-xs">
                      Estimé
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Qualité des données */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Qualité des données</p>
            <div className="flex gap-4 text-sm">
              <span>Données réelles: {result.dataQuality.realData.toFixed(0)}%</span>
              <span>Données estimées: {result.dataQuality.estimatedData.toFixed(0)}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {result.methodology}
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Clause anti-greenwashing */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground text-center">
            <strong>Note importante:</strong> Ce calcul utilise une méthodologie simplifiée basée sur 
            des facteurs d'émission moyens. Pour une analyse plus précise, notamment pour la communication 
            externe, nous recommandons de réaliser une Analyse du Cycle de Vie (ACV) complète conforme 
            aux normes ISO 14040/14044.
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={onFinish}>
          <FileText className="w-4 h-4 mr-2" />
          Enregistrer
        </Button>
        <Button onClick={handleExportPDF}>
          <Download className="w-4 h-4 mr-2" />
          Exporter PDF
        </Button>
      </div>
    </div>
  );
};


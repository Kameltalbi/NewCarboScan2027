// Écran 8: Reporting Net Zéro

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { useOrganizationId } from '@/hooks/useOrganizationId';
import { NetZeroService } from '@/lib/net-zero/NetZeroService';
import { NetZeroTrajectory } from '@/lib/net-zero/types';
import { generateNetZeroPDF } from '@/lib/netZeroExportUtils';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const NetZeroReporting: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId } = useOrganizationId();
  const [loading, setLoading] = useState(true);
  const [trajectory, setTrajectory] = useState<NetZeroTrajectory | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!organizationId) return;

      try {
        setLoading(true);
        const savedTrajectory = await NetZeroService.getTrajectory(organizationId);
        if (!savedTrajectory) {
          toast.error('Aucune trajectoire configurée');
          navigate('/app/decarbotech/trajectoire');
          return;
        }
        setTrajectory(savedTrajectory);
      } catch (err: any) {
        toast.error(`Erreur: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [organizationId, navigate]);

  const handleExportPDF = async () => {
    if (!trajectory) {
      toast.error('Aucune trajectoire à exporter');
      return;
    }

    try {
      await generateNetZeroPDF(trajectory);
      
      toast.success('Rapport PDF généré et téléchargé avec succès');
    } catch (err: any) {
      console.error('Erreur export PDF:', err);
      toast.error(`Erreur lors de la génération du PDF: ${err.message || 'Erreur inconnue'}`);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trajectory) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reporting Net Zéro</h1>
        <p className="text-muted-foreground mt-1">
          Exportez votre rapport exécutif de trajectoire Net Zero
        </p>
      </div>

      {/* Résumé du rapport */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé du rapport</CardTitle>
          <CardDescription>Contenu qui sera inclus dans l'export</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Configuration</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Année de référence: {trajectory.reference.reference_year}</li>
                <li>Émissions de référence: {Math.round(trajectory.reference.reference_emissions)} tCO₂e</li>
                <li>Scopes: {trajectory.reference.scopes_included}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Objectifs</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                {trajectory.objectives.map((obj, index) => (
                  <li key={index}>
                    {obj.horizon === 'net-zero' ? 'Net Zero' : 'Court terme'} {obj.target_year}: -{obj.target_reduction_percent}%
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Contenu inclus</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Graphiques de trajectoire</li>
              <li>Récapitulatif des objectifs et écarts</li>
              <li>Détail des leviers de réduction</li>
              <li>Comparaison des scénarios</li>
              <li>Suivi annuel</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Actions d'export */}
      <Card>
        <CardHeader>
          <CardTitle>Exporter le rapport</CardTitle>
          <CardDescription>Générez et téléchargez votre rapport Net Zero</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleExportPDF} className="w-full" size="lg">
            <Download className="mr-2 h-5 w-5" />
            Exporter en PDF
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Le rapport inclura tous les graphiques, tableaux et mentions légales nécessaires
          </p>
        </CardContent>
      </Card>

      {/* Mention légale */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-2">Mention légale obligatoire</p>
              <p>
                Trajectoire alignée avec les recommandations SBTi. La validation officielle des objectifs reste du ressort de la SBTi.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" onClick={() => navigate('/app/decarbotech/trajectoire')} className="flex-1">
          Retour à la vue d'ensemble
        </Button>
      </div>
    </div>
  );
};


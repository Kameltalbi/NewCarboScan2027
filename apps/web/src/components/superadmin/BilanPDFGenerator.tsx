import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/api/client";
import { useToast } from '@/hooks/use-toast';
import { EmpreinteProduitReportContent } from '@/components/empreinte-produit-report/EmpreinteProduitReportContent';

interface BilanData {
  id: string;
  organization_name: string;
  user_id: string;
  total_emission: number;
  scope1_emission: number;
  scope2_emission: number;
  scope3_emission: number;
  created_at: string;
}

interface BilanPDFGeneratorProps {
  bilan: BilanData;
}

/**
 * Superadmin tool: generates a quick PDF preview for an org bilan.
 * Uses EmpreinteProduitReportContent with legacy props mapping.
 * TODO: Replace with dedicated Bilan Carbone report viewer.
 */
export const BilanPDFGenerator: React.FC<BilanPDFGeneratorProps> = ({ bilan }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const { toast } = useToast();

  const generateReport = async () => {
    setIsGenerating(true);
    
    try {
      const { data: bilanDetails, error: bilanError } = await supabase
        .from('bilans_carbone')
        .select('*, questionnaire_data')
        .eq('id', bilan.id)
        .single();

      if (bilanError) throw bilanError;

      const { data: company } = await supabase
        .from('companies')
        .select('nom_entreprise, secteur, collaborateurs, ca_annuel')
        .eq('user_id', bilan.user_id)
        .single();

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name, sector, company_size')
        .eq('user_id', bilan.user_id)
        .single();

      const companyName = company?.nom_entreprise || profile?.company_name || bilan.organization_name;
      const sector = company?.secteur || profile?.sector || 'Non spécifié';

      const totalKg = Number(bilan.total_emission) || 0;
      const s1 = Number(bilan.scope1_emission) || 0;
      const s2 = Number(bilan.scope2_emission) || 0;
      const s3 = Number(bilan.scope3_emission) || 0;

      setReportData({
        companyInfo: { companyName, name: companyName, sector },
        emissionsResult: { totalEmissions: totalKg, scope1: s1, scope2: s2, scope3: s3 },
        formData: {
          nom_entreprise: companyName,
          secteur_activite: sector,
          nom_produit: `Bilan ${companyName}`,
          unite_fonctionnelle: '1 an d\'activité',
          annee_etude: new Date(bilan.created_at).getFullYear().toString(),
        },
      });

      setShowReport(true);
      toast({ title: "Rapport généré", description: "Le rapport est prêt" });
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      toast({ title: "Erreur", description: "Impossible de générer le rapport", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const closeReport = () => {
    setShowReport(false);
    setReportData(null);
  };

  if (showReport && reportData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-auto">
        <div className="min-h-screen p-4">
          <div className="max-w-6xl mx-auto bg-background rounded-lg">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Rapport – {bilan.organization_name}</h3>
              <Button variant="outline" onClick={closeReport}>Fermer</Button>
            </div>
            <div className="p-4">
              <EmpreinteProduitReportContent
                companyInfo={reportData.companyInfo}
                emissionsResult={reportData.emissionsResult}
                formData={reportData.formData}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button onClick={generateReport} disabled={isGenerating} size="sm" variant="outline" className="flex items-center gap-2">
      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {isGenerating ? 'Génération...' : 'PDF'}
    </Button>
  );
};

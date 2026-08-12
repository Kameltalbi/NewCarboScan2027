import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { EmpreinteProduitReportContent } from '@/components/empreinte-produit-report/EmpreinteProduitReportContent';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { getCompanyLogoUrl } from '@/lib/logoService';

const EmpreinteProduitReport: React.FC = () => {
  const { state } = useLocation();
  const [enrichedFormData, setEnrichedFormData] = useState(state?.formData);
  const [isLoadingLogo, setIsLoadingLogo] = useState(true);
  const emissionsResult = state?.emissionsResult;

  useEffect(() => {
    const loadLogoAndEnrichData = async () => {
      if (state?.formData) {
        try {
          const logoUrl = await getCompanyLogoUrl();
          setEnrichedFormData({
            ...state.formData,
            logo_url: logoUrl
          });
        } catch (error) {
          console.error('Error loading logo:', error);
          setEnrichedFormData(state.formData);
        }
      }
      setIsLoadingLogo(false);
    };

    loadLogoAndEnrichData();
  }, [state?.formData]);

  if (!enrichedFormData || !emissionsResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Rapport Non Disponible
            </h1>
            <p className="text-gray-600 mb-8">
              Aucune donnée d'empreinte carbone produit trouvée. Veuillez d'abord compléter le questionnaire.
            </p>
            <div className="space-y-4">
              <Button 
                onClick={() => window.location.href = '/carbo-start/questionnaire'}
                className="bg-[#10b981] hover:bg-[#059669]"
              >
                Commencer le Questionnaire
              </Button>
              <div>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/carbo-start/dashboard'}
                  className="border-[#10b981] text-[#10b981] hover:bg-green-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour au Tableau de Bord
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingLogo) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation avec bouton retour */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/carbo-start/dashboard'}
            className="border-[#10b981] text-[#10b981] hover:bg-green-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour tableau de bord
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/carbo-start/dashboard'}
            className="border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            <Home className="w-4 h-4 mr-2" />
            Accueil
          </Button>
        </div>
      </div>
      
      <EmpreinteProduitReportContent 
        formData={enrichedFormData}
        emissionsResult={emissionsResult}
      />
    </div>
  );
};

export default EmpreinteProduitReport;
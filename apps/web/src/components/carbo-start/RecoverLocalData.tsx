import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, RefreshCw } from "lucide-react";

export const RecoverLocalData: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [localData, setLocalData] = useState<any>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    if (user) {
      checkLocalData(user.id);
    }
  }, [user]);

  const checkLocalData = (userId: string) => {
    try {
      const savedData = localStorage.getItem(`questionnaire_progress_${userId}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        
        setLocalData(parsed);
      }
    } catch (error) {
      console.error('Erreur lecture données locales:', error);
    }
  };

  const calculateEmissionsFromData = (formData: any) => {
    let scope1Total = 0;
    let scope2Total = 0;
    let scope3Total = 0;

    // Calculs basés sur les facteurs d'émission
    if (formData.combustibleGaz) {
      scope1Total += formData.combustibleGaz * 0.227; // kgCO2e/kWh
    }
    if (formData.combustibleFioul) {
      scope1Total += formData.combustibleFioul * 0.324; // kgCO2e/kWh
    }
    if (formData.electricite) {
      scope2Total += formData.electricite * 0.057; // kgCO2e/kWh pour la Tunisie
    }
    if (formData.deplacementsVoiture) {
      scope3Total += formData.deplacementsVoiture * 0.193; // kgCO2e/km
    }
    if (formData.deplacementsTrain) {
      scope3Total += formData.deplacementsTrain * 0.003; // kgCO2e/km
    }
    if (formData.deplacementsAvion) {
      scope3Total += formData.deplacementsAvion * 0.255; // kgCO2e/km
    }

    return {
      scope1: scope1Total,
      scope2: scope2Total,
      scope3: scope3Total,
      total: scope1Total + scope2Total + scope3Total
    };
  };

  const recoverData = async () => {
    if (!localData || !user) return;

    setIsRecovering(true);
    try {
      const emissions = calculateEmissionsFromData(localData.questionnaire_data);
      
      await api.createBilan({
        scope1Emission: emissions.scope1,
        scope2Emission: emissions.scope2,
        scope3Emission: emissions.scope3,
        totalEmission: emissions.total,
        questionnaireData: localData.questionnaire_data,
        dateBilan: new Date().toISOString().slice(0, 10),
      });

      toast({
        title: "Données récupérées !",
        description: "Votre bilan carbone a été restauré avec succès.",
      });

      // Nettoyer les données locales après succès
      localStorage.removeItem(`questionnaire_progress_${user.id}`);
      setLocalData(null);

      // Recharger la page pour voir les données
      window.location.reload();

    } catch (error) {
      console.error('Erreur récupération:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer vos données. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsRecovering(false);
    }
  };

  if (!localData) {
    return null;
  }

  const emissions = calculateEmissionsFromData(localData.questionnaire_data);

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Données de bilan détectées
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-orange-700">
            Nous avons trouvé des données de bilan carbone non sauvegardées sur votre appareil.
          </p>
          
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium mb-2">Aperçu de vos données :</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total des émissions :</span>
                <br />
                <span className="font-bold text-lg">{emissions.total.toFixed(1)} tonnes CO₂e</span>
              </div>
              <div className="space-y-1">
                <div>Scope 1: {emissions.scope1.toFixed(1)} t CO₂e</div>
                <div>Scope 2: {emissions.scope2.toFixed(1)} t CO₂e</div>
                <div>Scope 3: {emissions.scope3.toFixed(1)} t CO₂e</div>
              </div>
            </div>
          </div>

          <Button 
            onClick={recoverData} 
            disabled={isRecovering}
            className="w-full"
          >
            {isRecovering ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Récupération en cours...
              </>
            ) : (
              "Récupérer mes données"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
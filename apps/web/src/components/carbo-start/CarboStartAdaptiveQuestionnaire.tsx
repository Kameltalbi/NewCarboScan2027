import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { MainHeader } from '@/components/MainHeader';
import { NewFooter } from '@/components/NewFooter';
import { AdaptiveCarbonQuestionnaire } from '@/components/questionnaire/AdaptiveCarbonQuestionnaire';
import { useTranslation } from 'react-i18next';

/**
 * CarboStart Adaptive Questionnaire Wrapper
 * 
 * Ce composant enrobe le questionnaire adaptatif pour le plan CarboStart
 * Il applique automatiquement les restrictions de scope (1 et 2 uniquement)
 * et personnalise l'interface pour l'expérience CarboStart
 */
export const CarboStartAdaptiveQuestionnaire: React.FC = () => {
  const navigate = useNavigate();
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const { t } = useTranslation();

  // Si l'utilisateur choisit de démarrer le questionnaire
  if (showQuestionnaire) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <MainHeader />
        
        {/* Header personnalisé CarboStart */}
        <div className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowQuestionnaire(false)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("questionnaire.actions.back")}
              </Button>
              <div>
                <h1 className="text-xl font-bold text-green-700">
                  {t("questionnaire.carboStart.title")}
                </h1>
                <p className="text-sm text-gray-600">
                  {t("questionnaire.carboStart.subtitle")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Questionnaire adaptatif avec configuration CarboStart */}
        <div className="py-8">
          <AdaptiveCarbonQuestionnaire />
        </div>
        
        <NewFooter />
      </div>
    );
  }

  // Interface d'introduction CarboStart
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      
      <main className="flex-grow bg-gradient-to-br from-green-50 to-blue-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-green-700 mb-4">
                {t("questionnaire.intro.title")}
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                {t("questionnaire.intro.description")}
              </p>
            </div>

            {/* Avantages du nouveau questionnaire */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-green-700 mb-3">
                  {t("questionnaire.benefits.adaptive.title")}
                </h3>
                <p className="text-sm text-gray-600">
                  {t("questionnaire.benefits.adaptive.description")}
                </p>
              </div>
              
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-blue-700 mb-3">
                  {t("questionnaire.benefits.scopes.title")}
                </h3>
                <p className="text-sm text-gray-600">
                  {t("questionnaire.benefits.scopes.description")}
                </p>
              </div>
              
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="font-semibold text-purple-700 mb-3">
                  {t("questionnaire.benefits.interface.title")}
                </h3>
                <p className="text-sm text-gray-600">
                  {t("questionnaire.benefits.interface.description")}
                </p>
              </div>
              
              <div className="bg-orange-50 p-6 rounded-lg">
                <h3 className="font-semibold text-orange-700 mb-3">
                  {t("questionnaire.benefits.factors.title")}
                </h3>
                <p className="text-sm text-gray-600">
                  {t("questionnaire.benefits.factors.description")}
                </p>
              </div>
            </div>

            {/* Informations sur le questionnaire */}
            <div className="bg-gray-50 p-6 rounded-lg mb-8">
              <h3 className="font-semibold mb-4">{t("questionnaire.expectations.title")}</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• <strong>{t("questionnaire.expectations.duration")}</strong> {t("questionnaire.expectations.durationValue")}</li>
                <li>• <strong>{t("questionnaire.expectations.questions")}</strong> {t("questionnaire.expectations.questionsValue")}</li>
                <li>• <strong>{t("questionnaire.expectations.autoSave")}</strong> {t("questionnaire.expectations.autoSaveValue")}</li>
                <li>• <strong>{t("questionnaire.expectations.help")}</strong> {t("questionnaire.expectations.helpValue")}</li>
                <li>• <strong>{t("questionnaire.expectations.results")}</strong> {t("questionnaire.expectations.resultsValue")}</li>
              </ul>
            </div>

            {/* Boutons d'action */}
            <div className="text-center space-y-4">
              <Button 
                size="lg" 
                onClick={() => setShowQuestionnaire(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg"
              >
                {t("questionnaire.actions.start")}
              </Button>
              
              <div className="flex justify-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/carbo-start/dashboard')}
                >
                  {t("questionnaire.actions.backToDashboard")}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/contact')}
                >
                  {t("questionnaire.actions.needHelp")}
                </Button>
              </div>
            </div>

            {/* Note sur la migration */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>{t("questionnaire.migration.new")}</strong> {t("questionnaire.migration.description")}
              </p>
            </div>
          </Card>
        </div>
      </main>
      
      <NewFooter />
    </div>
  );
};
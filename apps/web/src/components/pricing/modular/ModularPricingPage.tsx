import React, { useState, useEffect } from 'react';
import { PricingQuestionnaire } from './PricingQuestionnaire';
import { PricingEmailCollector } from './PricingEmailCollector';
import { PricingIntroduction } from './PricingIntroduction';
import { PricingServicesCards } from './PricingServicesCards';
import { PricingExplanation } from './PricingExplanation';
import { PricingCustomQuoteMessage } from './PricingCustomQuoteMessage';
import { PricingContactForm } from './PricingContactForm';
import { useTranslation } from 'react-i18next';

interface QuestionnaireData {
  employees: 'less-250' | 'more-250' | null;
  sites: '1' | 'multiple' | null;
  contact: 'yes' | 'no' | null;
}

export const ModularPricingPage: React.FC = () => {
  const { t } = useTranslation();
  const [showQuestionnaire, setShowQuestionnaire] = useState(true);
  const [showEmailCollector, setShowEmailCollector] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isCustomQuote, setIsCustomQuote] = useState(false);

  useEffect(() => {
    // Vérifier si le questionnaire et l'email ont déjà été complétés (localStorage)
    const savedQuestionnaire = localStorage.getItem('pricing-questionnaire');
    const savedEmail = localStorage.getItem('pricing-email');
    
    if (savedQuestionnaire && savedEmail) {
      try {
        const data = JSON.parse(savedQuestionnaire);
        setQuestionnaireData(data);
        setUserEmail(savedEmail);
        setShowQuestionnaire(false);
        setShowEmailCollector(false);
        setShowPricing(true);
        setIsCustomQuote(
          data.employees === 'more-250' || data.sites === 'multiple'
        );
      } catch (e) {
        // Si erreur de parsing, afficher le questionnaire
        setShowQuestionnaire(true);
      }
    } else if (savedQuestionnaire) {
      // Questionnaire complété mais pas d'email
      try {
        const data = JSON.parse(savedQuestionnaire);
        setQuestionnaireData(data);
        setShowQuestionnaire(false);
        setShowEmailCollector(true);
        setIsCustomQuote(
          data.employees === 'more-250' || data.sites === 'multiple'
        );
      } catch (e) {
        setShowQuestionnaire(true);
      }
    }
  }, []);

  const handleQuestionnaireComplete = (data: QuestionnaireData) => {
    setQuestionnaireData(data);
    setShowQuestionnaire(false);
    setShowEmailCollector(true);
    
    // Déterminer si mode "Sur devis"
    const customQuote = data.employees === 'more-250' || data.sites === 'multiple';
    setIsCustomQuote(customQuote);
    
    // Sauvegarder dans localStorage
    localStorage.setItem('pricing-questionnaire', JSON.stringify(data));
  };

  const handleEmailSubmit = (email: string) => {
    setUserEmail(email);
    setShowEmailCollector(false);
    setShowPricing(true);
    
    // Sauvegarder l'email dans localStorage
    localStorage.setItem('pricing-email', email);
  };


  return (
    <div className="min-h-screen bg-white">
      {/* Questionnaire initial */}
      {showQuestionnaire && (
        <PricingQuestionnaire onComplete={handleQuestionnaireComplete} />
      )}

      {/* Collecte d'email */}
      {showEmailCollector && (
        <PricingEmailCollector onEmailSubmit={handleEmailSubmit} />
      )}

      {/* Contenu principal avec tarifs */}
      {showPricing && (
        <>
          {/* Introduction */}
          <PricingIntroduction />

          {/* Cartes services orientées collecte */}
          <PricingServicesCards />

          {/* Message sur devis si applicable */}
          {isCustomQuote && <PricingCustomQuoteMessage />}

          {/* Section texte isolé pleine largeur */}
          <div className="py-8 bg-white w-full px-4 md:px-8 lg:px-12">
            <div className="max-w-7xl mx-auto">
              <div className="p-6 bg-[#009879] rounded-lg">
                <p className="text-center font-semibold text-white text-lg">
                  {t('pricing.modular.explanation.conclusion')}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2 colonnes : Explication + Formulaire */}
          <div className="py-16 bg-[#F5F7F9]">
            <div className="w-full px-4 md:px-8 lg:px-12">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Colonne gauche : Explication */}
                <div>
                  <PricingExplanation />
                </div>

                {/* Colonne droite : Formulaire */}
                <div>
                  <PricingContactForm />
                </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};


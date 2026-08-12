
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CarboScanLayout } from "./CarboScanLayout";
import { AdaptiveDashboard } from "@/components/dashboard/AdaptiveDashboard";
import { CarboScanReports } from "./CarboScanReports";
import { CarboScanRapports } from "@/pages/CarboScanRapports";
import { CarboStartAdaptiveQuestionnaire } from "./CarboStartAdaptiveQuestionnaire";
import { CarboScanSettings } from "./settings/CarboScanSettings";
import { MesBilans } from "./MesBilans";
import { SubscriptionStatusGuard } from "./SubscriptionStatusGuard";
import SuperAdmin from "../../pages/SuperAdmin";

export const CarboStartContent: React.FC = () => {
  const [showSurvey, setShowSurvey] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  // Module Collect désactivé - rediriger vers le dashboard
  if (location.pathname.includes('/carbo-start/collect') || location.pathname.includes('/carbo-start/collecte-donnees')) {
    return <Navigate to="/carbo-start/dashboard" replace />;
  }

  // Si on est sur une route du dashboard CarboScan, afficher l'interface SaaS
  if (location.pathname.includes('/carbo-start/dashboard') || 
      location.pathname.includes('/carbo-start/questionnaire') ||
      location.pathname.includes('/carbo-start/bilans') ||
      location.pathname.includes('/carbo-start/rapports') ||
      location.pathname.includes('/carbo-start/parametres') ||
      location.pathname.includes('/carbo-start/superadmin')) {

    return (
      <SubscriptionStatusGuard>
        <CarboScanLayout>
          <Routes>
            <Route path="/dashboard" element={<AdaptiveDashboard />} />
            {/* Questionnaires supprimés — redirection vers Collecte */}
            <Route path="/questionnaire-old" element={<Navigate to="/app/collecte" replace />} />
            <Route path="/questionnaire" element={<Navigate to="/app/collecte" replace />} />
            <Route path="/bilans" element={<MesBilans />} />
            <Route path="/rapports" element={<CarboScanRapports />} />
            <Route path="/parametres" element={
              <CarboScanSettings />
            } />
            <Route path="/superadmin" element={<SuperAdmin />} />
            <Route path="/*" element={<Navigate to="/carbo-start/dashboard" replace />} />
          </Routes>
        </CarboScanLayout>
      </SubscriptionStatusGuard>
    );
  }

  if (showSurvey) {
    return <CarboStartAdaptiveQuestionnaire />;
  }

  return (
    <section className="py-16 px-4 bg-white text-primary max-w-4xl mx-auto">
      
      {/* Hero */}
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-6">
        {t("carboStart.title")}
      </h1>

      <p className="text-lg leading-relaxed text-center mb-10">
        {t("carboStart.description")}
      </p>

      <div className="text-center mb-10 space-x-4">
        <Link to="/carbo-start/dashboard">
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg"
          >
            {t("carboStart.accessButton")}
          </Button>
        </Link>
        <Button 
          size="lg" 
          onClick={() => setShowSurvey(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg"
        >
          {t("carboStart.startAssessmentButton")}
        </Button>
        <Link to="/contact">
          <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
            {t("carboStart.requestInfoButton")}
          </Button>
        </Link>
      </div>

      {/* Pourquoi CarboStart */}
      <h2 className="text-2xl md:text-3xl font-bold mb-4">{t("carboStart.whyChoose")}</h2>

      <p className="text-lg leading-relaxed mb-6 text-justify">
        {t("carboStart.whyDescription")}
      </p>

      {/* Fonctionnalités */}
      <h2 className="text-2xl md:text-3xl font-bold mb-4">{t("carboStart.features")}</h2>

      <ul className="ml-5 text-gray-700 mb-8 space-y-2">
        <li><strong>{t("carboStart.featuresList.adaptiveQuestionnaire").split(" — ")[0]}</strong> — {t("carboStart.featuresList.adaptiveQuestionnaire").split(" — ")[1]}</li>
        <li><strong>{t("carboStart.featuresList.scopes12").split(" — ")[0]}</strong> — {t("carboStart.featuresList.scopes12").split(" — ")[1]}</li>
        <li><strong>{t("carboStart.featuresList.detailedReport").split(" — ")[0]}</strong> — {t("carboStart.featuresList.detailedReport").split(" — ")[1]}</li>
        <li><strong>{t("carboStart.featuresList.personalizedRecommendations").split(" — ")[0]}</strong> — {t("carboStart.featuresList.personalizedRecommendations").split(" — ")[1]}</li>
        <li><strong>{t("carboStart.featuresList.professionalReport").split(" — ")[0]}</strong> — {t("carboStart.featuresList.professionalReport").split(" — ")[1]}</li>
        <li><strong>{t("carboStart.featuresList.emailSupport").split(" — ")[0]}</strong> — {t("carboStart.featuresList.emailSupport").split(" — ")[1]}</li>
        <li><strong>{t("carboStart.featuresList.basicTraining").split(" — ")[0]}</strong> — {t("carboStart.featuresList.basicTraining").split(" — ")[1]}</li>
        <li><strong>{t("carboStart.featuresList.affordablePrice").split(" — ")[0]}</strong> — {t("carboStart.featuresList.affordablePrice").split(" — ")[1]}</li>
      </ul>

      {/* Process */}
      <h2 className="text-2xl md:text-3xl font-bold mb-4">{t("carboStart.howItWorks")}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
          <h3 className="font-semibold mb-2">{t("carboStart.steps.questionnaire.title")}</h3>
          <p className="text-sm text-gray-600">{t("carboStart.steps.questionnaire.description")}</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
          <h3 className="font-semibold mb-2">{t("carboStart.steps.analysis.title")}</h3>
          <p className="text-sm text-gray-600">{t("carboStart.steps.analysis.description")}</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
          <h3 className="font-semibold mb-2">{t("carboStart.steps.results.title")}</h3>
          <p className="text-sm text-gray-600">{t("carboStart.steps.results.description")}</p>
        </div>
      </div>

      {/* Témoignages */}
      <h2 className="text-2xl md:text-3xl font-bold mb-4">{t("carboStart.testimonials")}</h2>

      <div className="mb-8">
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="italic">"{t("carboStart.testimonial1.text")}"</p>
          <p className="text-sm font-semibold mt-2">{t("carboStart.testimonial1.author")}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="italic">"{t("carboStart.testimonial2.text")}"</p>
          <p className="text-sm font-semibold mt-2">{t("carboStart.testimonial2.author")}</p>
        </div>
      </div>

      {/* Appel à l'action final */}
      <p className="text-lg text-center font-bold mb-10">
        {t("carboStart.finalCTA")}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Link to="/carbo-start/dashboard" className="w-full sm:w-auto">
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-white px-4 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full"
          >
            <span className="truncate">{t("carboStart.startWithCarboScan")}</span>
          </Button>
        </Link>
        <Button 
          size="lg" 
          onClick={() => setShowSurvey(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto"
        >
          <span className="truncate">{t("carboStart.startAssessmentButton")}</span>
        </Button>
        <Link to="/contact" className="w-full sm:w-auto">
          <Button variant="outline" size="lg" className="px-4 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full">
            <span className="truncate">{t("carboStart.askQuestion")}</span>
          </Button>
        </Link>
      </div>

    </section>
  );
};

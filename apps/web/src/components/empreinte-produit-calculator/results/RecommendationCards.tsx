import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { EmissionsResult } from "@/types/empreinteProduit";
import { Target, Lightbulb, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecommendationCardsProps {
  results: EmissionsResult;
}

export const RecommendationCards: React.FC<RecommendationCardsProps> = ({ results }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const maxCategory = [...results.categoryBreakdown].sort((a, b) => b.value - a.value)[0];
  const percentage = maxCategory ? ((maxCategory.value / results.totalEmissions) * 100).toFixed(1) : "0";

  const getRecommendation = () => {
    if (!maxCategory) return t("carbonCalculator.results.recommendations.default");
    const key = maxCategory.name.toLowerCase();
    const map: Record<string, string> = {
      "transport de flotte": "fleet", véhicules: "fleet",
      chauffage: "heating",
      "voyages d'affaires": "travel", vols: "travel",
      "équipements informatiques": "it", numérique: "it",
      "transport domicile-travail": "commute",
      "consommation électricité": "electricity",
      "achats de biens et services": "purchases",
    };
    const rKey = map[key] || "default";
    return t(`carbonCalculator.results.recommendations.${rKey}`);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        {t("carbonCalculator.results.analysis")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-5 space-y-2">
          <div className="flex items-center gap-2 text-orange-700 font-semibold text-sm">
            <Target className="w-4 h-4" />
            {t("carbonCalculator.results.mainEmissionSource")}
          </div>
          <p className="text-sm text-orange-700/80">
            <strong>{maxCategory?.name || "N/A"}</strong> {t("carbonCalculator.results.represents")} <strong>{percentage}%</strong> {t("carbonCalculator.results.ofYourTotalEmissions")}.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
            <Lightbulb className="w-4 h-4" />
            {t("carbonCalculator.results.recommendation")}
          </div>
          <p className="text-sm text-emerald-700/80">{getRecommendation()}</p>
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] p-8 text-center space-y-4">
        <h3 className="text-xl font-bold text-white">{t("carbonCalculator.results.cta.title")}</h3>
        <p className="text-white/80 text-sm max-w-md mx-auto">{t("carbonCalculator.results.cta.subtitle")}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate("/contact")}
            className="bg-white text-primary hover:bg-white/90"
          >
            {t("carbonCalculator.results.cta.requestDiagnostic")}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-white hover:bg-white/10 border border-white/30"
          >
            <Home className="w-4 h-4 mr-2" />
            {t("carbonCalculator.results.cta.backToHome")}
          </Button>
        </div>
      </div>
    </div>
  );
};

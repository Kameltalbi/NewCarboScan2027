import React from "react";
import { useTranslation } from "react-i18next";
import { EmissionsResult, IntensityMetrics } from "@/types/empreinteProduit";
import { TotalEmissionsCard } from "./results/TotalEmissionsCard";
import { ScopeBreakdown } from "./results/ScopeBreakdown";
import { IntensityCards } from "./results/IntensityCards";
import { CategoryBreakdown } from "./results/CategoryBreakdown";
import { RecommendationCards } from "./results/RecommendationCards";
import { generateResultsPdf } from "@/lib/generateResultsPdf";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResultsScreenProps {
  results: EmissionsResult;
  companyName?: string;
  intensityMetrics?: IntensityMetrics;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ results, companyName, intensityMetrics }) => {
  const { t } = useTranslation();

  const handleDownloadPdf = () => {
    generateResultsPdf(results, companyName, intensityMetrics);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-10">
      <TotalEmissionsCard totalEmissions={results.totalEmissions} companyName={companyName} />
      <ScopeBreakdown results={results} />
      {intensityMetrics && <IntensityCards metrics={intensityMetrics} />}
      <CategoryBreakdown categories={results.categoryBreakdown} totalEmissions={results.totalEmissions} />
      <RecommendationCards results={results} />

      {/* PDF download button */}
      <div className="flex justify-center pt-4 pb-2">
        <Button
          onClick={handleDownloadPdf}
          variant="outline"
          className="rounded-[4px] px-6 h-11 gap-2 border-primary/30 text-primary hover:bg-primary/5"
        >
          <Download className="w-4 h-4" />
          {t("carbonCalculator.results.downloadPdf", "Télécharger le rapport PDF")}
        </Button>
      </div>
    </div>
  );
};

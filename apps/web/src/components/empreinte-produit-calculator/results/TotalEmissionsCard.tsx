import React from "react";
import { useTranslation } from "react-i18next";
import { Leaf } from "lucide-react";

interface TotalEmissionsCardProps {
  totalEmissions: number;
  companyName?: string;
}

export const TotalEmissionsCard: React.FC<TotalEmissionsCardProps> = ({ totalEmissions, companyName }) => {
  const { t } = useTranslation();

  return (
    <div className="text-center space-y-6 py-8">
      {companyName && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">{companyName}</p>
      )}
      <h1 className="text-2xl font-bold text-foreground">{t("carbonCalculator.results.title")}</h1>

      <div className="inline-flex flex-col items-center gap-3 rounded-[4px] border border-primary/20 bg-primary/5 px-12 py-8">
        <Leaf className="w-8 h-8 text-primary" />
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          {t("carbonCalculator.results.totalEmissions")}
        </p>
        <div className="text-5xl font-extrabold text-primary tabular-nums">
          {Math.round(totalEmissions).toLocaleString("fr-FR")}
        </div>
        <p className="text-sm text-muted-foreground font-medium">{t("carbonCalculator.results.tonnesCO2e")}</p>
      </div>
    </div>
  );
};

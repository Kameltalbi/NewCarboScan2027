import React from "react";
import { useTranslation } from "react-i18next";

export const PricingNotes: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="mt-12 bg-card border border-border p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-primary">{t("pricing.notes.title")}</h3>
      <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
        <div className="space-y-2">
          <p>✅ <span className="font-medium">{t("pricing.notes.completeFootprint").split(" - ")[0]}</span> - {t("pricing.notes.completeFootprint").split(" - ")[1]}</p>
          <p>✅ <span className="font-medium">{t("pricing.notes.twoRevisions").split(" - ")[0]}</span> - {t("pricing.notes.twoRevisions").split(" - ")[1]}</p>
          <p>✅ <span className="font-medium">{t("pricing.notes.automatedReport").split(" - ")[0]}</span> - {t("pricing.notes.automatedReport").split(" - ")[1]}</p>
        </div>
        <div className="space-y-2">
          <p>✅ <span className="font-medium">{t("pricing.notes.humanVerification").split(" - ")[0]}</span> - {t("pricing.notes.humanVerification").split(" - ")[1]}</p>
          <p>✅ <span className="font-medium">{t("pricing.notes.delivery2Days").split(" - ")[0]}</span> - {t("pricing.notes.delivery2Days").split(" - ")[1]}</p>
          <p>✅ <span className="font-medium">{t("pricing.notes.customerSupport").split(" - ")[0]}</span> - {t("pricing.notes.customerSupport").split(" - ")[1]}</p>
        </div>
      </div>
    </div>
  );
};
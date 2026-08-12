import React from "react";
import { useTranslation } from "react-i18next";
import { Target } from "lucide-react";

export const BilanCarboneWhySection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              {t("bilanCarboneLanding.why.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto whitespace-pre-line">
              {t("bilanCarboneLanding.why.text")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};


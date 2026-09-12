import React from "react";
import { useTranslation } from "react-i18next";
import { Target } from "lucide-react";

export const CollectLandingWhySection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-[4px] mb-6">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              {t("collectLanding.why.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
              {t("collectLanding.why.intro")}
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              {t("collectLanding.why.text")}
            </p>
            <p className="text-lg text-foreground font-medium max-w-2xl mx-auto">
              {t("collectLanding.why.benefit")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};


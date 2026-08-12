import React from "react";
import { useTranslation } from "react-i18next";
import { Target } from "lucide-react";

export const ACVLandingWhySection: React.FC = () => {
  const { t } = useTranslation();
  const reasons = t("acvLanding.why.reasons", { returnObjects: true });
  const reasonsArray = Array.isArray(reasons) ? reasons : [];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              {t("acvLanding.why.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              {t("acvLanding.why.text")}
            </p>
          </div>
          
          <ul className="space-y-4 max-w-2xl mx-auto">
            {reasonsArray.map((reason: string, index: number) => (
              <li key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                </div>
                <span className="text-foreground">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};


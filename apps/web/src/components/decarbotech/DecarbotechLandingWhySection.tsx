import React from "react";
import { useTranslation } from "react-i18next";
import { Target } from "lucide-react";

export const DecarbotechLandingWhySection: React.FC = () => {
  const { t } = useTranslation();
  const requirements = t("decarbotechLanding.why.requirements", { returnObjects: true });
  const requirementsArray = Array.isArray(requirements) ? requirements : [];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-[4px] mb-6">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              {t("decarbotechLanding.why.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
              {t("decarbotechLanding.why.text1")}
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              {t("decarbotechLanding.why.text2")}
            </p>
          </div>
          
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-foreground mb-6 text-center">
              {t("decarbotechLanding.why.requirementsTitle")}
            </h3>
            <ul className="space-y-4 max-w-2xl mx-auto">
              {requirementsArray.map((requirement: string, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                  </div>
                  <span className="text-foreground">{requirement}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-primary/5 p-6 rounded-xl border border-primary/20 text-center">
            <p className="text-foreground font-medium">
              {t("decarbotechLanding.why.conclusion")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};


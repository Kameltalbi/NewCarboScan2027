import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Database, Calculator, Zap, Target } from "lucide-react";

export const DecarbotechLandingIntegrationSection: React.FC = () => {
  const { t } = useTranslation();
  const steps = t("decarbotechLanding.integration.steps", { returnObjects: true });
  const stepsArray = Array.isArray(steps) ? steps : [];
  const descriptions = t("decarbotechLanding.integration.descriptions", { returnObjects: true });
  const descriptionsArray = Array.isArray(descriptions) ? descriptions : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Database,
    Calculator,
    Zap,
    Target,
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("decarbotechLanding.integration.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
              {t("decarbotechLanding.integration.subtitle")}
            </p>
          </div>
          
          <div className="mb-12">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              {stepsArray.map((step: { icon: string; text: string }, index: number) => {
                const IconComponent = iconMap[step.icon] || Database;
                return (
                  <React.Fragment key={index}>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-20 h-20 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                        <IconComponent className="w-10 h-10 text-primary" />
                      </div>
                      <p className="text-foreground font-semibold text-lg">{step.text}</p>
                    </div>
                    {index < stepsArray.length - 1 && (
                      <ArrowRight className="w-8 h-8 text-primary hidden md:block" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {descriptionsArray.map((description: string, index: number) => (
              <div
                key={index}
                className="bg-gray-50 p-6 rounded-xl border border-gray-200"
              >
                <p className="text-foreground">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-primary/5 p-6 rounded-xl border border-primary/20 text-center">
            <p className="text-foreground font-semibold text-lg">
              {t("decarbotechLanding.integration.conclusion")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};


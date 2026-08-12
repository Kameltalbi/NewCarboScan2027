import React from "react";
import { useTranslation } from "react-i18next";
import { Award, Settings, Database } from "lucide-react";

export const ACVLandingMethodologySection: React.FC = () => {
  const { t } = useTranslation();
  const standards = t("acvLanding.methodology.standards", { returnObjects: true });
  const standardsArray = Array.isArray(standards) ? standards : [];
  const approaches = t("acvLanding.methodology.approaches", { returnObjects: true });
  const approachesArray = Array.isArray(approaches) ? approaches : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Award,
    Settings,
    Database,
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              {t("acvLanding.methodology.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t("acvLanding.methodology.subtitle")}
            </p>
          </div>
          
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-foreground mb-6">
              {t("acvLanding.methodology.standardsTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {standardsArray.map((standard: { icon: string; text: string }, index: number) => {
                const IconComponent = iconMap[standard.icon] || Award;
                return (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-xl border border-primary/20"
                  >
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-foreground font-medium">{standard.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold text-foreground mb-6">
              {t("acvLanding.methodology.approachesTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {approachesArray.map((approach: string, index: number) => (
                <div
                  key={index}
                  className="bg-gray-50 p-6 rounded-xl border border-gray-200"
                >
                  <p className="text-foreground font-medium">{approach}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary/5 p-6 rounded-xl border border-primary/20">
            <p className="text-foreground text-center">
              {t("acvLanding.methodology.databasesNote")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};


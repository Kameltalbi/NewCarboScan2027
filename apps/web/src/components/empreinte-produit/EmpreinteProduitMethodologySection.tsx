import React from "react";
import { useTranslation } from "react-i18next";
import { FileText, Award, Database, Settings } from "lucide-react";

export const EmpreinteProduitMethodologySection: React.FC = () => {
  const { t } = useTranslation();
  const standards = t("empreinteProduitLanding.methodology.standards", { returnObjects: true });
  const standardsArray = Array.isArray(standards) ? standards : [];
  const approaches = t("empreinteProduitLanding.methodology.approaches", { returnObjects: true });
  const approachesArray = Array.isArray(approaches) ? approaches : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    FileText,
    Award,
    Database,
    Settings,
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              {t("empreinteProduitLanding.methodology.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t("empreinteProduitLanding.methodology.subtitle")}
            </p>
          </div>
          
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-foreground mb-6">
              {t("empreinteProduitLanding.methodology.standardsTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {standardsArray.map((standard: { icon: string; text: string }, index: number) => {
                const IconComponent = iconMap[standard.icon] || FileText;
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

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-6">
              {t("empreinteProduitLanding.methodology.approachesTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>
      </div>
    </section>
  );
};


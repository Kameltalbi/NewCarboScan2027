import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Package, Factory, Box, Truck, Recycle, Zap, Droplet, Wind, Database, Trash2, Target } from "lucide-react";

export const ACVLandingBenefitsSection: React.FC = () => {
  const { t } = useTranslation();
  const analyses = t("acvLanding.benefits.analyses", { returnObjects: true });
  const analysesArray = Array.isArray(analyses) ? analyses : [];
  const results = t("acvLanding.benefits.results", { returnObjects: true });
  const resultsArray = Array.isArray(results) ? results : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Package,
    Factory,
    Box,
    Truck,
    Recycle,
    Zap,
    Droplet,
    Wind,
    Database,
    Trash2,
    Target,
  };

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("acvLanding.benefits.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t("acvLanding.benefits.subtitle")}
            </p>
          </div>
          
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-foreground mb-6 text-center">
              {t("acvLanding.benefits.analysesTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analysesArray.map((analysis: { icon: string; text: string }, index: number) => {
                const IconComponent = iconMap[analysis.icon] || Package;
                return (
                  <div
                    key={index}
                    className="bg-white p-6 rounded-xl shadow-soft hover:shadow-medium transition-all duration-300 border border-gray-100"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-foreground font-medium">{analysis.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-6 text-center">
              {t("acvLanding.benefits.resultsTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resultsArray.map((result: { icon: string; text: string }, index: number) => {
                const IconComponent = iconMap[result.icon] || Target;
                return (
                  <div
                    key={index}
                    className="bg-white p-6 rounded-xl shadow-soft hover:shadow-medium transition-all duration-300 border border-gray-100"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-foreground font-medium">{result.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


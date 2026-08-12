import React from "react";
import { useTranslation } from "react-i18next";
import { FileText, BarChart3, Building2, Eye, Award, Shield } from "lucide-react";

export const BilanCarboneMethodologySection: React.FC = () => {
  const { t } = useTranslation();
  const methodologyPoints = t("bilanCarboneLanding.methodology.points", { returnObjects: true });
  const methodologyArray = Array.isArray(methodologyPoints) ? methodologyPoints : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    FileText,
    BarChart3,
    Building2,
    Eye,
    Award,
    Shield,
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              {t("bilanCarboneLanding.methodology.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t("bilanCarboneLanding.methodology.description")}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {methodologyArray.map((point: { icon: string; title: string }, index: number) => {
              const IconComponent = iconMap[point.icon] || FileText;
              return (
                <div
                  key={index}
                  className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-xl border border-primary/20"
                >
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{point.title}</h3>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};


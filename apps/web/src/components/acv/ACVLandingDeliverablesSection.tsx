import React from "react";
import { useTranslation } from "react-i18next";
import { FileText, BarChart, Target, Lightbulb, FileDown, GitCompare, TrendingDown } from "lucide-react";

export const ACVLandingDeliverablesSection: React.FC = () => {
  const { t } = useTranslation();
  const deliverables = t("acvLanding.deliverables.items", { returnObjects: true });
  const deliverablesArray = Array.isArray(deliverables) ? deliverables : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    FileText,
    BarChart,
    Target,
    Lightbulb,
    FileDown,
    GitCompare,
    TrendingDown,
  };

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("acvLanding.deliverables.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t("acvLanding.deliverables.subtitle")}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {deliverablesArray.map((deliverable: { icon: string; title: string }, index: number) => {
              const IconComponent = iconMap[deliverable.icon] || FileText;
              return (
                <div
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-soft hover:shadow-medium transition-all duration-300 border border-gray-100"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{deliverable.title}</h3>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};


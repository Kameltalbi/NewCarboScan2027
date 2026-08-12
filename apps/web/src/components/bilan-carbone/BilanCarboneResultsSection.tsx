import React from "react";
import { useTranslation } from "react-i18next";
import { TrendingDown, PieChart, BarChart, Target, Lightbulb, FileDown } from "lucide-react";

export const BilanCarboneResultsSection: React.FC = () => {
  const { t } = useTranslation();
  const results = t("bilanCarboneLanding.results.items", { returnObjects: true });
  const resultsArray = Array.isArray(results) ? results : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    TrendingDown,
    PieChart,
    BarChart,
    Target,
    Lightbulb,
    FileDown,
  };

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("bilanCarboneLanding.results.title")}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resultsArray.map((result: { icon: string; title: string }, index: number) => {
              const IconComponent = iconMap[result.icon] || TrendingDown;
              return (
                <div
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-soft hover:shadow-medium transition-all duration-300 border border-gray-100"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{result.title}</h3>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};


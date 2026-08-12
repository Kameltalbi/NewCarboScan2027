import React from "react";
import { useTranslation } from "react-i18next";
import { FileText, BarChart, Target, Lightbulb, FileDown, Package } from "lucide-react";

export const EmpreinteProduitDeliverablesSection: React.FC = () => {
  const { t } = useTranslation();
  const deliverables = t("empreinteProduitLanding.deliverables.items", { returnObjects: true });
  const deliverablesArray = Array.isArray(deliverables) ? deliverables : [];
  const breakdown = t("empreinteProduitLanding.deliverables.breakdown", { returnObjects: true });
  const breakdownArray = Array.isArray(breakdown) ? breakdown : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    FileText,
    BarChart,
    Target,
    Lightbulb,
    FileDown,
    Package,
  };

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("empreinteProduitLanding.deliverables.title")}
            </h2>
          </div>
          
          <div className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-6">
              {t("empreinteProduitLanding.deliverables.breakdownTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {breakdownArray.map((item: string, index: number) => (
                <div
                  key={index}
                  className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3"
                >
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <p className="text-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


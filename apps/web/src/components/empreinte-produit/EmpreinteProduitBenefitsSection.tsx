import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Calculator, TrendingDown, Package, Truck, Recycle } from "lucide-react";

export const EmpreinteProduitBenefitsSection: React.FC = () => {
  const { t } = useTranslation();
  const calculations = t("empreinteProduitLanding.benefits.calculations", { returnObjects: true });
  const calculationsArray = Array.isArray(calculations) ? calculations : [];
  const advantages = t("empreinteProduitLanding.benefits.advantages", { returnObjects: true });
  const advantagesArray = Array.isArray(advantages) ? advantages : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Calculator,
    TrendingDown,
    Package,
    Truck,
    Recycle,
  };

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("empreinteProduitLanding.benefits.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t("empreinteProduitLanding.benefits.subtitle")}
            </p>
          </div>
          
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-foreground mb-6 text-center">
              {t("empreinteProduitLanding.benefits.calculationsTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {calculationsArray.map((calc: { icon: string; text: string }, index: number) => {
                const IconComponent = iconMap[calc.icon] || Calculator;
                return (
                  <div
                    key={index}
                    className="bg-white p-6 rounded-xl shadow-soft hover:shadow-medium transition-all duration-300 border border-gray-100"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-foreground font-medium">{calc.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-6 text-center">
              {t("empreinteProduitLanding.benefits.advantagesTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {advantagesArray.map((advantage: string, index: number) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-soft hover:shadow-medium transition-all duration-300 border border-gray-100"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-foreground font-medium">{advantage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


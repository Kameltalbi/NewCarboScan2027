import React from "react";
import { useTranslation } from "react-i18next";
import { Target, TrendingDown, DollarSign, Calendar, BarChart } from "lucide-react";

export const DecarbotechLandingPlansSection: React.FC = () => {
  const { t } = useTranslation();
  const planItems = t("decarbotechLanding.plans.items", { returnObjects: true });
  const planItemsArray = Array.isArray(planItems) ? planItems : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Target,
    TrendingDown,
    DollarSign,
    DollarSign2: DollarSign, // Alias for second DollarSign usage (investment costs)
    Calendar,
    BarChart,
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("decarbotechLanding.plans.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t("decarbotechLanding.plans.subtitle")}
            </p>
          </div>
          
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-foreground mb-6">
              {t("decarbotechLanding.plans.itemsTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {planItemsArray.map((item: { icon: string; text: string }, index: number) => {
                const IconComponent = iconMap[item.icon] || Target;
                return (
                  <div
                    key={index}
                    className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex items-start gap-4"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-foreground font-medium">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-primary/5 p-6 rounded-xl border border-primary/20 text-center">
            <p className="text-foreground font-medium">
              {t("decarbotechLanding.plans.conclusion")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};


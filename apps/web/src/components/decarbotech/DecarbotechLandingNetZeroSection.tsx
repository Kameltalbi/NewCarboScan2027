import React from "react";
import { useTranslation } from "react-i18next";
import { Target, Calendar, BarChart, TrendingDown, Shield, CheckCircle2 } from "lucide-react";

export const DecarbotechLandingNetZeroSection: React.FC = () => {
  const { t } = useTranslation();
  const features = t("decarbotechLanding.netZero.items", { returnObjects: true });
  const featuresArray = Array.isArray(features) ? features : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Target,
    Calendar,
    BarChart,
    TrendingDown,
    Shield,
    Shield2: Shield, // Alias for second Shield usage
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("decarbotechLanding.netZero.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t("decarbotechLanding.netZero.subtitle")}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuresArray.map((feature: { icon: string; text: string }, index: number) => {
              const IconComponent = iconMap[feature.icon] || Target;
              return (
                <div
                  key={index}
                  className="bg-gray-50 p-6 rounded-xl border border-gray-200"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-foreground font-medium">{feature.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};


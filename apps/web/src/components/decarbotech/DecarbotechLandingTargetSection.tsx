import React from "react";
import { useTranslation } from "react-i18next";
import { Factory, Package, Settings, Network, Building2, Wheat, UtensilsCrossed } from "lucide-react";

export const DecarbotechLandingTargetSection: React.FC = () => {
  const { t } = useTranslation();
  const targets = t("decarbotechLanding.target.items", { returnObjects: true });
  const targetsArray = Array.isArray(targets) ? targets : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Factory,
    Package,
    Settings,
    Network,
    Building2,
    Wheat,
    UtensilsCrossed,
  };

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("decarbotechLanding.target.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
              {t("decarbotechLanding.target.subtitle")}
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {targetsArray.map((target: { icon: string; name: string }, index: number) => {
              const IconComponent = iconMap[target.icon] || Factory;
              return (
                <div
                  key={index}
                  className="flex flex-col items-center p-6 bg-white rounded-xl hover:bg-primary/5 transition-all duration-300 border border-gray-100 shadow-soft"
                >
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-center font-medium text-foreground">{target.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};


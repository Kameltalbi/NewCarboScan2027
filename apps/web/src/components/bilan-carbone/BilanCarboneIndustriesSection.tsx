import React from "react";
import { useTranslation } from "react-i18next";
import { Factory, Building2, ShoppingCart, Briefcase, Truck, Wheat } from "lucide-react";

export const BilanCarboneIndustriesSection: React.FC = () => {
  const { t } = useTranslation();
  const industries = t("bilanCarboneLanding.industries.items", { returnObjects: true });
  const industriesArray = Array.isArray(industries) ? industries : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Factory,
    Building2,
    ShoppingCart,
    Briefcase,
    Truck,
    Wheat,
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("bilanCarboneLanding.industries.title")}
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {industriesArray.map((industry: { icon: string; name: string }, index: number) => {
              const IconComponent = iconMap[industry.icon] || Factory;
              return (
                <div
                  key={index}
                  className="flex flex-col items-center p-6 bg-gray-50 rounded-xl hover:bg-primary/5 transition-all duration-300 border border-gray-100"
                >
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-center font-medium text-foreground">{industry.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};


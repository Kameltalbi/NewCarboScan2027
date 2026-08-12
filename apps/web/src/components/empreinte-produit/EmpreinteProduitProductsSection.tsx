import React from "react";
import { useTranslation } from "react-i18next";
import { Factory, Building2, Apple, Cpu, Box, Wheat, Sofa } from "lucide-react";

export const EmpreinteProduitProductsSection: React.FC = () => {
  const { t } = useTranslation();
  const products = t("empreinteProduitLanding.products.items", { returnObjects: true });
  const productsArray = Array.isArray(products) ? products : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Factory,
    Building2,
    Apple,
    Cpu,
    Box,
    Wheat,
    Sofa,
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("empreinteProduitLanding.products.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t("empreinteProduitLanding.products.subtitle")}
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {productsArray.map((product: { icon: string; name: string }, index: number) => {
              const IconComponent = iconMap[product.icon] || Factory;
              return (
                <div
                  key={index}
                  className="flex flex-col items-center p-6 bg-gray-50 rounded-xl hover:bg-primary/5 transition-all duration-300 border border-gray-100"
                >
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-center font-medium text-foreground">{product.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};


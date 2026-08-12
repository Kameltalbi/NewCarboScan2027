import React from "react";
import { Gauge, FileCheck, TrendingDown, Euro } from "lucide-react";
import { useTranslation } from "react-i18next";

export const CarboScanBenefits: React.FC = () => {
  const { t } = useTranslation();

  const benefits = [
    {
      icon: Gauge,
      title: t("benefits.benefit1.title"),
      description: t("benefits.benefit1.description")
    },
    {
      icon: FileCheck,
      title: t("benefits.benefit2.title"),
      description: t("benefits.benefit2.description")
    },
    {
      icon: TrendingDown,
      title: t("benefits.benefit3.title"),
      description: t("benefits.benefit3.description")
    },
    {
      icon: Euro,
      title: t("benefits.benefit4.title"),
      description: t("benefits.benefit4.description")
    }
  ];
  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            {t("benefits.title")}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t("benefits.subtitle")}
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
            >
              <div className="w-12 h-12 bg-green-accent/10 rounded-lg flex items-center justify-center mb-4">
                <benefit.icon className="w-6 h-6 text-green-accent" />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-3">
                {benefit.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
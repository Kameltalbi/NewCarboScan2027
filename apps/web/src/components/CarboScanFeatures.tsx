import React from "react";
import { useTranslation } from "react-i18next";

export const CarboScanFeatures: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    {
      title: t("features.feature1.title"),
      description: t("features.feature1.description")
    },
    {
      title: `📄 ${t("features.feature2.title")}`, 
      description: t("features.feature2.description")
    },
    {
      title: `🔍 ${t("features.feature3.title")}`,
      description: t("features.feature3.description")
    }
  ];
  return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("features.title")} <span className="text-primary">{t("features.titleHighlight")}</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("features.subtitle")}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
              <h3 className={`text-lg font-semibold mb-4 text-center ${index === 1 ? 'text-[#00BECB]' : 'text-foreground'}`}>
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed text-center">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
import React from "react";
import { useTranslation } from "react-i18next";
import { Shield, Zap, Globe, Target } from "lucide-react";

export const EmpreinteProduitWhyCarboScanSection: React.FC = () => {
  const { t } = useTranslation();
  const points = t("empreinteProduitLanding.whyCarboScan.points", { returnObjects: true });
  const pointsArray = Array.isArray(points) ? points : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Shield,
    Zap,
    Globe,
    Target,
  };

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("empreinteProduitLanding.whyCarboScan.title")}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pointsArray.map((point: { icon: string; text: string }, index: number) => {
              const IconComponent = iconMap[point.icon] || Shield;
              return (
                <div
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-soft hover:shadow-medium transition-all duration-300 border border-gray-100"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-foreground font-medium">{point.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};


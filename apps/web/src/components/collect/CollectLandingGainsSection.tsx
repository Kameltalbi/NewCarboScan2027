import React from "react";
import { useTranslation } from "react-i18next";
import { TrendingDown, ShieldCheck, Users, Database, Zap, CheckCircle2 } from "lucide-react";

export const CollectLandingGainsSection: React.FC = () => {
  const { t } = useTranslation();
  const gains = t("collectLanding.gains.items", { returnObjects: true });
  const gainsArray = Array.isArray(gains) ? gains : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    TrendingDown,
    ShieldCheck,
    Users,
    Database,
    Zap,
  };

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("collectLanding.gains.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t("collectLanding.gains.subtitle")}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gainsArray.map((gain: { icon: string; text: string }, index: number) => {
              const IconComponent = iconMap[gain.icon] || TrendingDown;
              return (
                <div
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-soft hover:shadow-medium transition-all duration-300 border border-gray-100"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-foreground font-medium">{gain.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};


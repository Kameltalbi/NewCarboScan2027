import React from "react";
import { useTranslation } from "react-i18next";
import { FileText, Target, TrendingUp, Lightbulb, Zap, Settings, Wrench } from "lucide-react";

export const DecarbotechLandingActionsSection: React.FC = () => {
  const { t } = useTranslation();
  const actions = t("decarbotechLanding.actions.items", { returnObjects: true });
  const actionsArray = Array.isArray(actions) ? actions : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    FileText,
    Target,
    TrendingUp,
    Lightbulb,
    Zap,
    Settings,
    Wrench,
  };

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("decarbotechLanding.actions.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t("decarbotechLanding.actions.subtitle")}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {actionsArray.map((action: { icon: string; text: string }, index: number) => {
              const IconComponent = iconMap[action.icon] || FileText;
              return (
                <div
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-soft hover:shadow-medium transition-all duration-300 border border-gray-100"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-foreground font-medium">{action.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};


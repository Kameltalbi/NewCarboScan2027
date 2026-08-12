import React from "react";
import { useTranslation } from "react-i18next";
import { Factory, Globe, Building2, Briefcase } from "lucide-react";

export const HowItWorksSection: React.FC = () => {
  const { t } = useTranslation();

  const audiences = [
    { icon: Factory, key: "industrial" },
    { icon: Globe, key: "exporters" },
    { icon: Building2, key: "multiSite" },
    { icon: Briefcase, key: "consulting" },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-card">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            {t("newHomepage.audience.title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {audiences.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="bg-background p-8 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 border border-border"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-5">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {t(`newHomepage.audience.cards.${item.key}.title`)}
                </h3>
                <p className="text-muted-foreground">
                  {t(`newHomepage.audience.cards.${item.key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

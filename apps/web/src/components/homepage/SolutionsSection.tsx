import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Package, Leaf, Database, Zap, Target, Shield } from "lucide-react";

export const SolutionsSection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const solutions = [
    {
      icon: Building2,
      key: "bilanCarbone",
      route: "/bilan-carbone",
    },
    {
      icon: Package,
      key: "empreinteProduit",
      route: "/empreinte-produit",
    },
    {
      icon: Leaf,
      key: "acv",
      route: "/acv-landing",
    },
    {
      icon: Shield,
      key: "cbam",
      route: "/cbam",
    },
    {
      icon: Database,
      key: "collect",
      route: "/collect",
    },
    {
      icon: Target,
      key: "decarbotech",
      route: "/decarbotech",
    },
  ];

  return (
    <section id="solutions" className="py-24 bg-[#F5F7FA]">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            {t("newHomepage.solutions.title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {solutions.map((solution) => {
            const Icon = solution.icon;
            return (
              <div
                key={solution.key}
                className="bg-white p-6 rounded-xl shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 flex flex-col"
              >
                <div className="w-12 h-12 bg-[#1ABC9C]/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-[#1ABC9C]" />
                </div>
                <h3 className="text-xl font-bold text-[#1F2937] mb-3">
                  {t(`newHomepage.solutions.items.${solution.key}.title`)}
                </h3>
                <p className="text-[#6B7280] mb-6 flex-grow whitespace-pre-line">
                  {t(`newHomepage.solutions.items.${solution.key}.description`)}
                </p>
                <Button
                  className="w-full justify-between group text-white border-0 shadow-sm rounded-[10px]"
                  style={{ background: 'linear-gradient(135deg, #1ABC9C 0%, #0F172A 100%)' }}
                  onClick={() => navigate(solution.route)}
                >
                  <span>{t(`newHomepage.solutions.items.${solution.key}.cta`)}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};


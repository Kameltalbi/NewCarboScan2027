import React from "react";
import { ClipboardList, BarChart3, Target } from "lucide-react";
import { useTranslation } from "react-i18next";

export const CarboScanHowItWorks: React.FC = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: ClipboardList,
      title: t("howItWorks.step1.title"),
      description: t("howItWorks.step1.description")
    },
    {
      icon: BarChart3,
      title: t("howItWorks.step2.title"),
      description: t("howItWorks.step2.description")
    },
    {
      icon: Target,
      title: t("howItWorks.step3.title"),
      description: t("howItWorks.step3.description")
    }
  ];
  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            {t("howItWorks.title")}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t("howItWorks.subtitle")}
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-blue-primary/30 to-green-accent/30 z-0"></div>
                )}
                
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-primary to-green-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h3 className="text-xl font-semibold text-primary mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
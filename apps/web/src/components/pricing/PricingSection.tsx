import React from "react";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PricingNotes } from "./PricingNotes";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const PLAN_META = [
  { key: "essentiel", price: "1900 DT", color: "#2ECC71", borderColor: "border-green-200" },
  { key: "pro", price: "2900 DT", color: "#00BECB", borderColor: "border-blue-200", popular: true },
  { key: "expert", price: null, color: "#2C3E50", borderColor: "border-gray-200" },
];

export const PricingSection: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const handlePlanSelection = (planKey: string) => {
    if (planKey === "expert") navigate('/contact');
    else if (user) navigate('/carbo-start');
    else navigate('/inscription');
  };

  return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('pricingSection.titleLead')} <span className="text-primary">CarboScan</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">{t('pricingSection.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PLAN_META.map((meta) => {
            const features = t(`pricingSection.plans.${meta.key}.features`, { returnObjects: true }) as string[];
            const notIncluded = t(`pricingSection.plans.${meta.key}.notIncluded`, { returnObjects: true }) as string[];
            const price = meta.price ?? t('pricingSection.customQuote');
            const period = meta.price ? t('pricingSection.perYear') : "";
            return (
              <div key={meta.key} className={`relative bg-white rounded-2xl shadow-lg border-2 ${meta.borderColor} p-8 transition-all duration-300 hover:shadow-xl ${meta.popular ? 'scale-105' : ''}`}>
                {meta.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                      {t('pricingSection.recommended')}
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold mb-2" style={{ color: meta.color }}>
                    {t(`pricingSection.plans.${meta.key}.name`)}
                  </h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-800">{price}</span>
                    <span className="text-gray-500 ml-1">{period}</span>
                  </div>
                  <p className="text-sm text-gray-600">{t(`pricingSection.plans.${meta.key}.target`)}</p>
                </div>

                <div className="space-y-4 mb-8">
                  {Array.isArray(features) && features.map((feature, idx) => (
                    <div key={idx} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                  {Array.isArray(notIncluded) && notIncluded.map((feature, idx) => (
                    <div key={idx} className="flex items-start">
                      <X className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-400 italic">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button className="w-full text-white font-semibold" style={{ backgroundColor: meta.color }} onClick={() => handlePlanSelection(meta.key)}>
                  {t('pricingSection.choosePlan')}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <a href="/contact" className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors duration-200">
            {t('pricingSection.talkExpert')}
          </a>
        </div>

        <PricingNotes />
      </div>
    </section>
  );
};

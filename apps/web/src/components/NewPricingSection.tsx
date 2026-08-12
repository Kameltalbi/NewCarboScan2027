import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const NewPricingSection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handlePlanClick = (planIndex: number) => {
    switch(planIndex) {
      case 0: // Essential
        navigate('/payment?plan=essentiel');
        break;
      case 1: // Pro
        navigate('/payment?plan=pro');
        break;
      case 2: // Expert
        navigate('/contact');
        break;
      case 3: // Net Zero
        navigate('/contact');
        break;
    }
  };

  const plans = [
    {
      name: t("newHomepage.pricing.plans.essential.name"),
      description: t("newHomepage.pricing.plans.essential.description"),
      price: t("newHomepage.pricing.plans.essential.price"),
      currency: t("newHomepage.pricing.plans.essential.currency"),
      period: t("newHomepage.pricing.plans.essential.period"),
      features: [
        t("newHomepage.pricing.plans.essential.features.auditScopes12"),
        t("newHomepage.pricing.plans.essential.features.reportFREN"),
        t("newHomepage.pricing.plans.essential.features.aiGenerated"),
        t("newHomepage.pricing.plans.essential.features.economicSimulation"),
        t("newHomepage.pricing.plans.essential.features.recommendations"),
        t("newHomepage.pricing.plans.essential.features.twoRevisions"),
        t("newHomepage.pricing.plans.essential.features.validatedReport")
      ],
      cta: t("newHomepage.pricing.plans.essential.cta"),
      popular: false
    },
    {
      name: t("newHomepage.pricing.plans.pro.name"),
      description: t("newHomepage.pricing.plans.pro.description"),
      price: t("newHomepage.pricing.plans.pro.price"),
      currency: t("newHomepage.pricing.plans.pro.currency"),
      period: t("newHomepage.pricing.plans.pro.period"),
      features: [
        t("newHomepage.pricing.plans.pro.features.emissionsTracking"),
        t("newHomepage.pricing.plans.pro.features.auditScopes123"),
        t("newHomepage.pricing.plans.pro.features.bilingualReport"),
        t("newHomepage.pricing.plans.pro.features.aiGeneratedADEME"),
        t("newHomepage.pricing.plans.pro.features.economicSimulationScenarios"),
        t("newHomepage.pricing.plans.pro.features.detailedRecommendations"),
        t("newHomepage.pricing.plans.pro.features.reductionPlan"),
        t("newHomepage.pricing.plans.pro.features.twoRevisions"),
        t("newHomepage.pricing.plans.pro.features.validatedReport")
      ],
      cta: t("newHomepage.pricing.plans.pro.cta"),
      popular: true
    },
    {
      name: t("newHomepage.pricing.plans.expert.name"),
      description: t("newHomepage.pricing.plans.expert.description"),
      price: t("newHomepage.pricing.plans.expert.price"),
      currency: t("newHomepage.pricing.plans.expert.currency"),
      period: t("newHomepage.pricing.plans.expert.period"),
      features: [
        t("newHomepage.pricing.plans.expert.features.comprehensiveAudit"),
        t("newHomepage.pricing.plans.expert.features.customReport"),
        t("newHomepage.pricing.plans.expert.features.strategicConsulting"),
        t("newHomepage.pricing.plans.expert.features.implementationSupport"),
        t("newHomepage.pricing.plans.expert.features.trainingSessions"),
        t("newHomepage.pricing.plans.expert.features.prioritySupport")
      ],
      cta: t("newHomepage.pricing.plans.expert.cta"),
      popular: false
    },
    {
      name: t("newHomepage.pricing.plans.netZero.name"),
      description: t("newHomepage.pricing.plans.netZero.description"),
      price: t("newHomepage.pricing.plans.netZero.price"),
      currency: t("newHomepage.pricing.plans.netZero.currency"),
      period: t("newHomepage.pricing.plans.netZero.period"),
      features: [
        t("newHomepage.pricing.plans.netZero.features.scopesAnalysis"),
        t("newHomepage.pricing.plans.netZero.features.physicalScope3"),
        t("newHomepage.pricing.plans.netZero.features.climateStrategy"),
        t("newHomepage.pricing.plans.netZero.features.advancedActionPlans"),
        t("newHomepage.pricing.plans.netZero.features.reductionTrajectory"),
        t("newHomepage.pricing.plans.netZero.features.actionPlanWorkshop"),
        t("newHomepage.pricing.plans.netZero.features.workshopInclusion"),
        t("newHomepage.pricing.plans.netZero.features.employeeEngagement"),
        t("newHomepage.pricing.plans.netZero.features.supplierEngagement"),
        t("newHomepage.pricing.plans.netZero.features.quantificationTool")
      ],
      cta: t("newHomepage.pricing.plans.netZero.cta"),
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-muted">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-5">
            {t("newHomepage.pricing.title")}
          </h2>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("newHomepage.pricing.subtitle")}
          </p>
        </div>


        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`bg-white rounded-[var(--radius)] p-10 shadow-soft transition-all duration-300 hover:-translate-y-2 hover:shadow-medium relative border-2 flex flex-col h-full ${
                plan.popular 
                  ? 'border-primary scale-105' 
                  : 'border-transparent'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-gradient-primary text-white px-5 py-2 rounded-full text-xs font-semibold">
                  {t("newHomepage.pricing.plans.pro.popular")}
                </div>
              )}

              {/* Card Header */}
              <div className="text-center mb-8">
                <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-4">
                  {plan.name}
                </h3>
                
                <div className="flex items-baseline justify-center gap-1 mb-2 flex-wrap">
                  {plan.currency && (
                    <span className="text-xs text-muted-foreground">{t("newHomepage.pricing.from")}</span>
                  )}
                  <span className="text-[26px] lg:text-[32px] font-extrabold text-primary">
                    {plan.price}
                  </span>
                  {plan.currency && (
                    <>
                      <span className="text-xs font-semibold text-muted-foreground">{plan.currency}</span>
                      <span className="text-xs text-muted-foreground">{plan.period}</span>
                    </>
                  )}
                </div>
                
                <p className="text-muted-foreground">{plan.description}</p>
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8 flex-grow">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div className="mt-auto">
                <Button 
                  onClick={() => handlePlanClick(index)}
                  className={`w-full py-3 sm:py-4 text-base sm:text-lg font-semibold transition-all duration-300 hover:-translate-y-1 ${
                    plan.popular
                      ? 'bg-gradient-primary hover:opacity-90 text-white shadow-medium hover:shadow-strong'
                      : 'bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white'
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  <span className="truncate">{plan.cta}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
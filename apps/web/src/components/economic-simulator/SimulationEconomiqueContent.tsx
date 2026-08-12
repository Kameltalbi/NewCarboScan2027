import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Calculator, Target, BarChart3, Zap, Shield, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const SimulationEconomiqueContent = () => {
  const { t } = useTranslation();
  
  const benefits = [
    {
      icon: <TrendingUp className="h-8 w-8 text-blue-600" />,
      title: t("economicSimulator.benefits.energyPrice.title"),
      description: t("economicSimulator.benefits.energyPrice.description"),
      highlight: t("economicSimulator.benefits.energyPrice.highlight")
    },
    {
      icon: <DollarSign className="h-8 w-8 text-emerald-600" />,
      title: t("economicSimulator.benefits.carbonTax.title"),
      description: t("economicSimulator.benefits.carbonTax.description"),
      highlight: t("economicSimulator.benefits.carbonTax.highlight")
    }
  ];

  const strategies = [
    {
      icon: <Zap className="h-6 w-6 text-emerald-600" />,
      title: t("economicSimulator.strategies.energyEfficiency.title"),
      description: t("economicSimulator.strategies.energyEfficiency.description")
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-blue-600" />,
      title: t("economicSimulator.strategies.modernization.title"), 
      description: t("economicSimulator.strategies.modernization.description")
    },
    {
      icon: <Shield className="h-6 w-6 text-emerald-600" />,
      title: t("economicSimulator.strategies.renewables.title"),
      description: t("economicSimulator.strategies.renewables.description")
    }
  ];

  const advantages = [
    {
      icon: <Target className="h-6 w-6 text-blue-600" />,
      title: t("economicSimulator.advantages.competitiveness.title"),
      description: t("economicSimulator.advantages.competitiveness.description")
    },
    {
      icon: <Shield className="h-6 w-6 text-emerald-600" />,
      title: t("economicSimulator.advantages.resilience.title"),
      description: t("economicSimulator.advantages.resilience.description")
    },
    {
      icon: <Calculator className="h-6 w-6 text-blue-600" />,
      title: t("economicSimulator.advantages.costManagement.title"),
      description: t("economicSimulator.advantages.costManagement.description")
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-primary-dark via-primary to-secondary overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-primary-light/20 blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-accent/20 blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {t("economicSimulator.title")}
            </h1>
            
            <p className="text-xl text-primary-light mb-8 leading-relaxed">
              {t("economicSimulator.subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Method Explanation */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-primary-light/10 to-accent/10 p-8 rounded-xl border border-primary/20">
              <div className="flex items-start space-x-4 mb-6">
                <Calculator className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("economicSimulator.method.title")}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {t("economicSimulator.method.description1")} 
                    <strong className="text-primary"> {t("economicSimulator.method.highlight")}</strong>.
                  </p>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {t("economicSimulator.method.description2")}
                  </p>
                  <p className="text-secondary font-medium">
                    {t("economicSimulator.method.description3")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Scenarios */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900">
            {t("economicSimulator.scenarios.title")}
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-primary to-accent mx-auto mb-12"></div>
          
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-primary-light/20 flex items-center justify-center">
                        {benefit.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{benefit.title}</h3>
                      <p className="text-gray-600 leading-relaxed mb-3">{benefit.description}</p>
                      <div className="flex items-center">
                        <ArrowUpRight className="h-5 w-5 text-accent mr-2" />
                        <p className="text-secondary font-medium text-sm">{benefit.highlight}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Strategic Opportunity */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900">
              {t("economicSimulator.opportunity.title")}
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-primary to-accent mx-auto mb-8"></div>
            
            <div className="text-center mb-12">
              <p className="text-lg text-gray-600 leading-relaxed">
                {t("economicSimulator.opportunity.description")} <strong className="text-accent">{t("economicSimulator.opportunity.roi")}</strong> :
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {strategies.map((strategy, index) => (
                <div key={index} className="text-center p-6 bg-gradient-to-br from-primary-light/10 to-accent/10 rounded-lg border border-primary/20">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-4 mx-auto shadow-sm">
                    {strategy.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{strategy.title}</h3>
                  <p className="text-sm text-gray-600">{strategy.description}</p>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-6 rounded-lg border border-emerald-200">
              <p className="text-gray-700 leading-relaxed text-center">
                {t("economicSimulator.opportunity.conclusion")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tunisian Context */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900">
              {t("economicSimulator.tunisianContext.title")}
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-primary to-accent mx-auto mb-8"></div>
            
            <div className="text-center mb-12">
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                {t("economicSimulator.tunisianContext.description1")} <strong className="text-blue-600">{t("economicSimulator.tunisianContext.highlight")}</strong>.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                {t("economicSimulator.tunisianContext.description2")}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {advantages.map((advantage, index) => (
                <Card key={index} className="text-center hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4 mx-auto">
                      {advantage.icon}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{advantage.title}</h3>
                    <p className="text-sm text-gray-600">{advantage.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-700 to-emerald-600">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t("economicSimulator.cta.title")}
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              {t("economicSimulator.cta.description")}
            </p>
            
            <Button 
              size="lg"
              className="bg-white text-blue-700 hover:bg-blue-50 px-8 py-4 text-lg font-medium"
              onClick={() => window.location.href = '/contact'}
            >
              {t("economicSimulator.cta.button")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SimulationEconomiqueContent;
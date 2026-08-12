import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, BarChart3, Target, FileText, Calculator, TrendingUp, Zap, Users, Award } from "lucide-react";
import { useTranslation } from "react-i18next";

const ComptabiliteCarbone = () => {
  const { t, i18n } = useTranslation();
  
  
  
  const keySteps = [
    {
      number: "1",
      title: t("carbonAccounting.steps.step1.title"),
      description: t("carbonAccounting.steps.step1.description"),
      icon: <Target className="h-6 w-6 text-emerald-600" />
    },
    {
      number: "2", 
      title: t("carbonAccounting.steps.step2.title"),
      description: t("carbonAccounting.steps.step2.description"),
      icon: <BarChart3 className="h-6 w-6 text-emerald-600" />
    },
    {
      number: "3",
      title: t("carbonAccounting.steps.step3.title"),
      description: t("carbonAccounting.steps.step3.description"),
      icon: <Calculator className="h-6 w-6 text-emerald-600" />
    },
    {
      number: "4",
      title: t("carbonAccounting.steps.step4.title"),
      description: t("carbonAccounting.steps.step4.description"),
      icon: <FileText className="h-6 w-6 text-emerald-600" />
    },
    {
      number: "5",
      title: t("carbonAccounting.steps.step5.title"),
      description: t("carbonAccounting.steps.step5.description"),
      icon: <TrendingUp className="h-6 w-6 text-emerald-600" />
    },
    {
      number: "6",
      title: t("carbonAccounting.steps.step6.title"),
      description: t("carbonAccounting.steps.step6.description"),
      icon: <Zap className="h-6 w-6 text-emerald-600" />
    },
    {
      number: "7",
      title: t("carbonAccounting.steps.step7.title"),
      description: t("carbonAccounting.steps.step7.description"),
      icon: <Award className="h-6 w-6 text-emerald-600" />
    }
  ];

  const serviceLevel = [
    {
      title: t("carbonAccounting.serviceLevels.essential.title"),
      description: t("carbonAccounting.serviceLevels.essential.description"),
      features: (t("carbonAccounting.serviceLevels.essential.features", { returnObjects: true }) as string[]) || []
    },
    {
      title: t("carbonAccounting.serviceLevels.pro.title"), 
      description: t("carbonAccounting.serviceLevels.pro.description"),
      features: (t("carbonAccounting.serviceLevels.pro.features", { returnObjects: true }) as string[]) || []
    },
    {
      title: t("carbonAccounting.serviceLevels.expert.title"),
      description: t("carbonAccounting.serviceLevels.expert.description"),
      features: (t("carbonAccounting.serviceLevels.expert.features", { returnObjects: true }) as string[]) || []
    }
  ];

  const advantages = [
    {
      icon: <CheckCircle className="h-8 w-8 text-emerald-600" />,
      title: t("carbonAccounting.advantages.methodology.title"),
      description: t("carbonAccounting.advantages.methodology.description")
    },
    {
      icon: <Users className="h-8 w-8 text-emerald-600" />,
      title: t("carbonAccounting.advantages.support.title"),
      description: t("carbonAccounting.advantages.support.description")
    },
    {
      icon: <Calculator className="h-8 w-8 text-emerald-600" />,
      title: t("carbonAccounting.advantages.simulator.title"), 
      description: t("carbonAccounting.advantages.simulator.description")
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-blue-900 via-blue-800 to-emerald-800 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-emerald-500/20 blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-blue-500/20 blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {t("carbonAccounting.title")}
            </h1>
            
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              {t("carbonAccounting.subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Key Steps Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900">
            {t("carbonAccounting.steps.title")}
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-blue-600 to-emerald-600 mx-auto mb-12"></div>
          
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {keySteps.map((step, index) => (
                <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-emerald-500">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                          {step.number}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {step.icon}
                          <h3 className="text-xl font-semibold text-gray-900 ml-2">{step.title}</h3>
                        </div>
                        <p className="text-gray-600 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Special highlight for step 2 */}
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-emerald-50 p-6 rounded-lg border border-emerald-200">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-emerald-800 mb-2">{t("carbonAccounting.steps.reliability.title")}</h4>
                  <p className="text-gray-700">{t("carbonAccounting.steps.reliability.description")}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-800 mb-2">{t("carbonAccounting.steps.support.title")}</h4>
                  <p className="text-gray-700">{t("carbonAccounting.steps.support.description")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Levels */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900">
            {t("carbonAccounting.serviceLevels.title")}
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-blue-600 to-emerald-600 mx-auto mb-12"></div>
          
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-gray-600 mb-8">
              {t("carbonAccounting.serviceLevels.description")}
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              {serviceLevel.map((service, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-emerald-700 mb-2">{service.title}</h3>
                    <p className="text-gray-600 mb-4">{service.description}</p>
                    <ul className="space-y-2">
                      {service.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center text-sm">
                          <CheckCircle className="h-4 w-4 text-emerald-500 mr-2 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why CarboScan */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900">
            {t("carbonAccounting.advantages.title")}
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-blue-600 to-emerald-600 mx-auto mb-12"></div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {advantages.map((advantage, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4 mx-auto">
                    {advantage.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{advantage.title}</h3>
                  <p className="text-gray-600">{advantage.description}</p>
                </div>
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
              {t("carbonAccounting.cta.title")}
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              {t("carbonAccounting.cta.description")}
            </p>
            
            <Button 
              size="lg"
              className="bg-white text-blue-700 hover:bg-blue-50 px-8 py-4 text-lg font-medium"
              onClick={() => window.location.href = '/contact'}
            >
              {t("carbonAccounting.cta.button")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ComptabiliteCarbone;
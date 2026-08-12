import React from "react";
import { ClipboardList, Brain, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

export const NewProcessSection: React.FC = () => {
  const { t } = useTranslation();

  const steps = [
    {
      number: "01",
      icon: ClipboardList,
      title: t("newHomepage.process.steps.step1.title"),
      description: t("newHomepage.process.steps.step1.description"),
      features: [t("newHomepage.process.steps.step1.features.adaptive"), t("newHomepage.process.steps.step1.features.time")]
    },
    {
      number: "02", 
      icon: Brain,
      title: t("newHomepage.process.steps.step2.title"),
      description: t("newHomepage.process.steps.step2.description"),
      features: [t("newHomepage.process.steps.step2.features.ml"), t("newHomepage.process.steps.step2.features.realTime")]
    },
    {
      number: "03",
      icon: TrendingUp,
      title: t("newHomepage.process.steps.step3.title"),
      description: t("newHomepage.process.steps.step3.description"),
      features: [t("newHomepage.process.steps.step3.features.ai"), t("newHomepage.process.steps.step3.features.action")]
    }
  ];

  return (
    <section id="process" className="py-24 lg:py-32 bg-muted">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-5">
            {t("newHomepage.process.title")}
          </h2>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("newHomepage.process.subtitle")}
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="bg-white p-10 rounded-[var(--radius)] shadow-soft transition-all duration-300 hover:-translate-y-2 hover:shadow-medium relative overflow-hidden group"
            >
              {/* Top Border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary"></div>

              {/* Step Number */}
              <div className="absolute top-5 right-5 text-5xl font-extrabold text-primary opacity-10">
                {step.number}
              </div>

              {/* Content */}
              <div className="relative z-10">
                {/* Icon */}
                <div className="w-20 h-20 bg-gradient-primary rounded-[20px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="w-8 h-8 text-white" />
                </div>

                {/* Title */}
                <h3 className="text-xl lg:text-2xl font-semibold text-foreground mb-4">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-muted-foreground leading-relaxed mb-5">
                  {step.description}
                </p>

                {/* Features */}
                <div className="flex gap-3 flex-wrap">
                  {step.features.map((feature, idx) => (
                    <span 
                      key={idx}
                      className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold border border-primary/20"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
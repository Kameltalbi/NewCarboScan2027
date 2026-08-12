import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";

export const ReliabilitySection: React.FC = () => {
  const { t } = useTranslation();

  const points = t("newHomepage.reliability.points", { returnObjects: true }) as string[];

  return (
    <section id="reliability" className="py-24 bg-[#0B2E24]">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            {t("newHomepage.reliability.title")}
          </h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.isArray(points) && points.map((point, index) => (
              <div
                key={index}
                className="flex items-start gap-3 bg-white/5 p-4 rounded-lg border border-white/10 backdrop-blur-sm"
              >
                <CheckCircle2 className="w-6 h-6 text-[#4ADE80] flex-shrink-0 mt-0.5" />
                <span className="text-white/85">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};



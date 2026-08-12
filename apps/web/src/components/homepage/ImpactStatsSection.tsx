import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

const STAT_VALUES = [65, 90, 75];

export const ImpactStatsSection: React.FC = () => {
  const { t } = useTranslation();
  const labels = t("homepage.impactStats.items", { returnObjects: true }) as string[];

  return (
    <section className="py-20 bg-[#0B2E24]">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl lg:text-4xl font-bold text-white text-center mb-14">
          {t("homepage.impactStats.title")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {STAT_VALUES.map((value, i) => (
            <div
              key={value}
              className="bg-white/[0.04] border border-white/5 rounded-2xl p-8 flex flex-col justify-between min-h-[260px]"
            >
              <p className="text-white/70 text-base leading-relaxed">
                {labels[i]}
              </p>
              <div className="flex items-end gap-2 mt-8">
                <AnimatedCounter target={value} suffix="%" prefix="-" />
                <ArrowDown className="w-6 h-6 text-[#22C55E] mb-3 animate-bounce" strokeWidth={3} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

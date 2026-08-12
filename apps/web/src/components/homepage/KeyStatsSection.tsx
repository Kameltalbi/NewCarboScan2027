import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, TrendingDown, Zap, ShieldCheck } from "lucide-react";

interface AnimatedNumberProps {
  value: string;
  suffix?: string;
  prefix?: string;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, suffix = "", prefix = "" }) => {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const num = parseInt(value);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const duration = 1500;
          const steps = 40;
          const increment = num / steps;
          const interval = setInterval(() => {
            start += increment;
            if (start >= num) {
              setDisplayed(num);
              clearInterval(interval);
            } else {
              setDisplayed(Math.floor(start));
            }
          }, duration / steps);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [num]);

  return (
    <div ref={ref} className="text-4xl md:text-5xl font-extrabold text-primary-foreground">
      {prefix}{displayed}{suffix}
    </div>
  );
};

export const KeyStatsSection: React.FC = () => {
  const { t } = useTranslation();

  const stats = [
    { icon: BarChart3, key: "scope3", value: "70", suffix: "%", prefix: "" },
    { icon: TrendingDown, key: "reduction", value: "30", suffix: "%", prefix: "" },
    { icon: Zap, key: "faster", value: "5", suffix: "x", prefix: "" },
    { icon: ShieldCheck, key: "compliant", value: "", suffix: "", prefix: "" },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-[#0E7C66] to-[#0a9f7f] text-white">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-16 text-white">
          {t("newHomepage.keyStats.title")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.key}
                className="text-center p-6 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm hover:bg-white/20 transition-all duration-300"
              >
                <div className="w-14 h-14 bg-white/15 rounded-xl flex items-center justify-center mx-auto mb-5">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                {stat.value ? (
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
                ) : (
                  <div className="text-4xl md:text-5xl font-extrabold text-white">✓</div>
                )}
                <p className="mt-3 text-white/90 text-sm font-medium leading-snug">
                  {t(`newHomepage.keyStats.stats.${stat.key}`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

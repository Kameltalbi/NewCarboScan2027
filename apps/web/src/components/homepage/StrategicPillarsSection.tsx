import React from "react";
import { ArrowRight, Building2, Landmark, Route } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const PILLARS = [
  {
    key: "enterprises" as const,
    icon: Building2,
    to: "/bilan-carbone",
  },
  {
    key: "finance" as const,
    icon: Landmark,
    to: "/bilan-carbone-finance",
  },
  {
    key: "transition" as const,
    icon: Route,
    to: "/strategie-decarbonation",
  },
] as const;

export const StrategicPillarsSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="bg-white py-16 md:py-24" aria-labelledby="strategic-pillars-title">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <h2
          id="strategic-pillars-title"
          className="font-hero-display max-w-3xl text-[32px] font-normal leading-[1.15] text-[#073D30] md:text-[44px]"
        >
          {t("homepage.pillars.title")}
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {PILLARS.map(({ key, icon: Icon, to }) => (
            <article
              key={key}
              className="flex h-full flex-col rounded-[4px] border border-[#E6EDE9] bg-[#FAFBF8] p-7 md:p-8"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E7F3EC] text-[#075C43]">
                <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#087354]">
                {t(`homepage.pillars.${key}.audience`)}
              </p>
              <h3 className="mt-2 text-[22px] font-semibold leading-snug text-[#073D30] md:text-[24px]">
                {t(`homepage.pillars.${key}.headline`)}
              </h3>
              <p className="mt-4 flex-1 text-[16px] leading-relaxed text-[#52615C]">
                {t(`homepage.pillars.${key}.description`)}
              </p>
              <p className="mt-5 text-[13px] font-medium text-[#073D30]/70">
                {t(`homepage.pillars.${key}.tags`)}
              </p>
              <Link
                to={to}
                className="mt-8 inline-flex items-center gap-2 text-[15px] font-semibold text-[#075C43] transition-colors hover:text-[#054C37]"
              >
                {t("homepage.pillars.cta")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

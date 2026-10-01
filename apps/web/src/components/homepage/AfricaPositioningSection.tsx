import React from "react";
import { Building2, Database, Globe2, MapPinned } from "lucide-react";
import { useTranslation } from "react-i18next";

const POINTS = [
  { key: "factors" as const, icon: Database },
  { key: "localData" as const, icon: MapPinned },
  { key: "multiSite" as const, icon: Building2 },
  { key: "standards" as const, icon: Globe2 },
] as const;

export const AfricaPositioningSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="bg-[#FAFBF8] py-16 md:py-24" aria-labelledby="africa-positioning-title">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="max-w-3xl">
          <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#087354]">
            {t("homepage.africa.eyebrow")}
          </p>
          <h2
            id="africa-positioning-title"
            className="font-hero-display mt-4 text-[32px] font-normal leading-[1.15] text-[#073D30] md:text-[44px]"
          >
            {t("homepage.africa.title")}
          </h2>
          <p className="mt-5 text-[18px] leading-relaxed text-[#52615C]">
            {t("homepage.africa.subtitle")}
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map(({ key, icon: Icon }) => (
            <li key={key} className="rounded-[4px] border border-[#E6EDE9] bg-white p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E7F3EC] text-[#075C43]">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-[17px] font-semibold text-[#073D30]">
                {t(`homepage.africa.points.${key}.title`)}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[#52615C]">
                {t(`homepage.africa.points.${key}.description`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

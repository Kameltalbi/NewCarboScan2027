import React from "react";
import { Leaf, Rocket, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const heroVideo = "/media/hero-wind.mp4";
const heroPoster = "/media/hero-wind-poster.jpg";

const HeroVideo = () => (
  <video
    className="h-full w-full object-cover object-[78%_center] lg:object-[30%_center]"
    src={heroVideo}
    poster={heroPoster}
    autoPlay
    muted
    loop
    playsInline
    preload="auto"
    aria-hidden="true"
  />
);

const TRUST_ITEMS = [
  { icon: Rocket, key: "deploy" as const },
  { icon: Shield, key: "compliant" as const },
  { icon: Leaf, key: "africa" as const },
];

export const NewHeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section id="home" className="relative w-full overflow-hidden bg-[#FAFBF8]">
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <clipPath id="hero-organic-split" clipPathUnits="objectBoundingBox">
            <path d="M0.22,0 C0.08,0.10 0.00,0.22 0.03,0.36 C0.07,0.52 0.24,0.60 0.16,0.74 C0.06,0.90 0.14,0.96 0.18,1 L1,1 L1,0 Z" />
          </clipPath>
          <clipPath id="hero-organic-glow" clipPathUnits="objectBoundingBox">
            <path d="M0.18,0 C0.04,0.10 -0.04,0.22 -0.01,0.36 C0.03,0.52 0.20,0.60 0.12,0.74 C0.02,0.90 0.10,0.96 0.14,1 L1,1 L1,0 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* Desktop image: full hero height, right bleed, organic S-curve — not a column gap */}
      <div className="hero-visual pointer-events-none absolute inset-y-0 right-0 hidden w-[min(64vw,980px)] lg:block xl:w-[58%]">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            clipPath: "url(#hero-organic-glow)",
            background:
              "radial-gradient(ellipse at 14% 42%, rgba(8,115,84,0.28), transparent 62%)",
            filter: "blur(26px)",
            transform: "translateX(-22px)",
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0" style={{ clipPath: "url(#hero-organic-split)" }}>
          <HeroVideo />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1440px] flex-col px-6 py-12 lg:h-[760px] lg:justify-center lg:px-10 lg:py-0">
        <div className="w-full max-w-[650px] font-manrope lg:w-[46%]">
          <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#087354]">
            {t("homepage.hero.eyebrow")}
          </p>

          <h1 className="font-hero-display mt-5 max-w-[650px] text-[38px] font-normal leading-[1.05] text-[#073D30] md:text-[44px] lg:text-[68px]">
            <span className="block">{t("homepage.hero.titleLine1")}</span>
            <span className="block">{t("homepage.hero.titleLine2")}</span>
            <span className="block">{t("homepage.hero.titleLine3")}</span>
          </h1>

          <p className="mt-7 max-w-[620px] text-[19px] leading-[1.55] text-[#52615C]">
            {t("homepage.hero.subtitle")}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => navigate("/calculateur-carbone")}
              className="inline-flex h-[58px] items-center justify-center rounded-[4px] bg-[#075C43] px-8 text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-[#054C37]"
            >
              {t("homepage.hero.ctaPrimary")}
            </button>
            <button
              type="button"
              onClick={() => navigate("/bilan-carbone")}
              className="inline-flex h-[58px] items-center justify-center rounded-[4px] border-[1.5px] border-[#075C43] bg-transparent px-8 text-[15px] font-semibold text-[#075C43] transition-colors duration-200 hover:bg-[#E8F4EE]"
            >
              {t("homepage.hero.ctaSecondary")}
            </button>
          </div>

          <ul className="mt-12 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-4">
            {TRUST_ITEMS.map(({ icon: Icon, key }) => (
              <li
                key={key}
                className="flex items-center gap-3 text-[14px] font-medium text-[#073D30]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7F3EC] text-[#075C43]">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </span>
                {t(`homepage.hero.trust.${key}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-10 h-[380px] overflow-hidden rounded-[40px_16px_16px_28px] shadow-[0_18px_50px_rgba(7,61,48,0.08)] md:h-[440px] lg:hidden">
          <HeroVideo />
        </div>
      </div>
    </section>
  );
};

/**
 * Public SEO landing — Supplier engagement / Scope 3 supply chain.
 */
import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SolutionLandingShell } from "@/components/seo/SolutionLandingShell";
import { SEOHead } from "@/components/seo/SEOHead";
import {
  ArrowRight,
  BarChart3,
  Link2,
  Mail,
  ShieldCheck,
  Truck,
} from "lucide-react";

const NS = "engagementFournisseursLanding";
const PATH = "/engagement-fournisseurs";

const CAPABILITY_ICONS = [Mail, Link2, BarChart3, ShieldCheck] as const;
const CAPABILITY_KEYS = ["invite", "collect", "score", "trace"] as const;
const WHY_KEYS = ["scope3", "supplyChain", "reporting"] as const;

const EngagementFournisseurs: React.FC = () => {
  const { t } = useTranslation();

  return (
    <SolutionLandingShell path={PATH}>
      <SEOHead path={PATH} />

      {/* 1 — Hero */}
      <section className="relative overflow-hidden bg-[#F7FAF8]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(7,86,63,0.08),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-6 py-20 md:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-8 lg:py-32">
          <div>
            <h1 className="max-w-xl text-[2.35rem] font-semibold leading-[1.08] tracking-[-0.035em] text-[#073D30] md:text-5xl lg:text-[3.35rem]">
              {t(`${NS}.hero.titleLine1`)}
              <br />
              {t(`${NS}.hero.titleLine2`)}
            </h1>
            <p className="mt-7 max-w-lg text-[17px] leading-relaxed text-[#073D30]/70 md:text-lg">
              {t(`${NS}.hero.subtitle`)}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/demo"
                className="inline-flex h-12 items-center justify-center rounded-[4px] bg-[#07563F] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#054C36]"
              >
                {t(`${NS}.hero.ctaPrimary`)}
              </Link>
              <Link
                to="/bilan-carbone"
                className="inline-flex h-12 items-center justify-center rounded-[4px] border border-[#073D30]/15 bg-white px-6 text-[15px] font-semibold text-[#073D30] transition-colors hover:border-[#073D30]/30"
              >
                {t(`${NS}.hero.ctaSecondary`)}
              </Link>
            </div>
          </div>

          <div className="relative rounded-[4px] border border-[#073D30]/10 bg-white p-6 shadow-[0_20px_50px_rgba(7,61,48,0.08)] md:p-8">
            <div className="flex items-center gap-3 border-b border-[#073D30]/08 pb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-[4px] bg-[#07563F]/10">
                <Truck className="h-5 w-5 text-[#07563F]" aria-hidden />
              </div>
              <div>
                <div className="text-[15px] font-semibold text-[#073D30]">
                  {t(`${NS}.preview.title`)}
                </div>
                <div className="text-[13px] text-[#073D30]/55">
                  {t(`${NS}.preview.subtitle`)}
                </div>
              </div>
            </div>
            <ul className="mt-5 space-y-4">
              {(["a", "b", "c"] as const).map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#07563F]" />
                  <span className="text-[14px] leading-relaxed text-[#073D30]/75">
                    {t(`${NS}.preview.items.${key}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 2 — Capacités */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-[#073D30] md:text-4xl">
            {t(`${NS}.capabilities.title`)}
          </h2>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#073D30]/65">
            {t(`${NS}.capabilities.subtitle`)}
          </p>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITY_KEYS.map((key, index) => {
              const Icon = CAPABILITY_ICONS[index];
              return (
                <div key={key} className="border-t border-[#073D30]/12 pt-6">
                  <Icon className="h-5 w-5 text-[#07563F]" strokeWidth={1.75} aria-hidden />
                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-[#073D30]">
                    {t(`${NS}.capabilities.${key}.title`)}
                  </h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-[#073D30]/65">
                    {t(`${NS}.capabilities.${key}.body`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3 — Pourquoi */}
      <section className="bg-[#F7FAF8] py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[#073D30] md:text-4xl">
            {t(`${NS}.why.title`)}
          </h2>
          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {WHY_KEYS.map((key, index) => (
              <div key={key} className="border-t border-[#073D30]/12 pt-6">
                <div className="text-[13px] font-semibold tracking-[0.12em] text-[#07563F]">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-[#073D30]">
                  {t(`${NS}.why.${key}.title`)}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#073D30]/65">
                  {t(`${NS}.why.${key}.body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — CTA */}
      <section className="bg-[#073D30] py-20 md:py-24">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
            {t(`${NS}.cta.title`)}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-white/70 md:text-[17px]">
            {t(`${NS}.cta.body`)}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/demo"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[4px] bg-white px-6 text-[15px] font-semibold text-[#073D30] transition-colors hover:bg-[#F7FAF8]"
            >
              {t(`${NS}.cta.primary`)}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/collect"
              className="inline-flex h-12 items-center justify-center rounded-[4px] border border-white/25 px-6 text-[15px] font-semibold text-white transition-colors hover:border-white/45 hover:bg-white/5"
            >
              {t(`${NS}.cta.secondary`)}
            </Link>
          </div>
        </div>
      </section>
    </SolutionLandingShell>
  );
};

export default EngagementFournisseurs;

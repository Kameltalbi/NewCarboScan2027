import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, BarChart3, Recycle, Package, Database, Truck, Globe2, Activity, Share2, FileCode, Webhook, Blocks } from "lucide-react";
import { Link } from "react-router-dom";
import heroIndustrial from "@/assets/homepage/hero_industrial.jpg";

const TAG_ICONS = {
  openapi: FileCode,
  erp: Blocks,
  webhooks: Webhook,
} as const;

const MODULE_META = [
  { key: "bilanCarbone", icon: BarChart3, href: "/bilan-carbone", iconBg: "bg-[#0E7C66]" },
  { key: "acv", icon: Recycle, href: "/empreinte-produit", iconBg: "bg-[#1B3A2D]" },
  { key: "pcf", icon: Package, href: "/empreinte-produit", iconBg: "bg-[#4B5563]" },
] as const;

const SECONDARY_META = [
  { key: "collect", icon: Database, href: "/collect", iconBg: "bg-[#6B7280]" },
  { key: "suppliers", icon: Truck, href: "/fournisseurs", iconBg: "bg-[#1B3A2D]" },
  { key: "cbam", icon: Globe2, href: "/cbam", iconBg: "bg-[#374151]" },
  { key: "monitoring", icon: Activity, href: "/monitoring", iconBg: "bg-[#16585C]" },
] as const;

export const SuiteModulesSection: React.FC = () => {
  const { t } = useTranslation();

  const renderCard = (mod: { key: string; icon: React.ElementType; href: string; iconBg: string }) => {
    const Icon = mod.icon;
    const title = t(`homepage.suiteModules.items.${mod.key}.title`);
    const description = t(`homepage.suiteModules.items.${mod.key}.description`);
    return (
      <div
        key={mod.key}
        className="bg-white rounded-2xl p-6 flex flex-col justify-between min-h-[320px] lg:min-h-[380px] hover:shadow-lg transition-shadow"
      >
        <div>
          <div
            className={`w-12 h-12 ${mod.iconBg} rounded-xl flex items-center justify-center mb-5`}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-[#1F2937] mb-3 leading-tight">
            {title}
          </h3>
          <p className="text-[#6B7280] leading-relaxed">
            {description}
          </p>
        </div>
        <div className="mt-6">
          <Link
            to={mod.href}
            className="inline-flex items-center gap-2 text-[#1F2937] font-semibold hover:text-[#0E7C66] transition-colors group"
          >
            {t("homepage.suiteModules.learnMore")}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <section className="py-20 bg-muted">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Featured card */}
          <div className="relative overflow-hidden rounded-2xl min-h-[320px] lg:min-h-[380px] flex flex-col justify-between p-6">
            <img
              src={heroIndustrial}
              alt={t("homepage.suiteModules.featuredAlt")}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F18]/95 via-[#0B1F18]/60 to-transparent" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-white leading-tight mb-5">
                {t("homepage.suiteModules.featuredTitle")}
              </h3>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 bg-[#1F2937] hover:bg-[#111827] text-white font-semibold px-5 py-3 rounded-xl transition-colors"
              >
                {t("homepage.suiteModules.featuredCta")}
              </Link>
            </div>
          </div>

          {MODULE_META.map(renderCard)}
        </div>

        {/* Second row: 4 additional modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {SECONDARY_META.map(renderCard)}
        </div>

        {/* API & integrations banner */}
        <div className="mt-6 bg-white rounded-2xl p-6 md:p-8 border border-border/50 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
            <div className="shrink-0">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                <Share2 className="w-7 h-7 text-primary" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground mb-2">
                {t("homepage.integrationsApi.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4 max-w-2xl">
                {t("homepage.integrationsApi.description")}
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TAG_ICONS) as Array<keyof typeof TAG_ICONS>).map((tag) => {
                  const Icon = TAG_ICONS[tag];
                  return (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 text-primary font-medium text-sm"
                    >
                      <Icon className="w-4 h-4" />
                      {t(`homepage.integrationsApi.tags.${tag}`)}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="shrink-0">
              <Link
                to="/developpeurs"
                className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors group"
              >
                {t("homepage.integrationsApi.cta")}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

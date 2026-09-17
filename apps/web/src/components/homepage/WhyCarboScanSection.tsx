import React from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Building2, FileCheck, Clock, TrendingDown, ShieldCheck } from "lucide-react";

const ROW_VALUES = ["12.4 tCO2e", "8.7 tCO2e", "24.1 tCO2e", "3.2 tCO2e"];

export const WhyCarboScanSection = () => {
  const { t } = useTranslation();

  const sectorTags = t("homepage.whyCarboScan.card2.sectors", { returnObjects: true }) as string[];
  const rows = t("homepage.whyCarboScan.card1.rows", { returnObjects: true }) as { name: string; tag: string }[];
  const card3Tags = t("homepage.whyCarboScan.card3.tags", { returnObjects: true }) as string[];
  const card4Tags = t("homepage.whyCarboScan.card4.tags", { returnObjects: true }) as string[];

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-5xl font-bold text-center text-foreground mb-4 leading-tight">
          {t("homepage.whyCarboScan.titleLine1")}
          <br />
          {t("homepage.whyCarboScan.titleLine2")}
        </h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-14 text-lg">
          {t("homepage.whyCarboScan.subtitle")}
        </p>

        {/* Top row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Card 1 - Light */}
          <div className="bg-muted/40 rounded-3xl p-8 md:p-10 border border-border">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {t("homepage.whyCarboScan.card1.title")}
            </h3>
            <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-md">
              {t("homepage.whyCarboScan.card1.description")}
            </p>
            <div className="bg-background rounded-2xl p-5 shadow-sm border border-border space-y-3">
              <div className="inline-flex items-center gap-2 bg-[#0E7C66] text-white text-xs font-medium px-3 py-1.5 rounded-[4px]">
                <Sparkles className="w-3 h-3" />
                {t("homepage.whyCarboScan.card1.assistantLabel")}
              </div>
              {rows.map((r, i) => (
                <div key={r.name} className="flex items-center justify-between text-sm border-t border-border pt-3">
                  <span className="text-foreground font-medium">{r.name}</span>
                  <span className="text-muted-foreground">{ROW_VALUES[i]}</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">{r.tag}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2 - Dark green */}
          <div className="bg-gradient-to-br from-[#0B1F18] to-[#1B3A2D] rounded-3xl p-8 md:p-10 text-white relative overflow-hidden">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              {t("homepage.whyCarboScan.card2.titleLine1")}<br />{t("homepage.whyCarboScan.card2.titleLine2")}
            </h3>
            <p className="text-white/70 text-base md:text-lg mb-8 max-w-sm">
              {t("homepage.whyCarboScan.card2.description")}
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              {sectorTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 text-white text-sm px-4 py-2 rounded-[4px] backdrop-blur-sm"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#22C55E]" />
                  {tag}
                </span>
              ))}
            </div>
            <a href="/contact" className="inline-flex items-center gap-2 text-white font-medium hover:gap-3 transition-all">
              {t("homepage.whyCarboScan.card2.cta")}
            </a>
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 3 */}
          <div className="bg-[#E8F5E9] rounded-3xl p-8 border border-border/50">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-[#0E7C66]" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
              {t("homepage.whyCarboScan.card3.title")}
            </h3>
            <p className="text-muted-foreground mb-6">
              {t("homepage.whyCarboScan.card3.description")}
            </p>
            <div className="flex flex-wrap gap-2">
              {card3Tags.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 bg-white text-foreground text-xs font-medium px-3 py-1.5 rounded-[4px] border border-border">
                  <FileCheck className="w-3 h-3 text-[#0E7C66]" /> {s}
                </span>
              ))}
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-[#FFF4E5] rounded-3xl p-8 border border-border/50">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-[#E8A33D]" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
              {t("homepage.whyCarboScan.card4.title")}
            </h3>
            <p className="text-muted-foreground mb-6">
              {t("homepage.whyCarboScan.card4.description")}
            </p>
            <div className="flex flex-wrap gap-2">
              {card4Tags.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 bg-white text-foreground text-xs font-medium px-3 py-1.5 rounded-[4px] border border-border">
                  <FileCheck className="w-3 h-3 text-[#E8A33D]" /> {s}
                </span>
              ))}
            </div>
          </div>

          {/* Card 5 - Dark */}
          <div className="bg-[#0B1F18] rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4">
              <TrendingDown className="w-6 h-6 text-[#22C55E]" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-3">
              {t("homepage.whyCarboScan.card5.title")}
            </h3>
            <p className="text-white/70 mb-6">
              {t("homepage.whyCarboScan.card5.description")}
            </p>
            <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
              <TrendingDown className="w-10 h-10 text-[#22C55E]" />
              <div>
                <div className="text-2xl font-bold">{t("homepage.whyCarboScan.card5.metric")}</div>
                <div className="text-xs text-white/60">{t("homepage.whyCarboScan.card5.metricSub")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

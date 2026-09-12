import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ArrowRight, BarChart3, Zap, Sparkles, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Tab = "carboscan" | "wattbim";

const TAB_META: Record<Tab, {
  cta: string;
  metricValue: string;
  bars: number[];
  accent: string;
}> = {
  carboscan: {
    cta: "/bilan-carbone",
    metricValue: "1 247",
    bars: [35, 55, 90],
    accent: "160 70% 55%",
  },
  wattbim: {
    cta: "/wattbim",
    metricValue: "9 000",
    bars: [70, 45, 85],
    accent: "45 95% 60%",
  },
};

export const CarboScanWattBimToggleSection: React.FC = () => {
  const { t } = useTranslation();
  const wattBimVisible = true;
  const [tab, setTab] = useState<Tab>("carboscan");
  const effectiveTab: Tab = wattBimVisible ? tab : "carboscan";
  const meta = TAB_META[effectiveTab];
  const bullets = t(`homepage.toggle.${effectiveTab}.bullets`, { returnObjects: true }) as string[];
  const bars = t(`homepage.toggle.${effectiveTab}.bars`, { returnObjects: true }) as string[];

  return (
    <section
      aria-labelledby="cs-wb-toggle-title"
      className="relative py-20 md:py-28 overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, hsl(160 55% 9%) 0%, hsl(170 50% 12%) 100%)",
      }}
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl transition-colors duration-500"
          style={{ background: `hsl(${meta.accent})` }}
        />
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Toggle — masqué jusqu'au 20/08/2026 */}
        {wattBimVisible && (
          <div className="flex justify-center mb-10">
            <div
              role="tablist"
              aria-label={t("homepage.toggle.ariaLabel")}
              className="inline-flex p-1 rounded-full bg-white/10 backdrop-blur border border-white/15"
            >
              {(["carboscan", "wattbim"] as Tab[]).map((tb) => {
                const active = effectiveTab === tb;
                return (
                  <button
                    key={tb}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(tb)}
                    className={`px-5 py-2 text-sm font-semibold rounded-[4px] transition-all flex items-center gap-2 ${
                      active
                        ? tb === "carboscan"
                          ? "bg-[hsl(160_70%_55%)] text-[hsl(160_55%_10%)] shadow"
                          : "bg-[hsl(45_95%_60%)] text-[hsl(160_55%_10%)] shadow"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    {tb === "carboscan" ? (
                      <BarChart3 className="h-4 w-4" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    {tb === "carboscan" ? "CarboScan" : "WattBim"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — message */}
          <div className="text-white">
            <Badge
              className="mb-5 font-semibold flex items-center gap-1.5 w-fit border-0"
              style={{
                background: `hsl(${meta.accent})`,
                color: "hsl(160 55% 10%)",
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t(`homepage.toggle.${effectiveTab}.badge`)}
            </Badge>

            <h2
              id="cs-wb-toggle-title"
              className="text-3xl md:text-5xl font-bold leading-tight mb-6"
            >
              {t(`homepage.toggle.${effectiveTab}.titlePart1`)}
              <span style={{ color: `hsl(${meta.accent})` }}>
                {t(`homepage.toggle.${effectiveTab}.titleHighlight`)}
              </span>
            </h2>

            <ul className="space-y-3 mb-8">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-white/90">
                  <span
                    className="mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `hsl(${meta.accent})` }}
                  >
                    <Check
                      className="h-3 w-3 text-[hsl(160_55%_10%)]"
                      strokeWidth={3}
                    />
                  </span>
                  <span className="text-sm md:text-base">{b}</span>
                </li>
              ))}
            </ul>

            <Button
              asChild
              size="lg"
              className="font-semibold"
              style={{
                background: `hsl(${meta.accent})`,
                color: "hsl(160 55% 10%)",
              }}
            >
              <Link to={meta.cta}>
                {t(`homepage.toggle.${effectiveTab}.ctaLabel`)}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Right — mock dashboard */}
          <div className="relative">
            <div
              className="absolute inset-0 rounded-3xl blur-2xl opacity-40"
              style={{ background: `hsl(${meta.accent})` }}
            />
            <div className="relative bg-white rounded-2xl p-6 md:p-8 shadow-2xl border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t(`homepage.toggle.${effectiveTab}.mockTitle`)}
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {t("homepage.toggle.overview")}
                  </p>
                </div>
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ background: `hsl(${meta.accent} / 0.15)` }}
                >
                  {effectiveTab === "carboscan" ? (
                    <BarChart3
                      className="h-5 w-5"
                      style={{ color: `hsl(${meta.accent})` }}
                    />
                  ) : (
                    <Zap
                      className="h-5 w-5"
                      style={{ color: `hsl(${meta.accent})` }}
                    />
                  )}
                </div>
              </div>

              <div
                className="rounded-xl p-5 mb-6"
                style={{ background: `hsl(${meta.accent} / 0.08)` }}
              >
                <p className="text-xs text-muted-foreground mb-1">
                  {t(`homepage.toggle.${effectiveTab}.metricLabel`)}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">
                    {meta.metricValue}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {t(`homepage.toggle.${effectiveTab}.metricSub`)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs font-medium text-[hsl(160_55%_30%)]">
                  <TrendingDown className="h-3.5 w-3.5" />
                  {t(`homepage.toggle.${effectiveTab}.trend`)}
                </div>
              </div>

              <div className="space-y-3">
                {bars.map((label, i) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground font-medium">
                        {label}
                      </span>
                      <span className="text-foreground font-semibold">
                        {meta.bars[i]}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${meta.bars[i]}%`,
                          background: `hsl(${meta.accent})`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CarboScanWattBimToggleSection;

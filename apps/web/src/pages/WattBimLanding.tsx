import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SolutionLandingShell } from "@/components/seo/SolutionLandingShell";
import { useTranslation } from "react-i18next";
import {
  Zap,
  TrendingDown,
  Moon,
  Activity,
  LineChart,
  Building2,
  ShieldCheck,
  ArrowRight,
  Check,
  Gauge,
  Bell,
  Leaf,
  Wifi,
  Cpu,
  Download,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Currency = "TND" | "EUR" | "USD";
const RATES: Record<Currency, number> = { TND: 1, EUR: 0.3, USD: 0.32 };
const SYMBOLS: Record<Currency, string> = { TND: "DT", EUR: "€", USD: "$" };

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingDown,
  Gauge,
  Bell,
  LineChart,
  Moon,
  Activity,
  Building2,
  Leaf,
  ShieldCheck,
  Cpu,
  Wifi,
  Zap,
};

const WattBimLanding: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [currency, setCurrency] = useState<Currency>("TND");
  const [annualBill, setAnnualBill] = useState<number>(80000);

  const locale = i18n.language?.startsWith("en") ? "en-US" : "fr-FR";
  const fmt = (tnd: number, c: Currency) =>
    `${Math.round(tnd * RATES[c]).toLocaleString(locale)} ${SYMBOLS[c]}`;

  const savings = useMemo(() => Math.round(annualBill * 0.15), [annualBill]);
  const commission = Math.round(savings * 0.30);
  const net = Math.max(0, savings - commission);
  const roiMonths =
    net > 0
      ? Math.max(1, Math.round((commission / savings) * 12))
      : 0;

  const kpis = t("wattbim.kpis", { returnObjects: true }) as { icon: string; value: string; label: string }[];
  const pvItems = t("wattbim.pv.items", { returnObjects: true }) as { icon: string; title: string; desc: string }[];
  const featuresItems = t("wattbim.features.items", { returnObjects: true }) as { icon: string; title: string; desc: string }[];
  const iotSteps = t("wattbim.iot.steps", { returnObjects: true }) as { icon: string; title: string; desc: string }[];
  const audiences = t("wattbim.audiences.groups", { returnObjects: true }) as { title: string; items: string[] }[];

  return (
    <SolutionLandingShell path="/wattbim">
        {/* HERO */}
        <section
          className="relative overflow-hidden py-20 md:py-28"
          style={{
            background:
              "linear-gradient(135deg, hsl(160 55% 12%) 0%, hsl(180 50% 18%) 60%, hsl(160 45% 22%) 100%)",
          }}
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-[hsl(45_95%_55%)] blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-[hsl(160_70%_50%)] blur-3xl" />
          </div>

          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl">
              <Badge className="bg-[hsl(45_95%_55%)] text-[hsl(160_55%_12%)] hover:bg-[hsl(45_95%_55%)] font-semibold mb-5 inline-flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 fill-amber-600" />
                {t("wattbim.hero.badge")}
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
                {t("wattbim.hero.titleLead")}{" "}
                <span className="text-[hsl(45_95%_65%)]">{t("wattbim.hero.titleAccent")}</span>.
              </h1>
              <p className="text-lg md:text-xl text-white/85 mb-8 max-w-2xl">
                {t("wattbim.hero.subtitle")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-[hsl(45_95%_55%)] text-[hsl(160_55%_12%)] hover:bg-[hsl(45_95%_60%)] font-semibold"
                >
                  <Link to="/demo">
                    {t("wattbim.hero.ctaDemo")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/contact">{t("wattbim.hero.ctaExpert")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {kpis.map((s) => {
                const Icon = ICONS[s.icon] ?? TrendingDown;
                return (
                  <Card key={s.label} className="p-6 text-center border-2 hover:border-[hsl(160_55%_30%)] transition-colors">
                    <Icon className="h-8 w-8 mx-auto mb-3 text-[hsl(160_55%_30%)]" />
                    <div className="text-3xl md:text-4xl font-bold text-[hsl(160_55%_22%)] mb-1">{s.value}</div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* SIMULATEUR ROI */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <Badge variant="outline" className="mb-3">{t("wattbim.roi.badge")}</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-3">{t("wattbim.roi.title")}</h2>
                <p className="text-muted-foreground">{t("wattbim.roi.subtitle")}</p>
              </div>

              <Card className="p-6 md:p-8 shadow-xl">
                <div className="flex items-center justify-end mb-6">
                  <div className="flex rounded-md border border-border bg-muted p-0.5" role="radiogroup" aria-label={t("wattbim.roi.currencyLabel")}>
                    {(["TND", "EUR", "USD"] as Currency[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={currency === c}
                        onClick={() => setCurrency(c)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                          currency === c ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <label htmlFor="annual-bill" className="block text-sm font-medium mb-2">
                    {t("wattbim.roi.billLabel", { symbol: SYMBOLS[currency] })}
                  </label>
                  <input
                    id="annual-bill"
                    type="range"
                    min={35000}
                    max={500000}
                    step={5000}
                    value={annualBill}
                    onChange={(e) => setAnnualBill(Number(e.target.value))}
                    className="w-full accent-[hsl(160_55%_30%)]"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{fmt(35000, currency)}</span>
                    <span className="text-base font-bold text-foreground">{fmt(annualBill, currency)}</span>
                    <span>{fmt(500000, currency)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-background border">
                    <p className="text-xs text-muted-foreground mb-1">{t("wattbim.roi.savings")}</p>
                    <p className="text-xl md:text-2xl font-bold text-[hsl(160_55%_30%)]">{fmt(savings, currency)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("wattbim.roi.savingsHint")}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-background border">
                    <p className="text-xs text-muted-foreground mb-1">{t("wattbim.roi.commission")}</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground">{fmt(commission, currency)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("wattbim.roi.commissionHint")}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-[hsl(45_95%_55%/0.12)] border-2 border-[hsl(45_95%_55%)]">
                    <p className="text-xs text-muted-foreground mb-1">{t("wattbim.roi.net")}</p>
                    <p className="text-xl md:text-2xl font-bold text-[hsl(160_55%_22%)]">{fmt(net, currency)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {net > 0 ? t("wattbim.roi.roiIn", { months: roiMonths }) : t("wattbim.roi.threshold")}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-6 text-center max-w-2xl mx-auto">
                  {t("wattbim.roi.modelNote")}
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* PV */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-10 items-center mb-12">
                <div>
                  <Badge variant="outline" className="mb-3">{t("wattbim.pv.badge")}</Badge>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    {t("wattbim.pv.titleLead")}{" "}
                    <span className="text-[hsl(160_55%_30%)]">{t("wattbim.pv.titleAccent")}</span>.
                  </h2>
                  <p className="text-muted-foreground text-lg">{t("wattbim.pv.subtitle")}</p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="bg-[hsl(45_95%_55%/0.12)] border-2 border-[hsl(45_95%_55%)] rounded-2xl p-6 md:p-8 text-center max-w-md">
                    <Sun className="h-12 w-12 mx-auto mb-4 text-[hsl(45_95%_55%)]" />
                    <p className="text-lg font-semibold text-foreground mb-2">{t("wattbim.pv.card.pvTitle")}</p>
                    <p className="text-sm text-muted-foreground mb-4">{t("wattbim.pv.card.pvDesc")}</p>
                    <div className="h-8 w-px bg-[hsl(160_55%_30%)] mx-auto mb-4" />
                    <Zap className="h-10 w-10 mx-auto mb-3 text-[hsl(160_55%_30%)]" />
                    <p className="text-lg font-semibold text-foreground mb-2">{t("wattbim.pv.card.wbTitle")}</p>
                    <p className="text-sm text-muted-foreground">{t("wattbim.pv.card.wbDesc")}</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pvItems.map((item) => {
                  const Icon = ICONS[item.icon] ?? LineChart;
                  return (
                    <Card key={item.title} className="p-6 border-l-4 border-l-[hsl(160_55%_30%)] hover:shadow-md transition-shadow">
                      <Icon className="h-8 w-8 mb-4 text-[hsl(160_55%_30%)]" />
                      <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">{t("wattbim.features.title")}</h2>
              <p className="text-muted-foreground">{t("wattbim.features.subtitle")}</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {featuresItems.map((f) => {
                const Icon = ICONS[f.icon] ?? Building2;
                return (
                  <Card key={f.title} className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-[hsl(160_55%_30%)]">
                    <Icon className="h-9 w-9 mb-4 text-[hsl(160_55%_30%)]" />
                    <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* IOT */}
        <section className="py-20 bg-background border-t">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <Badge variant="outline" className="mb-3">{t("wattbim.iot.badge")}</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-3">{t("wattbim.iot.title")}</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">{t("wattbim.iot.subtitle")}</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-10">
                {iotSteps.map((s) => {
                  const Icon = ICONS[s.icon] ?? Cpu;
                  return (
                    <Card key={s.title} className="p-6 border-l-4 border-l-[hsl(45_95%_55%)]">
                      <Icon className="h-8 w-8 mb-3 text-[hsl(160_55%_30%)]" />
                      <h3 className="font-semibold mb-1">{s.title}</h3>
                      <p className="text-sm text-muted-foreground">{s.desc}</p>
                    </Card>
                  );
                })}
              </div>

              <Card className="p-6 md:p-8 bg-muted/30 max-w-2xl mx-auto text-center">
                <h3 className="text-lg font-semibold mb-2">{t("wattbim.iot.guideTitle")}</h3>
                <p className="text-sm text-muted-foreground mb-5">{t("wattbim.iot.guideDesc")}</p>
                <Button asChild className="bg-[hsl(160_55%_30%)] hover:bg-[hsl(160_55%_24%)] text-white">
                  <a href="/docs/wattbim-guide-economies.pdf" target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    {t("wattbim.iot.guideCta")}
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground mt-4">{t("wattbim.iot.guideFootnote")}</p>
              </Card>
            </div>
          </div>
        </section>

        {/* BANQUES */}
        <section className="py-20 bg-background border-t">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-10">
                <Badge className="bg-[hsl(160_55%_30%)] text-white hover:bg-[hsl(160_55%_30%)] mb-3">Secteur bancaire</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-3">
                  WattBim pour les <span className="text-[hsl(160_55%_30%)]">banques & agences</span>
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Un réseau bancaire type (siège + 80 agences) consomme entre 6 et 10 GWh/an d'électricité.
                  WattBim identifie 12 à 20% d'économies immédiates — sans investissement lourd.
                </p>
              </div>

              <div className="grid md:grid-cols-4 gap-4 mb-10">
                {[
                  { v: "8 GWh", l: "Consommation moyenne réseau (siège + 80 agences)" },
                  { v: "2,4 M DT", l: "Facture électricité annuelle estimée" },
                  { v: "360 000 DT", l: "Économies annuelles WattBim (~15%)" },
                  { v: "1 200 tCO₂e", l: "Réduction Scope 2 annuelle (~15%)" },
                ].map((k) => (
                  <Card key={k.l} className="p-5 text-center border-2 border-[hsl(160_55%_30%)/0.25]">
                    <div className="text-2xl md:text-3xl font-bold text-[hsl(160_55%_22%)] mb-1">{k.v}</div>
                    <p className="text-xs text-muted-foreground">{k.l}</p>
                  </Card>
                ))}
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6 border-l-4 border-l-[hsl(160_55%_30%)]">
                  <Moon className="h-8 w-8 mb-3 text-[hsl(160_55%_30%)]" />
                  <h3 className="font-semibold mb-2">Gaspillage nocturne détecté</h3>
                  <p className="text-sm text-muted-foreground">
                    Climatisation, enseignes lumineuses et DAB non optimisés représentent 18 à 25% de la
                    consommation d'une agence hors horaires d'ouverture.
                  </p>
                </Card>
                <Card className="p-6 border-l-4 border-l-[hsl(160_55%_30%)]">
                  <Building2 className="h-8 w-8 mb-3 text-[hsl(160_55%_30%)]" />
                  <h3 className="font-semibold mb-2">Benchmark inter-agences</h3>
                  <p className="text-sm text-muted-foreground">
                    Classement automatique des 80 agences par kWh/m². Les 10 pires agences génèrent 40%
                    des économies potentielles — priorisation immédiate des actions.
                  </p>
                </Card>
                <Card className="p-6 border-l-4 border-l-[hsl(160_55%_30%)]">
                  <ShieldCheck className="h-8 w-8 mb-3 text-[hsl(160_55%_30%)]" />
                  <h3 className="font-semibold mb-2">Reporting CSRD / PCAF</h3>
                  <p className="text-sm text-muted-foreground">
                    Données Scope 2 auditables, exportables directement dans le bilan carbone CarboScan
                    et les rapports PCAF pour la Direction RSE.
                  </p>
                </Card>
              </div>

              <div className="mt-10 p-6 md:p-8 rounded-xl bg-[hsl(160_55%_30%/0.06)] border border-[hsl(160_55%_30%/0.2)] text-center">
                <p className="text-sm text-muted-foreground mb-2">Retour sur investissement moyen — réseau bancaire</p>
                <p className="text-2xl md:text-3xl font-bold text-[hsl(160_55%_22%)]">
                  {"ROI < 6 mois par site pilote"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AUDIENCES */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-3">{t("wattbim.audiences.title")}</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {audiences.map((g) => (
                  <Card key={g.title} className="p-6">
                    <h3 className="text-lg font-bold mb-4 text-[hsl(160_55%_22%)]">{g.title}</h3>
                    <ul className="space-y-2">
                      {g.items.map((i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-[hsl(160_55%_30%)] mt-0.5 shrink-0" />
                          <span>{i}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section
          className="py-20"
          style={{ background: "linear-gradient(135deg, hsl(160 55% 12%) 0%, hsl(160 45% 22%) 100%)" }}
        >
          <div className="container mx-auto px-4 text-center">
            <Zap className="h-12 w-12 mx-auto mb-5 text-[hsl(45_95%_60%)]" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">{t("wattbim.finalCta.title")}</h2>
            <p className="text-white/85 mb-8 max-w-xl mx-auto">{t("wattbim.finalCta.subtitle")}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild size="lg" className="bg-[hsl(45_95%_55%)] text-[hsl(160_55%_12%)] hover:bg-[hsl(45_95%_60%)] font-semibold">
                <Link to="/demo">
                  {t("wattbim.finalCta.ctaDemo")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white">
                <Link to="/contact">{t("wattbim.finalCta.ctaContact")}</Link>
              </Button>
            </div>
          </div>
        </section>
    </SolutionLandingShell>
  );
};

export default WattBimLanding;

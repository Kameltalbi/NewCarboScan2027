import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Zap, TrendingDown, Sparkles, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Currency = "TND" | "EUR" | "USD";

// Ratios indicatifs vs TND. Marketing only — pas un convertisseur officiel.
const RATES: Record<Currency, number> = { TND: 1, EUR: 0.3, USD: 0.32 };
const SYMBOLS: Record<Currency, string> = { TND: "DT", EUR: "€", USD: "$" };

// Baseline ROI annuel exprimé en TND (1 500 € invest. -> 2 700 € éco.)
const BASE_INVEST_TND = 5000;
const BASE_SAVINGS_TND = 9000;

const formatMoney = (valueTnd: number, currency: Currency) => {
  const v = valueTnd * RATES[currency];
  return `${Math.round(v).toLocaleString("fr-FR")} ${SYMBOLS[currency]}`;
};

export const WattBimSpotlightSection: React.FC = () => {
  const [currency, setCurrency] = useState<Currency>("TND");

  const invest = useMemo(() => formatMoney(BASE_INVEST_TND, currency), [currency]);
  const savings = useMemo(() => formatMoney(BASE_SAVINGS_TND, currency), [currency]);
  const net = useMemo(
    () => formatMoney(BASE_SAVINGS_TND - BASE_INVEST_TND, currency),
    [currency]
  );

  return (
    <section
      aria-labelledby="wattbim-spotlight-title"
      className="relative py-20 md:py-28 overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, hsl(160 55% 12%) 0%, hsl(180 50% 18%) 60%, hsl(160 45% 22%) 100%)",
      }}
    >
      {/* Décor */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[hsl(45_95%_55%)] blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[hsl(160_70%_50%)] blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Colonne gauche — message */}
          <div className="text-white">
            <Badge className="bg-[hsl(45_95%_55%)] text-[hsl(160_55%_12%)] hover:bg-[hsl(45_95%_55%)] font-semibold mb-5 flex items-center gap-1.5 w-fit">
              <Sparkles className="h-3.5 w-3.5" />
              Nouveau module CarboScan
            </Badge>

            <h2
              id="wattbim-spotlight-title"
              className="text-3xl md:text-5xl font-bold leading-tight mb-5"
            >
              CarboScan ne calcule pas que vos émissions —{" "}
              <span className="text-[hsl(45_95%_65%)]">il pilote aussi vos bâtiments</span>.
            </h2>

            <p className="text-base md:text-lg text-white/85 mb-7 max-w-xl">
              Avec le module <strong>WattBim</strong>, CarboScan suit la consommation de
              chaque bâtiment, détecte automatiquement le gaspillage et transforme vos
              factures en économies mesurables — dans la même plateforme que votre bilan
              carbone.
            </p>

            <ul className="space-y-2.5 mb-8">
              {[
                "Bilan GES + gestion énergétique dans une seule plateforme",
                "Détection nuit, pics et dérives par IA",
                "Suivi multi-bâtiments & multi-compteurs",
                "Synchronisation automatique vers votre bilan carbone",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-white/90">
                  <span className="mt-0.5 h-5 w-5 rounded-full bg-[hsl(45_95%_55%)] flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-[hsl(160_55%_12%)]" strokeWidth={3} />
                  </span>
                  <span className="text-sm md:text-base">{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-[hsl(45_95%_55%)] text-[hsl(160_55%_12%)] hover:bg-[hsl(45_95%_60%)] font-semibold"
              >
                <Link to="/wattbim">
                  Découvrir WattBim
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/demo">Demander une démo</Link>
              </Button>
            </div>
          </div>

          {/* Colonne droite — simulateur ROI */}
          <div className="bg-white/95 backdrop-blur rounded-2xl p-6 md:p-8 shadow-2xl border border-white/30">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-[hsl(160_55%_22%)] flex items-center justify-center">
                  <Zap className="h-5 w-5 text-[hsl(45_95%_60%)]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    ROI WattBim
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    Estimation annuelle
                  </p>
                </div>
              </div>

              {/* Sélecteur devise */}
              <div
                className="flex rounded-md border border-border bg-muted p-0.5"
                role="radiogroup"
                aria-label="Devise d'affichage"
              >
                {(["TND", "EUR", "USD"] as Currency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={currency === c}
                    onClick={() => setCurrency(c)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                      currency === c
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Investissement / an</span>
                <span className="text-lg font-bold text-foreground">{invest}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  Économies générées / an
                </span>
                <span className="text-lg font-bold text-[hsl(160_55%_30%)]">
                  {savings}
                </span>
              </div>
              <div className="flex items-center justify-between py-4 bg-[hsl(45_95%_55%/0.1)] -mx-2 px-4 rounded-lg">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-[hsl(160_55%_30%)]" />
                  Gain net annuel
                </span>
                <span className="text-2xl font-bold text-[hsl(160_55%_22%)]">{net}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-5 leading-relaxed">
              Estimation basée sur un bâtiment tertiaire moyen. Devise affichée dans la
              monnaie de votre choix — paramétrable par l'administrateur dans
              l'application.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WattBimSpotlightSection;

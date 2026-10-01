/**
 * Page institutionnelle — méthode de calcul des émissions financées.
 * Présentation uniquement : aucun moteur de calcul n'est modifié.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Car,
  ChevronDown,
  Factory,
  FileBarChart,
  Home,
  Landmark,
  Layers,
  PieChart,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const pipelineSteps = [
  {
    n: "1",
    title: "Financement",
    body: "La banque finance une entreprise, un projet ou un actif",
    detail: "Entreprise · Projet · Immobilier · Véhicule · Investissement",
  },
  {
    n: "2",
    title: "Classification",
    body: "CarboScan identifie la nature du financement",
    detail: "La méthodologie dépend de ce qui est réellement financé.",
  },
  {
    n: "3",
    title: "Données carbone",
    body: "CarboScan utilise les meilleures données disponibles",
    detail: "Émissions déclarées · Énergie · Production · Données économiques",
  },
  {
    n: "4",
    title: "Attribution",
    body: "La part correspondant au financement de la banque est déterminée",
    detail: null,
  },
  {
    n: "5",
    title: "Résultat",
    body: "Émissions financées",
    detail: "tCO₂e attribuées au portefeuille",
    dominant: true,
  },
] as const;

const qualitySummaryRows = [
  {
    data: "Bilan GES vérifié",
    treatment: "Utilisation des émissions déclarées",
    quality: "Très élevée",
  },
  {
    data: "Bilan GES non vérifié",
    treatment: "Utilisation des émissions déclarées",
    quality: "Élevée",
  },
  {
    data: "Énergie",
    treatment: "Consommation × facteurs d'émission",
    quality: "Élevée",
  },
  {
    data: "Production physique",
    treatment: "Production × facteurs physiques",
    quality: "Moyenne",
  },
  {
    data: "Chiffre d'affaires",
    treatment: "CA × facteur sectoriel",
    quality: "Plus faible",
  },
  {
    data: "Données limitées",
    treatment: "Proxies sectoriels",
    quality: "Faible",
  },
] as const;

const qualityScale = [
  { score: 1, label: "Très bonne qualité" },
  { score: 2, label: "Bonne qualité" },
  { score: 3, label: "Qualité moyenne" },
  { score: 4, label: "Qualité faible" },
  { score: 5, label: "Qualité très faible" },
] as const;

const assetClasses = [
  {
    icon: Building2,
    title: "Entreprise",
    body: "Prêt destiné aux besoins généraux d'une entreprise",
    pcaf: "Business Loans",
  },
  {
    icon: Factory,
    title: "Projet",
    body: "Financement d'un projet clairement identifié",
    pcaf: "Project Finance",
  },
  {
    icon: Home,
    title: "Immobilier",
    body: "Financement d'un actif immobilier",
    pcaf: "Commercial Real Estate / Mortgages",
  },
  {
    icon: Car,
    title: "Véhicule",
    body: "Financement de l'acquisition d'un véhicule",
    pcaf: "Motor Vehicle Loans",
  },
] as const;

const analysisCards = [
  {
    icon: PieChart,
    title: "Par secteur",
    body: "Identifier les secteurs contribuant le plus aux émissions financées.",
  },
  {
    icon: Layers,
    title: "Par classe d'actifs",
    body: "Comparer les différentes catégories de financement.",
  },
  {
    icon: Users,
    title: "Par contrepartie",
    body: "Identifier les principales contributions du portefeuille.",
  },
  {
    icon: ShieldCheck,
    title: "Par qualité des données",
    body: "Identifier les données à améliorer en priorité.",
  },
] as const;

const incompleteFlow = [
  {
    title: "Entreprise financée",
    body: "Bilan GES : Non disponible",
  },
  {
    title: "Données disponibles",
    body: "Chiffre d'affaires · Secteur d'activité · Pays · Données financières",
  },
  {
    title: "Estimation",
    body: "Facteur sectoriel approprié",
  },
  {
    title: "Émissions estimées",
    body: null,
  },
  {
    title: "Attribution au portefeuille",
    body: null,
  },
  {
    title: "Émissions financées",
    body: null,
    dominant: true,
  },
] as const;

const processSteps = [
  "Portefeuille financier",
  "Classification des financements",
  "Collecte / estimation des données carbone",
  "Calcul de l'attribution",
  "Émissions financées",
  "Qualité des données",
  "Consolidation & reporting",
] as const;

function qualityBarClass(score: number) {
  if (score === 1) return "bg-emerald-600";
  if (score === 2) return "bg-emerald-500";
  if (score === 3) return "bg-amber-500";
  if (score === 4) return "bg-orange-500";
  return "bg-rose-500";
}

export const MethodeCalculPage: React.FC = () => {
  const navigate = useNavigate();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCalcDetail, setShowCalcDetail] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-14 px-1 pb-16 pt-2">
      {/* 1. En-tête */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50/80 text-[11px] font-medium tracking-wide text-emerald-800"
          >
            PCAF · Scope 3 · Catégorie 15
          </Badge>
          <Badge
            variant="outline"
            className="border-border text-[11px] font-medium tracking-wide text-muted-foreground"
          >
            Méthodologie basée sur PCAF
          </Badge>
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Méthode de calcul des émissions financées
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            CarboScan applique la méthodologie correspondant à chaque type de
            financement, utilise les meilleures données disponibles et détermine
            la part des émissions attribuable à l&apos;institution financière.
          </p>
        </div>
      </header>

      {/* 2. Workflow */}
      <section className="space-y-5">
        <h2 className="text-xl font-semibold">Du financement aux émissions financées</h2>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Financement → Données carbone → Attribution → Émissions financées
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {pipelineSteps.map((step, i) => (
            <div key={step.n} className="relative flex flex-col">
              <Card
                className={cn(
                  "h-full",
                  step.dominant &&
                    "border-emerald-300 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-200/60",
                )}
              >
                <CardContent className="flex h-full flex-col gap-2 p-4">
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                      step.dominant
                        ? "bg-emerald-700 text-white"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {step.n}
                  </span>
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="text-sm leading-snug text-muted-foreground">{step.body}</p>
                  {step.detail && (
                    <p
                      className={cn(
                        "mt-auto pt-2 text-xs",
                        step.dominant
                          ? "font-semibold text-emerald-900"
                          : "text-muted-foreground/90",
                      )}
                    >
                      {step.detail}
                    </p>
                  )}
                </CardContent>
              </Card>
              {i < pipelineSteps.length - 1 && (
                <ArrowRight className="absolute -right-2 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground/50 lg:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 3. Exemple */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Exemple de calcul</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Exemple simplifié — prêt à une entreprise
          </p>
        </div>

        <Card className="overflow-hidden border-border/80">
          <CardContent className="space-y-8 p-6 sm:p-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Financement
                </p>
                <p className="text-sm text-foreground">Encours restant</p>
                <p className="text-[11px] text-muted-foreground">Outstanding Amount</p>
                <p className="text-3xl font-semibold tabular-nums tracking-tight">
                  10 M TND
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Valeur utilisée pour l&apos;attribution
                </p>
                <p className="text-3xl font-semibold tabular-nums tracking-tight">
                  50 M TND
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 px-5 py-4">
              <p className="text-sm text-foreground">Part attribuée</p>
              <p className="text-[11px] text-muted-foreground">Attribution Factor</p>
              <p className="mt-1 text-sm tabular-nums text-foreground">10 M / 50 M</p>
              <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-foreground">
                = 20 %
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Émissions de l&apos;entreprise
              </p>
              <p className="text-2xl font-semibold tabular-nums">8 000 tCO₂e/an</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-6 text-center sm:gap-5">
              <div>
                <p className="text-xs text-muted-foreground">Émissions considérées</p>
                <p className="text-2xl font-semibold tabular-nums sm:text-3xl">8 000 tCO₂e</p>
              </div>
              <span className="text-xl font-light text-muted-foreground">×</span>
              <div>
                <p className="text-xs text-muted-foreground">Part attribuée</p>
                <p className="text-2xl font-semibold tabular-nums sm:text-3xl">20 %</p>
              </div>
              <span className="text-xl font-light text-muted-foreground">=</span>
              <div>
                <p className="text-xs text-emerald-800/80">Émissions financées</p>
                <p className="text-3xl font-semibold tabular-nums text-emerald-800 sm:text-4xl">
                  1 600 tCO₂e
                </p>
                <p className="mt-1 text-sm font-medium text-emerald-900">
                  Attribuées au portefeuille
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              Dans cet exemple, 20 % des émissions considérées sont attribuées au
              portefeuille de la banque.
            </p>

            <p className="rounded-md border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-sm leading-relaxed text-amber-950/80">
              La méthode d&apos;attribution dépend de la classe d&apos;actifs. Le
              dénominateur utilisé n&apos;est donc pas identique pour tous les types
              de financement. Cet exemple illustre un prêt à une entreprise ; il ne
              constitue pas une formule universelle.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 4. Données disponibles et méthode */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">
            CarboScan s&apos;adapte aux données disponibles
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            La méthode utilisée dépend des informations disponibles pour chaque
            entreprise financée. Plus les données sont spécifiques, plus la
            qualité du calcul est élevée.
          </p>
        </div>

        <div className="space-y-4">
          {/* CAS 1 */}
          <Card>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[11px]">
                  Cas 1
                </Badge>
                <h3 className="font-semibold">
                  L&apos;entreprise dispose déjà d&apos;un bilan GES
                </h3>
              </div>

              <div className="space-y-0">
                {[
                  {
                    title: "Données disponibles",
                    body: "Bilan GES de l'entreprise · Scope 1 · Scope 2 · Scope 3, selon le périmètre applicable",
                  },
                  {
                    title: "CarboScan utilise les émissions déclarées",
                    body: null,
                  },
                  {
                    title: "Application de la méthode d'attribution PCAF",
                    body: null,
                  },
                  {
                    title: "Émissions financées",
                    body: null,
                    dominant: true,
                  },
                ].map((step, i, arr) => (
                  <div key={step.title}>
                    <div
                      className={cn(
                        "rounded-lg border px-4 py-3",
                        step.dominant
                          ? "border-emerald-300 bg-emerald-50/50"
                          : "border-border bg-muted/20",
                      )}
                    >
                      <p className="text-sm font-medium">{step.title}</p>
                      {step.body && (
                        <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                      )}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex justify-center py-1 text-muted-foreground/40">↓</div>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                Lorsque les données sont vérifiées, leur qualité est supérieure à
                celle de données non vérifiées.
              </p>
            </CardContent>
          </Card>

          {/* CAS 2 — énergie (développé) */}
          <Card className="border-emerald-200/80">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-300 bg-emerald-50 text-[11px] text-emerald-800"
                >
                  Cas 2
                </Badge>
                <h3 className="font-semibold">
                  Seules les données énergétiques sont disponibles
                </h3>
                <Badge
                  variant="outline"
                  className="text-[11px] font-normal text-muted-foreground"
                >
                  PCAF — Option 2a · données énergétiques
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border px-4 py-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Pas de bilan GES disponible
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 px-4 py-3">
                  <p className="text-sm font-semibold">Données énergétiques disponibles</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>Électricité consommée : kWh</li>
                    <li>Diesel : litres</li>
                    <li>Gaz naturel : m³</li>
                    <li>Autres consommations énergétiques pertinentes</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-5 text-center sm:gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Données énergétiques</p>
                  <p className="text-sm font-semibold">Consommations</p>
                </div>
                <span className="text-lg text-muted-foreground">×</span>
                <div>
                  <p className="text-xs text-muted-foreground">Facteurs d&apos;émission</p>
                  <p className="text-sm font-semibold">Appropriés &amp; sourcés</p>
                </div>
                <span className="text-lg text-muted-foreground">=</span>
                <div>
                  <p className="text-xs text-muted-foreground">Résultat</p>
                  <p className="text-sm font-semibold text-emerald-800">Émissions estimées</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-5 text-center sm:gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Émissions estimées</p>
                </div>
                <span className="text-lg text-muted-foreground">×</span>
                <div>
                  <p className="text-xs text-muted-foreground">Part attribuée</p>
                  <p className="text-[11px] text-muted-foreground">Attribution Factor</p>
                </div>
                <span className="text-lg text-muted-foreground">=</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Émissions financées</p>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-border px-4 py-4 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Exemple illustratif · fictif
                </p>
                <p className="text-sm text-muted-foreground">
                  L&apos;entreprise ne possède pas de bilan GES mais communique :
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Électricité</p>
                    <p className="font-semibold tabular-nums">2 000 000 kWh</p>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Diesel</p>
                    <p className="font-semibold tabular-nums">500 000 litres</p>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Gaz naturel</p>
                    <p className="font-semibold tabular-nums">300 000 m³</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  CarboScan applique les facteurs d&apos;émission appropriés à chaque
                  donnée énergétique :
                </p>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Électricité</span> — 2 000 000 kWh ×
                    facteur d&apos;émission électricité
                  </p>
                  <p className="text-muted-foreground">+</p>
                  <p>
                    <span className="font-medium">Diesel</span> — 500 000 L × facteur
                    d&apos;émission diesel
                  </p>
                  <p className="text-muted-foreground">+</p>
                  <p>
                    <span className="font-medium">Gaz naturel</span> — 300 000 m³ ×
                    facteur d&apos;émission gaz naturel
                  </p>
                  <p className="text-muted-foreground">=</p>
                  <p className="font-semibold">
                    Émissions estimées à partir des données énergétiques
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Les facteurs d&apos;émission et le total en tCO₂e ne sont pas
                  affichés ici : ils sont appliqués à partir des facteurs sourcés
                  dans CarboScan au moment du calcul réel.
                </p>
                <p className="text-sm text-muted-foreground">
                  Si la part attribuée à la banque est par exemple{" "}
                  <span className="font-semibold text-foreground">20 %</span> :
                </p>
                <p className="rounded-md bg-emerald-50/70 px-3 py-2 text-sm font-medium text-emerald-900">
                  Émissions estimées × 20 % = émissions financées
                </p>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                La banque n&apos;a donc pas besoin d&apos;attendre qu&apos;un bilan
                GES complet soit disponible : les consommations énergétiques
                permettent déjà d&apos;obtenir une estimation plus spécifique que des
                données économiques générales.
              </p>
            </CardContent>
          </Card>

          {/* CAS 3 */}
          <Card>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[11px]">
                  Cas 3
                </Badge>
                <h3 className="font-semibold">
                  Les données de production sont disponibles
                </h3>
                <Badge
                  variant="outline"
                  className="text-[11px] font-normal text-muted-foreground"
                >
                  PCAF — Option 2b · données physiques de production
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-md border border-border px-3 py-1.5 text-muted-foreground">
                  Pas de bilan GES
                </span>
                <span className="rounded-md border border-border px-3 py-1.5 text-muted-foreground">
                  Pas de données énergétiques suffisamment complètes
                </span>
                <span className="rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-1.5 font-medium text-emerald-900">
                  Données physiques de production disponibles
                </span>
              </div>

              <p className="text-sm text-muted-foreground">
                Exemples : tonnes de ciment · tonnes d&apos;acier · tonnes de
                clinker · MWh produits · autres unités physiques adaptées au
                secteur.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-5 text-center sm:gap-3">
                <div>
                  <p className="text-sm font-semibold">Production</p>
                </div>
                <span className="text-lg text-muted-foreground">×</span>
                <div>
                  <p className="text-sm font-semibold">Facteur d&apos;émission physique</p>
                </div>
                <span className="text-lg text-muted-foreground">=</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Émissions estimées</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-5 text-center sm:gap-3">
                <div>
                  <p className="text-sm font-semibold">Émissions estimées</p>
                </div>
                <span className="text-lg text-muted-foreground">×</span>
                <div>
                  <p className="text-sm font-semibold">Part attribuée</p>
                </div>
                <span className="text-lg text-muted-foreground">=</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Émissions financées</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Dans l&apos;exemple Business Loans de cette page, cette méthode
                correspond généralement à une qualité inférieure à une estimation
                basée sur des consommations énergétiques directes.
              </p>
            </CardContent>
          </Card>

          {/* CAS 4 */}
          <Card>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[11px]">
                  Cas 4
                </Badge>
                <h3 className="font-semibold">
                  Seules les données économiques sont disponibles
                </h3>
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-md border border-border px-3 py-1.5 text-muted-foreground">
                  Pas de bilan GES
                </span>
                <span className="rounded-md border border-border px-3 py-1.5 text-muted-foreground">
                  Pas de données énergétiques
                </span>
                <span className="rounded-md border border-border px-3 py-1.5 text-muted-foreground">
                  Pas de données physiques de production
                </span>
                <span className="rounded-md border border-amber-200 bg-amber-50/50 px-3 py-1.5 font-medium text-amber-950">
                  Chiffre d&apos;affaires et secteur disponibles
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-5 text-center sm:gap-3">
                <div>
                  <p className="text-sm font-semibold">Chiffre d&apos;affaires</p>
                </div>
                <span className="text-lg text-muted-foreground">×</span>
                <div>
                  <p className="text-sm font-semibold">Facteur sectoriel par revenu</p>
                </div>
                <span className="text-lg text-muted-foreground">=</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Émissions estimées</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-5 text-center sm:gap-3">
                <div>
                  <p className="text-sm font-semibold">Émissions estimées</p>
                </div>
                <span className="text-lg text-muted-foreground">×</span>
                <div>
                  <p className="text-sm font-semibold">Part attribuée</p>
                </div>
                <span className="text-lg text-muted-foreground">=</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Émissions financées</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Cette méthode permet de couvrir les contreparties pour lesquelles
                les données carbone détaillées ne sont pas encore disponibles,
                avec un niveau de qualité inférieur.
              </p>
            </CardContent>
          </Card>

          {/* CAS 5 */}
          <Card>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[11px]">
                  Cas 5
                </Badge>
                <h3 className="font-semibold">
                  Très peu de données sont disponibles
                </h3>
              </div>

              <div className="space-y-0">
                {[
                  "Encours + secteur + informations générales disponibles",
                  "Utilisation de proxies / données sectorielles appropriées",
                  "Estimation des émissions",
                  "Attribution",
                  "Émissions financées",
                ].map((label, i, arr) => (
                  <div key={label}>
                    <div
                      className={cn(
                        "rounded-lg border px-4 py-3 text-sm font-medium",
                        i === arr.length - 1
                          ? "border-emerald-300 bg-emerald-50/50 text-emerald-900"
                          : "border-border bg-muted/20",
                      )}
                    >
                      {label}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex justify-center py-1 text-muted-foreground/40">↓</div>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                Le résultat reste exploitable pour identifier les principaux
                ordres de grandeur et les lacunes de données, mais sa qualité est
                plus faible.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tableau résumé */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 font-medium">Données disponibles</th>
                <th className="px-4 py-3 font-medium">Traitement CarboScan</th>
                <th className="px-4 py-3 font-medium">Qualité indicative</th>
              </tr>
            </thead>
            <tbody>
              {qualitySummaryRows.map((row) => (
                <tr key={row.data} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{row.data}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.treatment}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.quality}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          La classification exacte de la qualité dépend de la classe d&apos;actifs
          et des données effectivement utilisées.
        </p>

        {/* Message principal */}
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="space-y-3 p-5 sm:p-6">
            <h3 className="font-semibold text-emerald-950">
              Pas de bilan GES ne signifie pas absence de calcul.
            </h3>
            <p className="text-sm leading-relaxed text-emerald-950/80">
              CarboScan utilise la meilleure donnée disponible, documente la
              méthode employée et indique la qualité du résultat.
            </p>
            <p className="text-sm leading-relaxed text-emerald-950/80">
              L&apos;objectif est d&apos;améliorer progressivement la qualité des
              données du portefeuille au fil des exercices.
            </p>
          </CardContent>
        </Card>

        {/* Traçabilité */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            onClick={() => setShowCalcDetail((v) => !v)}
          >
            Voir le détail du calcul
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                showCalcDetail && "rotate-180",
              )}
            />
          </Button>

          {showCalcDetail && (
            <Card className="border-dashed">
              <CardContent className="space-y-3 p-5 text-sm leading-relaxed text-muted-foreground">
                <p className="font-medium text-foreground">
                  Traçabilité conservée pour chaque estimation
                </p>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {[
                    "Donnée d'activité utilisée",
                    "Unité",
                    "Année de la donnée",
                    "Facteur d'émission utilisé",
                    "Source du facteur",
                    "Version du facteur",
                    "Résultat intermédiaire",
                    "Méthode PCAF",
                    "Facteur d'attribution",
                    "Émissions financées finales",
                    "Data Quality Score",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-muted-foreground/50">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p>
                  Ces éléments sont accessibles dans le détail technique de chaque
                  exposition. La vue principale reste volontairement synthétique
                  pour un responsable bancaire.
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  onClick={() => navigate("/app/fournisseurs/portefeuille")}
                >
                  Explorer une exposition du portefeuille
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* 5. Qualité */}
      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Qualité des données</h2>
          <p className="text-sm text-muted-foreground">
            Chaque résultat est accompagné d&apos;une évaluation de la qualité des
            données utilisées.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-5">
          {qualityScale.map((q) => (
            <div
              key={q.score}
              className="rounded-lg border border-border px-3 py-3 text-center"
            >
              <div
                className={cn(
                  "mx-auto mb-2 h-1.5 w-10 rounded-full",
                  qualityBarClass(q.score),
                )}
              />
              <p className="text-lg font-semibold tabular-nums">{q.score}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{q.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-emerald-900">
                Score 1 = meilleure qualité
              </p>
            </CardContent>
          </Card>
          <Card className="border-rose-200 bg-rose-50/40">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-rose-900">
                Score 5 = qualité la plus faible
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Le score de qualité évalue les données utilisées pour le calcul. Il ne
          mesure pas la performance climatique de l&apos;entreprise financée.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="space-y-2 p-5">
              <p className="text-sm font-semibold">Entreprise A</p>
              <p className="text-2xl font-semibold tabular-nums">100 000 tCO₂e</p>
              <p className="text-sm">
                Score qualité :{" "}
                <span className="font-semibold text-emerald-700">1</span>
              </p>
              <p className="text-xs text-muted-foreground">Données GES vérifiées.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2 p-5">
              <p className="text-sm font-semibold">Entreprise B</p>
              <p className="text-2xl font-semibold tabular-nums">10 000 tCO₂e</p>
              <p className="text-sm">
                Score qualité :{" "}
                <span className="font-semibold text-rose-700">5</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Estimation à partir de données sectorielles.
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Une entreprise fortement émettrice peut disposer de données de très
          bonne qualité.
        </p>
      </section>

      {/* 6. Classes d'actifs */}
      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">
            Une méthodologie adaptée à chaque financement
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            CarboScan identifie ce que l&apos;institution finance avant
            d&apos;appliquer la méthode de calcul correspondante.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {assetClasses.map((asset) => {
            const Icon = asset.icon;
            return (
              <Card key={asset.title} className="h-full">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-foreground" />
                    </span>
                    <p className="font-semibold">{asset.title}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {asset.body}
                  </p>
                  <p className="mt-auto pt-2 text-xs text-muted-foreground">
                    PCAF :{" "}
                    <span className="font-medium text-foreground">{asset.pcaf}</span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Le numérateur, le dénominateur d&apos;attribution et les données
          d&apos;émissions nécessaires varient selon la classe d&apos;actifs.
        </p>

        <Button
          type="button"
          variant="ghost"
          className="h-auto gap-1.5 px-0 text-sm font-medium text-primary hover:bg-transparent hover:underline"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          Voir le détail méthodologique
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")}
          />
        </Button>

        {showAdvanced && (
          <Card className="border-dashed">
            <CardContent className="space-y-3 p-5 text-sm leading-relaxed text-muted-foreground">
              <p>
                Pour chaque classe d&apos;actifs, la méthodologie basée sur PCAF
                définit une logique d&apos;attribution propre. Les formules
                détaillées et les hypothèses appliquées dans CarboScan sont
                documentées dans les notes de méthode.
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                onClick={() => navigate("/app/methode")}
              >
                Ouvrir les notes de méthode
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* 7. Périmètres */}
      <section className="space-y-5">
        <h2 className="text-xl font-semibold">Deux périmètres complémentaires</h2>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="h-full">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Empreinte propre de l&apos;institution</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Scope 1</p>
                  <p className="text-muted-foreground">
                    Émissions directes des activités contrôlées.
                  </p>
                </div>
                <div>
                  <p className="font-medium">Scope 2</p>
                  <p className="text-muted-foreground">
                    Électricité et énergie achetées.
                  </p>
                </div>
                <div>
                  <p className="font-medium">Scope 3</p>
                  <p className="text-muted-foreground">
                    Achats, déplacements, fournisseurs et autres émissions
                    indirectes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full border-emerald-200 bg-emerald-50/30">
            <CardContent className="space-y-4 p-6">
              <Badge
                variant="outline"
                className="border-emerald-300 bg-white text-[11px] text-emerald-800"
              >
                Scope 3 · Catégorie 15
              </Badge>
              <h3 className="font-semibold">Émissions financées</h3>
              <p className="text-sm text-muted-foreground">
                Émissions associées aux financements et investissements couverts.
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>Prêts aux entreprises</li>
                <li>Financements de projets</li>
                <li>Immobilier financé</li>
                <li>Véhicules financés</li>
                <li>Investissements</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          CarboScan conserve ces périmètres distincts afin d&apos;éviter de
          confondre l&apos;empreinte opérationnelle de l&apos;institution avec les
          émissions associées à son portefeuille financier.
        </p>
      </section>

      {/* 8. Processus */}
      <section className="space-y-5">
        <h2 className="text-xl font-semibold">Du portefeuille au reporting</h2>

        <div className="flex flex-wrap items-center gap-2">
          {processSteps.map((label, i) => (
            <React.Fragment key={label}>
              <span className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
                {label}
              </span>
              {i < processSteps.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
              )}
            </React.Fragment>
          ))}
        </div>

        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Chaque exposition conserve ses données sources, sa méthode de calcul,
          son facteur d&apos;attribution et son niveau de qualité afin
          d&apos;assurer la traçabilité du résultat.
        </p>
      </section>

      {/* 9. Analyse */}
      <section className="space-y-5">
        <h2 className="text-xl font-semibold">Analyse du portefeuille</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {analysisCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="h-full">
                <CardContent className="flex gap-3 p-5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-foreground" />
                  </span>
                  <div>
                    <p className="font-semibold">{card.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {card.body}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          L&apos;analyse ne se limite pas à un total d&apos;émissions. Elle permet
          d&apos;identifier les principaux contributeurs et les priorités
          d&apos;amélioration de la donnée.
        </p>
      </section>

      {/* 10. Données incomplètes */}
      <section className="space-y-5">
        <h2 className="text-xl font-semibold">
          Lorsque les données carbone ne sont pas disponibles
        </h2>

        <Card>
          <CardContent className="space-y-0 p-6">
            {incompleteFlow.map((step, i) => (
              <div key={step.title}>
                <div
                  className={cn(
                    "rounded-lg border px-4 py-3.5",
                    step.dominant
                      ? "border-emerald-300 bg-emerald-50/60"
                      : "border-border bg-card",
                  )}
                >
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      step.dominant ? "text-emerald-900" : "text-foreground",
                    )}
                  >
                    {step.title}
                  </p>
                  {step.body && (
                    <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                  )}
                </div>
                {i < incompleteFlow.length - 1 && (
                  <div className="flex justify-center py-1.5 text-muted-foreground/40">↓</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          Le calcul reste possible, mais la qualité de la donnée est plus faible
          et doit être clairement indiquée.
        </p>
      </section>

      {/* 11. CTA */}
      <section>
        <Card className="border-border bg-muted/20">
          <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="max-w-xl space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Analysez votre portefeuille</h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Accédez aux émissions financées, aux principales contributions et
                à la qualité des données de votre portefeuille.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => navigate("/app/fournisseurs")}
                className="gap-2"
              >
                Voir la vue d&apos;ensemble
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/app/fournisseurs/portefeuille")}
              >
                Explorer le portefeuille
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

/** Page Rapport — consolidation institutionnelle (pas de nouveau moteur). */
export const PortfolioReportPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-1 py-2">
      <div className="space-y-2">
        <Badge variant="outline" className="text-[11px] text-muted-foreground">
          Scope 3 · Catégorie 15
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight">Rapport</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Consolidez les émissions financées, la qualité des données et la
          traçabilité des expositions pour le reporting interne ou externe.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileBarChart className="h-4 w-4" />
            </span>
            <div>
              <p className="font-medium">Synthèse portefeuille</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Totaux d&apos;émissions financées et répartition par contrepartie.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => navigate("/app/fournisseurs")}>
            Ouvrir la vue d&apos;ensemble
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="font-medium">Qualité des données</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Scores PCAF et priorités d&apos;amélioration de la donnée.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/app/fournisseurs/scoring")}
          >
            Voir la qualité
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

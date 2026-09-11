/**
 * Public marketing / SEO page — Emission factors catalogue.
 * Does not load registry data; demo search UI is illustrative only.
 */
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SolutionLandingShell } from "@/components/seo/SolutionLandingShell";
import { SolutionFaq, type FaqItem } from "@/components/seo/SolutionFaq";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BookOpen,
  Globe2,
  Layers,
  Ruler,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const NS = "facteursEmissionLanding";

type SourceCard = {
  name: string;
  description: string;
  status: "available" | "soon" | "upcoming" | "study";
};

type UseCase = { title: string; items: string[] };

const STATUS_STYLES: Record<
  SourceCard["status"],
  { badge: string; border: string }
> = {
  available: {
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    border: "border-emerald-200/80",
  },
  soon: {
    badge: "bg-amber-50 text-amber-900 border-amber-200",
    border: "border-amber-200/80",
  },
  upcoming: {
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    border: "border-slate-200",
  },
  study: {
    badge: "bg-background text-muted-foreground border-border",
    border: "border-dashed border-border",
  },
};

const ILLUSTRATIVE_ROWS = [
  {
    nameKey: "search.rows.electricity",
    categoryKey: "search.chips.electricity",
    source: "ADEME Base Carbone",
    unit: "kgCO₂e / kWh",
    geo: "FR",
  },
  {
    nameKey: "search.rows.diesel",
    categoryKey: "search.chips.fuels",
    source: "UK GHG Conversion Factors",
    unit: "kgCO₂e / L",
    geo: "GB",
  },
  {
    nameKey: "search.rows.grid",
    categoryKey: "search.chips.electricity",
    source: "CarboScan / Tunisie",
    unit: "kgCO₂e / kWh",
    geo: "TN",
  },
] as const;

const FacteursEmission: React.FC = () => {
  const { t } = useTranslation();
  const [chip, setChip] = useState(0);

  const stats = t(`${NS}.stats.items`, { returnObjects: true }) as Array<{
    value: string;
    label: string;
  }>;
  const metaItems = t(`${NS}.catalog.metaItems`, { returnObjects: true }) as string[];
  const chips = t(`${NS}.search.chips`, { returnObjects: true }) as Record<
    string,
    string
  >;
  const chipKeys = ["electricity", "transport", "fuels", "freight", "purchases"] as const;
  const contextCards = t(`${NS}.context.cards`, { returnObjects: true }) as Array<{
    title: string;
    body: string;
  }>;
  const resolveItems = t(`${NS}.resolve.items`, { returnObjects: true }) as string[];
  const provenanceSteps = t(`${NS}.traceability.steps`, {
    returnObjects: true,
  }) as string[];
  const provenanceItems = t(`${NS}.traceability.items`, {
    returnObjects: true,
  }) as string[];
  const available = t(`${NS}.sources.available.items`, {
    returnObjects: true,
  }) as SourceCard[];
  const soon = t(`${NS}.sources.soon.items`, { returnObjects: true }) as SourceCard[];
  const upcoming = t(`${NS}.sources.upcoming.items`, {
    returnObjects: true,
  }) as SourceCard[];
  const study = t(`${NS}.sources.study.items`, { returnObjects: true }) as SourceCard[];
  const useCases = t(`${NS}.useCases.items`, { returnObjects: true }) as UseCase[];
  const faqs = t(`${NS}.faq.items`, { returnObjects: true }) as FaqItem[];

  const statusLabel = useMemo(
    () => ({
      available: t(`${NS}.sources.badges.available`),
      soon: t(`${NS}.sources.badges.soon`),
      upcoming: t(`${NS}.sources.badges.upcoming`),
      study: t(`${NS}.sources.badges.study`),
    }),
    [t],
  );

  const renderSourceGroup = (
    title: string,
    items: SourceCard[],
    status: SourceCard["status"],
  ) => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Badge variant="outline" className={STATUS_STYLES[status].badge}>
          {statusLabel[status]}
        </Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.name}
            className={`rounded-2xl border bg-card p-5 ${STATUS_STYLES[status].border}`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h4 className="font-semibold text-foreground leading-snug">{item.name}</h4>
              <Badge variant="outline" className={`shrink-0 text-[10px] ${STATUS_STYLES[status].badge}`}>
                {statusLabel[status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
          </article>
        ))}
      </div>
    </div>
  );

  return (
    <SolutionLandingShell path="/facteurs-emission">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.08),_transparent_55%)]" />
        <div className="container relative mx-auto max-w-5xl px-4 py-16 md:py-24">
          <p className="mb-4 text-sm font-medium tracking-wide text-primary">
            {t(`${NS}.hero.eyebrow`)}
          </p>
          <h1 className="max-w-4xl whitespace-pre-line text-3xl font-bold tracking-tight text-foreground md:text-5xl md:leading-[1.15]">
            {t(`${NS}.hero.title`)}
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground md:text-xl">
            {t(`${NS}.hero.subtitle`)}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/demo">
                {t(`${NS}.hero.ctaPrimary`)}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#catalogue">{t(`${NS}.hero.ctaSecondary`)}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border/60 bg-muted/30">
        <div className="container mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {(Array.isArray(stats) ? stats : []).map((s) => (
            <div key={s.label} className="space-y-1">
              <p className="text-2xl font-bold text-foreground md:text-3xl">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What is FE */}
      <section className="container mx-auto max-w-5xl px-4 py-16 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              {t(`${NS}.what.title`)}
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {t(`${NS}.what.body`)}
            </p>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {t(`${NS}.what.disclaimer`)}
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-full rounded-2xl bg-muted/60 px-4 py-3 text-sm font-medium">
                {t(`${NS}.what.formula.activity`)}
              </div>
              <span className="text-xl font-semibold text-primary">×</span>
              <div className="w-full rounded-2xl bg-primary/10 px-4 py-3 text-sm font-medium text-foreground">
                {t(`${NS}.what.formula.factor`)}
              </div>
              <span className="text-xl font-semibold text-primary">=</span>
              <div className="w-full rounded-2xl border border-primary/20 bg-background px-4 py-3 text-sm font-semibold">
                {t(`${NS}.what.formula.result`)}
              </div>
            </div>
            <p className="mt-5 text-center text-xs text-muted-foreground">
              {t(`${NS}.what.example`)}
            </p>
          </div>
        </div>
      </section>

      {/* Catalogue */}
      <section id="catalogue" className="bg-muted/25 py-16 md:py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            {t(`${NS}.catalog.title`)}
          </h2>
          <p className="mt-4 max-w-3xl text-muted-foreground leading-relaxed">
            {t(`${NS}.catalog.body`)}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">{t(`${NS}.catalog.metaIntro`)}</p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {(Array.isArray(metaItems) ? metaItems : []).map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-foreground/90"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Search preview — illustrative, no numeric FE values */}
      <section className="container mx-auto max-w-5xl px-4 py-16 md:py-20">
        <div className="mb-8 max-w-3xl">
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            {t(`${NS}.search.title`)}
          </h2>
          <p className="mt-3 text-muted-foreground">{t(`${NS}.search.subtitle`)}</p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/40 px-4 py-4 md:px-6">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-muted-foreground">
              <Search className="h-4 w-4 shrink-0" />
              <span className="text-sm">{t(`${NS}.search.placeholder`)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {chipKeys.map((key, i) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setChip(i)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    chip === i
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {chips?.[key] ?? key}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-border">
            {ILLUSTRATIVE_ROWS.map((row) => (
              <div
                key={row.nameKey}
                className="grid gap-2 px-4 py-4 md:grid-cols-[1.4fr_0.8fr_0.6fr_0.4fr] md:items-center md:px-6"
              >
                <div>
                  <p className="font-medium text-foreground">{t(`${NS}.${row.nameKey}`)}</p>
                  <p className="text-xs text-muted-foreground">{t(`${NS}.${row.categoryKey}`)}</p>
                </div>
                <p className="text-sm text-muted-foreground">{row.source}</p>
                <p className="font-mono text-xs text-muted-foreground">{row.unit}</p>
                <p className="text-xs font-medium text-foreground">{row.geo}</p>
              </div>
            ))}
          </div>
          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground md:px-6">
            {t(`${NS}.search.disclaimer`)}
          </p>
        </div>
      </section>

      {/* Context cards */}
      <section className="border-y border-border/60 bg-muted/25 py-16 md:py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            {t(`${NS}.context.title`)}
          </h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">{t(`${NS}.context.subtitle`)}</p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {(Array.isArray(contextCards) ? contextCards : []).map((card, i) => {
              const Icon = [Globe2, Ruler, Layers, BookOpen][i] ?? Layers;
              return (
                <article key={card.title} className="rounded-2xl border border-border bg-card p-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">{card.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{card.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Resolve intelligence */}
      <section className="container mx-auto max-w-5xl px-4 py-16 md:py-20">
        <div className="rounded-3xl border border-border bg-card p-8 md:p-10">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            {t(`${NS}.resolve.title`)}
          </h2>
          <p className="mt-4 max-w-3xl text-muted-foreground leading-relaxed">
            {t(`${NS}.resolve.body`)}
          </p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {(Array.isArray(resolveItems) ? resolveItems : []).map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-foreground/90">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">{t(`${NS}.resolve.disclaimer`)}</p>
        </div>
      </section>

      {/* Traceability */}
      <section className="bg-muted/25 py-16 md:py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            {t(`${NS}.traceability.title`)}
          </h2>
          <p className="mt-4 max-w-3xl text-muted-foreground leading-relaxed">
            {t(`${NS}.traceability.body`)}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2 text-sm">
            {(Array.isArray(provenanceSteps) ? provenanceSteps : []).map((step, i, arr) => (
              <React.Fragment key={step}>
                <span className="rounded-full border border-border bg-card px-3 py-1.5 font-medium">
                  {step}
                </span>
                {i < arr.length - 1 && (
                  <span className="text-muted-foreground" aria-hidden>
                    →
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">{t(`${NS}.traceability.itemsIntro`)}</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {(Array.isArray(provenanceItems) ? provenanceItems : []).map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Sources */}
      <section id="sources" className="container mx-auto max-w-5xl space-y-12 px-4 py-16 md:py-20">
        <div>
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            {t(`${NS}.sources.title`)}
          </h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">{t(`${NS}.sources.subtitle`)}</p>
        </div>
        {renderSourceGroup(t(`${NS}.sources.available.title`), available, "available")}
        {renderSourceGroup(t(`${NS}.sources.soon.title`), soon, "soon")}
        {renderSourceGroup(t(`${NS}.sources.upcoming.title`), upcoming, "upcoming")}
        {renderSourceGroup(t(`${NS}.sources.study.title`), study, "study")}
        <p className="rounded-2xl border border-border bg-muted/40 px-5 py-4 text-sm text-muted-foreground leading-relaxed">
          {t(`${NS}.sources.roadmapNote`)}
        </p>
      </section>

      {/* Use cases */}
      <section className="border-y border-border/60 bg-muted/25 py-16 md:py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            {t(`${NS}.useCases.title`)}
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(Array.isArray(useCases) ? useCases : []).map((uc) => (
              <article key={uc.title} className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground">{uc.title}</h3>
                <ul className="mt-3 space-y-1.5">
                  {(uc.items ?? []).map((item) => (
                    <li key={item} className="text-sm text-muted-foreground">
                      · {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA bilan */}
      <section className="container mx-auto max-w-5xl px-4 py-16 md:py-20">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-8 md:p-12">
          <h2 className="max-w-2xl text-2xl font-bold text-foreground md:text-3xl">
            {t(`${NS}.cta.title`)}
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">
            {t(`${NS}.cta.body`)}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/bilan-carbone">
                {t(`${NS}.cta.primary`)}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/demo">{t(`${NS}.cta.secondary`)}</Link>
            </Button>
          </div>
        </div>
      </section>

      <SolutionFaq
        path="/facteurs-emission"
        title={t(`${NS}.faq.title`)}
        faqs={Array.isArray(faqs) ? faqs : []}
      />
    </SolutionLandingShell>
  );
};

export default FacteursEmission;

/**
 * Public marketing page — Emission factors catalogue.
 * Illustrative search UI only; does not load registry data.
 */
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SolutionLandingShell } from "@/components/seo/SolutionLandingShell";
import { SEOHead } from "@/components/seo/SEOHead";
import { ArrowRight, Search } from "lucide-react";

const NS = "facteursEmissionLanding";
const PATH = "/facteurs-emission";

type Category = "electricity" | "transport" | "fuels" | "freight";

type DemoRow = {
  id: string;
  category: Category;
  nameKey: string;
  source: string;
  unit: string;
  geo: string;
};

/** Illustrative rows — name/source/unit/geo only (no invented factor values). */
const DEMO_ROWS: DemoRow[] = [
  {
    id: "elec-fr",
    category: "electricity",
    nameKey: "catalog.rows.gridElectricity",
    source: "ADEME Base Carbone",
    unit: "kgCO₂e / kWh",
    geo: "FR",
  },
  {
    id: "diesel-uk",
    category: "fuels",
    nameKey: "catalog.rows.diesel",
    source: "UK Government GHG Conversion Factors",
    unit: "kgCO₂e / litre",
    geo: "GB",
  },
  {
    id: "car-fr",
    category: "transport",
    nameKey: "catalog.rows.passengerCar",
    source: "ADEME Base Carbone",
    unit: "kgCO₂e / km",
    geo: "FR",
  },
  {
    id: "freight-uk",
    category: "freight",
    nameKey: "catalog.rows.roadFreight",
    source: "UK Government GHG Conversion Factors",
    unit: "kgCO₂e / tonne.km",
    geo: "GB",
  },
  {
    id: "gas-fr",
    category: "fuels",
    nameKey: "catalog.rows.naturalGas",
    source: "ADEME Base Carbone",
    unit: "kgCO₂e / kWh PCS",
    geo: "FR",
  },
  {
    id: "elec-tn",
    category: "electricity",
    nameKey: "catalog.rows.gridLocal",
    source: "CarboScan",
    unit: "kgCO₂e / kWh",
    geo: "TN",
  },
];

const CATEGORIES: Category[] = ["electricity", "transport", "fuels", "freight"];

const CONTEXT_KEYS = [
  "geography",
  "unit",
  "source",
  "version",
  "methodContext",
] as const;

const WHY_KEYS = ["contextual", "traceability", "multisource"] as const;

const FacteursEmission: React.FC = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");

  const sourceGroups = useMemo(
    () =>
      [
        {
          status: "available" as const,
          items: [
            { name: "ADEME", subtitle: "Base Carbone" },
            { name: "UK Government", subtitle: "GHG Conversion Factors" },
            { name: "CarboScan", subtitle: t(`${NS}.sources.localFactors`) },
          ],
        },
        {
          status: "soon" as const,
          items: [
            { name: "EPA", subtitle: "US GHG Emission Factors Hub" },
            { name: "INIES", subtitle: t(`${NS}.sources.inies`) },
            { name: "PEP ecopassport" },
            { name: "IPCC" },
            { name: "Agribalyse" },
          ],
        },
        {
          status: "upcoming" as const,
          items: [{ name: "HBEFA" }, { name: "Worldsteel" }, { name: "Plastics Europe" }],
        },
        {
          status: "study" as const,
          items: [{ name: "ecoinvent" }],
        },
      ] as const,
    [t],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO_ROWS.filter((row) => {
      if (category !== "all" && row.category !== category) return false;
      if (!q) return true;
      const name = t(`${NS}.${row.nameKey}`).toLowerCase();
      return (
        name.includes(q) ||
        row.source.toLowerCase().includes(q) ||
        row.geo.toLowerCase().includes(q) ||
        row.unit.toLowerCase().includes(q)
      );
    });
  }, [category, query, t]);

  const statusStyle: Record<
    (typeof sourceGroups)[number]["status"],
    { badge: string; wrap: string }
  > = {
    available: {
      badge: "bg-[#07563F] text-white",
      wrap: "border-[#07563F]/20 bg-white",
    },
    soon: {
      badge: "bg-[#073D30]/08 text-[#073D30]",
      wrap: "border-[#073D30]/10 bg-white",
    },
    upcoming: {
      badge: "bg-transparent text-[#073D30]/55 border border-[#073D30]/15",
      wrap: "border-[#073D30]/08 bg-[#F7FAF8]",
    },
    study: {
      badge: "bg-transparent text-[#073D30]/45 border border-dashed border-[#073D30]/25",
      wrap: "border-dashed border-[#073D30]/20 bg-transparent",
    },
  };

  return (
    <SolutionLandingShell path={PATH} showRelated={false}>
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
              <a
                href="#catalogue"
                className="inline-flex h-12 items-center justify-center rounded-[4px] bg-[#07563F] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#054C36]"
              >
                {t(`${NS}.hero.ctaPrimary`)}
              </a>
              <Link
                to="/bilan-carbone"
                className="inline-flex h-12 items-center justify-center rounded-[4px] border border-[#073D30]/15 bg-white px-6 text-[15px] font-semibold text-[#073D30] transition-colors hover:border-[#073D30]/30 hover:bg-white"
              >
                {t(`${NS}.hero.ctaSecondary`)}
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-10 gap-y-5 border-t border-[#073D30]/10 pt-8">
              <div>
                <div className="text-2xl font-semibold tracking-tight text-[#073D30]">10 000+</div>
                <div className="mt-1 text-sm text-[#073D30]/55">{t(`${NS}.hero.statFactors`)}</div>
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight text-[#073D30]">
                  {t(`${NS}.hero.statMulti`)}
                </div>
                <div className="mt-1 text-sm text-[#073D30]/55">{t(`${NS}.hero.statMultiLabel`)}</div>
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight text-[#073D30]">
                  {t(`${NS}.hero.statTrace`)}
                </div>
                <div className="mt-1 text-sm text-[#073D30]/55">{t(`${NS}.hero.statTraceLabel`)}</div>
              </div>
            </div>
          </div>

          {/* Product preview — search engine */}
          <div className="relative">
            <div className="rounded-[28px] border border-[#073D30]/08 bg-white p-3 shadow-[0_30px_80px_-40px_rgba(7,61,48,0.45)] sm:p-4">
              <div className="rounded-2xl border border-[#073D30]/08 bg-[#F7FAF8] p-4">
                <div className="flex items-center gap-3 rounded-xl border border-[#073D30]/10 bg-white px-3.5 py-3">
                  <Search className="h-4 w-4 shrink-0 text-[#073D30]/40" aria-hidden />
                  <span className="truncate text-[14px] text-[#073D30]/40">
                    {t(`${NS}.catalog.placeholder`)}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {DEMO_ROWS.slice(0, 3).map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-[#073D30]">
                          {t(`${NS}.${row.nameKey}`)}
                        </div>
                        <div className="mt-0.5 truncate text-[12px] text-[#073D30]/45">
                          {row.source}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[12px] font-medium text-[#073D30]/70">{row.unit}</div>
                        <div className="mt-0.5 text-[11px] uppercase tracking-wide text-[#073D30]/40">
                          {row.geo}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2 — Catalogue */}
      <section id="catalogue" className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[#073D30] md:text-4xl">
              {t(`${NS}.catalog.title`)}
            </h2>
            <p className="mt-5 text-[16px] leading-relaxed text-[#073D30]/65 md:text-[17px]">
              {t(`${NS}.catalog.body`)}
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:gap-10">
            <div className="rounded-[24px] border border-[#073D30]/08 bg-[#F7FAF8] p-4 sm:p-5">
              <label className="sr-only" htmlFor="fe-search">
                {t(`${NS}.catalog.placeholder`)}
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-[#073D30]/10 bg-white px-4 py-3.5 shadow-sm">
                <Search className="h-4 w-4 text-[#073D30]/40" aria-hidden />
                <input
                  id="fe-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t(`${NS}.catalog.placeholder`)}
                  className="w-full bg-transparent text-[15px] text-[#073D30] outline-none placeholder:text-[#073D30]/35"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategory("all")}
                  className={`rounded-[4px] px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                    category === "all"
                      ? "bg-[#07563F] text-white"
                      : "bg-white text-[#073D30]/70 ring-1 ring-[#073D30]/10 hover:text-[#073D30]"
                  }`}
                >
                  {t(`${NS}.catalog.all`)}
                </button>
                {CATEGORIES.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={`rounded-[4px] px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                      category === key
                        ? "bg-[#07563F] text-white"
                        : "bg-white text-[#073D30]/70 ring-1 ring-[#073D30]/10 hover:text-[#073D30]"
                    }`}
                  >
                    {t(`${NS}.catalog.categories.${key}`)}
                  </button>
                ))}
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-[#073D30]/08 bg-white">
                <div className="hidden grid-cols-[1.4fr_1.2fr_0.9fr_0.35fr] gap-3 border-b border-[#073D30]/06 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#073D30]/40 sm:grid">
                  <span>{t(`${NS}.catalog.cols.name`)}</span>
                  <span>{t(`${NS}.catalog.cols.source`)}</span>
                  <span>{t(`${NS}.catalog.cols.unit`)}</span>
                  <span>{t(`${NS}.catalog.cols.geo`)}</span>
                </div>
                <ul>
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className="grid gap-1 border-b border-[#073D30]/06 px-4 py-3.5 last:border-0 sm:grid-cols-[1.4fr_1.2fr_0.9fr_0.35fr] sm:items-center sm:gap-3"
                    >
                      <div className="text-[14px] font-medium text-[#073D30]">
                        {t(`${NS}.${row.nameKey}`)}
                      </div>
                      <div className="text-[13px] text-[#073D30]/55">{row.source}</div>
                      <div className="text-[13px] text-[#073D30]/70">{row.unit}</div>
                      <div className="text-[12px] font-medium uppercase tracking-wide text-[#073D30]/45">
                        {row.geo}
                      </div>
                    </li>
                  ))}
                  {rows.length === 0 && (
                    <li className="px-4 py-8 text-center text-[14px] text-[#073D30]/45">
                      {t(`${NS}.catalog.empty`)}
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <aside className="flex flex-col justify-between gap-6 lg:pt-1">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#073D30]/40">
                  {t(`${NS}.catalog.contextLabel`)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {CONTEXT_KEYS.map((key) => (
                    <span
                      key={key}
                      className="rounded-[4px] border border-[#073D30]/10 bg-white px-3.5 py-2 text-[13px] font-medium text-[#073D30]"
                    >
                      {t(`${NS}.catalog.context.${key}`)}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-[15px] leading-relaxed text-[#073D30]/65">
                {t(`${NS}.catalog.structureNote`)}
              </p>
            </aside>
          </div>
        </div>
      </section>

      {/* 3 — Multi-sources */}
      <section className="border-y border-[#073D30]/06 bg-[#F7FAF8] py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-[#073D30] md:text-4xl">
            {t(`${NS}.sources.title`)}
          </h2>

          <div className="mt-14 space-y-10">
            {sourceGroups.map((group) => (
              <div key={group.status}>
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${statusStyle[group.status].badge}`}
                  >
                    {t(`${NS}.sources.badges.${group.status}`)}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => (
                    <div
                      key={item.name}
                      className={`rounded-2xl border px-5 py-4 ${statusStyle[group.status].wrap}`}
                    >
                      <div className="text-[15px] font-semibold text-[#073D30]">{item.name}</div>
                      {"subtitle" in item && item.subtitle ? (
                        <div className="mt-1 text-[13px] text-[#073D30]/55">{item.subtitle}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — Pourquoi CarboScan */}
      <section className="bg-white py-20 md:py-28">
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

      {/* 5 — CTA final */}
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
              to="/bilan-carbone"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[4px] bg-white px-6 text-[15px] font-semibold text-[#073D30] transition-colors hover:bg-[#F7FAF8]"
            >
              {t(`${NS}.cta.primary`)}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/demo"
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

export default FacteursEmission;

#!/usr/bin/env node
/**
 * DEMO DATA — FICTIONAL ENRICHMENT for existing non-PCAF enterprise org KTC
 * Linked to kameltalbi.tn@gmail.com (owner). Does NOT recreate the user/org.
 *
 * Covers: sites + activity 2024/2025, closed bilans + ledger, climate roadmap /
 * actions / scenario results / objective, classic suppliers, factual report.
 *
 * Usage:
 *   node scripts/seed-ktc-entreprise-demo.mjs --sql > /tmp/ktc_demo.sql
 *   # pipe into psql (newcarboscan bypasses RLS)
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

const ORG = "69ec7061-faab-44f3-9a98-18be354637ba";
const USER = "f0df88c8-cb72-47a6-8631-5cc09627a38d";
const COMPANY = "841f5521-1142-4469-8a7a-54a80c096972";
const LEGACY = "demo_ktc_entreprise";
const EMAIL = "kameltalbi.tn@gmail.com";

const SITE_SOUKRA = "92e704fc-e151-4c4a-9382-470e194658d0";
const SITE_FOUCHANA = "cc40103c-8c96-4d1f-ad00-a81e988c683a";
const BILAN_2025 = "b88a94b1-5358-4878-b21b-91a03f6b0428";

const FE = {
  gas: "b1000000-0000-4000-8000-000000000001",
  fuel: "b1000000-0000-4000-8000-000000000002",
  essence: "b1000000-0000-4000-8000-000000000003",
  diesel: "b1000000-0000-4000-8000-000000000004",
  refrigerant: "b1000000-0000-4000-8000-000000000005",
  elec: "b1000000-0000-4000-8000-000000000006",
  heat: "b1000000-0000-4000-8000-000000000007",
  purchases: "b1000000-0000-4000-8000-000000000008",
};

const FE_VAL = {
  [FE.gas]: { v: 2.056, u: "m3", name: "Gaz naturel" },
  [FE.fuel]: { v: 2.68, u: "L", name: "Fioul / carburant" },
  [FE.essence]: { v: 2.31, u: "L", name: "Essence flotte" },
  [FE.diesel]: { v: 2.68, u: "L", name: "Diesel flotte" },
  [FE.refrigerant]: { v: 1345, u: "kg", name: "Fluide frigorigène" },
  [FE.elec]: { v: 0.523, u: "kWh", name: "Électricité TN" },
  [FE.heat]: { v: 0.2, u: "kWh", name: "Chaleur / vapeur" },
  [FE.purchases]: { v: 0.5, u: "TND", name: "Achats monétaires" },
};

const MODULE_CODES = [
  "bilan-carbone",
  "collect",
  "fournisseurs",
  "decarbotech",
  "empreinte-produit",
];

/** Build a fixed demo UUID from a numeric id (1..0xfffffff). */
function uid(n) {
  const num = typeof n === "number" ? n : parseInt(String(n).replace(/[^0-9a-f]/gi, ""), 16);
  if (!Number.isFinite(num) || num < 0) throw new Error(`bad uid ${n}`);
  return `c7c70000-0000-4000-8000-${num.toString(16).padStart(12, "0")}`;
}

const RUN_2024 = uid("f024");
const RUN_2025 = uid("f025");
const BILAN_2024 = uid("b024");
const REPORT_2025 = uid("e025");
const ROADMAP = uid("d001");
const SCENARIO = uid("d002");
const OBJECTIVE = uid("d003");

const SITES = [
  {
    id: SITE_SOUKRA,
    code: "SOU-HQ",
    name: "La Soukra — Siège & labo",
    city: "Ariana",
    type: "headquarters",
    surface: 4200,
    employees: 85,
    profile: "hq",
    existing: true,
  },
  {
    id: SITE_FOUCHANA,
    code: "FOU-USI",
    name: "Fouchana — Usine principale",
    city: "Fouchana",
    type: "usine",
    surface: 18500,
    employees: 240,
    profile: "plant",
    existing: true,
  },
  {
    id: uid("a003"),
    code: "BEN-ENT",
    name: "Ben Arous — Entrepôt logistique",
    city: "Ben Arous",
    type: "warehouse",
    surface: 6800,
    employees: 48,
    profile: "warehouse",
  },
  {
    id: uid("a004"),
    code: "SOU-USI",
    name: "Sousse — Usine secondaire",
    city: "Sousse",
    type: "usine",
    surface: 9200,
    employees: 110,
    profile: "plant_small",
  },
  {
    id: uid("a005"),
    code: "SFX-ATEL",
    name: "Sfax — Atelier conditionnement",
    city: "Sfax",
    type: "atelier",
    surface: 3100,
    employees: 42,
    profile: "atelier",
  },
  {
    id: uid("a006"),
    code: "NAB-FRM",
    name: "Nabeul — Ferme partenaires",
    city: "Nabeul",
    type: "ferme",
    surface: 15000,
    employees: 28,
    profile: "farm",
  },
];

const LEVERS = [
  { id: uid("b101"), name: "Efficacité énergétique usines", category: "energy", pot: 180 },
  { id: uid("b102"), name: "Flotte & logistique bas carbone", category: "transport", pot: 95 },
  { id: uid("b103"), name: "Achats & packaging responsables", category: "purchasing", pot: 140 },
  { id: uid("b104"), name: "Froid industriel & fluides", category: "process", pot: 70 },
];

const ACTIONS = [
  {
    id: uid("c101"),
    lever: uid("b101"),
    title: "LED + VSD compresseurs Fouchana",
    status: "in_progress",
    progress: 55,
    reduction: 42,
    priority: "high",
    site: SITE_FOUCHANA,
  },
  {
    id: uid("c102"),
    lever: uid("b101"),
    title: "Récupération chaleur process Sousse",
    status: "studying",
    progress: 20,
    reduction: 28,
    priority: "medium",
    site: uid("a004"),
  },
  {
    id: uid("c103"),
    lever: uid("b102"),
    title: "Electrification 30% flotte diesel",
    status: "in_progress",
    progress: 35,
    reduction: 38,
    priority: "high",
    site: uid("a003"),
  },
  {
    id: uid("c104"),
    lever: uid("b102"),
    title: "Optimisation tournées livraison clients",
    status: "completed",
    progress: 100,
    reduction: 18,
    priority: "medium",
    site: uid("a003"),
  },
  {
    id: uid("c105"),
    lever: uid("b103"),
    title: "Packaging recyclé / allégé",
    status: "validated",
    progress: 40,
    reduction: 55,
    priority: "high",
    site: SITE_SOUKRA,
  },
  {
    id: uid("c106"),
    lever: uid("b104"),
    title: "Remplacement R410A par fluide bas GWP",
    status: "to_launch",
    progress: 5,
    reduction: 48,
    priority: "high",
    site: SITE_FOUCHANA,
  },
];

const SUPPLIERS = [
  { id: uid("d101"), name: "MedOlive Packaging", city: "Sfax", cat: "Emballages", spend: 1850000, kg: 420000 },
  { id: uid("d102"), name: "Sahel Fruits Coop", city: "Nabeul", cat: "Matières premières agricoles", spend: 4200000, kg: 980000 },
  { id: uid("d103"), name: "Tunis Cold Chain", city: "Tunis", cat: "Logistique frigorifique", spend: 960000, kg: 310000 },
  { id: uid("d104"), name: "Cap Bon Ingredients", city: "Nabeul", cat: "Ingrédients", spend: 2100000, kg: 540000 },
  { id: uid("d105"), name: "GreenWash Services", city: "Ariana", cat: "Services industriels", spend: 380000, kg: 95000 },
  { id: uid("d106"), name: "Atlas Maintenance Indus", city: "Ben Arous", cat: "Maintenance", spend: 520000, kg: 140000 },
];

function sqlStr(v) {
  if (v == null) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}
function sqlNum(v) {
  if (v == null) return "NULL";
  return String(v);
}

let actSeq = 0x4000;
function nextActId() {
  actSeq += 1;
  return uid(actSeq);
}

function act({
  year,
  siteId,
  category,
  subcategory,
  scope,
  quantity,
  unit,
  factorId = null,
  activityType = "energy",
  quality = "estimated",
  method = "physical",
  sourceType = "estimate",
  uncertainty = 20,
  notes,
  legacyId,
}) {
  const id = nextActId();
  const p0 = `${year}-01-01`;
  const p1 = `${year}-12-31`;
  return {
    id,
    year,
    siteId,
    category,
    subcategory,
    scope,
    quantity,
    unit,
    factorId,
    sql: `(${[
      sqlStr(id),
      sqlStr(ORG),
      sqlStr(siteId),
      sqlStr(category),
      sqlStr(subcategory),
      sqlNum(scope),
      sqlNum(quantity),
      sqlStr(unit),
      sqlStr(p0),
      sqlStr(p1),
      factorId ? sqlStr(factorId) : "NULL",
      sqlStr(activityType),
      sqlStr(quality),
      sqlStr(method),
      sqlStr(sourceType),
      sqlNum(uncertainty),
      factorId ? sqlStr("Newcarboscan Core Pack TN") : "NULL",
      factorId ? String(year) : "NULL",
      factorId ? sqlStr("TN") : "NULL",
      sqlStr(`${notes} — DEMO DATA — FICTIONAL ORGANIZATION`),
      sqlStr(USER),
      sqlStr("validated"),
      sqlStr(LEGACY),
      sqlStr(legacyId),
      "now()",
      `'{"demo":true,"label":"DEMO DATA — FICTIONAL ORGANIZATION","org":"KTC"}'::jsonb`,
    ].join(",")})`,
  };
}

function activitiesForYear(year, scale = 1) {
  const rows = [];
  const s = (n) => Math.round(n * scale);

  for (const site of SITES) {
    const p = site.profile;
    const elecBase = {
      hq: 420_000,
      plant: 2_850_000,
      plant_small: 1_150_000,
      warehouse: 680_000,
      atelier: 390_000,
      farm: 145_000,
    }[p];
    rows.push(
      act({
        year,
        siteId: site.id,
        category: "scope2",
        subcategory: "electricity_grid",
        scope: 2,
        quantity: s(elecBase),
        unit: "kWh",
        factorId: FE.elec,
        quality: p === "farm" ? "estimated" : "real",
        sourceType: p === "farm" ? "estimate" : "invoice",
        uncertainty: p === "farm" ? 25 : 12,
        notes: `Électricité ${site.name}`,
        legacyId: `elec-${site.code}-${year}`,
      }),
    );

    if (p === "plant" || p === "plant_small") {
      rows.push(
        act({
          year,
          siteId: site.id,
          category: "scope1",
          subcategory: "fossil_gas",
          scope: 1,
          quantity: s(p === "plant" ? 95_000 : 38_000),
          unit: "m³",
          factorId: FE.gas,
          quality: "real",
          sourceType: "invoice",
          uncertainty: 12,
          notes: `Gaz process ${site.name}`,
          legacyId: `gas-${site.code}-${year}`,
        }),
        act({
          year,
          siteId: site.id,
          category: "scope1",
          subcategory: "fuel_diesel",
          scope: 1,
          quantity: s(p === "plant" ? 48_000 : 18_000),
          unit: "L",
          factorId: FE.diesel,
          quality: "real",
          sourceType: "invoice",
          uncertainty: 15,
          notes: `Groupes / chariots diesel ${site.name}`,
          legacyId: `diesel-${site.code}-${year}`,
        }),
        act({
          year,
          siteId: site.id,
          category: "scope1",
          subcategory: "fugitive_r410a",
          scope: 1,
          quantity: s(p === "plant" ? 42 : 18),
          unit: "kg",
          factorId: FE.refrigerant,
          quality: "estimated",
          sourceType: "estimate",
          uncertainty: 30,
          notes: `Fuites froid ${site.name}`,
          legacyId: `r410a-${site.code}-${year}`,
        }),
      );
    }

    if (p === "warehouse" || p === "hq") {
      rows.push(
        act({
          year,
          siteId: site.id,
          category: "scope1",
          subcategory: "fuel_diesel",
          scope: 1,
          quantity: s(p === "warehouse" ? 62_000 : 12_000),
          unit: "L",
          factorId: FE.diesel,
          quality: "real",
          sourceType: "invoice",
          uncertainty: 15,
          notes: `Flotte site ${site.name}`,
          legacyId: `fleet-${site.code}-${year}`,
        }),
      );
    }

    if (p === "hq") {
      rows.push(
        act({
          year,
          siteId: site.id,
          category: "scope1",
          subcategory: "fuel_gasoline",
          scope: 1,
          quantity: s(8_500),
          unit: "L",
          factorId: FE.essence,
          quality: "real",
          sourceType: "invoice",
          uncertainty: 15,
          notes: "Véhicules direction",
          legacyId: `essence-${site.code}-${year}`,
        }),
      );
    }

    // Scope 3 light per site
    rows.push(
      act({
        year,
        siteId: site.id,
        category: "scope3_upstream",
        subcategory: "cat7_employee_commuting:cat7_car_solo",
        scope: 3,
        quantity: s(site.employees * 220 * 22),
        unit: "km",
        activityType: "transport",
        method: "physical",
        sourceType: "extrapolation",
        uncertainty: 40,
        notes: `Domicile-travail ${site.city}`,
        legacyId: `commute-${site.code}-${year}`,
      }),
      act({
        year,
        siteId: site.id,
        category: "scope3_upstream",
        subcategory: "cat5_waste:cat5_unsorted_waste",
        scope: 3,
        quantity: s(p === "plant" ? 28_000 : p === "plant_small" ? 12_000 : 3_500),
        unit: "kg",
        activityType: "waste",
        uncertainty: 35,
        notes: `Déchets ${site.name}`,
        legacyId: `waste-${site.code}-${year}`,
      }),
    );
  }

  // Central scope 3 at HQ / plant
  rows.push(
    act({
      year,
      siteId: SITE_FOUCHANA,
      category: "scope3_upstream",
      subcategory: "cat1_purchased_goods:cat1_outsourced_services",
      scope: 3,
      quantity: s(2_450_000),
      unit: "TND",
      factorId: FE.purchases,
      activityType: "service",
      method: "monetary",
      sourceType: "invoice",
      uncertainty: 45,
      notes: "Achats matières & services industriels",
      legacyId: `purch-${year}`,
    }),
    act({
      year,
      siteId: SITE_FOUCHANA,
      category: "scope3_upstream",
      subcategory: "cat1_purchased_goods:cat1_packaging",
      scope: 3,
      quantity: s(980_000),
      unit: "TND",
      factorId: FE.purchases,
      activityType: "service",
      method: "monetary",
      sourceType: "invoice",
      uncertainty: 40,
      notes: "Emballages & conditionnement",
      legacyId: `pack-${year}`,
    }),
    act({
      year,
      siteId: SITE_SOUKRA,
      category: "scope3_upstream",
      subcategory: "cat2_capital_goods:cat2_it_equipment",
      scope: 3,
      quantity: s(320_000),
      unit: "TND",
      factorId: FE.purchases,
      activityType: "service",
      method: "monetary",
      sourceType: "invoice",
      uncertainty: 40,
      notes: "CAPEX IT / labo",
      legacyId: `capex-it-${year}`,
    }),
    act({
      year,
      siteId: uid("a003"),
      category: "scope3_upstream",
      subcategory: "cat4_upstream_transport:cat4_road_freight_local",
      scope: 3,
      quantity: s(420_000),
      unit: "t.km",
      activityType: "transport",
      sourceType: "estimate",
      uncertainty: 40,
      notes: "Transport amont matières",
      legacyId: `freight-up-${year}`,
    }),
    act({
      year,
      siteId: uid("a003"),
      category: "scope3_downstream",
      subcategory: "cat9_downstream_transport:cat9_delivery_truck",
      scope: 3,
      quantity: s(380_000),
      unit: "km",
      activityType: "transport",
      sourceType: "invoice",
      uncertainty: 30,
      notes: "Livraisons clients",
      legacyId: `freight-down-${year}`,
    }),
    act({
      year,
      siteId: SITE_SOUKRA,
      category: "scope3_upstream",
      subcategory: "cat6_business_travel:cat6_flight_short",
      scope: 3,
      quantity: s(85_000),
      unit: "km",
      activityType: "transport",
      sourceType: "invoice",
      uncertainty: 25,
      notes: "Voyages d'affaires",
      legacyId: `travel-${year}`,
    }),
  );

  return rows;
}

function buildSnapshot(lines, year) {
  const frozenAt = `${year}-12-31T23:59:59.000Z`;
  const normalized = lines.map((l, i) => {
    const fe = l.factorId ? FE_VAL[l.factorId] : null;
    const factorValue = fe ? fe.v : 0;
    const resultKgCo2e = fe ? Math.round(l.quantity * fe.v * 1000) / 1000 : 0;
    return {
      lineKey: `${l.scope}:${l.category}:${l.subcategory}:${i}`,
      name: fe?.name || l.subcategory,
      category: l.category,
      scope: l.scope,
      quantity: l.quantity,
      activityUnit: l.unit,
      factorValue,
      factorUnit: fe ? `kgCO2e/${fe.u}` : "kgCO2e",
      factorSource: fe ? "Newcarboscan Core Pack TN" : "Non trouvé",
      factorName: fe?.name || l.subcategory,
      resultKgCo2e,
      factorId: l.factorId,
      factorVersion: null,
      factorYear: year,
      factorGeography: "TN",
      usedAt: frozenAt,
    };
  }).filter((l) => l.resultKgCo2e > 0);

  const canonical = JSON.stringify(normalized);
  return {
    frozenAt,
    engineVersion: "bilan-ui-demo-1.0.0",
    methodologyVersion: "ghg-corporate-1.0.0",
    method: "bilan_carbone",
    periodStart: `${year}-01-01`,
    periodEnd: `${year}-12-31`,
    inputHash: createHash("sha256").update(canonical).digest("hex"),
    resultHash: createHash("sha256")
      .update(normalized.map((l) => String(l.resultKgCo2e)).join("|"))
      .digest("hex"),
    lines: normalized,
  };
}

function totalsFromSnapshot(snapshot) {
  const kg = (scope) =>
    snapshot.lines.filter((l) => l.scope === scope).reduce((s, l) => s + l.resultKgCo2e, 0);
  const s1 = kg(1);
  const s2 = kg(2);
  const s3 = kg(3);
  const total = s1 + s2 + s3;
  return {
    s1Kg: s1,
    s2Kg: s2,
    s3Kg: s3,
    totalKg: total,
    s1T: Math.round((s1 / 1000) * 1000) / 1000,
    s2T: Math.round((s2 / 1000) * 1000) / 1000,
    s3T: Math.round((s3 / 1000) * 1000) / 1000,
    totalT: Math.round((total / 1000) * 1000) / 1000,
  };
}

function buildSql() {
  const acts2024 = activitiesForYear(2024, 0.92);
  const acts2025 = activitiesForYear(2025, 1);
  const allActs = [...acts2024, ...acts2025];

  const snap2024 = buildSnapshot(acts2024, 2024);
  const snap2025 = buildSnapshot(acts2025, 2025);
  const tot2024 = totalsFromSnapshot(snap2024);
  const tot2025 = totalsFromSnapshot(snap2025);

  const baselineT = tot2025.totalT;
  const reductionT = 220; // tCO2e what-if reduction by 2030
  const targetT = Math.max(0, baselineT - reductionT);

  const siteEmployees = SITES.reduce((n, s) => n + s.employees, 0);
  const siteSurface = SITES.reduce((n, s) => n + s.surface, 0);

  const siteInserts = SITES.filter((s) => !s.existing)
    .map(
      (s) => `(${[
        sqlStr(s.id),
        sqlStr(ORG),
        sqlStr(COMPANY),
        sqlStr(s.name),
        sqlStr(s.code),
        sqlStr(s.city),
        sqlStr("Tunisie"),
        sqlStr("TN"),
        sqlStr(s.type),
        sqlNum(s.surface),
        sqlNum(s.employees),
        "true",
        "true",
        sqlStr("operated"),
        sqlStr(`${s.name} — DEMO DATA — FICTIONAL ORGANIZATION`),
        `'{"demo":true,"profile":"${s.profile}"}'::jsonb`,
        sqlStr(LEGACY),
        sqlStr(`site-${s.code}`),
        "now()",
        `'{"label":"DEMO DATA — FICTIONAL ORGANIZATION"}'::jsonb`,
      ].join(",")})`,
    )
    .join(",\n");

  const siteUpdates = SITES.filter((s) => s.existing)
    .map(
      (s) => `UPDATE collect_sites SET
  name = ${sqlStr(s.name)},
  code = ${sqlStr(s.code)},
  city = ${sqlStr(s.city)},
  site_type = ${sqlStr(s.type)},
  surface_m2 = ${sqlNum(s.surface)},
  employees_count = ${sqlNum(s.employees)},
  is_active = true,
  is_consolidated = true,
  operation_status = 'operated',
  metadata = coalesce(metadata, '{}'::jsonb) || '{"demo":true,"profile":"${s.profile}"}'::jsonb,
  updated_at = now()
WHERE id = ${sqlStr(s.id)} AND organization_id = ${sqlStr(ORG)};`,
    )
    .join("\n");

  function ledgerInserts(runId, snapshot) {
    return snapshot.lines
      .map(
        (line, i) => `(${[
          sqlStr(uid(0x5000 + (runId.endsWith("f025") ? 0x200 : 0) + i)),
          sqlStr(runId),
          sqlStr(ORG),
          sqlStr(line.lineKey),
          sqlNum(line.scope),
          line.factorId ? sqlStr(line.factorId) : "NULL",
          sqlStr("quantite x facteur = resultat fige a la cloture"),
          sqlNum(line.quantity),
          sqlStr(line.activityUnit),
          sqlNum(line.factorValue),
          sqlStr(line.factorUnit),
          sqlNum(line.resultKgCo2e),
          sqlStr(snapshot.engineVersion),
          sqlStr(snapshot.methodologyVersion),
          `'${JSON.stringify({
            factorName: line.factorName,
            factorSource: line.factorSource,
            factorVersion: line.factorVersion,
            factorYear: line.factorYear,
            factorGeography: line.factorGeography,
            usedAt: line.usedAt,
            category: line.category,
            demo: true,
          }).replace(/'/g, "''")}'::jsonb`,
        ].join(",")})`,
      )
      .join(",\n");
  }

  const scenarioYears = [];
  for (let y = 2025; y <= 2030; y++) {
    const projected = y === 2025 ? baselineT : targetT;
    const annual = y === 2025 ? 0 : reductionT;
    const cumul = y === 2025 ? 0 : reductionT;
    const pct = baselineT > 0 ? Math.round((cumul / baselineT) * 1000) / 10 : 0;
    scenarioYears.push(`(${[
      sqlStr(uid(0x6000 + (y - 2025))),
      sqlStr(ORG),
      sqlStr(SCENARIO),
      sqlNum(y),
      sqlNum(projected),
      sqlNum(annual),
      sqlNum(cumul),
      sqlNum(projected),
      sqlNum(pct),
      sqlStr("whatif-v1"),
      "now()",
      sqlStr(LEGACY),
      sqlStr(`res-${y}`),
      "now()",
      `'{"demo":true}'::jsonb`,
    ].join(",")})`);
  }

  const suppliersSql = SUPPLIERS.map((c) => `(${[
    sqlStr(c.id),
    sqlStr(ORG),
    sqlStr(c.name),
    sqlStr("TN"),
    sqlStr(c.city),
    sqlStr(c.cat),
    sqlStr("Achats opérationnels"),
    "1",
    sqlStr("B"),
    "NULL",
    "72",
    sqlStr("engaged"),
    sqlStr("estimated"),
    "false",
    "false",
    sqlNum(c.spend),
    sqlStr("TND"),
    "2025",
    sqlStr("medium"),
    sqlStr("DEMO — fournisseur fictif Scope 3 cat.1 (non-PCAF)"),
    "true",
    sqlStr(LEGACY),
    sqlStr(`sup-${c.id.slice(-4)}`),
    "now()",
    `'{"demo":true,"pcaf":false}'::jsonb`,
  ].join(",")})`).join(",\n");

  const purchasesSql = SUPPLIERS.map((c, i) => `(${[
    sqlStr(uid(0x7000 + i + 1)),
    sqlStr(ORG),
    sqlStr(c.id),
    "2025",
    sqlStr(`Achats ${c.name} 2025`),
    sqlNum(c.spend),
    sqlStr("TND"),
    sqlStr(c.cat),
    "1",
    sqlNum(c.kg),
    sqlStr("estimated"),
    "35",
    sqlStr("invoice"),
    "true",
    sqlStr("DEMO — émissions achats (Scope 3 cat.1)"),
    sqlStr(LEGACY),
    sqlStr(`pur-${c.id.slice(-4)}`),
    "now()",
    `'{"demo":true,"pcaf":false}'::jsonb`,
  ].join(",")})`).join(",\n");

  const leversSql = LEVERS.map(
    (l) => `(${[
      sqlStr(l.id),
      sqlStr(ORG),
      sqlStr(ROADMAP),
      sqlStr(l.name),
      sqlStr(l.category),
      sqlStr(`${l.name} — DEMO`),
      "'{1,2,3}'",
      sqlNum(l.pot),
      sqlStr("identified"),
      sqlStr(LEGACY),
      sqlStr(`lever-${l.id.slice(-4)}`),
      "now()",
      `'{"demo":true}'::jsonb`,
    ].join(",")})`,
  ).join(",\n");

  const actionsSql = ACTIONS.map(
    (a) => `(${[
      sqlStr(a.id),
      sqlStr(ORG),
      sqlStr(ROADMAP),
      sqlStr(a.lever),
      sqlStr(a.title),
      sqlStr(`${a.title} — action de démonstration KTC`),
      sqlStr("mitigation"),
      sqlStr(a.site),
      "'{1,2,3}'",
      sqlStr(USER),
      sqlStr("KAT — Direction Climat"),
      sqlStr("2025-03-01"),
      sqlStr("2027-12-31"),
      sqlStr(a.status),
      sqlStr(a.priority),
      sqlNum(a.progress),
      sqlNum(Math.round(a.reduction * 8000)),
      sqlNum(a.reduction),
      sqlNum(Math.round(a.reduction * (a.progress / 100) * 10) / 10),
      sqlStr("internal_estimate"),
      sqlStr(LEGACY),
      sqlStr(`act-${a.id.slice(-4)}`),
      "now()",
      `'{"demo":true}'::jsonb`,
    ].join(",")})`,
  ).join(",\n");

  return `-- =============================================================================
-- DEMO DATA — FICTIONAL ORGANIZATION
-- KTC (enterprise, non-PCAF) — enrichissement compte ${EMAIL}
-- Generated by scripts/seed-ktc-entreprise-demo.mjs
-- checksum:${createHash("sha256").update(String(allActs.length)).digest("hex").slice(0, 12)}
-- baseline 2025: ${tot2025.totalT} tCO2e | 2024: ${tot2024.totalT} tCO2e
-- =============================================================================

BEGIN;

-- Purge previous demo enrichment only (keep user + org + membership)
DELETE FROM report_line_links WHERE report_id = ${sqlStr(REPORT_2025)};
DELETE FROM reports WHERE organization_id = ${sqlStr(ORG)} AND id = ${sqlStr(REPORT_2025)};
UPDATE bilans_carbone SET run_id = NULL
WHERE organization_id = ${sqlStr(ORG)}
  AND run_id IN (${sqlStr(RUN_2024)}, ${sqlStr(RUN_2025)});
DELETE FROM bilans_carbone WHERE organization_id = ${sqlStr(ORG)} AND (legacy_source = ${sqlStr(LEGACY)} OR id = ${sqlStr(BILAN_2024)});
DELETE FROM calculation_ledger WHERE organization_id = ${sqlStr(ORG)} AND run_id IN (${sqlStr(RUN_2024)}, ${sqlStr(RUN_2025)});
DELETE FROM calculation_runs WHERE organization_id = ${sqlStr(ORG)} AND id IN (${sqlStr(RUN_2024)}, ${sqlStr(RUN_2025)});
DELETE FROM climate_scenario_results WHERE organization_id = ${sqlStr(ORG)} AND legacy_source = ${sqlStr(LEGACY)};
DELETE FROM climate_scenario_assumptions WHERE organization_id = ${sqlStr(ORG)};
DELETE FROM climate_scenario_levers WHERE organization_id = ${sqlStr(ORG)} AND legacy_source = ${sqlStr(LEGACY)};
DELETE FROM climate_scenario_targets WHERE organization_id = ${sqlStr(ORG)} AND legacy_source = ${sqlStr(LEGACY)};
DELETE FROM climate_scenarios WHERE organization_id = ${sqlStr(ORG)} AND legacy_source = ${sqlStr(LEGACY)};
DELETE FROM climate_action_milestones WHERE organization_id = ${sqlStr(ORG)} AND legacy_source = ${sqlStr(LEGACY)};
DELETE FROM climate_priority_scores WHERE organization_id = ${sqlStr(ORG)};
DELETE FROM climate_actions WHERE organization_id = ${sqlStr(ORG)} AND legacy_source = ${sqlStr(LEGACY)};
DELETE FROM climate_levers WHERE organization_id = ${sqlStr(ORG)} AND legacy_source = ${sqlStr(LEGACY)};
DELETE FROM climate_kpis WHERE organization_id = ${sqlStr(ORG)} AND legacy_source = ${sqlStr(LEGACY)};
DELETE FROM climate_objective_snapshots WHERE objective_id IN (
  SELECT id FROM climate_objectives WHERE organization_id = ${sqlStr(ORG)}
);
DELETE FROM climate_objectives WHERE organization_id = ${sqlStr(ORG)};
DELETE FROM climate_roadmaps WHERE organization_id = ${sqlStr(ORG)} AND legacy_source = ${sqlStr(LEGACY)};
DELETE FROM supplier_purchases WHERE organization_id = ${sqlStr(ORG)} AND legacy_source = ${sqlStr(LEGACY)};
DELETE FROM suppliers WHERE organization_id = ${sqlStr(ORG)} AND legacy_source = ${sqlStr(LEGACY)};
DELETE FROM activity_data WHERE organization_id = ${sqlStr(ORG)} AND legacy_source = ${sqlStr(LEGACY)};
DELETE FROM collect_sites WHERE organization_id = ${sqlStr(ORG)} AND legacy_source = ${sqlStr(LEGACY)};

-- Org metadata (enterprise, non-PCAF)
UPDATE organizations SET
  name = 'KTC',
  legal_name = 'KTC Agroalimentaire (DEMO)',
  pilot_name = 'Direction Climat & RSE',
  country = 'TN',
  sector = 'Agroalimentaire',
  reference_year = 2025,
  currency = 'TND',
  subscription_plan = 'pro',
  subscription_status = 'active',
  max_users = 25,
  status = 'active',
  consolidation_method = 'operational_control',
  employees = ${siteEmployees},
  annual_revenue = 68500000,
  total_surface = ${siteSurface},
  organization_type = 'enterprise',
  financed_emissions_enabled = false,
  raw_legacy = coalesce(raw_legacy, '{}'::jsonb) || jsonb_build_object(
    'demo', true,
    'label', 'DEMO DATA — FICTIONAL ORGANIZATION',
    'demo_seed', ${sqlStr(LEGACY)},
    'warning', 'Données enrichies pour démonstration commerciale (non-PCAF).'
  ),
  updated_at = now()
WHERE id = ${sqlStr(ORG)};

-- Ensure owner membership for the test account
INSERT INTO organization_members (organization_id, user_id, role, legacy_source, legacy_id, imported_at)
VALUES (${sqlStr(ORG)}, ${sqlStr(USER)}, 'owner', ${sqlStr(LEGACY)}, 'member-owner', now())
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner';

UPDATE companies SET
  nom_entreprise = 'KTC',
  secteur = 'Agroalimentaire',
  ca_annuel = 68500000,
  collaborateurs = ${siteEmployees},
  updated_at = now()
WHERE id = ${sqlStr(COMPANY)};

INSERT INTO organization_years (organization_id, year, is_included, legacy_source, legacy_id, imported_at)
VALUES
  (${sqlStr(ORG)}, 2024, true, ${sqlStr(LEGACY)}, 'year-2024', now()),
  (${sqlStr(ORG)}, 2025, true, ${sqlStr(LEGACY)}, 'year-2025', now())
ON CONFLICT (organization_id, year) DO UPDATE SET is_included = true;

INSERT INTO organization_modules (organization_id, module_id, enabled, org_id, active, started_at, legacy_source, legacy_id, imported_at)
SELECT ${sqlStr(ORG)}, m.id, true, ${sqlStr(ORG)}, true, now(), ${sqlStr(LEGACY)}, 'mod-' || m.code, now()
FROM modules m
WHERE m.code IN (${MODULE_CODES.map(sqlStr).join(", ")})
ON CONFLICT (organization_id, module_id) DO UPDATE
  SET enabled = true, active = true, updated_at = now();

${siteUpdates}

INSERT INTO collect_sites (
  id, organization_id, company_id, name, code, city, country, country_code,
  site_type, surface_m2, employees_count, is_active, is_consolidated,
  operation_status, description, metadata, legacy_source, legacy_id, imported_at, raw_legacy
) VALUES
${siteInserts};

-- Drop legacy unscoped activity so demo site rollups are clean
DELETE FROM activity_data
WHERE organization_id = ${sqlStr(ORG)}
  AND (site_id IS NULL OR legacy_source IS DISTINCT FROM ${sqlStr(LEGACY)});

INSERT INTO activity_data (
  id, organization_id, site_id, category, subcategory, scope, quantity, unit,
  period_start, period_end, factor_id, activity_type, data_quality, data_method,
  source_type, uncertainty_pct, emission_factor_source, emission_factor_year,
  emission_factor_region, notes, created_by, validation_status,
  legacy_source, legacy_id, imported_at, raw_legacy
) VALUES
${allActs.map((a) => a.sql).join(",\n")};

-- Closed bilans 2024 + 2025
INSERT INTO calculation_runs (
  id, organization_id, engine_version, methodology_version, method,
  period_start, period_end, input_hash, result_hash, created_by,
  publish_status, published_at, published_by, published_snapshot, status
) VALUES
(
  ${sqlStr(RUN_2024)}, ${sqlStr(ORG)}, ${sqlStr(snap2024.engineVersion)}, ${sqlStr(snap2024.methodologyVersion)},
  'bilan_carbone', '2024-01-01', '2024-12-31',
  ${sqlStr(snap2024.inputHash)}, ${sqlStr(snap2024.resultHash)}, ${sqlStr(USER)},
  'published', now(), ${sqlStr(USER)},
  '${JSON.stringify(snap2024).replace(/'/g, "''")}'::jsonb, 'completed'
),
(
  ${sqlStr(RUN_2025)}, ${sqlStr(ORG)}, ${sqlStr(snap2025.engineVersion)}, ${sqlStr(snap2025.methodologyVersion)},
  'bilan_carbone', '2025-01-01', '2025-12-31',
  ${sqlStr(snap2025.inputHash)}, ${sqlStr(snap2025.resultHash)}, ${sqlStr(USER)},
  'published', now(), ${sqlStr(USER)},
  '${JSON.stringify(snap2025).replace(/'/g, "''")}'::jsonb, 'completed'
);

INSERT INTO calculation_ledger (
  id, run_id, organization_id, line_key, scope, factor_id, formula,
  activity_quantity, activity_unit, factor_value, factor_unit,
  result_kgco2e, engine_version, methodology_version, provenance
) VALUES
${ledgerInserts(RUN_2024, snap2024)},
${ledgerInserts(RUN_2025, snap2025)};

INSERT INTO bilans_carbone (
  id, organization_id, user_id, company_id, run_id, name, year, status,
  total_emission, scope1_emission, scope2_emission, scope3_emission,
  total_kgco2e, scope1_kgco2e, scope2_kgco2e, scope3_kgco2e,
  date_bilan, questionnaire_data, legacy_source, legacy_id, imported_at, raw_legacy
) VALUES
(
  ${sqlStr(BILAN_2024)}, ${sqlStr(ORG)}, ${sqlStr(USER)}, ${sqlStr(COMPANY)}, ${sqlStr(RUN_2024)},
  'Bilan 2024', 2024, 'validated',
  ${tot2024.totalT}, ${tot2024.s1T}, ${tot2024.s2T}, ${tot2024.s3T},
  ${tot2024.totalKg}, ${tot2024.s1Kg}, ${tot2024.s2Kg}, ${tot2024.s3Kg},
  '2024-12-31',
  '{"year":2024,"demo":true}'::jsonb,
  ${sqlStr(LEGACY)}, 'bilan-2024', now(), '{"demo":true}'::jsonb
);

UPDATE bilans_carbone SET
  run_id = ${sqlStr(RUN_2025)},
  status = 'validated',
  name = 'Bilan 2025',
  year = 2025,
  total_emission = ${tot2025.totalT},
  scope1_emission = ${tot2025.s1T},
  scope2_emission = ${tot2025.s2T},
  scope3_emission = ${tot2025.s3T},
  total_kgco2e = ${tot2025.totalKg},
  scope1_kgco2e = ${tot2025.s1Kg},
  scope2_kgco2e = ${tot2025.s2Kg},
  scope3_kgco2e = ${tot2025.s3Kg},
  date_bilan = '2025-12-31',
  questionnaire_data = coalesce(questionnaire_data, '{}'::jsonb) || '{"year":2025,"demo":true}'::jsonb,
  legacy_source = ${sqlStr(LEGACY)},
  legacy_id = 'bilan-2025',
  updated_at = now()
WHERE id = ${sqlStr(BILAN_2025)} AND organization_id = ${sqlStr(ORG)};

-- Factual report (from-run shape)
INSERT INTO reports (
  id, organization_id, run_id, title, report_type, structured_content, ai_commentary, created_by, published_at
) VALUES (
  ${sqlStr(REPORT_2025)}, ${sqlStr(ORG)}, ${sqlStr(RUN_2025)},
  'Rapport Bilan Carbone KTC 2025 (DEMO)',
  'carbon_balance',
  jsonb_build_object(
    'totals', jsonb_build_object(
      'scope1', ${sqlStr(String(tot2025.s1Kg))},
      'scope2', ${sqlStr(String(tot2025.s2Kg))},
      'scope3', ${sqlStr(String(tot2025.s3Kg))},
      'total', ${sqlStr(String(tot2025.totalKg))},
      'biogenicCo2', '0'
    ),
    'engineVersion', ${sqlStr(snap2025.engineVersion)},
    'methodologyVersion', ${sqlStr(snap2025.methodologyVersion)},
    'resultHash', ${sqlStr(snap2025.resultHash)},
    'lineCount', ${snap2025.lines.length},
    'factsAsserted', true
  ),
  jsonb_build_object(
    'synthese', ${sqlStr(`Bilan 2025 clôturé : ${tot2025.totalT} tCO₂e (S1 ${tot2025.s1T} · S2 ${tot2025.s2T} · S3 ${tot2025.s3T}).`)},
    'resultats', ${sqlStr(`Total ${tot2025.totalKg} kgCO₂e calculé sur ${snap2025.lines.length} lignes figées (run ${RUN_2025}).`)},
    'methodologie', 'GHG Protocol Corporate — facteurs Core Pack TN figés à la clôture.'
  ),
  ${sqlStr(USER)},
  now()
);

INSERT INTO report_line_links (report_id, ledger_line_id, section_key)
SELECT ${sqlStr(REPORT_2025)}, id, 'resultats'
FROM calculation_ledger
WHERE run_id = ${sqlStr(RUN_2025)};

-- Transition / trajectoire / actions
INSERT INTO climate_roadmaps (
  id, organization_id, name, description, baseline_year, target_year,
  reduction_target_percent, baseline_emissions_tco2e, target_emissions_tco2e,
  status, trajectory_kind, created_by, legacy_source, legacy_id, imported_at, raw_legacy
) VALUES (
  ${sqlStr(ROADMAP)}, ${sqlStr(ORG)},
  'Feuille de route climat KTC 2030',
  'Trajectoire de démonstration (réduction absolute, non validée SBTi).',
  2025, 2030, 25, ${baselineT}, ${targetT},
  'active', 'personalized', ${sqlStr(USER)},
  ${sqlStr(LEGACY)}, 'roadmap-2030', now(), '{"demo":true}'::jsonb
);

INSERT INTO climate_levers (
  id, organization_id, roadmap_id, name, category, description, scope_concerned,
  estimated_potential_reduction_tco2e, status, legacy_source, legacy_id, imported_at, raw_legacy
) VALUES
${leversSql};

INSERT INTO climate_actions (
  id, organization_id, roadmap_id, lever_id, title, description, action_type, site_id,
  scope_concerned, owner_user_id, owner_name, start_date, target_date, status, priority,
  progress_percent, budget_estimated, expected_reduction_tco2e, realized_reduction_tco2e,
  estimation_method, legacy_source, legacy_id, imported_at, raw_legacy
) VALUES
${actionsSql};

INSERT INTO climate_kpis (
  id, organization_id, roadmap_id, reporting_period, reporting_date,
  baseline_emissions_tco2e, target_emissions_tco2e, realized_emissions_tco2e,
  total_actions, completed_actions, delayed_actions,
  expected_reduction_tco2e, realized_reduction_tco2e,
  legacy_source, legacy_id, imported_at, raw_legacy
) VALUES (
  ${sqlStr(uid("e101"))}, ${sqlStr(ORG)}, ${sqlStr(ROADMAP)}, '2025', '2025-12-31',
  ${baselineT}, ${targetT}, ${baselineT},
  ${ACTIONS.length},
  ${ACTIONS.filter((a) => a.status === "completed").length},
  0,
  ${ACTIONS.reduce((n, a) => n + a.reduction, 0)},
  ${ACTIONS.reduce((n, a) => n + a.reduction * (a.progress / 100), 0)},
  ${sqlStr(LEGACY)}, 'kpi-2025', now(), '{"demo":true}'::jsonb
);

INSERT INTO climate_scenarios (
  id, organization_id, name, description, baseline_source_type, baseline_source_id,
  baseline_year, start_year, target_year, scenario_type, target_reduction_percent,
  baseline_emissions_tco2e, target_emissions_tco2e, status, notes, created_by,
  legacy_source, legacy_id, imported_at, raw_legacy
) VALUES (
  ${sqlStr(SCENARIO)}, ${sqlStr(ORG)},
  'What-If −220 tCO₂e à 2030',
  'Scénario de démonstration basé sur le bilan 2025 clôturé.',
  'bilan', ${sqlStr(BILAN_2025)},
  2025, 2025, 2030, 'what_if', ${Math.round((reductionT / baselineT) * 1000) / 10},
  ${baselineT}, ${targetT}, 'active',
  'Projection What-If — ne modifie pas activity_data.',
  ${sqlStr(USER)}, ${sqlStr(LEGACY)}, 'scenario-2030', now(), '{"demo":true}'::jsonb
);

INSERT INTO climate_scenario_targets (
  id, organization_id, scenario_id, target_year, target_emissions_tco2e,
  target_reduction_percent, target_type, legacy_source, legacy_id, imported_at, raw_legacy
) VALUES (
  ${sqlStr(uid("e102"))}, ${sqlStr(ORG)}, ${sqlStr(SCENARIO)}, 2030, ${targetT},
  ${Math.round((reductionT / baselineT) * 1000) / 10}, 'absolute',
  ${sqlStr(LEGACY)}, 'target-2030', now(), '{"demo":true}'::jsonb
);

INSERT INTO climate_scenario_results (
  id, organization_id, scenario_id, year, projected_emissions_tco2e,
  annual_reduction_tco2e, cumulative_reduction_tco2e, residual_emissions_tco2e,
  reduction_percent_vs_baseline, calculation_version, calculated_at,
  legacy_source, legacy_id, imported_at, raw_legacy
) VALUES
${scenarioYears.join(",\n")};

INSERT INTO climate_objectives (
  id, organization_id, name, objective_type, origin, validation_status, is_primary,
  perimeter, scopes, baseline_year, baseline_value, baseline_unit,
  target_year, target_value, reduction_percent, unit, status, owner_name, notes,
  created_by, parameters
) VALUES (
  ${sqlStr(OBJECTIVE)}, ${sqlStr(ORG)},
  'Réduction absolute −25 % à 2030',
  'absolute_reduction', 'internal', 'company_objective', true,
  'organization', '{1,2,3}', 2025, ${baselineT}, 'tCO2e',
  2030, ${targetT}, 25, 'tCO2e', 'active', 'KAT — Direction Climat',
  'Objectif interne de démonstration (non validé SBTi).',
  ${sqlStr(USER)}, '{"demo":true,"seed":"demo_ktc_entreprise"}'::jsonb
);

-- Classic suppliers (Scope 3 cat.1 — NOT PCAF cat.15)
INSERT INTO suppliers (
  id, organization_id, name, country, city, purchase_category, purchase_subcategory,
  scope3_ghg_category, carbon_score, carbon_intensity_kgco2e, confidence_index,
  engagement_status, data_method, has_carbon_footprint, has_sbti_target,
  annual_spend, annual_spend_currency, annual_spend_year, criticality, notes,
  is_active, legacy_source, legacy_id, imported_at, raw_legacy
) VALUES
${suppliersSql};

INSERT INTO supplier_purchases (
  id, organization_id, supplier_id, reference_year, description, amount, currency,
  purchase_category, ghg_scope3_category, calculated_emissions_kgco2e,
  data_method, uncertainty_percent, source_type, is_validated, notes,
  legacy_source, legacy_id, imported_at, raw_legacy
) VALUES
${purchasesSql};

COMMIT;

-- Smoke checks
-- SELECT count(*) FROM collect_sites WHERE organization_id = '${ORG}';
-- SELECT year, status, total_emission FROM bilans_carbone WHERE organization_id = '${ORG}';
-- SELECT count(*) FROM climate_actions WHERE organization_id = '${ORG}';
`;
}

const sql = buildSql();
const asSqlOnly = process.argv.includes("--sql");

if (asSqlOnly) {
  process.stdout.write(sql);
  process.exit(0);
}

const outPath = new URL("../db/seeds/ktc_entreprise_demo.sql", import.meta.url);
writeFileSync(outPath, sql, "utf8");
console.error(`Wrote ${outPath.pathname}`);
console.error(`Sites: ${SITES.length}`);
console.error(`Linked email: ${EMAIL}`);

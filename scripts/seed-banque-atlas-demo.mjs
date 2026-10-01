#!/usr/bin/env node
/**
 * DEMO DATA — FICTIONAL ORGANIZATION
 * Seed Banque Atlas (multi-sites + portefeuille PCAF labels via sector Banque).
 *
 * Usage (local):
 *   DATABASE_URL=postgresql://... node scripts/seed-banque-atlas-demo.mjs
 *
 * Usage (prod via docker):
 *   node scripts/seed-banque-atlas-demo.mjs --sql > /tmp/banque_atlas.sql
 *   # then pipe into psql
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

const ORG = "a7a50000-0000-4000-8000-00000000b001";
const USER = "a7a50000-0000-4000-8000-00000000b002";
const COMPANY = "a7a50000-0000-4000-8000-00000000b003";
const LEGACY = "demo_banque_atlas";
const YEAR = 2025;
const P0 = "2025-01-01";
const P1 = "2025-12-31";

/** bcrypt hash of AtlasDemo2025! (cost 12) */
const PASSWORD_HASH =
  "$2a$12$oT.loTtz3O1EPKMTspIPou0nbIwI.roXcOiFRvBZM9WS9yJysNqym";

const FE = {
  gas: "b1000000-0000-4000-8000-000000000001",
  fuel: "b1000000-0000-4000-8000-000000000002",
  essence: "b1000000-0000-4000-8000-000000000003",
  diesel: "b1000000-0000-4000-8000-000000000004",
  elec: "b1000000-0000-4000-8000-000000000006",
};

const MODULE_CODES = ["bilan-carbone", "collect", "fournisseurs", "decarbotech"];

const SITES = [
  { id: "a7a50000-0000-4000-8000-00000000b010", code: "HQ-TUN", name: "Siège Banque Atlas — Tunis", city: "Tunis", type: "headquarters", surface: 12500, employees: 520, profile: "hq" },
  { id: "a7a50000-0000-4000-8000-00000000b011", code: "AG-LAC1", name: "Agence Lac 1 — Tunis", city: "Tunis", type: "branch", surface: 920, employees: 32, profile: "large" },
  { id: "a7a50000-0000-4000-8000-00000000b012", code: "AG-LAC2", name: "Agence Lac 2 — Tunis", city: "Tunis", type: "branch", surface: 850, employees: 28, profile: "large" },
  { id: "a7a50000-0000-4000-8000-00000000b013", code: "AG-CV", name: "Agence Centre-Ville — Tunis", city: "Tunis", type: "branch", surface: 780, employees: 26, profile: "large" },
  { id: "a7a50000-0000-4000-8000-00000000b014", code: "AG-ARI", name: "Agence Ariana — Ariana", city: "Ariana", type: "branch", surface: 610, employees: 18, profile: "medium" },
  { id: "a7a50000-0000-4000-8000-00000000b015", code: "AG-BA", name: "Agence Ben Arous — Ben Arous", city: "Ben Arous", type: "branch", surface: 580, employees: 17, profile: "medium" },
  { id: "a7a50000-0000-4000-8000-00000000b016", code: "AG-SOU", name: "Agence Sousse — Sousse", city: "Sousse", type: "branch", surface: 700, employees: 22, profile: "large" },
  { id: "a7a50000-0000-4000-8000-00000000b017", code: "AG-MON", name: "Agence Monastir — Monastir", city: "Monastir", type: "branch", surface: 540, employees: 16, profile: "medium" },
  { id: "a7a50000-0000-4000-8000-00000000b018", code: "AG-SFX", name: "Agence Sfax — Sfax", city: "Sfax", type: "branch", surface: 760, employees: 24, profile: "large" },
  { id: "a7a50000-0000-4000-8000-00000000b019", code: "AG-NAB", name: "Agence Nabeul — Nabeul", city: "Nabeul", type: "branch", surface: 520, employees: 15, profile: "medium" },
  { id: "a7a50000-0000-4000-8000-00000000b01a", code: "AG-BIZ", name: "Agence Bizerte — Bizerte", city: "Bizerte", type: "branch", surface: 500, employees: 14, profile: "medium" },
  { id: "a7a50000-0000-4000-8000-00000000b01b", code: "AG-GAB", name: "Agence Gabès — Gabès", city: "Gabès", type: "branch", surface: 480, employees: 13, profile: "regional" },
  { id: "a7a50000-0000-4000-8000-00000000b01c", code: "AG-KAI", name: "Agence Kairouan — Kairouan", city: "Kairouan", type: "branch", surface: 460, employees: 12, profile: "regional" },
  { id: "a7a50000-0000-4000-8000-00000000b01d", code: "ADM-TUN", name: "Centre administratif Banque Atlas — Tunis", city: "Tunis", type: "administrative", surface: 3200, employees: 95, profile: "admin" },
  { id: "a7a50000-0000-4000-8000-00000000b01e", code: "DC-TUN", name: "Data Center Banque Atlas — Tunis", city: "Tunis", type: "datacenter", surface: 2100, employees: 42, profile: "datacenter" },
];

const COUNTERPARTIES = [
  { id: "d101", name: "Médina Textile SA", city: "Monastir", cat: "Industrie textile", score: "A", conf: 88, spend: 48500000, kg: 20370000, dq: 2, attr: 0.25 },
  { id: "d102", name: "Carthage Agro SARL", city: "Béja", cat: "Agroalimentaire", score: "B", conf: 72, spend: 31200000, kg: 26520000, dq: 3, attr: 0.22 },
  { id: "d103", name: "Numéris Soft TN", city: "Tunis", cat: "Services numériques", score: "A+", conf: 92, spend: 15800000, kg: 2844000, dq: 1, attr: 0.18 },
  { id: "d104", name: "Sahel Constructions", city: "Sousse", cat: "BTP", score: "C", conf: 55, spend: 27600000, kg: 40020000, dq: 4, attr: 0.28 },
  { id: "d105", name: "Oasis Énergies", city: "Gabès", cat: "Énergie", score: "B", conf: 68, spend: 52400000, kg: 57640000, dq: 3, attr: 0.30 },
  { id: "d106", name: "Cap Bon Logistique", city: "Nabeul", cat: "Transport & logistique", score: "B", conf: 70, spend: 18900000, kg: 17955000, dq: 3, attr: 0.20 },
  { id: "d107", name: "Golfe Pharma Distribution", city: "Sfax", cat: "Santé / distribution", score: "A", conf: 84, spend: 22100000, kg: 12155000, dq: 2, attr: 0.24 },
  { id: "d108", name: "Virtus Courtage Assurances", city: "Tunis", cat: "Services financiers", score: "A+", conf: 90, spend: 9400000, kg: 1128000, dq: 1, attr: 0.15 },
  { id: "d109", name: "Horizon Hôtels Groupe", city: "Hammamet", cat: "Tourisme", score: "C", conf: 48, spend: 36700000, kg: 60555000, dq: 4, attr: 0.32 },
  { id: "d110", name: "Delta Immobilière", city: "Ariana", cat: "Immobilier", score: "D", conf: 35, spend: 41200000, kg: 86520000, dq: 5, attr: 0.35 },
  { id: "d111", name: "SoftPay Fintech", city: "Tunis", cat: "Fintech", score: "A", conf: 86, spend: 7200000, kg: 1584000, dq: 2, attr: 0.16 },
  { id: "d112", name: "Green Olive Export", city: "Sfax", cat: "Agro-export", score: "B", conf: 65, spend: 14300000, kg: 11154000, dq: 3, attr: 0.21 },
];

const PCAF_OPTION_BY_DQ = { 1: "1a", 2: "1b", 3: "2b", 4: "3a", 5: "3b" };

function uid(suffix) {
  return `a7a50000-0000-4000-8000-00000000${suffix}`;
}

function sqlStr(v) {
  if (v == null) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlNum(v) {
  if (v == null) return "NULL";
  return String(v);
}

let actSeq = 0;
function nextActId() {
  actSeq += 1;
  return uid(`c${actSeq.toString(16).padStart(3, "0")}`);
}

function act({
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
  return `(${[
    sqlStr(id),
    sqlStr(ORG),
    sqlStr(siteId),
    sqlStr(category),
    sqlStr(subcategory),
    sqlNum(scope),
    sqlNum(quantity),
    sqlStr(unit),
    sqlStr(P0),
    sqlStr(P1),
    factorId ? sqlStr(factorId) : "NULL",
    sqlStr(activityType),
    sqlStr(quality),
    sqlStr(method),
    sqlStr(sourceType),
    sqlNum(uncertainty),
    factorId ? sqlStr("Newcarboscan Core Pack TN") : "NULL",
    factorId ? "2027" : "NULL",
    factorId ? sqlStr("TN") : "NULL",
    sqlStr(`${notes} — DEMO DATA — FICTIONAL ORGANIZATION`),
    sqlStr(USER),
    sqlStr("validated"),
    sqlStr(LEGACY),
    sqlStr(legacyId),
    "now()",
    `'{"demo":true,"label":"DEMO DATA — FICTIONAL ORGANIZATION"}'::jsonb`,
  ].join(",")})`;
}

function activitiesForSite(site) {
  const rows = [];
  const s = site.id;
  const code = site.code;
  const p = site.profile;

  const elecByProfile = {
    hq: 1_850_000,
    large: 135_000,
    medium: 92_000,
    regional: 78_000,
    admin: 410_000,
    datacenter: 2_450_000,
  };
  // Slight site-specific jitter so graphs are not flat clones
  const jitter = ((parseInt(code.slice(-2), 36) % 17) - 8) / 100; // ~±8%
  const elec = Math.round(elecByProfile[p] * (1 + jitter));

  rows.push(
    act({
      siteId: s,
      category: "scope2",
      subcategory: "electricity_grid",
      scope: 2,
      quantity: elec,
      unit: "kWh",
      factorId: FE.elec,
      quality: p === "regional" ? "estimated" : "real",
      sourceType: p === "regional" ? "estimate" : "invoice",
      uncertainty: p === "regional" ? 18 : 15,
      notes: `Électricité ${site.name}`,
      legacyId: `elec-${code}`,
    }),
  );

  if (p === "hq") {
    rows.push(
      act({
        siteId: s,
        category: "scope1",
        subcategory: "fossil_gas",
        scope: 1,
        quantity: 48200,
        unit: "m³",
        factorId: FE.gas,
        quality: "real",
        sourceType: "invoice",
        uncertainty: 12,
        notes: "Gaz naturel chauffage/cuisine siège",
        legacyId: `gas-${code}`,
      }),
      act({
        siteId: s,
        category: "scope1",
        subcategory: "fuel_diesel",
        scope: 1,
        quantity: 62500,
        unit: "L",
        factorId: FE.diesel,
        quality: "real",
        sourceType: "invoice",
        uncertainty: 10,
        notes: "Flotte diesel siège / courriers",
        legacyId: `diesel-fleet-${code}`,
      }),
      act({
        siteId: s,
        category: "scope1",
        subcategory: "fuel_gasoline",
        scope: 1,
        quantity: 18400,
        unit: "L",
        factorId: FE.essence,
        quality: "real",
        sourceType: "invoice",
        uncertainty: 10,
        notes: "Flotte essence direction",
        legacyId: `essence-${code}`,
      }),
      act({
        siteId: s,
        category: "scope1",
        subcategory: "fugitive_r410a",
        scope: 1,
        quantity: 42,
        unit: "kg",
        quality: "estimated",
        sourceType: "estimate",
        uncertainty: 25,
        notes: "Fuites R-410A clim siège (FE via subcategory)",
        legacyId: `r410a-${code}`,
      }),
    );
  }

  if (p === "datacenter") {
    rows.push(
      act({
        siteId: s,
        category: "scope1",
        subcategory: "fugitive_r410a",
        scope: 1,
        quantity: 28,
        unit: "kg",
        quality: "estimated",
        sourceType: "estimate",
        uncertainty: 25,
        notes: "Fuites fluides froid datacenter",
        legacyId: `r410a-${code}`,
      }),
      act({
        siteId: s,
        category: "scope1",
        subcategory: "fuel_diesel",
        scope: 1,
        quantity: 18500,
        unit: "L",
        factorId: FE.diesel,
        quality: "real",
        sourceType: "invoice",
        uncertainty: 12,
        notes: "Groupes électrogènes secours DC",
        legacyId: `gen-${code}`,
      }),
      act({
        siteId: s,
        category: "scope3_upstream",
        subcategory: "cat1_purchased_goods:cat1_it_servers",
        scope: 3,
        quantity: 680000,
        unit: "TND",
        activityType: "service",
        method: "monetary",
        sourceType: "invoice",
        uncertainty: 45,
        notes: "Hébergement / licences / spare IT DC",
        legacyId: `it-${code}`,
      }),
      act({
        siteId: s,
        category: "scope3_upstream",
        subcategory: "cat5_waste:cat5_used_batteries",
        scope: 3,
        quantity: 180,
        unit: "unités",
        activityType: "waste",
        uncertainty: 30,
        notes: "Batteries UPS remplacées",
        legacyId: `batt-${code}`,
      }),
    );
  }

  if (p === "admin") {
    rows.push(
      act({
        siteId: s,
        category: "scope1",
        subcategory: "fuel_diesel",
        scope: 1,
        quantity: 8200,
        unit: "L",
        factorId: FE.diesel,
        quality: "real",
        sourceType: "invoice",
        uncertainty: 12,
        notes: "Flotte administrative",
        legacyId: `diesel-${code}`,
      }),
      act({
        siteId: s,
        category: "scope1",
        subcategory: "fugitive_r410a",
        scope: 1,
        quantity: 9,
        unit: "kg",
        uncertainty: 28,
        notes: "Clim centre administratif",
        legacyId: `r410a-${code}`,
      }),
      act({
        siteId: s,
        category: "scope3_upstream",
        subcategory: "cat1_purchased_goods:cat1_office_supplies",
        scope: 3,
        quantity: 145000,
        unit: "TND",
        activityType: "service",
        method: "monetary",
        sourceType: "invoice",
        uncertainty: 40,
        notes: "Fournitures admin centralisées",
        legacyId: `office-${code}`,
      }),
      act({
        siteId: s,
        category: "scope3_upstream",
        subcategory: "cat7_employee_commuting:cat7_public_transport",
        scope: 3,
        quantity: 420000,
        unit: "km",
        activityType: "transport",
        method: "physical",
        sourceType: "extrapolation",
        uncertainty: 40,
        notes: "Domicile-travail TC centre admin",
        legacyId: `commute-pt-${code}`,
      }),
    );
  }

  // Branches: genset + refrigerants + light fleet vary by profile
  if (["large", "medium", "regional"].includes(p)) {
    const gen = p === "large" ? 4200 : p === "medium" ? 2800 : 6100; // regional more genset
    const r410 = p === "large" ? 5.5 : p === "medium" ? 3.2 : 2.4;
    const fleet = p === "large" ? 6100 : p === "medium" ? 3400 : 2200;
    rows.push(
      act({
        siteId: s,
        category: "scope1",
        subcategory: "fuel_diesel",
        scope: 1,
        quantity: Math.round(gen * (1 + jitter)),
        unit: "L",
        factorId: FE.diesel,
        quality: "estimated",
        sourceType: "estimate",
        uncertainty: p === "regional" ? 20 : 15,
        notes: `Groupes électrogènes ${site.city}`,
        legacyId: `gen-${code}`,
      }),
      act({
        siteId: s,
        category: "scope1",
        subcategory: "fuel_diesel",
        scope: 1,
        quantity: Math.round(fleet * (1 - jitter / 2)),
        unit: "L",
        factorId: FE.diesel,
        quality: "real",
        sourceType: "invoice",
        uncertainty: 12,
        notes: `Flotte / coursiers ${site.city}`,
        legacyId: `fleet-${code}`,
      }),
      act({
        siteId: s,
        category: "scope1",
        subcategory: "fugitive_r410a",
        scope: 1,
        quantity: Number((r410 * (1 + jitter)).toFixed(1)),
        unit: "kg",
        uncertainty: 30,
        notes: `Fuites clim ${site.city}`,
        legacyId: `r410a-${code}`,
      }),
      act({
        siteId: s,
        category: "scope3_upstream",
        subcategory: "cat1_purchased_goods:cat1_office_supplies",
        scope: 3,
        quantity: p === "large" ? 28000 : p === "medium" ? 16000 : 11000,
        unit: "TND",
        activityType: "service",
        method: "monetary",
        sourceType: "invoice",
        uncertainty: 40,
        notes: `Achats locaux ${site.city}`,
        legacyId: `office-${code}`,
      }),
      act({
        siteId: s,
        category: "scope3_upstream",
        subcategory: "cat5_waste:cat5_unsorted_waste",
        scope: 3,
        quantity: p === "large" ? 3200 : p === "medium" ? 2100 : 1600,
        unit: "kg",
        activityType: "waste",
        uncertainty: 35,
        notes: `Déchets ${site.city}`,
        legacyId: `waste-${code}`,
      }),
      act({
        siteId: s,
        category: "scope3_upstream",
        subcategory: "cat7_employee_commuting:cat7_car_solo",
        scope: 3,
        quantity: Math.round(site.employees * 220 * 18), // jours × km moyens
        unit: "km",
        activityType: "transport",
        method: "physical",
        sourceType: "extrapolation",
        uncertainty: 40,
        notes: `Domicile-travail voiture ${site.city}`,
        legacyId: `commute-${code}`,
      }),
    );

    if (p === "large") {
      rows.push(
        act({
          siteId: s,
          category: "scope3_upstream",
          subcategory: "cat6_business_travel:cat6_taxi",
          scope: 3,
          quantity: 4800,
          unit: "km",
          activityType: "transport",
          sourceType: "estimate",
          uncertainty: 30,
          notes: `Taxi / missions locales ${site.city}`,
          legacyId: `taxi-${code}`,
        }),
      );
    }
  }

  return rows;
}

function hqCentralScope3() {
  const hq = SITES[0].id;
  const code = "HQ-TUN";
  return [
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat1_purchased_goods:cat1_outsourced_services",
      scope: 3,
      quantity: 2650000,
      unit: "TND",
      activityType: "service",
      method: "monetary",
      sourceType: "invoice",
      uncertainty: 45,
      notes: "Services externalisés centralisés (sécurité, nettoyage, gardiennage réseau)",
      legacyId: `svc-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat1_purchased_goods:cat1_maintenance_services",
      scope: 3,
      quantity: 780000,
      unit: "TND",
      activityType: "service",
      method: "monetary",
      sourceType: "invoice",
      uncertainty: 40,
      notes: "Maintenance bâtiments / ATM centralisée",
      legacyId: `maint-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat1_purchased_goods:cat1_it_consumables",
      scope: 3,
      quantity: 420000,
      unit: "TND",
      activityType: "service",
      method: "monetary",
      sourceType: "invoice",
      uncertainty: 40,
      notes: "Consommables IT groupe",
      legacyId: `itcons-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat1_purchased_goods:cat1_moyens_generaux",
      scope: 3,
      quantity: 540000,
      unit: "TND",
      activityType: "service",
      method: "monetary",
      sourceType: "invoice",
      uncertainty: 40,
      notes: "Moyens généraux OPEX",
      legacyId: `mg-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat2_capital_goods:cat2_it_equipment",
      scope: 3,
      quantity: 1250000,
      unit: "TND",
      activityType: "service",
      method: "monetary",
      sourceType: "invoice",
      uncertainty: 45,
      notes: "CAPEX informatique groupe",
      legacyId: `capex-it-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat2_capital_goods:cat2_furniture",
      scope: 3,
      quantity: 320000,
      unit: "TND",
      activityType: "service",
      method: "monetary",
      sourceType: "invoice",
      uncertainty: 45,
      notes: "Mobilier renouvellement agences",
      legacyId: `furn-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat2_capital_goods:cat2_vehicles",
      scope: 3,
      quantity: 18,
      unit: "unités",
      activityType: "service",
      method: "physical",
      sourceType: "invoice",
      uncertainty: 30,
      notes: "Véhicules de service acquis 2025",
      legacyId: `veh-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat2_capital_goods:cat2_capex_general",
      scope: 3,
      quantity: 2100000,
      unit: "TND",
      activityType: "service",
      method: "monetary",
      sourceType: "invoice",
      uncertainty: 50,
      notes: "CAPEX rénovation / aménagement",
      legacyId: `capex-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat4_upstream_transport:cat4_road_freight_local",
      scope: 3,
      quantity: 185000,
      unit: "t.km",
      activityType: "transport",
      sourceType: "estimate",
      uncertainty: 40,
      notes: "Transport amont cash / courier",
      legacyId: `freight-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat5_waste:cat5_unsorted_waste",
      scope: 3,
      quantity: 18500,
      unit: "kg",
      activityType: "waste",
      uncertainty: 35,
      notes: "Déchets siège",
      legacyId: `waste-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat5_waste:cat5_recyclables",
      scope: 3,
      quantity: 9200,
      unit: "kg",
      activityType: "waste",
      uncertainty: 30,
      notes: "Papier/recyclables siège",
      legacyId: `recycl-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat6_business_travel:cat6_flight_short",
      scope: 3,
      quantity: 420000,
      unit: "km",
      activityType: "transport",
      sourceType: "invoice",
      uncertainty: 25,
      notes: "Vols court-courrier",
      legacyId: `flight-s-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat6_business_travel:cat6_flight_medium",
      scope: 3,
      quantity: 280000,
      unit: "km",
      activityType: "transport",
      sourceType: "invoice",
      uncertainty: 25,
      notes: "Vols moyen-courrier",
      legacyId: `flight-m-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat6_business_travel:cat6_flight_long",
      scope: 3,
      quantity: 190000,
      unit: "km",
      activityType: "transport",
      sourceType: "invoice",
      uncertainty: 25,
      notes: "Vols long-courrier",
      legacyId: `flight-l-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat6_business_travel:cat6_train",
      scope: 3,
      quantity: 95000,
      unit: "km",
      activityType: "transport",
      sourceType: "invoice",
      uncertainty: 20,
      notes: "Train",
      legacyId: `train-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat6_business_travel:cat6_hotel",
      scope: 3,
      quantity: 4200,
      unit: "nuitées",
      activityType: "service",
      sourceType: "invoice",
      uncertainty: 30,
      notes: "Hôtels missions",
      legacyId: `hotel-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat6_business_travel:cat6_taxi",
      scope: 3,
      quantity: 38000,
      unit: "km",
      activityType: "transport",
      sourceType: "estimate",
      uncertainty: 30,
      notes: "Taxi / VTC siège",
      legacyId: `taxi-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat7_employee_commuting:cat7_car_solo",
      scope: 3,
      quantity: 2_450_000,
      unit: "km",
      activityType: "transport",
      sourceType: "extrapolation",
      uncertainty: 40,
      notes: "Domicile-travail voiture siège",
      legacyId: `commute-car-${code}`,
    }),
    act({
      siteId: hq,
      category: "scope3_upstream",
      subcategory: "cat7_employee_commuting:cat7_public_transport",
      scope: 3,
      quantity: 980000,
      unit: "km",
      activityType: "transport",
      sourceType: "extrapolation",
      uncertainty: 40,
      notes: "Domicile-travail TC siège",
      legacyId: `commute-pt-${code}`,
    }),
  ];
}

function buildSql() {
  const siteEmployees = SITES.reduce((n, s) => n + s.employees, 0);
  const siteSurface = SITES.reduce((n, s) => n + s.surface, 0);

  const siteValues = SITES.map(
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
      `'{"demo":true,"profile":"${s.profile}","network_note":"15 sites seedés (siège, admin, DC, 12 agences)"}'::jsonb`,
      sqlStr(LEGACY),
      sqlStr(`site-${s.code}`),
      "now()",
      `'{"label":"DEMO DATA — FICTIONAL ORGANIZATION"}'::jsonb`,
    ].join(",")})`,
  ).join(",\n");

  const activityRows = [...SITES.flatMap(activitiesForSite), ...hqCentralScope3()];

  const supplierValues = COUNTERPARTIES.map((c) => {
    const sid = uid(c.id);
    const financedT = c.kg / 1000;
    const companyValue = Math.round(c.spend / c.attr);
    const companyEmissions = Math.round((financedT / c.attr) * 10) / 10;
    const option = PCAF_OPTION_BY_DQ[c.dq];
    const raw = JSON.stringify({
      demo: true,
      label: "DEMO DATA — FICTIONAL ORGANIZATION",
      pcaf_standard: "PCAF Part A Financed Emissions Third Edition 2025",
      pcaf_section: "5.2",
      asset_class: "business_loans",
      listing: "private",
      pcaf_data_quality: c.dq,
      pcaf_option: option,
      outstanding_tnd: c.spend,
      total_equity_plus_debt_tnd: companyValue,
      attribution_factor: c.attr,
      company_emissions_tco2e: companyEmissions,
      financed_emissions_tco2e: financedT,
      scopes_covered: "1+2 (+3 séparément)",
      currency: "TND",
    }).replace(/'/g, "''");
    return `(${[
      sqlStr(sid),
      sqlStr(ORG),
      sqlStr(c.name),
      sqlStr("TN"),
      sqlStr(c.city),
      sqlStr(c.cat),
      sqlStr("Prêt / financement"),
      "15",
      sqlStr(c.score),
      "NULL",
      sqlNum(c.conf),
      sqlStr("engaged"),
      sqlStr(c.dq <= 2 ? "supplier_specific" : "estimated"),
      c.dq <= 3 ? "true" : "false",
      c.dq <= 2 ? "true" : "false",
      sqlNum(c.spend),
      sqlStr("TND"),
      sqlNum(YEAR),
      sqlStr("high"),
      sqlStr(`DEMO — contrepartie fictive. PCAF Option ${option}, data quality score ${c.dq}.`),
      "true",
      sqlStr(LEGACY),
      sqlStr(`cp-${c.id}`),
      "now()",
      `'${raw}'::jsonb`,
    ].join(",")})`;
  }).join(",\n");

  const purchaseValues = COUNTERPARTIES.map((c, i) => {
    const sid = uid(c.id);
    const pid = uid(`e${(0x201 + i).toString(16)}`);
    return `(${[
      sqlStr(pid),
      sqlStr(ORG),
      sqlStr(sid),
      sqlNum(YEAR),
      sqlStr(`Encours ${c.name} 2025`),
      sqlNum(c.spend),
      sqlStr("TND"),
      sqlStr(c.cat),
      "15",
      sqlNum(c.kg),
      sqlStr(c.dq <= 2 ? "supplier_specific" : "estimated"),
      sqlNum(15 + c.dq * 8),
      sqlStr(c.dq <= 2 ? "invoice" : "estimate"),
      "true",
      sqlStr("DEMO — émissions financées (hors bilan opérationnel)"),
      sqlStr(LEGACY),
      sqlStr(`pur-${c.id}`),
      "now()",
      `'{"demo":true,"pcaf":true}'::jsonb`,
    ].join(",")})`;
  }).join(",\n");

  return `-- =============================================================================
-- DEMO DATA — FICTIONAL ORGANIZATION
-- Banque Atlas — multi-sites (15) + activité 2025 + portefeuille (labels PCAF)
-- Generated by scripts/seed-banque-atlas-demo.mjs
-- checksum:${createHash("sha256").update(String(activityRows.length)).digest("hex").slice(0, 12)}
-- =============================================================================

BEGIN;

DELETE FROM organizations WHERE legacy_source = ${sqlStr(LEGACY)};
DELETE FROM users WHERE legacy_source = ${sqlStr(LEGACY)};

INSERT INTO users (
  id, email, password_hash, full_name, is_active, must_reset_password,
  legacy_source, legacy_id, imported_at
) VALUES (
  ${sqlStr(USER)},
  'demo.banque.atlas@carboscan.io',
  ${sqlStr(PASSWORD_HASH)},
  'Chargé climat — Banque Atlas (DEMO)',
  true, false,
  ${sqlStr(LEGACY)}, 'user-demo-banque-atlas', now()
);

INSERT INTO organizations (
  id, name, slug, user_id, country, sector, reference_year, currency,
  legal_name, pilot_name, subscription_plan, subscription_status, max_users,
  status, consolidation_method, employees, annual_revenue, total_surface,
  organization_type, financed_emissions_enabled,
  legacy_source, legacy_id, imported_at, raw_legacy
) VALUES (
  ${sqlStr(ORG)},
  'Banque Atlas',
  'banque-atlas-demo',
  ${sqlStr(USER)},
  'TN', 'Banque', ${YEAR}, 'TND',
  'Banque Atlas (DEMO — organisation fictive)',
  'Direction Climat & ESG',
  'pro', 'active', 25, 'active', 'operational_control',
  ${siteEmployees}, 420000000, ${siteSurface},
  'financial_institution', true,
  ${sqlStr(LEGACY)}, 'org-banque-atlas', now(),
  jsonb_build_object(
    'demo', true,
    'label', 'DEMO DATA — FICTIONAL ORGANIZATION',
    'network', '15 sites seedés (siège, centre admin, data center, 12 agences)',
    'type', 'Financial Institution / Bank',
    'pcaf_enabled', true,
    'financial_institution', true,
    'warning', 'Organisation fictive pour démonstration commerciale.'
  )
);

INSERT INTO organization_members (organization_id, user_id, role, legacy_source, legacy_id, imported_at)
VALUES (${sqlStr(ORG)}, ${sqlStr(USER)}, 'owner', ${sqlStr(LEGACY)}, 'member-owner', now());

INSERT INTO profiles (user_id, full_name, company_name, sector, company_size, legacy_source, legacy_id, imported_at)
VALUES (
  ${sqlStr(USER)}, 'Chargé climat — Banque Atlas (DEMO)', 'Banque Atlas', 'Banque', '1000-5000',
  ${sqlStr(LEGACY)}, 'profile-demo', now()
)
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  company_name = EXCLUDED.company_name,
  sector = EXCLUDED.sector;

INSERT INTO companies (
  id, organization_id, user_id, nom_entreprise, secteur, ca_annuel, collaborateurs,
  legacy_source, legacy_id, imported_at, raw_legacy
) VALUES (
  ${sqlStr(COMPANY)}, ${sqlStr(ORG)}, ${sqlStr(USER)}, 'Banque Atlas', 'Banque',
  420000000, ${siteEmployees},
  ${sqlStr(LEGACY)}, 'company-banque-atlas', now(),
  '{"demo":true,"label":"DEMO DATA — FICTIONAL ORGANIZATION"}'::jsonb
);

INSERT INTO organization_years (organization_id, year, is_included, legacy_source, legacy_id, imported_at)
VALUES (${sqlStr(ORG)}, ${YEAR}, true, ${sqlStr(LEGACY)}, 'year-2025', now())
ON CONFLICT (organization_id, year) DO UPDATE SET is_included = true;

INSERT INTO organization_modules (organization_id, module_id, enabled, org_id, active, started_at, legacy_source, legacy_id, imported_at)
SELECT ${sqlStr(ORG)}, m.id, true, ${sqlStr(ORG)}, true, now(), ${sqlStr(LEGACY)}, 'mod-' || m.code, now()
FROM modules m
WHERE m.code IN (${MODULE_CODES.map(sqlStr).join(", ")})
ON CONFLICT (organization_id, module_id) DO UPDATE
  SET enabled = true, active = true, updated_at = now();

INSERT INTO collect_sites (
  id, organization_id, company_id, name, code, city, country, country_code,
  site_type, surface_m2, employees_count, is_active, is_consolidated,
  operation_status, description, metadata, legacy_source, legacy_id, imported_at, raw_legacy
) VALUES
${siteValues};

INSERT INTO activity_data (
  id, organization_id, site_id, category, subcategory, scope, quantity, unit,
  period_start, period_end, factor_id, activity_type, data_quality, data_method,
  source_type, uncertainty_pct, emission_factor_source, emission_factor_year,
  emission_factor_region, notes, created_by, validation_status,
  legacy_source, legacy_id, imported_at, raw_legacy
) VALUES
${activityRows.join(",\n")};

INSERT INTO suppliers (
  id, organization_id, name, country, city, purchase_category, purchase_subcategory,
  scope3_ghg_category, carbon_score, carbon_intensity_kgco2e, confidence_index,
  engagement_status, data_method, has_carbon_footprint, has_sbti_target,
  annual_spend, annual_spend_currency, annual_spend_year, criticality, notes,
  is_active, legacy_source, legacy_id, imported_at, raw_legacy
) VALUES
${supplierValues};

INSERT INTO supplier_purchases (
  id, organization_id, supplier_id, reference_year, description, amount, currency,
  purchase_category, ghg_scope3_category, calculated_emissions_kgco2e,
  data_method, uncertainty_percent, source_type, is_validated, notes,
  legacy_source, legacy_id, imported_at, raw_legacy
) VALUES
${purchaseValues};

COMMIT;

-- Post-check helpers (not part of transaction result)
-- SELECT count(*) FROM collect_sites WHERE organization_id = '${ORG}';
-- SELECT scope, count(*) FROM activity_data WHERE organization_id = '${ORG}' GROUP BY 1;
`;
}

const sql = buildSql();
const asSqlOnly = process.argv.includes("--sql");

if (asSqlOnly) {
  process.stdout.write(sql);
  process.exit(0);
}

const outPath = new URL("../db/seeds/banque_atlas_demo.sql", import.meta.url);
writeFileSync(outPath, sql, "utf8");
console.error(`Wrote ${outPath.pathname}`);
console.error(`Sites: ${SITES.length}`);

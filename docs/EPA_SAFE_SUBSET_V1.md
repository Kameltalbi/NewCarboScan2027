# EPA Safe Subset V1

**Ruleset:** `EPA_SAFE_SUBSET_V1_2026_09`  
**Resolver ruleset version:** `2026-09-v3`  
**Source:** `epa_ghg_emission_factors_hub` / dataset `2025`  
**Migration:** `026_activate_epa_catalog.sql` (catalog only)

## Principle

Conservative. Methodological quality beats coverage.  
An uncertain factor stays **out** of auto-resolution.

`visible in catalog ≠ automatically calculable`.

## Final class counts

| Class | Count | Meaning |
|-------|------:|---------|
| EPA total | **1421** | Hub 2025 imported rows |
| **AUTO_US** | **258** | US activity CO2e eligible for future auto-resolve when country=US |
| **AUTO_GLOBAL_ACTIVITY** | **0** | No Hub activity factor is scientifically world-applicable in V1 |
| **GLOBAL_GWP** | **62** | Tables 11–12 AR5 GWP references (never activity factors) |
| **REVIEW_REQUIRED** | **1101** | Components + import review + ambiguous combustion/steam |

Sum check: `258 + 0 + 62 + 1101 = 1421`.

### TN vs US auto-eligible EPA activity

| Request country | EPA activity auto-eligible |
|-----------------|---------------------------:|
| TN | **0** (no AUTO_GLOBAL_ACTIVITY) |
| US | **258** (AUTO_US) |
| FR / GB | **0** (US_SPECIFIC / eGRID excluded) |

## Analysis of the 62 GLOBAL_APPLICABLE

All 62 rows are `factor_kind = gwp` (Tables 11–12).  
None are activity emission factors.

| Decision | Count |
|----------|------:|
| GLOBAL_GWP | 62 |
| AUTO_GLOBAL | 0 |

**Rationale:** IPCC AR5 100-year GWPs are scientifically global references, but they must never be selected as activity emission factors. The engine may use them only when it explicitly needs an AR5-compatible GWP.

## Analysis of the 781 US_SPECIFIC

| Kind | Count | Safe class |
|------|------:|------------|
| activity_emission_factor | 258 | AUTO_US |
| ghg_component | 523 | REVIEW_REQUIRED (never activity auto-resolve) |

### AUTO_US by EPA table

| Table | Activity AUTO_US | Notes |
|------:|-----------------:|-------|
| 6 eGRID | 56 | Derived AR5 CO2e; **US only**; region = eGRID subregion |
| 8 Scope 3 T&D | 7 | Derived; US logistics assumptions |
| 9 Waste | 183 | Already CO2e; US waste methods |
| 10 Travel / commuting | 12 | Derived; US commuting / travel hypotheses |
| 3–4 on-road CH4/N2O | 0 activity | Components only → REVIEW_REQUIRED |

## Analysis of the 578 REQUIRES_REVIEW

| Kind | Count | Decision |
|------|------:|----------|
| activity (mostly T1 stationary derived + T7 steam) | 122 | **REVIEW_REQUIRED** — HHV/gross_cv, US units (mmBtu, short ton, scf), fuel composition assumptions |
| ghg_component | 456 | **REVIEW_REQUIRED** |

**No artificial promotion** to AUTO_GLOBAL_ACTIVITY. Stationary combustion is not “global diesel” just because the fuel name is familiar.

## Policy rules

### Geography — Tunisia (`country=TN`)

1. Prefer Core TN specific factor when compatible.  
2. Else ADEME/UK only if their geography policy already allows (usually not for TN).  
3. EPA AUTO_GLOBAL_ACTIVITY: **none in V1**.  
4. EPA US_SPECIFIC / eGRID: **hard reject** (`GEO_EPA_US_INCOMPATIBLE` / `GEO_EPA_EGRID_US_ONLY`).  
5. Proxy-only situations → `REVIEW_REQUIRED` / `REQUIRES_CONTEXT` — never silent US→TN.

Same national hard rules: ADEME FR and UK GB remain intrinsically national when geography is set.

### Geography — USA (`country=US`)

- AUTO_US + (future) AUTO_GLOBAL_ACTIVITY may participate.  
- Ranking prefers US-specific (esp. matching eGRID region) over weaker globals at comparable methodology/unit/lifecycle.  
- Source preference: `epa_ghg_emission_factors_hub` when country=US.

### eGRID

- Table 6 only.  
- Eligible only for `country=US` (optional region match improves rank).  
- **Forbidden** as world / TN / FR / GB fallback.

### GWP

- Class `GLOBAL_GWP`.  
- Rejected as activity by `KIND_INCOMPATIBLE` / safe-subset gate.  
- Not in `PRODUCTION_SAFE_FACTOR_SQL`.

### Derived (197)

- Keep `derived=true`, components, formula, AR5 basis, provenance.  
- US derived activity rows (eGRID, T&D, travel) → **AUTO_US** when other AUTO_US criteria hold.  
- Stationary derived under REQUIRES_REVIEW → stay **REVIEW_REQUIRED**.

### Combustion caution

Do **not** declare GLOBAL solely because the fuel is diesel/gasoline/gas/coal.  
EPA Hub stationary factors use US HHV and imperial quantity bases → REVIEW_REQUIRED in V1.

## Implementation (deterministic, not UUID lists)

App module: `apps/api/src/services/factorResolver/epaSafeSubset.ts`

Classification inputs:

- `source_key`
- `factor_kind`
- `metadata.geography.geographic_applicability`
- `country_code`
- `gwp_basis`
- `lifecycle_boundary`
- `normalization_status` (review_required)
- table number (eGRID detection)

Wired into:

- `productionSafeSubset.ts` / `PRODUCTION_SAFE_FACTOR_SQL`
- `geographyPolicy.ts`
- `sourcePolicy.ts` (US → EPA preference)
- Resolver / resolve-and-calculate **provenance** (`epaSafeSubsetRuleset`, class, geo, lifecycle, GWP, derived, eGRID flag)

## Governance after 026

| Field | Value |
|-------|-------|
| catalog_status | **visible** |
| calculation_status | **disabled** |
| resolver_status | **disabled** |

Catalog shows all 1421 EPA factors. Auto-calc still off until a later activation (like ADEME/UK FE V1).

## Non-regression

- Registry remains **11445**.  
- Core TN / ADEME / UK rules unchanged.  
- Public catalog becomes **11445** once EPA is visible.  
- EPA importer / scientific values / stable IDs untouched.

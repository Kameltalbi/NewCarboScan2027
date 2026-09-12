# EPA GHG Emission Factors Hub 2025 — Import Report

**Date:** 2026-09-12  
**Source file:** `ghg-emission-factors-hub-2025.xlsx`  
**XLSX SHA-256:** `43afb91d79b2ae765b3a447549d9e1021a144a407cec5eb804be9fcf69a668a7`  
**Seed:** `db/seeds/epa_ghg_emission_factors_hub_2025.sql`  
**Seed SHA-256:** `8dace7ec6e486d7f1083802352f4037ebba3d0793342a3144d44f0b1279130ca`  
**Migration:** `025_bootstrap_epa_ghg_hub_2025.sql`

## Scope

Import + normalisation + catalogue bootstrap **only**.  
Factor Resolver / calculation **not** activated for EPA.

## Counts

| Metric | Value |
|--------|------:|
| 1. Source rows (sheet) | 591 |
| 2. Tables | 12 |
| 3. Raw factors detected | 1421 |
| 4. Factors imported | 1421 |
| 5. GHG components | 979 |
| 6. Activity CO2e factors | 380 |
| 7. GWP | 62 |
| 8. Derived (CarboScan AR5) | 197 |
| 9. US_SPECIFIC | 781 |
| 10. GLOBAL_APPLICABLE | 62 |
| 11. REQUIRES_REVIEW | 578 |
| 15. NA ignored | 183 |
| 16. Zeros | 7 |
| 17. Negatives | 0 |
| 18. Duplicate stable IDs | 0 (hard fail) |

## 12. Répartition par table

| Table | Factors |
|------:|--------:|
| 1 Stationary combustion | 484 |
| 2 Mobile CO2 | 10 |
| 3 On-road gasoline CH4/N2O | 230 |
| 4 On-road diesel/alt CH4/N2O | 68 |
| 5 Non-road CH4/N2O | 80 |
| 6 Electricity eGRID | 224 |
| 7 Steam & heat | 4 |
| 8 Scope 3 T&D | 28 |
| 9 Waste (already CO2e) | 183 |
| 10 Travel / commuting | 48 |
| 11 GWP gases | 32 |
| 12 GWP refrigerant blends | 30 |

## 13–14. Units & lifecycle

See generator summary (`byUnit`, `byLifecycle`): primarily `direct` (836), `waste_treatment` (183), `other` for GWP (62).

## 19. Anomalies / notes

- Table 1 kraft-pulping rows lack heat content / quantity columns → mmBtu-only components.
- Table 4 alternative-fuel rows often have no model year → stored as `unspecified`.
- Table 9 `NA` never imported as 0.
- Derived CO2e rows are explicitly flagged (`derived=true`, formula + AR5 GWPs); never presented as EPA raw.
- eGRID (Table 6) forced `country_code=US` + `US_SPECIFIC`.

## 20. Décisions méthodologiques

1. Explicit table-by-table parsers (no generic row scanner).
2. `factor_kind`: `ghg_component` | `activity_emission_factor` | `gwp`.
3. AR5 GWPs: CH4=28, N2O=265 from Hub header / Table 11.
4. Derived CO2e for tables with CO2+CH4+N2O when units allow (T1 energy/qty, T6 lb→kg, T7, T8, T10).
5. Geography conservative: eGRID/on-road US / waste / travel → US_SPECIFIC; GWP → GLOBAL_APPLICABLE; stationary/mobile fuels/steam/non-road → REQUIRES_REVIEW.
6. Governance bootstrap: `draft/hidden/disabled/disabled`.
7. Stable IDs: `epa:2025:<stem…>`; UUID v5 namespace `a4000000-0000-4000-8000-000000000002`.
8. No EPA activation in Factor Resolver in this task.

## Governance

| Field | Value |
|-------|-------|
| catalog_status | hidden |
| calculation_status | disabled |
| resolver_status | disabled |
| factor status | draft |

## Non-regression intent

Core TN, ADEME, UK seeds/migrations untouched. Resolver FE V1 unchanged. EPA invisible to calculation/resolver until a future SAFE SUBSET + activation migration.

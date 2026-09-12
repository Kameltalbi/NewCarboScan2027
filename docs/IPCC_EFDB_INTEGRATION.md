# IPCC EFDB integration (EFDB_output.xlsx)

## Source

| Field | Value |
|-------|-------|
| File | `data/ipcc_efdb/EFDB_output.xlsx` |
| Sheet | Sheet1 |
| Headers | row 1 (21 columns A–U) |
| Data | rows 2–27567 (**27566** records, **27566** distinct EF IDs) |
| SHA-256 | `4b9c071cb247fab8a4ec80df695d28f77f8dcfe585992adba9dd797f266aa038` |
| Snapshot date | **2026-09-12** (export date — distinct from scientific reference years) |

## Type of parameter (origin — not factor_kind)

| Type of parameter | Count |
|-------------------|------:|
| 2019 Refinement default | 7203 |
| 2006 IPCC default | 5887 |
| 1996 & 2006 IPCC default | 1045 |
| 1996 IPCC default | 6302 |
| 2013 WS default | 112 |
| 2013 KP default | 12 |
| Measured | 3239 |
| Modeled | 797 |
| Other (e.g. compiled) | 2969 |

## Value parsing (deterministic, no partial `parseFloat`)

Observed by importer:

| Class | Count |
|-------|------:|
| number | 24013 |
| simple_interval | 1342 |
| central_with_bounds | 734 |
| inequality | 6 |
| other_text | 1177 |
| missing | **294** |

Also: empty geo **10450**, empty unit **77**, empty description **2909**, multi-gas **1807**.

Intervals / central values / inequalities keep `number = null` (no silent mid-point). True zeros and negatives are preserved and annotated.

## Staging vs registry

- **`ipcc_efdb_records`**: all **27566** rows with full JSON payload (21 fields), `value_parse`, `semantic_class`, `exclusion_reason`.
- **`emission_factors`**: operational subset only (**778**).

### Mandatory examples

| EF ID | Role |
|-------|------|
| 62801 | Fraction wastewater treated (%), **auxiliary_parameter**, region Tunisia |
| 14772 | NCV (TJ/kt), **auxiliary_parameter**, region Tunisia |
| 117614 | CO2 stationary combustion diesel, **74100 kg/TJ NCV** → activity `kgCO2e/TJ` (CO2 identity GWP=1, no blend) |

Empty region is stored as `country_code = NULL` + `geographic_applicability = IPCC_DEFAULT_UNSPECIFIED` — **never WORLD**.

## Biogenic CO2 (031)

Among the **216** CO2 stationary activity factors, **44** are biomass/biofuels
(11 fuels × 4 categories). They remain calculable (value conserved) but are tagged:

| Field | Value |
|-------|-------|
| `lifecycle_boundary` | `outside_of_scopes` |
| `metadata.provenance.biogenicCo2` | `true` |
| Engine `accountingClass` | `biogenic_co2` |
| Scope totals | **excluded** |
| `totals.biogenicCo2` | memo (Ledger provenance) |

`Municipal Wastes (non-biomass fraction)` (**4**) stays fossil/`direct`.

## Operational subset V1 (`IPCC_STATIONARY_COMBUSTION_V1_2026_09`)

Criteria: `2006 IPCC default` ∩ categories `1.A.1|1.A.2|1.A.4` ∩ unit `kg/TJ` ∩ single gas CO2/CH4/N2O ∩ numeric value.

| Class | Count | Registry role |
|-------|------:|---------------|
| AUTO_GLOBAL_ACTIVITY | **216** | `activity_emission_factor` kgCO2e/TJ net_cv |
| GHG_COMPONENT | **562** | `ghg_component` (no silent CO2e derivation) |
| Total promoted | **778** | |

No CH4/N2O→CO2e composite without documented GWP set + complete components. Missing component ≠ 0.

TN eligibility: measured **216** AUTO_GLOBAL_ACTIVITY (Tier-1 defaults usable with activity country TN/FR/…). TN-specific stationary rows in file: **0**. Core TN remains preferred for electricity kWh.

## Migrations

| File | Role |
|------|------|
| `db/seeds/ipcc_efdb.sql` | DATA bootstrap |
| `028_bootstrap_ipcc_efdb.sql` | post-checks draft/hidden |
| `029_activate_ipcc_efdb_catalog.sql` | approved/visible |
| `030_activate_ipcc_stationary_combustion_v1.sql` | calc+resolver enabled (app gate 216) |
| `031_ipcc_biogenic_co2_v1.sql` | tag 44 biogenic CO2 outside scopes |

### Rollback 030

```sql
UPDATE emission_factor_versions v
SET calculation_status = 'disabled', resolver_status = 'disabled'
FROM factor_sources s
WHERE s.id = v.source_id AND s.source_key = 'ipcc_efdb'
  AND v.dataset_version = 'efdb_snapshot_2026_09';
```

## Reproduce seed

```bash
npm run generate:ipcc-efdb-seed
```

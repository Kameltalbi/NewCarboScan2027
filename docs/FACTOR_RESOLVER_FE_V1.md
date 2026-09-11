# Factor Resolver FE V1 — completion report

Date: 2026-09-11 · HEAD base: `1cbbd1e` · **no push**

## Done

- Heat EN synonym (`heat` / `chaleur` / `vapeur`) → Core TN `heat_kwh` (exact synonyms, no fuzzy)
- Production safe-subset ruleset (`2026-09-v2`) enforced in eligibility + authoritative reload
- Migration `024_activate_factor_resolver_fe_v1.sql` applied locally:
  - Core TN: calc enabled, **resolver enabled**
  - ADEME: calc+resolver **enabled** (auto-resolve = safe **2570** only)
  - UK: calc+resolver **enabled** (auto-resolve = safe **1260** only)
- `/v1/calculate` still **internal-only** (ADEME/UK UUID bypass blocked)
- Feature flag `FACTOR_RESOLVER_CALCULATION_ENABLED` remains kill switch (**default OFF**)
- UI: `api.resolveFactor` / `api.resolveAndCalculate` + Proof workspace Resolver mode

## Kill switch

Set `FACTOR_RESOLVER_CALCULATION_ENABLED=false` (or unset) → resolve-and-calculate refuses calculation immediately. DB governance can stay enabled.

## Tests

`factor-resolver-fe-v1` + phase1 + http + unit + live: **pass** (see session).

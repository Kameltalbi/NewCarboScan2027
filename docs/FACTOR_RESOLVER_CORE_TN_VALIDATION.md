# Factor Resolver — Core TN Controlled Validation

Date: 2026-09-11  
HEAD: `1cbbd1e` (`develop` sync 0/0)  
Scope: Core TN only — no ADEME/UK activation, no commit, no push, no deploy.

## Method

Temporary local activation for the validation window only:

1. `UPDATE emission_factor_versions … SET resolver_status='enabled'` for `source_key='internal'`
2. `FACTOR_RESOLVER_CALCULATION_ENABLED=true` in process env only (`.env.example` untouched, default remains `false`)
3. Run resolve + `POST /v1/factors/resolve-and-calculate` E2E + security + non-RESOLVED + atomicity + perf
4. Delete only calculation_run / ledger / audit rows created by this protocol (marker `core-tn-validation-20260911`)
5. Restore Core TN `resolver_status=disabled`; leave ADEME/UK disabled/disabled

Script (local, uncommitted): `apps/api/scripts/validate-core-tn-resolver.mts`  
Raw results: `docs/_core_tn_validation_raw.json`

---

## 1. Liste des 8 Core TN

| stable_factor_id | Activité (name) | Valeur | Unité | Source | Geography | Resolver (après restore) |
|---|---|---:|---|---|---|---|
| electricity_kwh | Électricité location-based TN | 0.523 | kgCO2e/kWh | internal | TN | disabled |
| heat_kwh | Chaleur / vapeur | 0.200 | kgCO2e/kWh | internal | TN | disabled |
| gas_m3 | Gaz naturel | 2.056 | kgCO2e/m3 | internal | TN | disabled |
| fuel_liters | Fioul / carburant | 2.680 | kgCO2e/L | internal | TN | disabled |
| fleet_diesel | Diesel flotte | 2.680 | kgCO2e/L | internal | TN | disabled |
| fleet_essence | Essence flotte | 2.310 | kgCO2e/L | internal | TN | disabled |
| refrigerant_kg | Fluide frigorigène (proxy) | 1345 | kgCO2e/kg | internal | TN | disabled |
| purchases_dt | Achats monétaires (proxy) | 0.500 | kgCO2e/TND | internal | TN | disabled |

Dataset: `core-tn-2027.1` · calc status (permanent): **enabled** · resolver (permanent): **disabled**

---

## 2. Résultats Resolver des 8 (production mode, Core resolver temporairement enabled)

Tous **RESOLVED** avec `source=internal` — aucun facteur ADEME/UK sélectionné.

| stable_factor_id | Input activité | Unité | Qty | Status | Source |
|---|---|---|---:|---|---|
| electricity_kwh | electricity | kWh | 1000 | RESOLVED | internal |
| heat_kwh | chaleur | kWh | 500 | RESOLVED | internal |
| gas_m3 | natural gas | m3 | 100 | RESOLVED | internal |
| fuel_liters | fuel oil fioul carburant | L | 50 | RESOLVED | internal |
| fleet_diesel | diesel fleet | L | 40 | RESOLVED | internal |
| fleet_essence | essence gasoline fleet | L | 30 | RESOLVED | internal |
| refrigerant_kg | refrigerant fugitive | kg | 2 | RESOLVED | internal |
| purchases_dt | purchases monetary | TND | 1000 | RESOLVED | internal |

Note retrieval: l’activité anglaise `heat steam district heating` → `NO_CANDIDATES_RETRIEVED` (pas de synonyme EN « heat »). Avec l’activité FR réaliste `chaleur`, `heat_kwh` résout correctement. Pas d’ajout de synonyme dans cette validation.

---

## 3. E2E complet

`activity=electricity` → `POST /v1/factors/resolve-and-calculate` → RESOLVED → reload DB authoritative → engine → run + ledger.

- `selectedStableId`: `electricity_kwh`
- `sourceKey`: `internal`
- `originalQuantity` / `normalizedQuantity`: `1000` / `1000` (kWh)
- `factorValue` utilisé (DB): `0.523`
- `resultKgCo2e`: `523`
- run + ledger créés puis **supprimés** en fin de protocole

Les 8 facteurs ont aussi passé un E2E resolve-and-calculate individuel — **8/8 math OK**.

---

## 4. Vérification mathématique

Formule: `emissions = normalizedQuantity × authoritative_factor_value`

Tolérance: `abs ≤ 1e-9` **ou** `rel ≤ 1e-9`.

Exemple électricité: `1000 × 0.523 = 523` — **exact**.

Safe conversion: `0.002 t × 1000 = 2 kg`; `2 × 1345 = 2690` — **exact**.

---

## 5. Ledger provenance

Champs vérifiés sur la ligne ledger E2E électricité:

| Champ | Présent / cohérent |
|---|---|
| resolverVersion | oui (`1`) |
| rulesetVersion | oui (`2026-09-v1`) |
| resolutionMode | `production` |
| stableFactorId | `electricity_kwh` |
| factor UUID | = factor_id ledger |
| sourceKey | `internal` |
| datasetVersion | `core-tn-2027.1` |
| factorChecksum | présent |
| originalQuantity / Unit | `1000` / `kWh` |
| normalizedQuantity / Unit | `1000` / `kWh` |
| unit_conversion | `{type:exact, multiplier:1, from:kWh, to:kWh}` |
| reasons / warnings | présents dans provenance |
| factor_value / result_kgco2e | `0.523` / `523` |
| factorResolvedFromDb | `true` |
| clientOverride | `false` |

Le ledger permet de reproduire: qty normalisée × factor_value → émissions.

---

## 6. Safe conversion E2E

Cas réel Core TN: **tonne → kg** sur `refrigerant_kg`.

- original: `0.002 t`
- multiplier: `1000`
- normalized: `2 kg`
- émissions: `2690 kgCO2e`
- ledger `unit_conversion.type = safe`

---

## 7. Sécurité (flag ON + Core resolver enabled temporairement)

| Test | Résultat |
|---|---|
| Injection `factorValue` / `factorId` / `resolverResult` / `conversionMultiplier` | **400** (schema strict) |
| ADEME UUID via `/v1/calculate` | **400** (unavailable / source restricted) |
| UK UUID via `/v1/calculate` | **400** |
| ADEME resolve-and-calculate (FR electricity) | **404** `FACTOR_NOT_RESOLVED` / `NO_MATCH` — **aucun calcul** |
| UK resolve-and-calculate (GB electricity) | **404** `FACTOR_NOT_RESOLVED` / `NO_MATCH` — **aucun calcul** |
| Ledger pendant ces tests | **inchangé** |

---

## 8. Non-RESOLVED

| Statut exercé | Via | Calcul / run / ledger |
|---|---|---|
| NO_MATCH | resolve-and-calculate | **zéro écriture** |
| REQUIRES_CONTEXT | monetary hint + kWh | **zéro écriture** |
| FR / GB electricity (ADEME/UK off) | production → NO_MATCH | **zéro écriture** |

`AMBIGUOUS` / `REVIEW_REQUIRED` non reproductibles en production avec ADEME/UK `resolver_status=disabled` (volontaire). Le garde-fou code est commun: `status !== RESOLVED` → pas de run/ledger. Shadow matrix inchangé.

---

## 9. Atomicité

Échec post-résolution sans modifier la logique prod: `evidenceId` UUID inexistant.

- HTTP **500** `Evidence not found: …`
- `calculation_runs` **inchangé**
- `calculation_ledger` **inchangé**
- Pas de run/ledger partiel

---

## 10. Performances (local)

| Métrique | min | p50 | p95 | max | n |
|---|---:|---:|---:|---:|---:|
| Resolver (ms) | ~1.8 | ~6.0 | ~14.8 | ~16 | 32 |
| resolve-and-calculate total (ms) | ~13.3 | ~29.1 | ~61.4 | ~91.1 | 12 |

Acceptable pour validation locale. Pas d’optimisation.

---

## 11. État DB après restauration

| Contrôle | Valeur |
|---|---|
| registry | **10024** |
| visible | **10024** |
| Core TN | **8** · calc **enabled** · resolver **disabled** |
| ADEME | **7394** · disabled / disabled |
| UK | **2622** · disabled / disabled |
| Flag default | OFF (`.env.example` non modifié) |
| Shadow | OK |
| `/v1/calculate` | toujours protégé (ADEME/UK refusés) |
| Runs/ledger de test | **21** runs nettoyés (marker) |

---

## 12. Fichiers éventuellement modifiés / créés (non commités)

- `apps/api/scripts/validate-core-tn-resolver.mts` (script de validation)
- `docs/_core_tn_validation_raw.json` (raw)
- `docs/FACTOR_RESOLVER_CORE_TN_VALIDATION.md` (ce rapport)

Aucun fichier de production modifié. Pas de migration. WIP ~95 non touchés.

---

## VERDICT

| | Question | Verdict |
|---|---|---|
| A | 8 Core TN compatibles Resolver ? | **YES** (heat via activité FR `chaleur`; EN « heat » sans synonyme = gap retrieval) |
| B | pipeline Resolver → Engine fonctionne ? | **YES** |
| C | calcul mathématiquement exact ? | **YES** |
| D | ledger reproductible ? | **YES** |
| E | authoritative DB factor garanti ? | **YES** |
| F | safe conversion correcte ? | **YES** (t→kg refrigerant) |
| G | bypass client impossible ? | **YES** |
| H | ADEME reste non calculable ? | **YES** |
| I | UK reste non calculable ? | **YES** |
| J | non-RESOLVED = zéro écriture ? | **YES** |
| K | atomicité validée ? | **YES** |
| L | performance acceptable ? | **YES** |
| M | DB correctement restaurée ? | **YES** |
| N | Core TN prêt pour activation permanente ? | **YES** (sous réserve: activation = décision produit séparée; gap synonyme EN « heat » optionnel; ADEME/UK restent off) |

**Arrêt.** Aucun commit / push / deploy / activation ADEME-UK / flag permanent ON.

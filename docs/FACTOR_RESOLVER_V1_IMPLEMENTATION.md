# Factor Resolver V1 — Implementation Report (Shadow Mode)

**Date :** 2026-09-11  
**Statut :** SHADOW ONLY — non commité  
**Versions :** `resolverVersion=1` · `rulesetVersion=2026-09-v1`

Décisions méthodologiques appliquées depuis `docs/FACTOR_RESOLVER_V1_AUDIT.md` + validation utilisateur.

---

## 1. Architecture implémentée

```text
POST /v1/factors/resolve (mode=shadow only)
  → resolveFactor()
       → retrieveCandidates (SQL ≤50, catalog approved+visible)
       → applyHardFilters (geo/unit/lifecycle/energy/gwp/physical-monetary)
       → ambiguity checks (lifecycle / energy / geography)
       → rankCandidates (déterministe)
       → explanation + provenance object (pas d'écriture DB)
```

Shadow : `resolver_status=disabled` **n’exclut pas** ADEME/UK.  
Production path (code) : exige `resolver_status=enabled` + `calculation_status=enabled` — **non exposé** par l’API V1.

Organization factors : **hors scope** (`organizationOverride: null` réservé).

---

## 2. Fichiers créés / modifiés (Resolver uniquement)

**Créés**

- `apps/api/src/services/factorResolver/types.ts`
- `apps/api/src/services/factorResolver/unitCompatibility.ts`
- `apps/api/src/services/factorResolver/geographyPolicy.ts`
- `apps/api/src/services/factorResolver/lifecyclePolicy.ts`
- `apps/api/src/services/factorResolver/energyBasisPolicy.ts`
- `apps/api/src/services/factorResolver/gwpPolicy.ts`
- `apps/api/src/services/factorResolver/sourcePolicy.ts`
- `apps/api/src/services/factorResolver/candidateRepository.ts`
- `apps/api/src/services/factorResolver/eligibility.ts`
- `apps/api/src/services/factorResolver/ranker.ts`
- `apps/api/src/services/factorResolver/resolveFactor.ts`
- `apps/api/src/services/factorResolver/index.ts`
- `apps/api/src/tests/factor-resolver-unit.test.ts`
- `apps/api/src/tests/factor-resolver-live.test.ts`
- `apps/api/src/tests/factor-resolver-http.test.ts`
- `docs/FACTOR_RESOLVER_V1_IMPLEMENTATION.md` (ce fichier)
- `docs/FACTOR_RESOLVER_V1_AUDIT.md` (phase 1, déjà présent)

**Modifiés**

- `apps/api/src/routes/factors.ts` — endpoint resolve
- `apps/api/src/schemas/factors.ts` — `factorResolveBodySchema`

Aucun autre WIP touché volontairement.

---

## 3. Input contract

`activity` + `unit` requis. Optionnels : quantity, country, region, reportingYear, taxonomy, lifecycleBoundary, energyBasis, gwpBasis, preferredSource, methodology, factorTypeHint.  
API : `mode` littéral `"shadow"` uniquement.

---

## 4. Output contract

`status` ∈ RESOLVED | AMBIGUOUS | NO_MATCH | REQUIRES_CONTEXT | REVIEW_REQUIRED  
+ `selectedFactor?`, `reasons[]`, `warnings[]`, `unitConversion?`, `candidateSummary`, versions, `provenance` (futur ledger), `latencyMs`.

---

## 5–13. Policies (résumé)

| Domaine | Comportement V1 |
|---------|-----------------|
| Hard filters | approved/visible ; kind ; physical≠monetary ; unit ; geo ; lifecycle/energy/gwp explicites ; review non auto |
| Ranking | geo → unit → taxonomy → source policy → year → text → tie `source_key, dataset_version, stable_factor_id, id` |
| Geography | exact ; ADEME NULL+FR = `FR_IMPLIED_BY_SOURCE_POLICY` ; ADEME NULL+TN = reject ; UK GB ↛ FR/TN |
| Units | exact + safe mass/distance/energy SI ; t.km↔tonne.km ; **interdit** m3↔kWh, L↔kg, pkm↔km |
| Lifecycle | NULL=unknown≠direct ; multi-boundary sans input → REQUIRES_CONTEXT ; jamais WTW implicite |
| Energy | Gross≠Net ; les deux présents sans input → REQUIRES_CONTEXT |
| GWP | AR4/5/6 OK ; mixed/unknown/NULL warnings ; demande explicite non prouvable → reject |
| review_required | pas de RESOLVED auto → REVIEW_REQUIRED |
| Source | TN→internal, FR→ademe, GB→uk **après** compat méthodologique |

---

## 14–16. Déterminisme / endpoint / auth

- Même input → même `status` + même `selectedFactor.id` (test AF).  
- `POST /v1/factors/resolve` + `requireOrgMember`.  
- Unauthenticated → 401/403.  
- Aucune lecture `organization_emission_factors`.

---

## 17–18. Test matrix (DB réelle 10024)

| Case | Status observé | Notes |
|------|----------------|-------|
| A TN electricity | **RESOLVED** internal `electricity_kwh` | |
| B FR electricity | **AMBIGUOUS** | multiples mixes ADEME — correct |
| C GB electricity | **REQUIRES_CONTEXT** | lifecycle multi |
| C2 GB + direct | **REQUIRES_CONTEXT** | gross/net coal electricity aussi présents |
| D FR gas | **AMBIGUOUS** | |
| E GB gas | **REQUIRES_CONTEXT** | energy basis |
| M/N gross/net | **AMBIGUOUS** | variantes mineral blend vs standard |
| F diesel L FR | **RESOLVED** ADEME physical | |
| G diesel kg | **AMBIGUOUS** | |
| H diesel monetary | **NO_MATCH** | peu/pas de FE monétaire “diesel” |
| I/J flight/freight | **AMBIGUOUS** | |
| K diesel wtt | **AMBIGUOUS** | |
| P review | **REVIEW_REQUIRED** | |
| T no country | **REQUIRES_CONTEXT** | |
| V TN ≠ ADEME null | **RESOLVED** internal | |
| X nomatch | **NO_MATCH** | |
| AF determinism | pass | |
| Unit policy unit tests | 11/11 pass | |
| HTTP auth+calc non-reg | pass | |

---

## 19–20. Candidates / latency

- `retrieved` plafonné à **50**.  
- Latences observées typiques **~90–250 ms** / requête (local), matrice complète ~3.2 s.

---

## 21–23. Non-régression

| Check | Résultat |
|-------|----------|
| Registry | 10024 |
| Visible | 10024 |
| ADEME calc/resolver | disabled/disabled |
| UK calc/resolver | disabled/disabled |
| Core TN | calc enabled / resolver disabled |
| `/v1/factors` | 8 |
| `/v1/calculate` UK | toujours 400 unavailable |
| Ledger après shadow | inchangé |

---

## 24. Limitations

1. Ambiguïtés fréquentes ADEME (années / variantes) — **voulu**, pas de choix silencieux.  
2. Synonymes FR/EN retrieval limités (liste courte).  
3. Fuzzy faible → NO_MATCH (seuil texte).  
4. Org factors non intégrés.  
5. Semantics ADEME NULL → warnings lifecycle/GWP/energy.  
6. Mode production non exposé API.  
7. Pas de migration / pas d’activation.

---

## 25. Décisions restantes (non bloquantes shadow)

1. Faut-il un désambiguïsateur “mix moyen + année reporting” pour électricité FR ?  
2. Affinage retrieval UK electricity (exclure coal-generation quand activité = grid electricity) ?  
3. Table `factor_resolution_events` pour analytics shadow ?  
4. Quand activer calculation+resolver ADEME/UK derrière feature flag ?

---

## VERDICT

| | | |
|--|--|--|
| A | Resolver V1 implémenté ? | **YES** |
| B | Shadow only garanti ? | **YES** |
| C | ADEME calculation disabled ? | **YES** |
| D | UK calculation disabled ? | **YES** |
| E | ADEME resolver DB disabled ? | **YES** |
| F | UK resolver DB disabled ? | **YES** |
| G | Hard filters OK ? | **YES** |
| H | Safe unit conversions OK ? | **YES** |
| I | Semantic conversions interdites ? | **YES** |
| J | Geography policy OK ? | **YES** |
| K | Lifecycle ambiguity détectée ? | **YES** |
| L | Energy ambiguity détectée ? | **YES** |
| M | review_required non auto-résolu ? | **YES** |
| N | GWP warnings OK ? | **YES** |
| O | Ranking déterministe ? | **YES** |
| P | Same input → same result ? | **YES** |
| Q | Auth correcte ? | **YES** |
| R | Aucun ledger écrit ? | **YES** |
| S | Registry 10024 ? | **YES** |
| T | Visible 10024 ? | **YES** |
| U | /v1/factors = 8 ? | **YES** |
| V | /v1/calculate non régressé ? | **YES** |
| W | Migrations non affectées ? | **YES** |
| X | Prêt à valider le shadow Resolver ? | **YES** |

---

*Aucun commit / push / deploy.*

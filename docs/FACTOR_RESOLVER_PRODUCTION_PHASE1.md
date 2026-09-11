# Factor Resolver V1 — Production Integration Phase 1 (local report)

**Date :** 2026-09-11  
**Statut :** implémenté localement — **non commité**  
**Activation ADEME/UK :** aucune (DB leftover restored to disabled/disabled)

---

## 1. Fichiers créés / modifiés

**Créés**
- `apps/api/src/services/factorResolver/featureFlags.ts`
- `apps/api/src/services/factorResolver/safeSubsets.ts`
- `apps/api/src/services/factorResolver/resolveAndCalculate.ts`
- `apps/api/src/tests/factor-resolver-production-phase1.test.ts`

**Modifiés**
- `apps/api/src/routes/calculate.ts` — durcissement source `internal` only
- `apps/api/src/routes/factors.ts` — `POST /v1/factors/resolve-and-calculate`
- `apps/api/src/schemas/factors.ts` — body schema strict
- `apps/api/src/schemas/index.ts` — calculate schema `.strict()`
- `apps/api/src/services/factorResolver/index.ts` — exports
- `.env.example` — `FACTOR_RESOLVER_CALCULATION_ENABLED=false`

---

## 2–9. Synthèse technique

| Item | Détail |
|------|--------|
| Endpoint | `POST /v1/factors/resolve-and-calculate` (auth org) |
| Feature flag | `FACTOR_RESOLVER_CALCULATION_ENABLED` default **OFF** |
| Durcissement calculate | `source_key === 'internal'` obligatoire après reload ; ADEME/UK refusés même si calc enabled |
| Authoritative reload | SQL exige approved + calculation_status + resolver_status enabled |
| Unit conversion | serveur only (`exact`/`safe`) ; sémantique refusée |
| Engine | `calculateCarbonBalance` inchangé |
| Ledger | `provenance` + `unit_conversion` JSONB (pas de migration) |
| Atomicité | `withOrgClient` = 1 transaction run+ledger+audit ; engine sync avant write |

---

## 10–15. Tests & comportements

- Phase1 suite : **9/9 pass**
- Governance tests existants : OK
- Shadow HTTP : OK
- Core TN direct `/v1/calculate` : OK
- ADEME/UK UUID `/v1/calculate` : refused (y compris après enable calc temporaire ADEME)
- Flag OFF → 403, pas de ledger
- Flag ON + resolver DB disabled → FACTOR_NOT_RESOLVED, pas de ledger
- E2E TN electricity (enable resolver **temporaire** puis restore) : 1000 kWh × 0.523 = 523 ; provenance complète
- Subsets formalisés : Core 8 / ADEME 2570 / UK 1260
- Registry 10024, visible 10024, ADEME/UK disabled/disabled, `/v1/factors`=8

---

## 16. Limitations

- Production resolve nécessite `resolver_status=enabled` (Core TN encore disabled en DB permanente)
- ADEME/UK non activés ; ambiguïtés restent bloquantes
- Legacy `BilanCarboneCalculator` non touché

---

## 17. Prochaine étape exacte

**Activation contrôlée Core TN uniquement :**

1. Commit Phase 1 (sur demande)  
2. Feature flag ON en environnement de test  
3. `resolver_status=enabled` sur version `internal` seulement (pas ADEME/UK)  
4. E2E stables sans enable temporaire  
5. Puis seulement subsets ADEME/UK derrière le même anti-bypass

---

## VERDICT

| | | |
|--|--|--|
| A | resolve-and-calculate implémenté ? | **YES** |
| B | feature flag default OFF ? | **YES** |
| C | shadow toujours fonctionnel ? | **YES** |
| D | /v1/calculate durci ? | **YES** |
| E | bypass ADEME impossible ? | **YES** |
| F | bypass UK impossible ? | **YES** |
| G | client factorValue non fiable ? | **YES** |
| H | client conversion non fiable ? | **YES** |
| I | authoritative DB factor garanti ? | **YES** |
| J | non-RESOLVED => aucun calcul ? | **YES** |
| K | ledger provenance complète ? | **YES** |
| L | atomicité garantie ? | **YES** |
| M | Core TN non régressé ? | **YES** |
| N | ADEME disabled/disabled ? | **YES** |
| O | UK disabled/disabled ? | **YES** |
| P | registry = 10024 ? | **YES** |
| Q | visible = 10024 ? | **YES** |
| R | aucune migration ? | **YES** |
| S | tests sécurité pass ? | **YES** |
| T | prêt pour activation contrôlée ? | **YES** (Core TN next — pas ADEME/UK) |

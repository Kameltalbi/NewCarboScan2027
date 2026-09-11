# Factor Resolver V1 — Audit & Design (Phase 1)

**Date :** 2026-09-11  
**Statut :** AUDIT + DESIGN UNIQUEMENT — aucun code Resolver, aucune migration, aucun commit.  
**Registry de référence :** 10024 facteurs (Core TN 8 + ADEME 7394 + UK 2622).

Commits de contexte :
- `2bcf8e8` — 021 canonical semantics  
- `8809d7a` — UK import draft  
- `2608f76` — UK bootstrap reproductible  
- `3eb6a2c` — 023 UK catalog activation  

---

## A. Architecture actuelle réelle

### Deux stacks de calcul coexistent

| Stack | Chemin | Production ? | Ledger ? |
|-------|--------|--------------|----------|
| **Canonique** | UI Proof → `POST /v1/calculate` → `carbon-engine` → `calculation_ledger` | **Oui** (`/preuve`, free-bilan API sans ledger) | Oui (sauf free-bilan) |
| **Legacy UI** | Collect/Bilan/Dashboard → `BilanCarboneCalculator` → FE hardcodés / `/v1/factors` (8) | **Oui** (écrans org quotidiens) | **Non** |
| **Morts** | `ActivityDataService.calculateEmissions` (=0), org FE via supabase Proxy, edge Deno | Non | — |

```text
CANONIQUE (certifiable)
  CoreProofWorkspace / api.calculate
    → apps/api/src/routes/calculate.ts
      → charge FE si approved + version approved + calculation_status=enabled
      → packages/carbon-engine calculateCarbonBalance(..., "ghg-corporate-1.0.0")
      → INSERT calculation_runs + calculation_ledger (+ provenance JSON)
      → PAS de conversion d'unité ; PAS de resolver_status ; PAS d'auto-sélection

LEGACY (affichage org)
  BilanCarboneCalculator.calculate
    → ActivityDataService.list
    → hierarchy: org FE (VIDE) → getDefaultFactor (~100 clés hardcodées)
                    → GET /v1/factors (8 Core TN only)
    → hacks d'unités ad hoc (huiles L→kg, pneus, déchets t→kg)
    → PAS carbon-engine, PAS ledger
```

**Fichiers clés**

| Rôle | Fichier |
|------|---------|
| API calcul | `apps/api/src/routes/calculate.ts` |
| Engine | `packages/carbon-engine/src/calculateEmission.ts`, `calculateCarbonBalance.ts` |
| Legacy | `apps/web/src/lib/calculators/BilanCarboneCalculator.ts` |
| Activity CRUD | `apps/web/src/lib/activity-data/ActivityDataService.ts` |
| Catalogue | `apps/api/src/services/factorSearch.ts`, `routes/factors.ts` |
| Inventaire | `docs/ENGINE_INVENTORY.md` |

### Gouvernance aujourd’hui

| Source | status | catalog | calculation | resolver |
|--------|--------|---------|-------------|----------|
| Core TN (`internal`) | approved | visible | **enabled** | disabled |
| ADEME 23.9 | approved | visible | disabled | disabled |
| UK 2026-flat-1.2 | approved | visible | disabled | disabled |

- Catalogue searchable = 10024 (visibilité).  
- Calculables via `/v1/calculate` = **8** uniquement.  
- `resolver_status` existe (019A/019C) mais **aucun code ne s’en sert** pour sélectionner un FE.

### Methodology

- Request `method` (`ghg_protocol` / `bilan_carbone` / …) → stocké sur `calculation_runs`, **ignoré pour la formule**.  
- Engine force `"ghg-corporate-1.0.0"`.  
- `GwpFramework` AR5/AR6 : type exporté, **non appliqué** au produit qty×FE.

---

## B. Problèmes actuels (bloquants pour un Resolver sûr)

1. **Double vérité** : totaux UI legacy ≠ chemin ledger/proof.  
2. **Sélection = UUID client ou hardcode** : pas de règles méthodologiques.  
3. **ADEME/UK visibles mais non calculables** : Resolver sans enable calculation serait inutile pour le ledger.  
4. **Semantics 021 vides** sur ADEME + Core TN (NULL lifecycle / energy / gwp / kind).  
5. **Géo ADEME** : 4606/7394 sans `country_code` (souvent implicite FR / mix).  
6. **Année** : quasi absente (UK 0/2622, ADEME 7132/7394 NULL).  
7. **Org factors** : 18 lignes legacy import, **hors registry**, non branchées au calcul.  
8. **Unités** : engine ne convertit pas ; `unit_conversions` = 6 lignes génériques ; frontend `UnitConversionService` invente m³↔kWh gaz (10.5) — **non sûr pour Resolver**.  
9. **Search ≠ Resolve** : ranking FTS/trigram ne doit pas devenir le Resolver.  
10. **`calculateEmissions` = 0** si `activity.emission_factor_id` est renseigné (piège).

---

## C. Données disponibles (stats réelles)

### Nulls / couverture par source

| Champ | Core TN (8) | ADEME (7394) | UK (2622) |
|-------|-------------|--------------|-----------|
| `country_code` NULL | 0 | **4606** | 60 |
| `region` NULL | 8 | 5397 (1997 renseignés, 23 régions FR) | **2622** |
| `unit_denominator` NULL | 0 | 0 | 0 |
| `factor_type` NULL | 0 | 0 | 0 |
| `factor_kind` NULL | **8** | **7394** | 0 (tous `activity_emission_factor`) |
| `lifecycle_boundary` NULL | **8** | **7394** | 0 |
| `energy_basis` NULL | **8** | **7394** | 2498 (62 gross + 62 net) |
| `gwp_basis` NULL | **8** | **7394** | 0 (AR5 2055 / AR4 169 / unknown 359 / mixed 39) |
| `factor_year` NULL | **8** | **7132** | **2622** |
| `internal_category` NULL | 0 | 0 | 0 |
| `review_required` | 0 | 1 | **363** |

### `factor_type`

| Source | physical | monetary | gwp | other |
|--------|----------|----------|-----|-------|
| ADEME | 6842 | **285** | 266 | 1 unknown |
| Core TN | 7 | **1** (TND) | 0 | 0 |
| UK | 2622 | 0 | 0 | 0 |

### UK lifecycle

direct 1686 · wtt 656 · waste_treatment 139 · material_use 71 · td 70

### Unités denominator (top)

- ADEME : kg, kWh, t, **kEUR**, unit, ha.an, t.km, passenger.km, …  
- UK : km, **mile**, kg, t, tonne.km, kWh, passenger.km, L, room_night, …  
- Core : L, kWh, kg, m3, TND  

### Org factors

- **18** lignes, **1** org (`f6be0e09-…`), `legacy_source=carboscan_supabase`  
- `factor_id` → `emission_factors_legacy` (souvent NULL) ; payload dans `raw_legacy`  
- **Non utilisables** tels quels par un Resolver registry-aware  

### Ledger / conversions

- `calculation_ledger` : 15 lignes (fixtures)  
- `unit_conversions` : 6 (L↔kg fuels densités, g↔kg, kg↔t, m3↔L)  
- Colonne ledger `unit_conversion` JSONB : **jamais écrite** par `/v1/calculate`

---

## D. Hard filters (proposition V1)

Un candidat **doit** passer **tous** ces filtres, sinon exclusion (pas de score de consolation).

| # | Filtre | Règle |
|---|--------|-------|
| H1 | Factor approved | `f.status = 'approved'` |
| H2 | Version approved | `v.status = 'approved'` |
| H3 | Resolver enabled | `v.resolver_status = 'enabled'` *(shadow : optionnellement bypass en mode shadow)* |
| H4 | Calculation enabled | `v.calculation_status = 'enabled'` pour résolution **utilisable en calcul** ; shadow peut résoudre sans enable |
| H5 | Kind / type | `factor_type` compatible activité (voir K) ; si `factor_kind` non NULL → `activity_emission_factor` (exclure gwp/components) |
| H6 | Unité | exact **ou** conversion **safe** documentée (voir F) — sinon OUT |
| H7 | Lifecycle | exact si demandé ; **pas** de fusion implicite direct+WTT→WTW (voir H) |
| H8 | Energy basis | exact si demandé ; **pas** d’échange Gross/Net (voir I) |
| H9 | Geography | politique explicite (voir G) — **pas** de fallback UK→FR |
| H10 | review_required | **OUT** de la sélection auto (voir L) |
| H11 | Org isolation | custom factors uniquement si `organizationId` match |
| H12 | Numerator | `unit_numerator` compatible kg CO2e (ou équivalent documenté) |

**Interdit en hard-filter soft** : similarité texte seule, rank FTS, “meilleur score magique”.

---

## E. Ranking (après hard filters uniquement)

Ordre lexicographique **déterministe** (pas de score flottant opaque) :

1. **Source policy match** (pays → source préférée)  
2. **Geography specificity** (exact country > GLOBAL/NULL autorisé > region si fournie)  
3. **Taxonomy** (`internal_category` / subcategory exact)  
4. **Year proximity** si `reportingYear` + `factor_year` connus ; sinon neutre  
5. **Text relevance** (stable_factor_id exact > external_code > name prefix > FTS) — **dernier**  
6. **Tie-breakers stables** : `stable_factor_id` ASC, puis `id` ASC  

Si top-2 ex æquo sur (1–4) → **AMBIGUOUS**, pas de choix silencieux.

---

## F. Unités

### Classes

| Classe | Exemples | Comportement Resolver |
|--------|----------|------------------------|
| **Exact** | kWh↔kWh, L↔L | OK |
| **Safe dimensional** | kg↔t (×0.001), g↔kg, MWh↔kWh, m↔km | OK si table versionnée ; enregistrer conversion |
| **Contextual** | m3 gaz↔kWh, Gross↔Net, L fuel↔kg, passenger.km↔km, mile↔km* | **REQUIRES_CONTEXT** ou facteur déjà dans la bonne unité — **jamais inventé** |
| **Incompatible** | L diesel vs kEUR ; km vs kWh ; physical vs monetary | OUT |

\* mile↔km est dimensionnel sûr **si** l’activité est clairement une distance ; à activer explicitement dans le ruleset (UK en miles).

### État actuel à ne pas réutiliser tel quel

- `UnitConversionService` (web) : m³→kWh = 10.5 “PCI moyen” — **conversion sémantique non traçable**.  
- Legacy calculator densités huiles/pneus — ad hoc.  
- DB `unit_conversions` trop pauvre pour V1 complet.

### Proposition

- V1 : **exact + safe mass/energy SI prefixes** uniquement.  
- Contextual : l’appelant doit fournir l’unité déjà alignée **ou** un `conversionHint` explicite approuvé (hors scope auto).  
- Persister dans `calculation_ledger.unit_conversion` (colonne déjà prévue).

---

## G. Géographie

### Hiérarchie proposée

```text
1. Exact country_code match
2. Region match (si input.region ET factor.region) — ADEME FR seulement utile
3. Explicit GLOBAL / World (country_code='GLOBAL' ADEME)
4. NULL country uniquement si SourcePolicy autorise "source-default-geo"
     (ex. ADEME sans code ≈ FR pour énergie France — DÉCISION REQUISE)
5. Sinon NO_MATCH / REQUIRES_CONTEXT
```

### Fallbacks **interdits**

- UK (`GB`) → activité `FR` ou `TN`  
- ADEME → activité `GB` sans règle UK  
- “n’importe quel pays” parce qu’aucun candidat local  

### Tunisie

- Core TN (`TN`) = source préférée pour électricité / gaz / flotte TN.  
- ADEME/UK **ne doivent pas** combler silencieusement un manque TN.

### NULL country ADEME (4606)

Risque majeur d’ambiguïté. Options (accord requis) :
- Traiter NULL ADEME énergie comme **FR-implied** avec warning  
- Exiger `preferredSource=ademe` + warning  
- Exclure NULL sauf match texte très fort + confirmation humaine  

---

## H. Lifecycle

Valeurs 021 : `direct | wtt | td | wtw | cradle_to_gate | material_use | waste_treatment | outside_of_scopes | other | unknown`

| Input | Candidat | Résultat |
|-------|----------|----------|
| direct | direct | OK |
| wtt | wtt | OK |
| direct | wtt / td / wtw | **INCOMPATIBLE** |
| (absent) | UK multi-boundary | **REQUIRES_CONTEXT** ou défaut methodology (ex. GHG Protocol scope1 → direct) — **accord requis** |
| wtw demandé | wtw publié seul | OK ; **jamais** somme direct+wtt auto |

ADEME/Core : lifecycle NULL → traiter comme **unknown** : compatible seulement si input n’exige pas de boundary, avec warning “boundary unset”.

---

## I. Energy basis

| Input | Candidat | |
|-------|----------|--|
| gross_cv | gross_cv | OK |
| net_cv | net_cv | OK |
| gross | net | **INCOMPATIBLE** (pas de conversion auto) |
| absent | UK avec Gross+Net | **REQUIRES_CONTEXT** ou préférence methodology (souvent Net CV UK) — **accord requis** |
| absent | NULL (ADEME) | OK avec warning |

---

## J. GWP

| Mode V1 recommandé | |
|--------------------|--|
| Filtrer si `preferredGwp` fourni | exact match |
| Sinon | **informer** (warning si unknown/mixed/AR4) — **ne pas** pénaliser AR5 vs AR6 “parce que plus récent” |
| `unknown` / `mixed` UK | éligible catalogue ; sélection auto **déconseillée** si alternatives AR5 claires |

Ne pas supposer AR6 > AR5.

---

## K. Physical vs monetary

| Activité | Autorisé | Interdit |
|----------|----------|----------|
| qty physique (L, kWh, kg, km…) | `factor_type=physical` (+ activity_emission_factor) | monetary, gwp, lca characterization |
| qty monétaire (EUR, TND, kEUR) | monetary | physical kg/L/kWh |
| GWP factors ADEME | seulement si activité = “caractérisation GWP” explicite | usage activité énergie |

Hard filter H5.

---

## L. review_required

| Surface | Comportement proposé |
|---------|----------------------|
| Catalogue | **visible** (déjà le cas) |
| Resolver auto | **NO** — résultat `REVIEW_REQUIRED` si seuls candidats review_required |
| Admin / sélection humaine | YES avec flag `allowReviewRequired=true` |

Conséquence : 363 UK + 1 ADEME exclus de l’auto-pick.

---

## M. Custom / org factors

### État

- Table active = coquille import legacy → **pas** FK registry.  
- Calcul : non supporté (`calculateSchema` / commentaire API).  
- UI : morte (supabase Proxy).

### Intégration Resolver (après schéma)

| Mode | Priorité | Garde-fou |
|------|----------|-----------|
| `organization_override` explicite (pinned factor_id registry) | Avant ranking public | Org match + approved + unit compatible |
| `supplier_specific` | Préféré si activity tag supplier | Ne pas écraser sans flag |
| Import legacy brut | **Hors V1** jusqu’à migration vers registry | |

**Ne pas** assumer “custom always wins”.

---

## N. Input contract (minimal réel)

Aligné sur `activity_data` + `/v1/calculate` actuel, pas sur un modèle théorique.

```text
ResolveFactorInput {
  // REQUIRED
  activityText: string          // ou activityType / subcategory_key métier
  quantity: DecimalString
  unit: string                  // unité d'activité déjà connue
  organizationId: uuid          // isolation tenant

  // OPTIONAL (fortement recommandés)
  countryCode?: string          // ISO
  region?: string
  reportingYear?: number
  internalCategory?: string
  internalSubcategory?: string
  lifecycleBoundary?: enum021
  energyBasis?: 'gross_cv'|'net_cv'
  factorTypeHint?: 'physical'|'monetary'
  preferredSource?: 'internal'|'ademe'|'uk_gov_ghg'
  methodology?: string          // stocké / policy pack, pas math engine V1
  allowReviewRequired?: boolean
  mode?: 'resolve'|'shadow'     // shadow = pas d'écriture ledger

  // DERIVED (serveur)
  unitNormalized
  sourcePolicyFromGeo
  rulesetVersion
}
```

**Minimal absolu** pour tenter une résolution : `activityText|taxonomy` + `unit` + `organizationId`.  
Sans `countryCode` → souvent `REQUIRES_CONTEXT` (sauf Core TN si org TN connue — dérivation possible).

---

## O. Output contract

```text
ResolveFactorResult {
  status: 'RESOLVED' | 'AMBIGUOUS' | 'NO_MATCH' | 'REQUIRES_CONTEXT' | 'REVIEW_REQUIRED'
  selected?: {
    factorId, stableFactorId, externalCode,
    sourceKey, datasetVersion, checksum,
    value, unitNumerator, unitDenominator,
    countryCode, lifecycleBoundary, energyBasis, gwpBasis, factorType
  }
  conversion?: { from, to, factor, class: 'exact'|'safe', rulesetRef }
  confidence: 'high'|'medium'|'low'   // dérivé du status + warnings, pas score magique
  reasons: string[]                   // codes stables machine + label
  warnings: string[]
  rejected: Array<{ factorId, stableFactorId, reasonCode }>  // top N
  candidatesConsidered: number
  resolverVersion: string
  rulesetVersion: string
}
```

Compatible avec provenance ledger actuelle (`stableFactorId`, `sourceKey`, `datasetVersion`).

---

## P. Explainability

- `reasons[]` / `rejected[]` avec **codes** (`GEO_MISMATCH`, `UNIT_INCOMPATIBLE`, `LIFECYCLE_MISMATCH`, `SOURCE_POLICY`, `REVIEW_REQUIRED`, …).  
- Pas de prose LLM.  
- UI Proof peut afficher reasons ; ledger stocke subset JSON.

---

## Q. Déterminisme

Sources de non-déterminisme actuelles / à éliminer :

| Source | Mitigation |
|--------|------------|
| FTS rank / trigram | Seulement après hard filters ; tie-break id |
| `ORDER BY` non total | Toujours `stable_factor_id, id` |
| Timestamps `approved_at` | Ne pas ranker dessus |
| Fuzzy legacy calculator | Hors Resolver |
| Equal scores | AMBIGUOUS |

Garantie : même registry snapshot + même ruleset + même input → même résultat.

---

## R. Ledger / audit

Étendre **provenance** (sans migration bloquante si JSONB suffit) :

```json
{
  "source": "api/v1/resolve+calculate",
  "resolverVersion": "1.0.0",
  "rulesetVersion": "2026.09.1",
  "status": "RESOLVED",
  "reasons": ["SOURCE_POLICY_TN", "UNIT_EXACT", "GEO_EXACT"],
  "warnings": [],
  "stableFactorId": "...",
  "conversion": null,
  "shadow": false
}
```

Colonnes déjà prêtes : `factor_id`, `factor_version_id`, `factor_checksum`, `unit_conversion`, `methodology_version`.  
Table dédiée `factor_resolution_events` : **optionnelle** (shadow mode / analytics) — pas obligatoire V1 si provenance ledger suffit.

---

## S. Test matrix (avant implémentation)

| # | Input | Candidats attendus | Résultat attendu |
|---|-------|--------------------|------------------|
| T1 | TN electricity kWh | Core `electricity_kwh` 0.523 | RESOLVED internal |
| T2 | FR electricity kWh mix | ADEME mixes (années) | AMBIGUOUS ou RESOLVED+year ; **pas** UK |
| T3 | GB electricity kWh | UK direct 0.13096 (+ wtt/td séparés) | RESOLVED direct si boundary=direct ; sinon REQUIRES_CONTEXT |
| T4 | FR natural gas kWh | ADEME gaz kWh | RESOLVED/AMBIGUOUS ADEME ; pas UK |
| T5 | GB natural gas 42k kWh | UK Gross vs Net vs m3 | REQUIRES_CONTEXT sans energyBasis |
| T6 | Diesel 100 L | ADEME B7 3.10 L ; UK mineral/avg ; Core fleet_diesel | geo+source policy ; physical only |
| T7 | Diesel 100 kg | UK kg / ADEME t | unit path ; pas L |
| T8 | Diesel 10000 EUR | ADEME monetary only | monetary ; pas L |
| T9 | Flight pkm | ADEME/UK passenger.km | unit exact ; geo |
| T10 | Freight tkm | ADEME t.km / UK tonne.km | alias safe? **décision** t.km↔tonne.km |
| T11 | WTT demandé | UK wtt only | pas de direct |
| T12 | Gross CV | UK gross only | pas net |
| T13 | review_required only hits | — | REVIEW_REQUIRED |
| T14 | country unknown | — | REQUIRES_CONTEXT |
| T15 | GWP unknown UK only | — | warning ou REVIEW selon policy |
| T16 | q="diesel" sans unit | — | REQUIRES_CONTEXT |
| T17 | nonsense | — | NO_MATCH |
| T18 | org custom pin | — | RESOLVED org si schema prêt ; sinon skip V1 |

---

## T. Architecture V1 (adaptée au repo)

Éviter micro-services inutiles. Package API clair :

```text
apps/api/src/services/factorResolver/
  resolveFactor.ts          // orchestration
  retrieveCandidates.ts     // SQL prefilter (source/geo/unit/type/text)
  eligibility.ts            // hard filters
  unitCompatibility.ts
  geographyPolicy.ts
  lifecyclePolicy.ts
  energyBasisPolicy.ts
  sourcePolicy.ts
  ranker.ts                 // ordre lexicographique
  explain.ts
  types.ts
```

- **Pas** de Factor Resolver dans le frontend.  
- Endpoint proposé (plus tard) : `POST /v1/factors/resolve` puis optionnellement compose avec calculate.  
- carbon-engine reste **qty × value** ; Resolver fournit FE + conversion.

---

## U. Performance

```text
SQL prefilter (indexes existants + WHERE source/geo/unit/type/status)
  → ≤ 50–200 candidats typiques
  → hard filters en SQL autant que possible
  → rank en mémoire sur ≤ ~50
```

Objectifs : p95 &lt; 100–200 ms sur 10k FE ; design compatible 100k+ (pas de full scan 10024 scorés en JS).  
Ne pas réutiliser le path search “limit 20 fuzzy” comme unique retrieval.

---

## V. Activation strategy

```text
1. Shadow mode
   - resolver_status reste disabled
   - resolve() calcule en lecture ; log/compare vs facteur humain
   - 0 impact ledger production

2. Tests matrix + golden files

3. Enable calculation+resolver Core TN only (déjà calc enabled)
   - Resolver V1 “local” pour TN

4. ADEME limited enable
   - calculation_status=enabled + resolver_status=enabled
   - scope: energy+transport physical FR d'abord ?
   - feature flag org

5. UK limited enable
   - idem GB / lifecycle explicit required

6. Production default resolve+calculate
   - UI legacy progressivement débranchée
```

Contrainte DB : `resolver_status=enabled` ⇒ `calculation_status=enabled` (019C).

**Pas de big bang** ADEME+UK.

---

## W. Migrations / schema — nécessaires ou NON

| Besoin | V1 blocker ? | Note |
|--------|--------------|------|
| Nouvelle table resolver | **NON** | Service applicatif suffit |
| Ruleset version table | NON (constante code) | Optionnel plus tard |
| Backfill ADEME lifecycle/gwp/kind | **Souhaitable, pas blocker absolu** | Warnings “unset” |
| `country_code` ADEME NULL policy | **Décision**, pas forcément migration | |
| Org factors → FK registry | **Oui avant org override** | Migration dédiée plus tard |
| Unit compat table versionnée | **Oui pour safe conversions** | Peut commencer en code + tests |
| Alias `t.km` / `tonne.km` | Décision + petite table/code | |
| Colonnes ledger | **NON** | JSONB provenance + `unit_conversion` |

**Verdict schema :** Resolver V1 **peut démarrer sans migration** si on accepte warnings sur semantics NULL et pas d’org override.  
Migrations **recommandées avant enable ADEME/UK large** : backfill partiel semantics + unit alias + org registry link.

---

## X. Risques

1. Activer ADEME calculation sans Resolver → clients peuvent UUID-picker un mauvais FE.  
2. NULL country ADEME → faux positifs FR.  
3. Text ranking utilisé comme Resolver → erreurs méthodologiques.  
4. Conversion gaz m³/kWh héritée du frontend.  
5. Legacy UI continue d’afficher des totaux différents du ledger.  
6. review_required / GWP unknown sélectionnés par erreur.  
7. WTW implicite.  
8. Org leakage si custom mal scoppés.  
9. Ambiguïté électricité ADEME multi-années.  
10. Dette WIP repo (~96 chemins) — ne pas mélanger commits Resolver.

---

## Y. Plan d’implémentation par étapes (après accord)

1. Figer décisions bloquantes (§ Questions).  
2. Implémenter `factorResolver` + tests unitaires matrix (shadow, **sans** enable sources).  
3. `POST /v1/factors/resolve` lecture seule + golden tests SQL.  
4. Brancher provenance shadow logs.  
5. Migration UI Proof : resolve assisté (suggestion) avant calculate.  
6. Enable policies par source/geo derrière flags.  
7. Déprécier `getDefaultFactor` progressivement.  
8. Org factors registry (chantier séparé).  
9. Backfill semantics ADEME (chantier séparé).

---

## Analyse doublons / candidats (exemples)

### Électricité

| Geo | Candidats | Différences |
|-----|-----------|-------------|
| TN | Core `electricity_kwh` = 0.523 kgCO2e/kWh | Unique TN calculable aujourd’hui |
| FR | ADEME ~257 kWh “électricité*” (mixes 2008–…, usages) ; country souvent NULL | Année / usage / méthode ; **lifecycle NULL** |
| GB | UK `Electricity: UK` direct 0.13096 ; + WTT gen/T&D ; + TD | Boundaries séparées — **ne pas sommer** |

### Gaz naturel

| Source | Exemple | Différences |
|--------|---------|-------------|
| Core | `gas_m3` 2.056 / m3 TN | Unité m3 |
| ADEME | Gaz naturel kWh ~0.227–0.239 ; Nm3 2.52 ; GNC… | Unités / années / techno |
| UK | Natural gas kWh Gross 0.182 / Net 0.202 ; m3 ; t ; + WTT | **Gross vs Net** critique |

### Diesel / gazole

| Source | Exemple | Différences |
|--------|---------|-------------|
| Core | fleet_diesel 2.68 / L | TN |
| ADEME | Gazole B7 3.10 / L ; aussi GJ, t, km, pkm, t.km | Techno B7/B30 ; mode transport vs fuel |
| UK | Diesel mineral 2.66 / L ; average blend 2.58 ; + WTT ; biofuels | Blend / boundary / bio |

→ Même mot “diesel” : **fuel vs vehicle vs freight** = taxonomies différentes.

### Flight / freight

- ADEME : beaucoup de t.km “avion*” ; peu de passenger.km “avion”.  
- UK : passenger.km / tonne.km / miles — unités et geo GB.

---

## Classification champs (A/B/C/D)

| Champ | Classe | Commentaire |
|-------|--------|-------------|
| ids, stable_factor_id, value, units, statuses, catalog/calc/resolver | **A** | |
| source_key, dataset_version, factor_type, country_code, internal_* | **A** | geo uneven |
| lifecycle, energy_basis, gwp_basis, factor_kind | **B** | OK UK ; NULL ADEME/Core |
| selection_rule, technology, metadata | **B/C** | non exécutés |
| category/geography legacy vs normalized | **C** | |
| org_emission_factors actif | **C/D** | legacy |
| activity↔factor map, unit matrix, GHG category on factor | **D** | |

---

## Questions bloquantes (accord requis)

1. **NULL `country_code` ADEME** : FR-implied avec warning, ou exclusion, ou REQUIRES_CONTEXT ?  
2. **Lifecycle par défaut** si input omet boundary (surtout UK) : exiger explicit, ou default `direct` pour scope 1 énergie ?  
3. **Energy basis défaut UK** : exiger explicit, ou default `net_cv` (pratique UK) avec warning ?  
4. **Alias unités** `t.km` ↔ `tonne.km`, `L` ↔ `litre` : safe ou pas ?  
5. **mile ↔ km** : activer en V1 pour UK distance ?  
6. **Org custom** : hors V1 strict, ou chantier parallèle bloquant ?  
7. **Enable calculation ADEME/UK** : uniquement derrière Resolver+flag, ou allow UUID manuel dès enable ?  
8. **Shadow mode storage** : ledger-only provenance vs table `factor_resolution_events` ?  
9. **Legacy BilanCarboneCalculator** : gelé pendant Resolver, ou migration UI en parallèle dès shadow ?  
10. **GWP unknown/mixed** : hard-exclude auto ou warning-only ?

---

## Verdict

| # | Question | Réponse |
|---|----------|---------|
| 1 | Architecture actuelle suffisamment comprise ? | **YES** |
| 2 | Registry actuel suffisant pour Resolver V1 ? | **YES** (avec warnings semantics NULL ADEME/Core) |
| 3 | Schema change nécessaire avant Resolver ? | **NO** (pour shadow + Core TN) ; **YES plus tard** pour org overrides + backfill ADEME |
| 4 | Unit model suffisant ? | **NO** pour conversions contextuelles ; **YES** pour exact+safe limité |
| 5 | Geography model suffisant ? | **PARTIAL→NO** tant que politique NULL ADEME non tranchée ; colonnes OK |
| 6 | Lifecycle model suffisant ? | **YES** schéma ; **NO** données ADEME/Core (NULL) |
| 7 | GWP model suffisant ? | **YES** UK ; **NO** ADEME/Core peuplé |
| 8 | Organization factors intégrables ? | **NO** en l’état (legacy) ; **YES** après remodelage |
| 9 | Hard filters définissables sans ambiguïté ? | **YES** (sous réserve décisions § questions) |
| 10 | Ranking déterministe possible ? | **YES** |
| 11 | Ledger peut tracer la résolution ? | **YES** (JSONB + unit_conversion) |
| 12 | Shadow mode possible ? | **YES** |
| 13 | Prêt à implémenter Resolver V1 ? | **NO** — attendre réponses aux questions bloquantes ; ensuite **YES** pour shadow/Core |

**Synthèse :** l’architecture et le registry permettent un **Resolver V1 en shadow** (surtout Core TN + règles strictes). L’activation ADEME/UK et les conversions contextuelles **ne sont pas prêtes** sans décisions méthodologiques et sans garde-fous d’activation.

---

*Document local non commité — Phase 1 only.*

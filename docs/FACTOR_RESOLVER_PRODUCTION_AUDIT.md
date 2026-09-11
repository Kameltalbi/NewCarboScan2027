# Factor Resolver → Calcul réel — Audit & Plan (Phase production)

**Date :** 2026-09-11  
**Statut :** AUDIT + PLAN UNIQUEMENT — aucun code, aucune migration, aucun commit.  
**Base :** Shadow Resolver `92259110b73635bd1fbb0cf66b98d7043b10e778`

---

## 1. Architecture cible

```text
Activity input (auth org)
  → Factor Resolver (mode=production)
       hard filters + ranking + ambiguity gates
  → IF status ≠ RESOLVED → HTTP 422, aucun calcul
  → IF RESOLVED:
       factor chargé depuis DB (re-vérif gouvernance)
       quantité normalisée (safe conversion only)
  → carbon-engine.calculateCarbonBalance / calculateEmission
  → INSERT calculation_runs
  → INSERT calculation_ledger
       (+ provenance resolver + unit_conversion JSONB)
  → audit_events
```

### Comparaison chemins actuels

| Chemin | Rôle aujourd’hui | Rôle cible |
|--------|------------------|------------|
| `POST /v1/calculate` (`apps/api/src/routes/calculate.ts`) | Client fournit `factorId` ; gate `calculation_status=enabled` ; charge value DB ; engine ; ledger | **Durci** : plus de bypass ADEME/UK via UUID nu ; option pin contrôlé |
| `POST /v1/factors/resolve` | Shadow only, pas de calcul | Reste diagnostic / assisté |
| `BilanCarboneCalculator` | Legacy UI, FE hardcodés, pas ledger | **Gelé** pour chemins certifiables |
| `ActivityDataService.calculateEmissions` | Stub `return 0` | Ne pas brancher tel quel |
| `carbon-engine` | `qty × value × alloc` — pas de conversion | Inchangé : reçoit qty **déjà** normalisée |
| Ledger | provenance JSONB + `unit_conversion` JSONB (souvent null) | Remplir systématiquement |

### Fichiers / fonctions à modifier (plus tard — ne pas coder maintenant)

| Fichier | Changement prévu |
|---------|------------------|
| `apps/api/src/routes/calculate.ts` | Durcissement gates ; refus ADEME/UK UUID sans pin |
| Nouveau route p.ex. `apps/api/src/routes/resolveCalculate.ts` | Orchestration resolve→engine→ledger |
| `apps/api/src/schemas/index.ts` / `factors.ts` | Schémas input production |
| `apps/api/src/services/factorResolver/resolveFactor.ts` | Mode `production` (déjà prévu) + éventuellement allowlist subset |
| `apps/api/src/services/factorResolver/*` | Pas de calcul d’émissions |
| Frontend Proof / Collect (plus tard) | Appeler le nouvel endpoint ; **pas** dans cette phase |
| `packages/carbon-engine` | **Aucune** modification pour contourner gouvernance |

---

## 2. Responsabilité du Resolver

### Le Resolver FAIT

- Sélectionner un facteur canonique (ou refuser)
- Produire `reasons` / `warnings` / versions
- Proposer une **safe** unit conversion (multiplier)
- Exposer un objet `provenance` prêt ledger

### Le Resolver NE FAIT PAS

- Calculer kgCO₂e
- Modifier `factor.value`
- Écrire `calculation_runs` / `calculation_ledger`
- Inventer conversions sémantiques (m³↔kWh, L↔kg, Gross↔Net, etc.)

### Contrat transmis au Carbon Engine (après re-load DB)

| Champ | Source |
|-------|--------|
| `factorId` (UUID) | selectedFactor.id — **rechargé** serveur |
| `factorValue` | DB uniquement |
| `factorUnit` | DB `unit_numerator/unit_denominator` |
| `activityQuantity` | **normalizedQuantity** (si conversion safe) sinon quantité input |
| `activityUnit` | unité dénominateur facteur |
| `factor.versionId` | DB |
| (hors engine, pour ledger) | resolverVersion, rulesetVersion, reasons, warnings, checksum, conversion, original qty/unit |

Le client **ne peut pas** envoyer `factorValue` (déjà rejeté aujourd’hui).

---

## 3. Gouvernance nécessaire

### État actuel

| Source | calculation | resolver |
|--------|-------------|----------|
| Core TN | enabled | disabled |
| ADEME | disabled | disabled |
| UK | disabled | disabled |

### Problème critique

`calculation_status` / `resolver_status` sont au niveau **`emission_factor_versions`**, pas par facteur.

**Activer `calculation_status=enabled` sur ADEME** ouvrirait les **7394** UUID au chemin `/v1/calculate` actuel, **sans** passer par le Resolver — contournement méthodologique.

### Règle production recommandée

Pour un calcul **auto-résolu** :

```text
f.status = approved
AND v.status = approved
AND v.calculation_status = enabled
AND v.resolver_status = enabled
AND resolve status = RESOLVED
AND server-side re-fetch factor id == selected id
AND (source-specific allowlist / ruleset subset si applicable)
AND valid resolver provenance written to ledger
```

Pour un calcul **pin manuel** (`factorId` client) :

```text
UNIQUEMENT si :
  - source = internal (Core TN), OU
  - flag admin / explicit pin policy + audit
ET calculation_status = enabled
ET PAS de factorValue client
```

**Recommandation :** avant tout `calculation_status=enabled` ADEME/UK :

1. Durcir `/v1/calculate` pour **refuser** `factorId` ADEME/UK (sauf pin admin explicite).  
2. N’autoriser ADEME/UK calculables que via **resolve-and-calculate**.  
3. Appliquer le **safe subset** dans le Resolver production (ruleset), pas seulement la flag version.

Shadow continue d’ignorer `resolver_status` ; production l’exige (déjà dans le code path `mode=production`).

---

## 4. Endpoint recommandé — **UNE** solution

### Options

| | Option | Verdict |
|--|--------|---------|
| A | Faire évoluer `/v1/factors/resolve` | Non — mélange diagnostic et écriture ledger |
| B | `POST /v1/factors/resolve-and-calculate` | **Oui — recommandé** |
| C | Tout fusionner dans `/v1/calculate` | Possible mais risque de confusion de contrats |
| D | Autre | Inutile si B + durcissement C |

### Recommandation : **B**

**`POST /v1/factors/resolve-and-calculate`** (nom final à aligner sur conventions API)

- Input : activité + qty + unit + contexte (comme resolve) + `scope` / `lineKey` / période / method  
- Auth : `requireOrgMember`  
- Feature flag : si off → 503/403  
- Appelle Resolver `mode=production`  
- Si non-RESOLVED → **422** + payload resolve (pas de run)  
- Si RESOLVED → re-fetch factor → engine → ledger  
- **Pas** de champ `factorId` / `factorValue` / `factorUnit` client  
- **Pas** d’acceptation d’un `resolverResult` client falsifié  

En parallèle : **durcir** `POST /v1/calculate` existant (garder Proof manuel Core TN).

---

## 5. Safe unit conversion

```text
input: quantity=1000, unit=kg
factor denominator: t
Resolver: SAFE_CONVERSION multiplier=0.001
normalizedQuantity=1, unit=t
Engine: 1 × factor.value
```

**Où :** dans l’orchestrateur resolve-and-calculate (après Resolver), **avant** l’appel engine.  
**Pas** dans carbon-engine.

**Ledger :**

| Concept | Stockage |
|---------|----------|
| Quantité originale | `provenance.originalQuantity` + éventuellement garder aussi dans provenance (colonnes actuelles = qty **utilisée** pour le calcul) |
| Unité originale | `provenance.originalUnit` |
| Conversion | colonne `unit_conversion` JSONB (déjà en 011) |
| Quantité normalisée | `activity_quantity` / `activity_unit` = valeurs **passées à l’engine** |

Convention recommandée :  
- `activity_quantity` / `activity_unit` = **normalisées** (reproductibilité mathématique du produit)  
- original + multiplier dans `unit_conversion` + `provenance`

Aucune conversion sémantique.

---

## 6. Ledger / schema

### Colonnes actuelles (suffisantes)

`factor_id`, `factor_version_id`, `factor_checksum`, `activity_quantity`, `activity_unit`, `factor_value`, `factor_unit`, `formula`, `result_kgco2e`, `engine_version`, `methodology_version`, **`provenance` JSONB**, **`unit_conversion` JSONB**, `data_quality` JSONB.

### Contenu provenance Resolver (sans migration)

```json
{
  "source": "api/v1/factors/resolve-and-calculate",
  "factorResolvedFromDb": true,
  "clientOverride": false,
  "resolverVersion": "1",
  "rulesetVersion": "2026-09-v1",
  "stableFactorId": "...",
  "sourceKey": "...",
  "datasetVersion": "...",
  "resolutionStatus": "RESOLVED",
  "reasons": [],
  "warnings": [],
  "originalQuantity": "...",
  "originalUnit": "..."
}
```

`unit_conversion` :

```json
{
  "class": "safe",
  "fromUnit": "kg",
  "toUnit": "t",
  "multiplier": 0.001
}
```

### Migration nécessaire ?

**NO** pour démarrer la production Resolver→calcul (JSONB déjà là).

**Optionnelle plus tard :** colonnes dédiées / table `factor_resolution_events` pour analytics shadow — non bloquant.

---

## 7. Cas non-RESOLVED (production)

| Status | HTTP | Calcul | Comportement |
|--------|------|--------|--------------|
| AMBIGUOUS | 422 | Non | Retour resolve + candidats résumé |
| REQUIRES_CONTEXT | 422 | Non | Demander country / lifecycle / energyBasis / unit |
| REVIEW_REQUIRED | 422 | Non | Escalade humaine / admin pin |
| NO_MATCH | 404 ou 422 | Non | Pas de facteur |

Aucun de ces statuts n’écrit de run/ledger.

---

## 8. Activation progressive (recommandée)

Éviter big bang. Ordre **nécessaire** d’après données + tests shadow :

| Phase | Contenu | Prérequis |
|-------|---------|-----------|
| **P0** | Durcir `/v1/calculate` (bloquer bypass ADEME/UK) + feature flag | Aucune activation FE |
| **P1** | `resolve-and-calculate` + E2E **Core TN** (8) | `resolver_status=enabled` sur version **internal** seulement |
| **P2** | ADEME **safe subset** via ruleset (pas les 7394) | calc+resolver ADEME enabled **après** P0 |
| **P3** | UK **safe subset** (direct, GWP connu, non review) | idem UK + input lifecycle/energy quand requis |
| **P4** | Élargir subsets / backfill semantics ADEME | chantier data séparé |
| **P5** | Migrer UI Proof/Collect hors legacy | FE V1 “produit” |

Phases “ADEME général / UK général” **sans** backfill ni désambiguïsation = **non recommandées**.

---

## 9. ADEME — activable ?

### Réponse explicite : **B. seulement un subset sûr**

**Pas A** (7394) — trop d’ambiguïté (années, usages, geo NULL, semantics 021 vides).  
**Pas C** — un subset energy/transport physique FR-applicable est déjà gérable avec warnings.

### Critères SQL subset V1 (count réel local)

```sql
-- ADEME safe_combined_v1
factor_type = 'physical'
AND coalesce(metadata->>'normalization_status','') <> 'review_required'
AND (country_code IS NULL OR country_code IN ('FR','GLOBAL'))
AND (
  (internal_category = 'energy'
     AND unit_denominator IN ('kWh','L','kg','t','GJ','MJ','m3','Nm3'))
  OR
  (internal_category IN ('transport','freight')
     AND unit_denominator IN ('km','passenger.km','t.km','kg','t','L'))
)
```

| Slice | Count |
|-------|------:|
| ADEME total | 7394 |
| physical | 6842 |
| safe_energy_kwh | 2296 |
| safe_transport | 206 |
| **safe_combined_v1** | **2570** |

Même dans ce subset, beaucoup de cas resteront **AMBIGUOUS** (ex. électricité multi-années) → pas de calcul auto tant que l’input n’ajoute pas année / libellé plus précis. C’est acceptable.

---

## 10. UK — subset auto-résolvable

### Réponse : **B. subset sûr** — **pas** les 2622

Exclusions : 363 review_required, 359 GWP unknown, boundaries multiples sans input, Gross/Net sans `energyBasis`.

### Critères SQL subset V1

```sql
-- UK safe_uk_v1_direct
coalesce(metadata->>'normalization_status','') <> 'review_required'
AND factor_kind = 'activity_emission_factor'
AND gwp_basis IN ('AR4','AR5','AR6')
AND lifecycle_boundary = 'direct'   -- wtt/td seulement si input explicite
AND country_code = 'GB'
-- energy_basis NULL OK si pas d'ambiguïté Gross/Net dans le candidate set
```

| Slice | Count |
|-------|------:|
| UK total | 2622 |
| not review | 2259 |
| auto_base (GB, GWP known, lifecycle set) | 2168 |
| direct + null energy | 1198 |
| **safe_uk_v1_direct** (direct + GWP known + GB + not review) | **1260** |
| with energy_basis (gross/net) | 124 → exigent `energyBasis` |

Production UK : Resolver `mode=production` + allowlist ruleset + **exiger** `lifecycleBoundary` (et `energyBasis` si candidats Gross/Net).

---

## 11. Matrice E2E (avant production)

Pour chaque cas RESOLVED attendu :

Resolver → factor id → qty normalisée → engine → `result_kgco2e` attendu → ledger provenance complète.

| Cas | Attendu typique |
|-----|-----------------|
| TN electricity | RESOLVED Core → calcul |
| FR electricity | souvent AMBIGUOUS → 422 |
| GB electricity | REQUIRES_CONTEXT sans lifecycle ; RESOLVED+calcul avec direct (+ filtres) |
| FR/GB gas | idem energy/lifecycle |
| diesel L/kg | RESOLVED ou AMBIGUOUS |
| flight / freight | selon unité |
| WTT vs direct | pas de mélange |
| Gross vs Net | pas de mélange |
| safe kg↔t | conversion + ledger |
| review_required | 422 |
| ambiguous / no match | 422 / 404 |
| Non-régression | ADEME/UK UUID sur `/v1/calculate` refusé si policy P0 |

---

## 12. Legacy — minimum sûr

| Composant | Décision V1 |
|-----------|-------------|
| `BilanCarboneCalculator` | **Conserver** pour écrans historiques ; **interdire** pour nouveaux totaux certifiables / publish |
| `ActivityDataService.calculateEmissions` | Laisser mort ; ne pas “réparer” via hardcode |
| Frontend FE paths | Proof → nouvel endpoint ; Collect legacy plus tard |
| Migration immédiate de toute l’UI | **Non** — trop risqué |

Minimum sûr : **isoler** le chemin certifiable (resolve-and-calculate + ledger) ; legacy ne publie pas.

---

## 13. Feature flag

**Oui — recommandé :** `FACTOR_RESOLVER_CALCULATION_ENABLED` (env / config org optionnelle plus tard)

| Flag off | Flag on |
|----------|---------|
| resolve-and-calculate refuse | chemin production actif |
| catalogue + shadow OK | |
| `/v1/calculate` Core TN manuel OK (selon durcissement) | |

Contrôle : **API route** (premier garde) — rollback immédiat sans toucher FE.

---

## 14. Rollback

1. Mettre flag → off  
2. Optionnel : `resolver_status=disabled` sur versions ADEME/UK (et même internal)  
3. Ne **pas** toucher catalogue / valeurs / ledger historique  
4. Shadow `/v1/factors/resolve` peut rester pour diagnostic  

Aucune suppression de données.

---

## 15. Performance

| Étape | Ordre de grandeur (local 10k FE) |
|-------|----------------------------------|
| Resolver | ~100–250 ms (déjà mesuré shadow) |
| Engine | &lt; 5 ms / ligne |
| Ledger insert | &lt; 20–50 ms / ligne |

**Objectif p95** resolve-and-calculate 1 ligne : **&lt; 500 ms** local ; &lt; 1 s acceptable en prod initiale.

Pas de full scan 10024 en mémoire (déjà prefilter ≤50).

---

## 16. Security

| Attaque | Mitigation |
|---------|------------|
| Imposer factorId non résolu (ADEME/UK) | P0 : reject sur `/v1/calculate` ; seul resolve-and-calculate |
| Remplacer factorValue | Déjà rejeté |
| Modifier unit conversion client | Ignoré ; serveur recalcule |
| Envoyer resolverResult falsifié | Non accepté ; resolve serveur obligatoire |
| Facteur calculation disabled | Gate SQL |
| Contournement org | `requireOrgMember` + `withOrgClient` |
| Org factors legacy | Toujours hors Resolver |

---

## 17. Schema change ?

### Migration nécessaire avant production Resolver→calcul ?

# **NO**

Schéma ledger actuel suffit (provenance + unit_conversion).

### Si plus tard (non bloquant)

- Table `factor_resolution_events` (analytics)  
- Ou flag `resolver_eligible` **par facteur** si on refuse la allowlist applicative — seulement si la gouvernance version-level reste trop grossière

---

## 18. Plan final — étapes restantes avant « FE V1 TERMINÉ »

| # | Étape | Livrable |
|---|-------|----------|
| 1 | Durcir `/v1/calculate` anti-bypass ADEME/UK | Code + tests |
| 2 | Feature flag + `POST .../resolve-and-calculate` | Code + tests |
| 3 | Remplir `unit_conversion` + provenance Resolver dans ledger | Code |
| 4 | E2E Core TN (resolve→engine→ledger) | Tests |
| 5 | Activer `resolver_status=enabled` **Core TN only** | Migration gouvernance **minimale** ou SQL contrôlé (pas de changement de valeurs FE) |
| 6 | Ruleset ADEME safe subset (2570) + enable calc+resolver ADEME **après** étape 1 | Gouvernance + tests |
| 7 | Ruleset UK safe subset (1260) + enable UK + E2E context | Gouvernance + tests |
| 8 | Brancher UI Proof sur le chemin certifiable ; legacy isolé | Frontend (hors WIP non liés) |
| 9 | Rapport FE V1 done + commits ciblés | Docs |

**Nombre exact d’étapes restantes : 9** (dont 1–7 = backend/gouvernance/tests ; 8 = produit UI ; 9 = clôture).

« FE V1 TERMINÉ » **backend certifiable** peut être revendiqué après **étapes 1–7** (Core + subsets ADEME/UK).  
« FE V1 TERMINÉ » **produit** inclut l’étape 8.

---

## 19. Synthèse livrable

1. **Architecture cible** — resolve → normalize → engine → ledger  
2. **Intégration** — nouvel endpoint resolve-and-calculate + durcir calculate  
3. **Gouvernance** — calc+resolver+provenance ; anti-bypass version-level  
4. **Endpoint** — **B** resolve-and-calculate  
5. **Ledger** — JSONB suffisant, **pas** de migration bloquante  
6. **Unit conversion** — serveur, safe only, snapshot ledger  
7. **ADEME subset** — **2570** (energy+transport physical FR/NULL/GLOBAL)  
8. **UK subset** — **1260** direct GB GWP known non-review  
9. **Feature flag** — oui  
10. **Legacy** — conserver isolé, pas de publish  
11. **Security** — anti-falsification / anti-UUID ADEME  
12. **Rollback** — flag off  
13. **E2E** — matrice §11  
14. **Perf** — p95 &lt; 500 ms cible  
15. **Étapes** — **9** jusqu’à FE V1 produit ; **7** jusqu’à backend certifiable  

---

## VERDICT

| | | |
|--|--|--|
| A | Resolver prêt techniquement pour intégration calcul ? | **YES** |
| B | Schema migration nécessaire ? | **NO** |
| C | Ledger actuel suffisant ? | **YES** |
| D | Core TN activable via Resolver ? | **YES** |
| E | ADEME entier activable ? | **NO** |
| F | ADEME safe subset identifiable ? | **YES** (2570) |
| G | UK entier activable ? | **NO** |
| H | UK safe subset identifiable ? | **YES** (1260) |
| I | Feature flag recommandé ? | **YES** |
| J | Contournement client évitable ? | **YES** (si P0 appliqué **avant** enable calc ADEME/UK) |
| K | Rollback propre possible ? | **YES** |
| L | Étapes restantes avant FE V1 terminé ? | **9** (produit) / **7** (backend certifiable) |

---

*Document local non commité — aucun code / migration / activation.*

# Système de preuve carbone — constitution produit

Date : 12 août 2026  
Statut : **north star Newcarboscan-2027**

Objectif : transformer CarboScan d’une collection de calculateurs en un **système de preuve carbone**.

Pour chaque chiffre affiché, le produit doit pouvoir répondre automatiquement :

> Quelle donnée ? Quelle source ? Quel facteur ? Quelle formule ? Quelle version ? Qui l’a validé ?

---

## Chaîne canonique

```text
Collecte → Validation → Calcul certifiable → Analyse → Rapport
```

Chaque écran du noyau sert **une** étape de cette chaîne.

---

## Noyau certifiable (4 parcours)

| # | Parcours | Rôle dans la chaîne |
|---|---|---|
| 1 | Collecte des données | Origine + extraction → `evidence_records` |
| 2 | Bilan carbone organisationnel | Calcul via `carbon-engine` → `calculation_ledger` |
| 3 | Plan de réduction | Analyse **uniquement** sur totaux ledger / runs publiés |
| 4 | Rapport vérifiable | Faits structurés du ledger (+ IA reformule seulement) |

### Modules hors noyau (accessibles, non critiques)

ACV, CBAM, empreinte produit (PCF), ROI / simulation, Academy / formations, WattBIM, autres services.

Ils peuvent rester dans le produit, mais **ne portent pas la promesse de certifiabilité** tant qu’ils n’empruntent pas la même chaîne (evidence → facteur versionné → moteur → ledger → rapport).

---

## Six questions → six artefacts

| Question | Artefact |
|---|---|
| Quelle donnée ? | `evidence_records` (valeur originale + normalisée + période) |
| Quelle source ? | `source_type` + document / page / cellule |
| Quel facteur ? | `emission_factors` lié à une version figée |
| Quelle formule ? | `calculation_ledger.formula` |
| Quelle version ? | `ENGINE_VERSION` + méthodologie + `factor` version/checksum |
| Qui l’a validé ? | `validated_by` / `validated_at` + statut validation |

---

## Règles non négociables

1. **Origine ≠ qualité ≠ validation** — OCR / Excel ≠ « donnée réelle » tant que non validé.
2. **Facteur immuable une fois utilisé** — correction = nouvelle version ; anciens bilans conservent l’ancienne.
3. **Un seul moteur** — `packages/carbon-engine` ; pas de calcul réglementaire dans React.
4. **Ledger immuable** — republier = nouveau run (« Voir le publié » ≠ « Recalculer avec facteurs actuels »).
5. **IA après les faits** — `faits structurés → IA → texte` + contrôle que tout nombre existe dans les faits.
6. **Langage honnête** — pas de « conforme » sans preuve ; préférer « selon méthodologie X vY », « couverture partielle », « non vérifié par un tiers ».

---

## Ordre de réalisation (engagement)

1. Fermer endpoints sensibles — **fait (stubs JWT / 501)** ; à maintenir
2. Supprimer affirmations quantitatives inventées — **partiel** (rapports API) ; UI legacy à purger
3. Cartographier moteurs et tables — **fait** (`TABLE_INVENTORY`, portage 006–010)
4. Définir le schéma de preuve — **en cours** (`001` + `011_proof_model_alignment`)
5. Registre versionné des facteurs — **schéma partiel** ; seed + usage runtime à brancher
6. Moteur canonique — **partiel** (`calculateEmission` + décimaux + structure)
7. Cas de référence — **démarré** (`packages/carbon-engine` reference cases)
8. Migrer Bilan Carbone vers le moteur — **MVP UI** `/app/bilan-carbone/preuve`
9. Rapport entièrement traçable — **API + panneau 6Q** ; PDF/QR à faire
10. Migrer ACV / PCF / CBAM — **après** le noyau
11. Audit externe — plus tard
12. ISO 27001 / SOC 2 — après contrôles réellement opérés

---

## Première version « mondiale »

Volontairement étroite :

> Un bilan carbone impeccable, reproductible, sécurisé et vérifiable  
> avant dix modules seulement partiellement maîtrisés.

Artefacts liés :

- Schéma : `db/migrations/001_trust_core.sql`, `011_proof_model_alignment.sql`
- Moteur : `packages/carbon-engine`
- Checklist : `docs/AUDIT_CHECKLIST_APPLICATION.md`
- Portage tables : `docs/TABLE_PORT_STATUS.md`

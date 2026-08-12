# Noyau certifiable — statut du parcours UI

Date : 12 août 2026

## Chaîne branchée

```text
/app/bilan-carbone/preuve
  → POST /v1/evidence
  → PATCH /v1/evidence/:id/validate
  → GET /v1/factors  (seed 012)
  → POST /v1/calculate  (facteurs DB → carbon-engine → ledger)
  → GET /v1/ledger/:id/provenance  (6 questions)
  → POST /v1/runs/:id/publish
  → POST /v1/reports/from-run
```

## Artefacts

| Couche | Fichier |
|---|---|
| Seed facteurs | `db/migrations/012_seed_core_factor_pack.sql` |
| API evidence validate | `apps/api/src/routes/evidence.ts` |
| API factors / runs / provenance | `factors.ts`, `runs.ts` |
| Calculate résout FE en DB | `apps/api/src/routes/calculate.ts` |
| Client web | `apps/web/src/integrations/api/client.ts` |
| Panneau 6 questions | `apps/web/src/components/proof/ProofPanel.tsx` |
| Workspace noyau | `apps/web/src/modules/bilan-carbone/CoreProofWorkspace.tsx` |
| Adapter collect | `apps/web/src/lib/evidence/submitActivityAsEvidence.ts` |

## Hors scope (volontaire)

- Rewrite complet des écrans Collecte / `BilanCarboneCalculator` (encore legacy)
- ACV, CBAM, PCF
- PDF + QR code de vérification publique

## Appliquer

```bash
docker compose exec -T postgres psql -U newcarboscan -d newcarboscan \
  < db/migrations/011_proof_model_alignment.sql
docker compose exec -T postgres psql -U newcarboscan -d newcarboscan \
  < db/migrations/012_seed_core_factor_pack.sql
```

Puis ouvrir `/app/bilan-carbone/preuve` (JWT org requis).

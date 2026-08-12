# Inventaire des moteurs de calcul

| Moteur | Emplacement | Statut | Usage autorisé |
|---|---|---|---|
| **carbon-engine** | `packages/carbon-engine` | **CANONIQUE** `ENGINE_VERSION` | Totaux réglementaires, free-bilan API, `/v1/calculate`, rapports |
| BilanCarboneCalculator | `apps/web/src/lib/calculators/BilanCarboneCalculator.ts` | **LEGACY UI** | Affichage historique uniquement — ne pas publier |
| ProductFootprintCalculator | `apps/web/.../ProductFootprintCalculator.ts` | Hors noyau | PCF — à migrer plus tard |
| DashboardAggregator | `apps/web/.../DashboardAggregator.ts` | Legacy | Agrège le calculateur legacy |
| CBAM / PCF utils front | `modules/cbam`, `modules/empreinte-produit` | Hors noyau | Pas de promesse certifiable |
| Edge functions Deno | `apps/api/legacy-edge-functions-ref/` | **NON DÉPLOYÉ** | Référence audit uniquement |

## Contrat du moteur canonique

```text
activité × facteur versionné × allocation = émission
```

Champs enregistrés dans `calculation_ledger` :

- quantité / unité activité
- valeur / unité facteur + `factor_version_id` / checksum
- formule, allocation, incertitude (si sourcée)
- `engine_version`, `methodology_version`
- lien `evidence_id`

## Migration progressive

1. Nouveaux écrans → uniquement `api.calculate` / carbon-engine  
2. Publication bilan → snapshot immuable (`013`)  
3. Remplacer appels `BilanCarboneCalculator.calculate` dans bilan org  
4. Puis ACV / PCF / CBAM

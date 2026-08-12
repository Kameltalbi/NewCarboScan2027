# Audit initial CarboScan — verdict

**Date :** 11 août 2026  
**Projet cible :** Newcarboscan-2027 (PostgreSQL, sans Supabase)  
**Maturité industrielle évaluée :** **4,5 / 10**

---

## Verdict

CarboScan possède une base fonctionnelle riche et plusieurs briques intéressantes, mais je ne le présenterais pas aujourd’hui comme une plateforme « audit-ready » ou équivalente à Greenly pour un grand compte.

Le problème n’est pas le manque de fonctionnalités. C’est l’absence d’une chaîne de confiance démontrable entre :

**donnée source → facteur d’émission versionné → calcul déterministe → résultat explicable → rapport vérifiable.**

---

## Résultats vérifiés (source CarboScan)

| Métrique | Valeur |
|---|---|
| TypeScript/SQL | ~205 000 lignes |
| Fichiers `src` + `supabase` + `e2e` | 1 258 |
| Migrations Supabase | 241 |
| Fonctions serveur | ~40 |
| Tests unitaires | 267 (264 OK, 3 KO) |
| Build production | OK |
| Lint | 1 002 problèmes (909 erreurs, 93 warnings) |
| CI déploiement | build seulement — **ni lint ni tests** |
| RLS | ~202 activations, ~601 politiques (présence ≠ cohérence) |

---

## Constats critiques

### P0 — Services IA payants sans authentification suffisante

Plusieurs fonctions ont `verify_jwt = false` (`supabase/config.toml`), notamment génération de rapports et estimation d’actions.

Cas critiques :

- `generate-carbon-report` : OpenAI, CORS `*`, pas de validation utilisateur
- `estimate-action-impact` : même modèle

Conséquences : abus de crédits API, exfiltration, absence d’attribution, DoS financier, prompt injection.

**Correctifs obligatoires :** auth JWT, autorisation org, quotas, rate limiting, limites payload, Zod serveur, journal d’audit, CORS restrictif.

### P0 — Affirmations climat non justifiées

Le fallback IA invente : réduction 30–50 %, −40 % en 2030 « 1,5 °C », ROI &lt; 24 mois, incertitude ±15 %, « traçabilité complète ».

**Règle Newcarboscan-2027 :** l’IA ne commente que des faits déjà calculés et sourcés. Aucun chiffre inventé.

### P0 — Pipeline de déploiement non bloquant

Build OK + tests KO + lint KO + deploy possible. La branche principale doit échouer si typecheck, lint, tests, migrations ou contrôles sécurité échouent.

### P1 — Moteur carbone fragmenté

Bilan Carbone, dynamique, adaptatif, CBAM client/serveur, ACV, empreinte produit, SQL, Edge Functions, composants React.

**Décision :** un seul moteur carbone central, pur, versionné, testé. Aucun calcul réglementaire dans React.

### P1 — Qualité des données attribuée automatiquement à tort

Imports Excel / OCR facture marqués « réels » automatiquement.

**Séparer :** origine, méthode d’extraction, statut de validation, qualité temporelle/géographique, représentativité, incertitude.

### P1 — XSS blog

HTML injecté sans sanitisation (`BlogPost.tsx`).

### P1 — Migrations trop nombreuses / difficiles à certifier

241 migrations → reconstruire depuis un schéma consolidé PostgreSQL + tests d’isolation multi-tenant négatifs.

### P2 — Gouvernance logicielle insuffisante

`package.json` encore `vite_react_shadcn_ts` 0.0.0 ; README Lovable générique.

---

## Position face à Greenly

| Domaine | Greenly (public) | CarboScan observé |
|---|---|---|
| Sécurité | ISO 27001, SOC 2 Type II | Non démontré |
| Contrôles | MFA, chiffrement, pentests | Non démontré |
| Facteurs | 300k+ revendiqués | Sources multiples, gouvernance faible |
| Méthodes | GHG / Bilan Carbone / ISO / SBTi | Références + conformités parfois générées |
| Auditabilité | Exports audit-ready | Hypothèses parfois statiques/générées |
| Multi-entité | Consolidation annoncée | Isolation à prouver formellement |

---

## Architecture cible — cinq noyaux

1. **Registre de données probantes** — source, auteur, période, unité, transformations, validation, historique  
2. **Registre versionné des facteurs** — source, licence, version, GWP, incertitude, validité, règle de sélection  
3. **Moteur de calcul unique** — déterministe, sans IA, décimaux, versionné, reproductible  
4. **Ledger d’audit immuable** — entrées, facteurs, formules, allocations, version moteur  
5. **Couche réglementaire / rapports** — consomme le ledger ; IA = reformulation uniquement  

---

## Priorités temporelles

### 0–30 jours

- Fermer fonctions publiques sensibles  
- Auth + authz + quotas + rate limit  
- Supprimer valeurs climat inventées  
- Sanitiser HTML + CSP  
- CI bloquante  
- Tests isolation multi-tenant  
- Geler nouveaux modules  

### 30–90 jours

- Inventaire chemins de calcul → moteur canonique  
- Versionner facteurs / méthodes / résultats  
- Jeux de référence expert carbone  
- Lignes de rapport cliquables jusqu’à la source  
- Backups, restauration testée, monitoring, incidents  

### 3–12 mois

- Pentest / ISO 27001 / SOC 2  
- Revue méthodologique indépendante  
- SSO/SAML, MFA, SCIM, RBAC fin  
- DPA / RGPD / conservation / suppression  
- SLA / status page / continuité  
- Validation externe des rapports  

---

## Conclusion

Ne pas ajouter d’écrans d’abord. Réduire la surface, sécuriser les frontières, construire une **preuve de calcul reproductible**. C’est cette preuve qui permet de rivaliser avec Greenly.

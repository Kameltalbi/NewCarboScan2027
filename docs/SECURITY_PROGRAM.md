# Programme sécurité CarboScan — Vague 3 (ops / contrat)

Ce fichier décrit les **actions hors code** à engager pour un dossier banque.
Le code des vagues 1–2 est dans `db/migrations/032_security_hardening.sql` et `apps/api`.

## Pentest

- Commander un test d’intrusion applicatif + infra (OWASP ASVS L2 visé).
- Périmètre : `https://www.ktoptima.com`, API `/auth` `/v1`, VPS `213.130.144.183`.
- Livrable attendu : rapport daté, criticité, preuves, retest.
- **Ne pas affirmer « pentest réalisé » tant que le rapport n’est pas signé.**

## Chiffrement disque (LUKS)

Sur le VPS :

```bash
ssh ciblix-vps 'bash -s' < scripts/check-disk-encryption.sh
```

Si le script sort 2 : chiffrer le volume ou migrer vers un hébergeur avec disque chiffré (attestation écrite).

## Sauvegardes chiffrées

```bash
BACKUP_PASSPHRASE='…' ./scripts/backup-encrypted.sh
```

Planifier un cron quotidien + copie hors site. Tester une restauration (`docs/RUNBOOK_RESTORE.md`) au moins une fois par trimestre.

## Sous-traitants / DPA

| Prestataire | Données | Action |
|---|---|---|
| Hébergeur VPS (à nommer) | Base Postgres, fichiers | Contrat + DPA + localisation |
| Let’s Encrypt | Certificats TLS | Public CA |
| Google Analytics | Uniquement si `VITE_GA_MEASUREMENT_ID` est défini | DPA Google **ou retirer GA** (recommandé pour une banque) |
| GitHub Actions | Code source CI | Compte org, pas la base prod |

## ISO 27001 / SOC 2

Roadmap, pas un certificat actuel :

1. Inventaire des actifs et risques (déjà amorcé : `docs/THREAT_MODEL.md`)
2. Politique d’accès, sauvegardes, incidents (ce fichier + runbooks)
3. Preuves d’exploitation 3–6 mois
4. Organisme certificateur

## Localisation

Aligner contrat, politique de confidentialité et réalité VPS. Ne plus afficher « hébergé en France » si le traitement est en Tunisie (`legal.privacy.transfers`).
